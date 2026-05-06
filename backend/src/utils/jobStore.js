/**
 * In-memory PDF generation job store.
 * For production at scale, replace with Redis + BullMQ.
 * Each job lives for up to 30 minutes.
 */

const jobs = new Map();
const JOB_TTL_MS = 30 * 60 * 1000; // 30 min

function createJob(orgId) {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  jobs.set(jobId, {
    orgId:     String(orgId),
    status:    'queued',   // queued | processing | done | error
    current:   0,
    total:     0,
    failed:    0,
    pdfBuffer: null,
    error:     null,
    filename:  'IDCards.pdf',
    createdAt: Date.now(),
  });
  // Auto-expire
  setTimeout(() => jobs.delete(jobId), JOB_TTL_MS);
  return jobId;
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function updateJob(jobId, patch) {
  const job = jobs.get(jobId);
  if (job) jobs.set(jobId, { ...job, ...patch });
}

function deleteJob(jobId) {
  jobs.delete(jobId);
}

// Clean up stale jobs every 10 min
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
}, 10 * 60 * 1000);

module.exports = { createJob, getJob, updateJob, deleteJob };
