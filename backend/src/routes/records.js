const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const Record = require('../models/Record');
const uploadPhoto = require('../utils/uploadPhoto');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// GET /api/records — list with filters
router.get('/', protect, async (req, res) => {
  try {
    const { batchId, department, status, search, page = 1, limit = 20 } = req.query;
    const filter = { organizationId: req.user.organizationId };

    if (batchId) filter.uploadBatchId = batchId;
    if (department) filter.department = new RegExp(department, 'i');
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { idNumber: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      Record.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Record.countDocuments(filter),
    ]);

    res.json({ records, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/records/stats — dashboard counts + department breakdown + expiry
router.get('/stats', protect, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const now = new Date();

    const [total, generated, expired, batches, recent, departments] = await Promise.all([
      Record.countDocuments({ organizationId: orgId }),
      Record.countDocuments({ organizationId: orgId, status: 'generated' }),
      Record.countDocuments({ organizationId: orgId, expiryDate: { $lt: now } }),
      Record.aggregate([
        { $match: { organizationId: orgId } },
        { $group: { _id: '$uploadBatchId', count: { $sum: 1 }, createdAt: { $first: '$createdAt' } } },
        { $sort: { createdAt: -1 } },
      ]),
      Record.find({ organizationId: orgId, status: 'generated' })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name idNumber department updatedAt'),
      Record.aggregate([
        { $match: { organizationId: orgId, department: { $ne: '' } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    res.json({
      total, generated, expired,
      pending: total - generated,
      batches: batches.length,
      recentBatches: batches.slice(0, 5),
      recentGenerated: recent,
      departments, // [{ _id: "Grade 10", count: 42 }, ...]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/records/batches — unique batch IDs
router.get('/batches', protect, async (req, res) => {
  try {
    const batches = await Record.aggregate([
      { $match: { organizationId: req.user.organizationId } },
      { $group: { _id: '$uploadBatchId', count: { $sum: 1 }, createdAt: { $first: '$createdAt' } } },
      { $sort: { createdAt: -1 } },
    ]);
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/records/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const record = await Record.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/records/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const allowed = ['name', 'idNumber', 'department', 'designation', 'email', 'phone', 'photoUrl', 'extraFields'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    // If core fields are edited, reset status so ID gets regenerated
    const coreEdited = ['name', 'idNumber', 'department', 'designation', 'photoUrl'].some((k) => updates[k] !== undefined);
    if (coreEdited) updates.status = 'pending';

    const record = await Record.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      updates,
      { new: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/records/:id/photo — upload photo to Cloudinary
router.post('/:id/photo', protect, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const record = await Record.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!record) return res.status(404).json({ message: 'Record not found' });

    let photoUrl;
    try {
      photoUrl = await uploadPhoto(req.file.buffer, req.file.mimetype, String(req.user.organizationId));
    } catch (uploadErr) {
      return res.status(502).json({ message: 'Photo upload failed — ' + uploadErr.message });
    }

    const updated = await Record.findByIdAndUpdate(
      record._id,
      { photoUrl, status: 'pending' },
      { new: true }
    );
    res.json({ photoUrl: updated.photoUrl, record: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/records/manual — single manual record (with optional photo)
router.post('/manual', protect, upload.single('photo'), async (req, res) => {
  try {
    const { name, idNumber, department, designation, email, phone, extraFields } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });

    const orgId = req.user.organizationId;

    // Check duplicate ID within org
    if (idNumber && idNumber.trim()) {
      const existing = await Record.findOne({ organizationId: orgId, idNumber: idNumber.trim() });
      if (existing) return res.status(409).json({ message: `ID "${idNumber}" already exists` });
    }

    let photoUrl = '';
    let photoWarning = '';
    if (req.file) {
      try {
        photoUrl = await uploadPhoto(req.file.buffer, req.file.mimetype, orgId);
      } catch (uploadErr) {
        photoWarning = 'Photo upload skipped — ' + uploadErr.message;
        console.warn('[manual] Photo upload failed:', uploadErr.message);
      }
    }

    const batchId = `manual-${Date.now()}`;
    const record = await Record.create({
      organizationId: orgId,
      uploadBatchId: batchId,
      name: name.trim(),
      idNumber: idNumber?.trim() || '',
      department: department?.trim() || '',
      designation: designation?.trim() || '',
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      photoUrl,
      source: 'manual',
      extraFields: extraFields ? JSON.parse(extraFields) : {},
    });

    res.status(201).json({ ...record.toObject(), _warning: photoWarning || undefined });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/records/bulk-manual — bulk insert array of records
router.post('/bulk-manual', protect, async (req, res) => {
  try {
    const { records, batchName } = req.body;
    if (!Array.isArray(records) || records.length === 0)
      return res.status(400).json({ message: 'records array is required' });

    const orgId = req.user.organizationId;
    const batchId = batchName?.trim()
      ? `manual-${batchName.trim().replace(/\s+/g, '-')}-${Date.now()}`
      : `manual-bulk-${Date.now()}`;

    // Validate: name required for all, collect IDs for dup check
    const errors = [];
    const seenIds = new Set();
    const idNumbers = records.map((r) => r.idNumber?.trim()).filter(Boolean);

    // Check DB for existing IDs in one query
    const existingIds = await Record.distinct('idNumber', {
      organizationId: orgId,
      idNumber: { $in: idNumbers },
    });
    const existingSet = new Set(existingIds);

    const docs = [];
    records.forEach((r, i) => {
      const rowNum = i + 1;
      if (!r.name?.trim()) { errors.push(`Row ${rowNum}: Name is required`); return; }
      const idNum = r.idNumber?.trim() || '';
      if (idNum) {
        if (seenIds.has(idNum)) { errors.push(`Row ${rowNum}: Duplicate ID "${idNum}" within batch`); return; }
        if (existingSet.has(idNum)) { errors.push(`Row ${rowNum}: ID "${idNum}" already exists in database`); return; }
        seenIds.add(idNum);
      }
      docs.push({
        organizationId: orgId,
        uploadBatchId: batchId,
        name: r.name.trim(),
        idNumber: idNum,
        department: r.department?.trim() || '',
        designation: r.designation?.trim() || '',
        email: r.email?.trim() || '',
        phone: r.phone?.trim() || '',
        photoUrl: r.photoUrl || '',
        source: 'manual',
        extraFields: r.extraFields || {},
      });
    });

    if (errors.length > 0) return res.status(400).json({ message: 'Validation errors', errors });

    const inserted = await Record.insertMany(docs);
    res.status(201).json({ inserted: inserted.length, batchId, records: inserted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/records/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const record = await Record.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
