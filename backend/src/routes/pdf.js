const express = require('express');
const { protect } = require('../middleware/auth');
const Record = require('../models/Record');
const Template = require('../models/Template');
const Organization = require('../models/Organization');
const generateIDCard = require('../utils/generateIDCard');
const { seedBuiltinTemplates } = require('../utils/builtinTemplates');
const { createJob, getJob, updateJob, deleteJob } = require('../utils/jobStore');

const router = express.Router();

async function resolveTemplate(templateId, orgId, orgType) {
  if (templateId) return Template.findById(templateId);
  await seedBuiltinTemplates(orgId, orgType);
  return Template.findOne({ organizationId: orgId, isDefault: true });
}

// ── Shared: generate + merge records in background, updating a job ─────────────
async function generateBatch({ records, template, org, jobId }) {
  const PDFMerger = require('../utils/pdfMerger');
  const merger = new PDFMerger();
  const generatedIds = [];
  let failed = 0;
  const total = records.length;

  updateJob(jobId, { status: 'processing', total, current: 0 });

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    try {
      const buf = await generateIDCard({ record, template, org });
      await merger.add(buf);
      generatedIds.push(record._id);
    } catch {
      failed++;
      await Record.findByIdAndUpdate(record._id, { status: 'error' });
    }
    updateJob(jobId, { current: i + 1, failed });
  }

  if (generatedIds.length) {
    await Record.updateMany({ _id: { $in: generatedIds } }, { status: 'generated' });
  }

  if (!generatedIds.length) {
    updateJob(jobId, { status: 'error', error: 'All records failed to generate' });
    return;
  }

  const pdfBuffer = await merger.saveAsBuffer();
  updateJob(jobId, { status: 'done', pdfBuffer, failed });
}

