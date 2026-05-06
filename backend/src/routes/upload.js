const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { protect } = require('../middleware/auth');
const planLimit = require('../middleware/planLimit');
const { autoDetectMapping } = require('../utils/fieldDetector');

const router = express.Router();

// ── Multer configs ───────────────────────────────────────────────────────────
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls|csv)$/i)) cb(null, true);
    else cb(new Error('Only Excel/CSV files allowed'));
  },
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed (PNG, JPG, TIFF, BMP)'));
  },
});

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.match(/\.pdf$/i)) cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  },
});

// ── Excel routes ─────────────────────────────────────────────────────────────

// POST /api/upload/excel — parse, preview, smart-map
router.post('/excel', protect, excelUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawData.length) return res.status(400).json({ message: 'Excel file is empty' });

    const columns = Object.keys(rawData[0]);
    const preview = rawData.slice(0, 5);
    const autoMapping = autoDetectMapping(columns, preview); // ← smarter detection

    res.json({
      columns,
      preview,
      totalRows: rawData.length,
      autoMapping,
      fileName: req.file.originalname,
      source: 'excel',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/upload/excel/confirm — save records
router.post('/excel/confirm', protect, planLimit('records'), excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let mapping;
    try { mapping = JSON.parse(req.body.mapping); }
    catch { return res.status(400).json({ message: 'Invalid mapping JSON' }); }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const saved = await saveRecords(rawData, mapping, req.user.organizationId);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Image OCR routes ──────────────────────────────────────────────────────────

// POST /api/upload/image — OCR an image, return extracted rows + auto-mapping
router.post('/image', protect, planLimit('ocr'), imageUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const { extractTextFromImage } = require('../utils/ocrExtract');
    const result = await extractTextFromImage(req.file.buffer, req.file.mimetype);

    if (!result.lines.length) {
      return res.status(422).json({ message: 'No text found in image. Try a clearer scan.' });
    }

    const { columns, rows, isTabular, rawText, lines } = result;

    const preview = rows.slice(0, 5);
    const autoMapping = columns.length ? autoDetectMapping(columns, preview) : {};

    res.json({
      rawText,
      lines,
      columns,
      rows,
      preview,
      totalRows: rows.length,
      autoMapping,
      isTabular,
      fileName: req.file.originalname,
      source: 'image',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/upload/image/confirm — save OCR rows as records
router.post('/image/confirm', protect, planLimit('records'), async (req, res) => {
  try {
    const { rows, mapping } = req.body;
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ message: 'No rows provided' });
    }
    if (!mapping) return res.status(400).json({ message: 'Mapping required' });

    const saved = await saveRecords(rows, mapping, req.user.organizationId);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PDF extraction routes ─────────────────────────────────────────────────────

// POST /api/upload/pdf — extract text from PDF, return rows + auto-mapping
router.post('/pdf', protect, planLimit('ocr'), pdfUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No PDF uploaded' });

    const { extractTextFromPDF } = require('../utils/pdfExtract');
    const result = await extractTextFromPDF(req.file.buffer);

    if (!result.lines.length) {
      return res.status(422).json({
        message: 'No text found in PDF. If it is a scanned document, use Image OCR instead.',
      });
    }

    const { columns, rows, isTabular, rawText, lines, pageCount } = result;
    const preview = rows.slice(0, 5);
    const autoMapping = columns.length ? autoDetectMapping(columns, preview) : {};

    res.json({
      rawText,
      lines,
      columns,
      rows,
      preview,
      totalRows: rows.length,
      autoMapping,
      isTabular,
      pageCount,
      fileName: req.file.originalname,
      source: 'pdf',
    });
  } catch (err) {
    res.status(422).json({ message: err.message });
  }
});

// POST /api/upload/pdf/confirm — save PDF rows as records
router.post('/pdf/confirm', protect, planLimit('records'), async (req, res) => {
  try {
    const { rows, mapping } = req.body;
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ message: 'No rows provided' });
    }
    if (!mapping) return res.status(400).json({ message: 'Mapping required' });

    const saved = await saveRecords(rows, mapping, req.user.organizationId);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Shared helpers ────────────────────────────────────────────────────────────

const CORE_FIELDS = ['name', 'idNumber', 'department', 'designation', 'email', 'phone', 'photoUrl'];
const { cleanAndDedup } = require('../utils/dataCleaner');

async function saveRecords(rawRows, mapping, organizationId) {
  const Record = require('../models/Record');
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Step 1: Map columns → system fields
  const mapped = rawRows.map((row) => {
    const record = { organizationId, uploadBatchId: batchId, name: '', extraFields: {} };
    for (const [col, systemField] of Object.entries(mapping)) {
      if (!systemField || systemField === '__skip__') continue;
      const value = String(row[col] || '').trim();
      if (!value) continue;
      if (CORE_FIELDS.includes(systemField)) {
        record[systemField] = value;
      } else {
        record.extraFields[col] = value;
      }
    }
    if (!record.name) record.name = 'Unknown';
    return record;
  });

  // Step 2: Fetch existing ID numbers in this org for dedup
  const inputIds = mapped.map((r) => r.idNumber).filter(Boolean);
  const existingIds = inputIds.length
    ? await Record.distinct('idNumber', { organizationId, idNumber: { $in: inputIds } })
    : [];
  const existingSet = new Set(existingIds.map((id) => String(id).toLowerCase()));

  // Step 3: Clean + deduplicate
  const { cleaned, skippedDuplicates, skippedInvalid, cleaningChanges, report } =
    cleanAndDedup(mapped, existingSet);

  if (!cleaned.length) {
    throw Object.assign(new Error('No valid records to save after cleaning'), {
      status: 422,
      detail: report,
      skippedDuplicates,
      skippedInvalid,
    });
  }

  // Step 4: Auto-generate IDs for records that have none (if org has idPrefix set)
  const Organization = require('../models/Organization');
  const org = await Organization.findById(organizationId).select('idPrefix idFormat').lean();

  if (org?.idPrefix) {
    const prefix  = org.idPrefix;
    const format  = org.idFormat || `${prefix}-{NNN}`;
    const year    = new Date().getFullYear();

    // Find the highest existing numeric suffix among IDs starting with this prefix
    const existingWithPrefix = await Record.find(
      { organizationId, idNumber: { $regex: `^${prefix}`, $options: 'i' } },
      { idNumber: 1 }
    ).lean();

    const maxNum = existingWithPrefix.reduce((max, r) => {
      const digits = r.idNumber.replace(/\D+/g, '').slice(-6);
      const n = parseInt(digits, 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);

    let counter = maxNum + 1;
    cleaned.forEach((doc) => {
      if (!doc.idNumber) {
        doc.idNumber = format
          .replace('{NNN}',  String(counter).padStart(3, '0'))
          .replace('{NNNN}', String(counter).padStart(4, '0'))
          .replace('{YYYY}', year);
        counter++;
      }
    });
  }

  const saved = await Record.insertMany(cleaned);
  return {
    batchId,
    count: saved.length,
    records: saved,
    cleaning: { report, skippedDuplicates, skippedInvalid, cleaningChanges },
  };
}

module.exports = router;
