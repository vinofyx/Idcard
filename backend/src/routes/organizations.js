const express = require('express');
const { protect } = require('../middleware/auth');
const Organization = require('../models/Organization');
const cloudinary = require('../utils/cloudinary');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/organizations/me
router.get('/me', protect, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json(org);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/organizations/me
router.put('/me', protect, async (req, res) => {
  try {
    const { name, type, idPrefix, idFormat } = req.body;
    const updates = {};
    if (name !== undefined)     updates.name     = name;
    if (type !== undefined)     updates.type     = type;
    if (idPrefix !== undefined) updates.idPrefix = idPrefix.trim().toUpperCase();
    if (idFormat  !== undefined) updates.idFormat = idFormat.trim();
    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      updates,
      { new: true, runValidators: true }
    );
    res.json(org);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/organizations/me/setup — complete onboarding wizard
router.put('/me/setup', protect, upload.single('logo'), async (req, res) => {
  try {
    const { name, type, idPrefix, idFormat, skipLogo } = req.body;
    const updates = { onboardingDone: true };

    if (name?.trim())     updates.name     = name.trim();
    if (type)             updates.type     = type;
    if (idPrefix?.trim()) updates.idPrefix = idPrefix.trim().toUpperCase();
    if (idFormat?.trim()) updates.idFormat = idFormat.trim();

    // Upload logo if provided
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataUri, { folder: 'idflow/logos' });
      updates.logo = result.secure_url;
    }

    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      updates,
      { new: true }
    );
    res.json(org);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/organizations/logo
router.post('/logo', protect, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, { folder: 'idflow/logos' });
    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { logo: result.secure_url },
      { new: true }
    );
    res.json({ logoUrl: org.logo, organization: org });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
