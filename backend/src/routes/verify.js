const express = require('express');
const Record = require('../models/Record');
const Organization = require('../models/Organization');

const router = express.Router();

// GET /verify/:id — public QR verification page
router.get('/:id', async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).lean();
    if (!record) return res.status(404).send(page404());

    const org = await Organization.findById(record.organizationId).lean();
    const isExpired = record.expiryDate && new Date(record.expiryDate) < new Date();
    res.send(pageFound({ record, org, isExpired }));
  } catch {
    res.status(500).send(page404());
  }
});

// ─────────────────────────────────────────────────────────────────────────────
function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── 404 page ──────────────────────────────────────────────────────────────────
function page404() {
  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ID Not Found — IDFlow</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:linear-gradient(135deg,#1e2a4a 0%,#2d4a7a 100%);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px}
.box{background:#fff;border-radius:20px;padding:48px 36px;text-align:center;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25)}
.icon{font-size:64px;margin-bottom:16px}
h1{font-size:22px;color:#1e2a4a;margin-bottom:8px}
p{color:#6b7280;font-size:15px;line-height:1.6}
.brand{margin-top:32px;font-size:12px;color:#9ca3af}
</style></head>
<body><div class="box">
  <div class="icon">🚫</div>
  <h1>ID Not Found</h1>
  <p>This ID card could not be verified. The ID may have been deleted or the QR code is invalid.</p>
  <div class="brand">Powered by <strong>IDFlow</strong></div>
</div></body></html>`;
}

// ── Verified page ─────────────────────────────────────────────────────────────
function pageFound({ record, org, isExpired }) {
  const statusColor   = isExpired ? '#dc2626' : '#16a34a';
  const statusBg      = isExpired ? '#fef2f2' : '#f0fdf4';
  const statusBorder  = isExpired ? '#fca5a5' : '#bbf7d0';
  const statusLabel   = isExpired ? '✗ EXPIRED' : '✓ VALID';
  const statusSubtext = isExpired
    ? `Expired on ${fmt(record.expiryDate)}`
    : `Valid until ${fmt(record.expiryDate)}`;

  const orgInitial = esc(org?.name?.charAt(0) || 'O');
  const orgName    = esc(org?.name || 'Organization');
  const name       = esc(record.name);
  const idNum      = esc(record.idNumber);
  const dept       = esc(record.department);
  const desig      = esc(record.designation);
  const email      = esc(record.email);
  const phone      = esc(record.phone);
  const photoUrl   = record.photoUrl ? esc(record.photoUrl) : '';

  const field = (label, value) => value
    ? `<div class="field">
        <div class="field-label">${label}</div>
        <div class="field-value">${value}</div>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ID Verification — ${name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;background:linear-gradient(135deg,#1e2a4a 0%,#2d4a7a 60%,#1e3a8a 100%);
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
         display:flex;flex-direction:column;align-items:center;padding:24px 16px 48px}

    /* ── Card ── */
    .card{background:#fff;border-radius:20px;width:100%;max-width:440px;
          box-shadow:0 24px 64px rgba(0,0,0,.28);overflow:hidden}

    /* ── Header ── */
    .hdr{background:linear-gradient(135deg,#1e2a4a 0%,#2d4a7a 100%);
         padding:24px 24px 20px;display:flex;align-items:center;gap:14px}
    .org-logo{width:44px;height:44px;border-radius:10px;background:rgba(255,255,255,.18);
              border:1px solid rgba(255,255,255,.3);display:flex;align-items:center;
              justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden}
    .org-logo img{width:100%;height:100%;object-fit:contain}
    .hdr-text{}
    .hdr-org{font-size:15px;font-weight:700;color:#fff;line-height:1.2}
    .hdr-sub{font-size:11px;color:rgba(255,255,255,.6);margin-top:2px;letter-spacing:.5px;text-transform:uppercase}

    /* ── Status banner ── */
    .status-banner{background:${statusBg};border-bottom:2px solid ${statusBorder};
                   padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
    .status-badge{font-size:15px;font-weight:800;color:${statusColor};letter-spacing:1px}
    .status-sub{font-size:12px;color:${isExpired ? '#991b1b' : '#15803d'};margin-top:2px}
    .status-icon{font-size:32px}

    /* ── Profile section ── */
    .profile{padding:24px;display:flex;gap:18px;align-items:flex-start;border-bottom:1px solid #f3f4f6}
    .photo{width:80px;height:80px;border-radius:12px;object-fit:cover;border:3px solid #e5e7eb;flex-shrink:0;background:#f3f4f6}
    .photo-placeholder{width:80px;height:80px;border-radius:12px;background:linear-gradient(135deg,#1e2a4a,#2d4a7a);
                       display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;
                       color:#fff;flex-shrink:0}
    .profile-info{flex:1;min-width:0}
    .person-name{font-size:22px;font-weight:800;color:#111827;line-height:1.2;word-break:break-word}
    .person-desig{font-size:13px;color:#6b7280;margin-top:4px}
    .id-chip{display:inline-flex;align-items:center;gap:6px;background:#1e2a4a;color:#fff;
             font-size:12px;font-weight:700;letter-spacing:1px;padding:4px 12px;border-radius:20px;
             margin-top:10px;font-family:monospace}

    /* ── Fields ── */
    .fields{padding:20px 24px;display:flex;flex-direction:column;gap:0}
    .field{display:flex;align-items:flex-start;gap:0;padding:10px 0;border-bottom:1px solid #f9fafb}
    .field:last-child{border-bottom:none}
    .field-label{width:110px;font-size:11.5px;font-weight:600;color:#9ca3af;text-transform:uppercase;
                 letter-spacing:.5px;flex-shrink:0;padding-top:1px}
    .field-value{font-size:14px;color:#111827;font-weight:500;flex:1;word-break:break-word}

    /* ── Dates row ── */
    .dates{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#f3f4f6;border-top:1px solid #f3f4f6}
    .date-cell{background:#fff;padding:14px 20px}
    .date-label{font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px}
    .date-val{font-size:14px;color:#111827;font-weight:600;margin-top:3px}

    /* ── Footer ── */
    .footer{padding:14px 24px;background:#f8fafc;display:flex;align-items:center;
            justify-content:center;gap:8px;border-top:1px solid #e5e7eb}
    .footer-text{font-size:12px;color:#9ca3af}
    .footer-brand{font-size:12px;font-weight:700;color:#1e2a4a}

    /* ── Top bar ── */
    .topbar{width:100%;max-width:440px;margin-bottom:20px;display:flex;align-items:center;justify-content:center}
    .topbar-text{font-size:13px;color:rgba(255,255,255,.7);letter-spacing:.3px}

    @media(max-width:480px){
      body{padding:16px 12px 40px}
      .person-name{font-size:20px}
    }
  </style>
</head>
<body>
  <div class="topbar"><span class="topbar-text">🔒 Identity Verification Portal</span></div>

  <div class="card">
    <!-- Header -->
    <div class="hdr">
      <div class="org-logo">
        ${org?.logo ? `<img src="${esc(org.logo)}" alt="logo"/>` : orgInitial}
      </div>
      <div class="hdr-text">
        <div class="hdr-org">${orgName}</div>
        <div class="hdr-sub">Official ID Verification</div>
      </div>
    </div>

    <!-- Status -->
    <div class="status-banner">
      <div>
        <div class="status-badge">${statusLabel}</div>
        <div class="status-sub">${statusSubtext}</div>
      </div>
      <div class="status-icon">${isExpired ? '🔴' : '🟢'}</div>
    </div>

    <!-- Profile -->
    <div class="profile">
      ${photoUrl
        ? `<img src="${photoUrl}" class="photo" alt="Photo" onerror="this.style.display='none'">`
        : `<div class="photo-placeholder">${name.charAt(0).toUpperCase()}</div>`}
      <div class="profile-info">
        <div class="person-name">${name}</div>
        ${desig ? `<div class="person-desig">${desig}</div>` : ''}
        ${idNum  ? `<div class="id-chip">🪪 ${idNum}</div>` : ''}
      </div>
    </div>

    <!-- Fields -->
    <div class="fields">
      ${field('Department', dept)}
      ${field('Email',      email)}
      ${field('Phone',      phone)}
    </div>

    <!-- Dates -->
    <div class="dates">
      <div class="date-cell">
        <div class="date-label">Issue Date</div>
        <div class="date-val">${fmt(record.issueDate)}</div>
      </div>
      <div class="date-cell">
        <div class="date-label">Expiry Date</div>
        <div class="date-val" style="color:${isExpired ? '#dc2626' : '#111827'}">${fmt(record.expiryDate)}</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <span class="footer-text">Verified by</span>
      <span class="footer-brand">IDFlow</span>
      <span class="footer-text">· ${new Date().toLocaleDateString('en-IN')}</span>
    </div>
  </div>
</body>
</html>`;
}

module.exports = router;