// ── POST /api/pdf/single/:recordId ────────────────────────────────────────────
router.post('/single/:recordId', protect, async (req, res) => {
  try {
    const [record, org] = await Promise.all([
      Record.findOne({ _id: req.params.recordId, organizationId: req.user.organizationId }),
      Organization.findById(req.user.organizationId),
    ]);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const template = await resolveTemplate(req.body.templateId, req.user.organizationId, org?.type);
    if (!template) return res.status(404).json({ message: 'No template found. Create a template first.' });

    const pdfBuffer = await generateIDCard({ record, template, org });
    await Record.findByIdAndUpdate(record._id, { status: 'generated' });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ID_${record.name.replace(/\s+/g, '_')}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/pdf/jobs — start a background batch job ─────────────────────────
// Body: { recordIds?: string[], batchId?: string, templateId?: string, filename?: string }
router.post('/jobs', protect, async (req, res) => {
  try {
    const { recordIds, batchId, templateId, filename } = req.body;
    const orgId = req.user.organizationId;

    let records;
    if (Array.isArray(recordIds) && recordIds.length) {
      if (recordIds.length > 500) return res.status(400).json({ message: 'Max 500 records per job' });
      records = await Record.find({ _id: { $in: recordIds }, organizationId: orgId });
    } else if (batchId) {
      records = await Record.find({ uploadBatchId: batchId, organizationId: orgId });
    } else {
      return res.status(400).json({ message: 'Provide recordIds or batchId' });
    }

    if (!records.length) return res.status(404).json({ message: 'No records found' });

    const org = await Organization.findById(orgId);
    const template = await resolveTemplate(templateId, orgId, org?.type);
    if (!template) return res.status(404).json({ message: 'No template found' });

    const jobId = createJob(orgId);
    const safeFilename = filename || (batchId ? `IDCards_Batch_${batchId.slice(-6)}.pdf` : `IDCards_${Date.now()}.pdf`);
    updateJob(jobId, { filename: safeFilename, total: records.length });

    // Fire-and-forget background processing
    generateBatch({ records, template, org, jobId }).catch(() => {
      updateJob(jobId, { status: 'error', error: 'Unexpected generation failure' });
    });

    res.json({ jobId, total: records.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/pdf/jobs/:jobId — poll for progress ──────────────────────────────
router.get('/jobs/:jobId', protect, async (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ message: 'Job not found or expired' });
  if (job.orgId !== String(req.user.organizationId)) return res.status(403).json({ message: 'Forbidden' });

  res.json({
    jobId:   req.params.jobId,
    status:  job.status,
    current: job.current,
    total:   job.total,
    failed:  job.failed,
    error:   job.error,
    percent: job.total ? Math.round((job.current / job.total) * 100) : 0,
    ready:   job.status === 'done',
  });
});

// ── GET /api/pdf/jobs/:jobId/download — download completed PDF ────────────────
router.get('/jobs/:jobId/download', protect, async (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ message: 'Job not found or expired' });
  if (job.orgId !== String(req.user.organizationId)) return res.status(403).json({ message: 'Forbidden' });
  if (job.status !== 'done' || !job.pdfBuffer) return res.status(400).json({ message: 'PDF not ready yet' });

  const buf = job.pdfBuffer;
  const filename = job.filename || 'IDCards.pdf';
  deleteJob(req.params.jobId); // free memory

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.send(buf);
});

// ── POST /api/pdf/batch (legacy — kept for backward compat) ───────────────────
router.post('/batch', protect, async (req, res) => {
  try {
    const { batchId, templateId } = req.body;
    if (!batchId) return res.status(400).json({ message: 'batchId required' });

    const [records, org] = await Promise.all([
      Record.find({ uploadBatchId: batchId, organizationId: req.user.organizationId }),
      Organization.findById(req.user.organizationId),
    ]);
    if (!records.length) return res.status(404).json({ message: 'No records for this batch' });
    const template = await resolveTemplate(templateId, req.user.organizationId, org?.type);
    if (!template) return res.status(404).json({ message: 'No template found' });

    const PDFMerger = require('../utils/pdfMerger');
    const merger = new PDFMerger();
    const generatedIds = [];
    for (const record of records) {
      try { const buf = await generateIDCard({ record, template, org }); await merger.add(buf); generatedIds.push(record._id); }
      catch { await Record.findByIdAndUpdate(record._id, { status: 'error' }); }
    }
    if (generatedIds.length) await Record.updateMany({ _id: { $in: generatedIds } }, { status: 'generated' });
    const merged = await merger.saveAsBuffer();
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="IDCards_Batch_${batchId.slice(-6)}.pdf"` });
    res.send(merged);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/pdf/selected (legacy — small batches <20) ───────────────────────
router.post('/selected', protect, async (req, res) => {
  try {
    const { recordIds, templateId } = req.body;
    if (!Array.isArray(recordIds) || !recordIds.length) return res.status(400).json({ message: 'recordIds array required' });
    if (recordIds.length > 200) return res.status(400).json({ message: 'Max 200 records per download' });

    const [records, org] = await Promise.all([
      Record.find({ _id: { $in: recordIds }, organizationId: req.user.organizationId }),
      Organization.findById(req.user.organizationId),
    ]);
    if (!records.length) return res.status(404).json({ message: 'No records found' });
    const template = await resolveTemplate(templateId, req.user.organizationId, org?.type);
    if (!template) return res.status(404).json({ message: 'No template found' });

    const PDFMerger = require('../utils/pdfMerger');
    const merger = new PDFMerger();
    const generatedIds = [];
    for (const record of records) {
      try { const buf = await generateIDCard({ record, template, org }); await merger.add(buf); generatedIds.push(record._id); }
      catch { await Record.findByIdAndUpdate(record._id, { status: 'error' }); }
    }
    if (generatedIds.length) await Record.updateMany({ _id: { $in: generatedIds } }, { status: 'generated' });
    const merged = await merger.saveAsBuffer();
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="IDCards_${Date.now()}.pdf"` });
    res.send(merged);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/pdf/preview/:recordId ────────────────────────────────────────────
router.get('/preview/:recordId', protect, async (req, res) => {
  try {
    const [record, org] = await Promise.all([
      Record.findOne({ _id: req.params.recordId, organizationId: req.user.organizationId }),
      Organization.findById(req.user.organizationId),
    ]);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    const template = await resolveTemplate(req.query.templateId || null, req.user.organizationId, org?.type);
    if (!template) return res.status(404).json({ message: 'No template found' });
    const { buildCardHTML } = require('../utils/generateIDCard');
    const html = await buildCardHTML({ record, template, org });
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
