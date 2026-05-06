const puppeteer = require('puppeteer');
const QRCode    = require('qrcode');
const https     = require('https');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');

// ── Image → base64 data URI ───────────────────────────────────────────────────
async function toDataUri(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.includes('/uploads/photos/')) {
    const filename = url.split('/uploads/photos/')[1];
    const filepath = path.join(__dirname, '../../uploads/photos', filename);
    if (fs.existsSync(filepath)) {
      const buf  = fs.readFileSync(filepath);
      const ext  = path.extname(filename).slice(1) || 'jpeg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
  }
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf  = Buffer.concat(chunks);
        const mime = res.headers['content-type'] || 'image/jpeg';
        resolve(`data:${mime};base64,${buf.toString('base64')}`);
      });
    }).on('error', () => resolve(''));
  });
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Main entry ────────────────────────────────────────────────────────────────
async function generateIDCard({ record, template, org }) {
  const html = await buildCardHTML({ record, template, org });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    width: `${template.width || 856}px`,
    height: `${template.height || 540}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser.close();
  return pdf;
}

async function buildCardHTML({ record, template, org }) {
  const verifyUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/verify/${record._id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });

  if (template.layout === 'classic') {
    const [orgLogo, photoDataUri] = await Promise.all([
      toDataUri(org?.logo || ''),
      toDataUri(record.photoUrl || ''),
    ]);
    const ctx = {
      W: template.width  || 856,
      H: template.height || 540,
      orgName: esc(org?.name || 'Organization'),
      orgLogo,
      photo: photoDataUri,
      name:    esc(record.name || ''),
      id:      esc(record.idNumber || ''),
      dept:    esc(record.department || ''),
      desig:   esc(record.designation || ''),
      email:   esc(record.email || ''),
      phone:   esc(record.phone || ''),
      year:    new Date().getFullYear(),
      qr:      qrDataUrl,
    };
    const style = template.cardStyle || 'classic-blue';
    const builders = {
      'classic-blue':      styleClassicBlue,
      'modern-dark':       styleModernDark,
      'minimal-white':     styleMinimalWhite,
      'corporate-green':   styleCorporateGreen,
      'sunset-orange':     styleSunsetOrange,
      'royal-purple':      styleRoyalPurple,
      'split-panel':       styleSplitPanel,
      'tech-card':         styleTechCard,
      // Portrait styles
      'portrait-classic':  stylePortraitClassic,
      'portrait-dark':     stylePortraitDark,
      'portrait-elegant':  stylePortraitElegant,
      'portrait-minimal':  stylePortraitMinimal,
    };
    const fn = builders[style] || styleClassicBlue;
    return fn(ctx);
  }

  // Element-based custom template
  return buildElementsHTML({ record, template, org, qrDataUrl });
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLE 1 — Classic Blue (navy header, white body)
// ═════════════════════════════════════════════════════════════════════════════
function styleClassicBlue(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${c.W}px;height:${c.H}px;background:#dde3ed;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}
.card{width:${c.W-32}px;height:${c.H-32}px;background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.18)}
.hdr{background:linear-gradient(135deg,#1e2a4a 0%,#2d4a7a 100%);height:88px;display:flex;align-items:center;padding:0 24px;gap:16px;flex-shrink:0}
.logo-wrap{width:56px;height:56px;border-radius:10px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
.logo-wrap img{width:100%;height:100%;object-fit:contain}
.logo-init{font-size:24px;font-weight:800;color:#fff}
.org-name{flex:1;font-size:20px;font-weight:700;color:#fff}
.org-sub{font-size:12px;color:rgba(255,255,255,.6);margin-top:3px}
.badge{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:20px}
.body{flex:1;display:flex;padding:20px 24px;gap:20px;overflow:hidden}
.photo-frame{width:130px;height:162px;border-radius:10px;border:3px solid #e5e7eb;overflow:hidden;background:#f3f4f6;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.photo-frame img{width:100%;height:100%;object-fit:cover}
.no-photo{font-size:12px;color:#9ca3af;text-align:center}
.info{flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0}
.person-name{font-size:26px;font-weight:800;color:#1e2a4a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.b-dept{background:#edf2ff;color:#3b5bdb;font-size:12px;font-weight:600;padding:3px 12px;border-radius:12px}
.b-desig{background:#ecfdf5;color:#059669;font-size:12px;font-weight:600;padding:3px 12px;border-radius:12px}
.div{height:1px;background:#f0f0f0;margin:14px 0}
.id-pill{display:inline-flex;align-items:center;gap:8px;background:#1e2a4a;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;padding:5px 14px;border-radius:8px}
.contacts{margin-top:12px;display:flex;flex-direction:column;gap:7px}
.crow{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#6b7280}
.cico{width:20px;height:20px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
.qr-col{flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.qr-box{width:112px;height:112px;border:2px solid #e5e7eb;border-radius:10px;padding:6px;background:#fff;display:flex;align-items:center;justify-content:center}
.qr-box img{width:100%;height:100%}
.scan{font-size:9px;font-weight:700;letter-spacing:2px;color:#9ca3af;text-transform:uppercase}
.ftr{background:linear-gradient(90deg,#1e2a4a,#2d4a7a);height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;flex-shrink:0}
.ftr span{font-size:11px;color:rgba(255,255,255,.6);letter-spacing:.5px}
.dots{display:flex;gap:4px}
.dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.3)}
.dot.on{background:#748ffc}
</style></head><body><div class="card">
<div class="hdr">
  <div class="logo-wrap">${c.orgLogo?`<img src="${c.orgLogo}"/>`:`<span class="logo-init">${c.orgName.charAt(0)}</span>`}</div>
  <div><div class="org-name">${c.orgName}</div><div class="org-sub">Official ID Card</div></div>
  <div class="badge">Identity Card</div>
</div>
<div class="body">
  <div class="photo-frame">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-photo">No<br>Photo</div>`}</div>
  <div class="info">
    <div class="person-name">${c.name}</div>
    <div class="badges">${c.dept?`<span class="b-dept">${c.dept}</span>`:''} ${c.desig?`<span class="b-desig">${c.desig}</span>`:''}</div>
    <div class="div"></div>
    ${c.id?`<div class="id-pill">&#128203; ${c.id}</div>`:''}
    <div class="contacts">
      ${c.email?`<div class="crow"><div class="cico">✉</div><span>${c.email}</span></div>`:''}
      ${c.phone?`<div class="crow"><div class="cico">☎</div><span>${c.phone}</span></div>`:''}
    </div>
  </div>
  <div class="qr-col"><div class="qr-box"><img src="${c.qr}"/></div><div class="scan">Scan to verify</div></div>
</div>
<div class="ftr"><span>Valid: ${c.year}</span><div class="dots"><div class="dot on"></div><div class="dot"></div><div class="dot"></div></div><span>${c.orgName}</span></div>
</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLE 2 — Modern Dark (full dark card, neon accents)
// ═════════════════════════════════════════════════════════════════════════════
function styleModernDark(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${c.W}px;height:${c.H}px;background:#0a0a0f;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}
.card{width:${c.W-28}px;height:${c.H-28}px;background:#13131f;border-radius:18px;overflow:hidden;display:flex;border:1px solid #2a2a3e;box-shadow:0 0 40px rgba(116,143,252,.15)}
.left{width:220px;background:linear-gradient(160deg,#1a1a2e 0%,#16213e 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;border-right:1px solid #2a2a3e;flex-shrink:0}
.photo-ring{width:136px;height:136px;border-radius:50%;background:linear-gradient(135deg,#748ffc,#5c7cfa);padding:3px;flex-shrink:0}
.photo-inner{width:100%;height:100%;border-radius:50%;overflow:hidden;background:#1e2a4a;display:flex;align-items:center;justify-content:center}
.photo-inner img{width:100%;height:100%;object-fit:cover}
.no-photo-txt{font-size:11px;color:#4a5568;text-align:center}
.org-badge{background:rgba(116,143,252,.15);border:1px solid rgba(116,143,252,.3);color:#748ffc;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:5px 12px;border-radius:20px;text-align:center}
.right{flex:1;display:flex;flex-direction:column;padding:28px 28px 20px;justify-content:space-between;min-width:0}
.top-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.name-block{}
.person-name{font-size:28px;font-weight:800;color:#ffffff;line-height:1.1}
.dept-row{margin-top:8px;display:flex;gap:8px;flex-wrap:wrap}
.tag{background:#1e2a4a;color:#748ffc;font-size:11px;font-weight:600;padding:3px 10px;border-radius:6px;border:1px solid rgba(116,143,252,.2)}
.tag.green{background:#0d2b1f;color:#34d399;border-color:rgba(52,211,153,.2)}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0}
.qr-box{width:90px;height:90px;border:1px solid #2a2a3e;border-radius:8px;padding:4px;background:#0d0d1a;display:flex;align-items:center;justify-content:center}
.qr-box img{width:100%;height:100%}
.scan{font-size:8px;letter-spacing:1.5px;color:#4a5568;text-transform:uppercase}
.mid-line{height:1px;background:linear-gradient(90deg,transparent,#2a2a3e,transparent)}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px}
.detail-item{}
.det-label{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#4a5568;margin-bottom:3px}
.det-val{font-size:13px;color:#e2e8f0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.det-val.accent{color:#748ffc;font-size:15px;letter-spacing:1px}
.ftr{display:flex;align-items:center;justify-content:space-between}
.ftr-left{font-size:11px;color:#4a5568}
.neon-line{height:2px;background:linear-gradient(90deg,#748ffc,#5c7cfa,transparent);border-radius:1px;width:120px}
</style></head><body><div class="card">
<div class="left">
  <div class="photo-ring"><div class="photo-inner">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-photo-txt">No<br>Photo</div>`}</div></div>
  <div class="org-badge">${c.orgName}</div>
</div>
<div class="right">
  <div class="top-row">
    <div class="name-block">
      <div class="person-name">${c.name}</div>
      <div class="dept-row">
        ${c.dept?`<span class="tag">${c.dept}</span>`:''}
        ${c.desig?`<span class="tag green">${c.desig}</span>`:''}
      </div>
    </div>
    <div class="qr-wrap"><div class="qr-box"><img src="${c.qr}"/></div><div class="scan">Verify</div></div>
  </div>
  <div class="mid-line"></div>
  <div class="detail-grid">
    ${c.id?`<div class="detail-item"><div class="det-label">ID Number</div><div class="det-val accent">${c.id}</div></div>`:''}
    ${c.dept?`<div class="detail-item"><div class="det-label">Department</div><div class="det-val">${c.dept}</div></div>`:''}
    ${c.email?`<div class="detail-item"><div class="det-label">Email</div><div class="det-val">${c.email}</div></div>`:''}
    ${c.phone?`<div class="detail-item"><div class="det-label">Phone</div><div class="det-val">${c.phone}</div></div>`:''}
  </div>
  <div class="ftr">
    <span class="ftr-left">Valid: ${c.year}</span>
    <div class="neon-line"></div>
  </div>
</div>
</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLE 3 — Minimal White (clean, left accent stripe)
// ═════════════════════════════════════════════════════════════════════════════
function styleMinimalWhite(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${c.W}px;height:${c.H}px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}
.card{width:${c.W-32}px;height:${c.H-32}px;background:#fff;border-radius:12px;overflow:hidden;display:flex;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.stripe{width:6px;background:linear-gradient(to bottom,#3b5bdb,#748ffc);flex-shrink:0}
.content{flex:1;display:flex;flex-direction:column;padding:28px 28px 20px}
.top{display:flex;align-items:flex-start;gap:24px;flex:1}
.photo-frame{width:120px;height:150px;border-radius:8px;overflow:hidden;background:#f8f9fa;border:1px solid #e9ecef;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.photo-frame img{width:100%;height:100%;object-fit:cover}
.no-ph{font-size:11px;color:#adb5bd;text-align:center}
.main{flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:4px 0;min-width:0}
.org-line{font-size:11px;color:#868e96;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;margin-bottom:12px}
.person-name{font-size:28px;font-weight:700;color:#212529;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.role-line{margin-top:6px;font-size:13px;color:#495057}
.id-box{display:inline-flex;align-items:center;gap:6px;border:1.5px solid #dee2e6;border-radius:6px;padding:4px 12px;margin-top:10px;width:fit-content}
.id-label{font-size:10px;color:#adb5bd;text-transform:uppercase;letter-spacing:1px}
.id-val{font-size:14px;font-weight:700;color:#3b5bdb}
.contacts{margin-top:8px;display:flex;flex-direction:column;gap:4px}
.crow{font-size:12px;color:#6c757d}
.qr-side{display:flex;flex-direction:column;align-items:center;gap:8px;justify-content:center;flex-shrink:0}
.qr-box{width:100px;height:100px;border:1px solid #dee2e6;border-radius:8px;padding:4px;display:flex;align-items:center;justify-content:center}
.qr-box img{width:100%;height:100%}
.scan{font-size:9px;color:#adb5bd;letter-spacing:1px;text-transform:uppercase}
.bottom{display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid #f1f3f5;margin-top:16px}
.valid{font-size:11px;color:#adb5bd}
.logo-area{display:flex;align-items:center;gap:8px}
.logo-circle{width:28px;height:28px;border-radius:50%;background:#edf2ff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#3b5bdb}
.org-name-sm{font-size:12px;font-weight:600;color:#495057}
</style></head><body><div class="card">
<div class="stripe"></div>
<div class="content">
  <div class="top">
    <div class="photo-frame">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-ph">No<br>Photo</div>`}</div>
    <div class="main">
      <div>
        <div class="org-line">${c.orgName}</div>
        <div class="person-name">${c.name}</div>
        <div class="role-line">${[c.desig,c.dept].filter(Boolean).join(' &nbsp;·&nbsp; ')}</div>
        ${c.id?`<div class="id-box"><span class="id-label">ID</span><span class="id-val">${c.id}</span></div>`:''}
        <div class="contacts">
          ${c.email?`<div class="crow">✉ ${c.email}</div>`:''}
          ${c.phone?`<div class="crow">☎ ${c.phone}</div>`:''}
        </div>
      </div>
    </div>
    <div class="qr-side"><div class="qr-box"><img src="${c.qr}"/></div><div class="scan">Scan to verify</div></div>
  </div>
  <div class="bottom">
    <span class="valid">Valid through ${c.year}</span>
    <div class="logo-area"><div class="logo-circle">${c.orgName.charAt(0)}</div><span class="org-name-sm">${c.orgName}</span></div>
  </div>
</div>
</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLE 4 — Corporate Green
// ═════════════════════════════════════════════════════════════════════════════
function styleCorporateGreen(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${c.W}px;height:${c.H}px;background:#e8f5e9;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}
.card{width:${c.W-32}px;height:${c.H-32}px;background:#fff;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 6px 28px rgba(0,100,0,.12)}
.hdr{background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 60%,#388e3c 100%);height:90px;display:flex;align-items:center;padding:0 28px;gap:16px;flex-shrink:0}
.logo-sq{width:54px;height:54px;border-radius:8px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;overflow:hidden;flex-shrink:0}
.logo-sq img{width:100%;height:100%;object-fit:contain}
.hdr-text{flex:1}
.hdr-org{font-size:20px;font-weight:700;color:#fff}
.hdr-sub{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;letter-spacing:.5px}
.id-tag{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:6px 16px;border-radius:20px}
.body{flex:1;display:flex;padding:22px 28px;gap:22px}
.photo-wrap{flex-shrink:0}
.photo-frame{width:128px;height:160px;border-radius:8px;overflow:hidden;background:#f1f8e9;border:2px solid #a5d6a7;display:flex;align-items:center;justify-content:center}
.photo-frame img{width:100%;height:100%;object-fit:cover}
.no-ph{font-size:11px;color:#81c784;text-align:center}
.info{flex:1;display:flex;flex-direction:column;justify-content:center;gap:0;min-width:0}
.name{font-size:26px;font-weight:800;color:#1b5e20;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sub-line{font-size:13px;color:#4caf50;margin-top:4px;font-weight:600}
.green-div{height:2px;background:linear-gradient(90deg,#4caf50,transparent);margin:14px 0;border-radius:1px}
.info-rows{display:flex;flex-direction:column;gap:8px}
.info-row{display:flex;align-items:center;gap:10px}
.info-icon{width:22px;height:22px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.info-text{font-size:12.5px;color:#37474f;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.id-green{display:inline-flex;align-items:center;gap:8px;background:#1b5e20;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;padding:5px 14px;border-radius:8px;margin-bottom:10px;width:fit-content}
.qr-col{flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.qr-box{width:108px;height:108px;border:2px solid #a5d6a7;border-radius:10px;padding:5px;background:#fff;display:flex;align-items:center;justify-content:center}
.qr-box img{width:100%;height:100%}
.scan{font-size:9px;font-weight:700;letter-spacing:1.5px;color:#81c784;text-transform:uppercase}
.ftr{background:#f1f8e9;border-top:1px solid #c8e6c9;height:38px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
.ftr-text{font-size:11px;color:#81c784;letter-spacing:.5px}
</style></head><body><div class="card">
<div class="hdr">
  <div class="logo-sq">${c.orgLogo?`<img src="${c.orgLogo}"/>`:`${c.orgName.charAt(0)}`}</div>
  <div class="hdr-text"><div class="hdr-org">${c.orgName}</div><div class="hdr-sub">Official Identity Card</div></div>
  <div class="id-tag">ID Card</div>
</div>
<div class="body">
  <div class="photo-wrap"><div class="photo-frame">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-ph">No<br>Photo</div>`}</div></div>
  <div class="info">
    <div class="name">${c.name}</div>
    <div class="sub-line">${[c.desig,c.dept].filter(Boolean).join(' · ')}</div>
    <div class="green-div"></div>
    ${c.id?`<div class="id-green">&#128203; ${c.id}</div>`:''}
    <div class="info-rows">
      ${c.email?`<div class="info-row"><div class="info-icon">✉</div><span class="info-text">${c.email}</span></div>`:''}
      ${c.phone?`<div class="info-row"><div class="info-icon">☎</div><span class="info-text">${c.phone}</span></div>`:''}
    </div>
  </div>
  <div class="qr-col"><div class="qr-box"><img src="${c.qr}"/></div><div class="scan">Scan to verify</div></div>
</div>
<div class="ftr"><span class="ftr-text">Valid: ${c.year}</span><span class="ftr-text">${c.orgName}</span></div>
</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLE 5 — Sunset Orange (warm gradient, modern)
// ═════════════════════════════════════════════════════════════════════════════
function styleSunsetOrange(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${c.W}px;height:${c.H}px;background:#fff3e0;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}
.card{width:${c.W-32}px;height:${c.H-32}px;background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(230,80,0,.15)}
.hdr{background:linear-gradient(135deg,#e65100 0%,#f57c00 50%,#ff9800 100%);height:90px;display:flex;align-items:center;padding:0 24px;gap:16px;flex-shrink:0;position:relative;overflow:hidden}
.hdr::after{content:'';position:absolute;right:-30px;top:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.08)}
.hdr::before{content:'';position:absolute;right:60px;bottom:-40px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.06)}
.logo-c{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;overflow:hidden;flex-shrink:0;z-index:1}
.logo-c img{width:100%;height:100%;object-fit:contain;border-radius:50%}
.hdr-info{flex:1;z-index:1}
.hdr-org{font-size:20px;font-weight:700;color:#fff}
.hdr-sub{font-size:11px;color:rgba(255,255,255,.8);margin-top:2px}
.badge{background:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.4);color:#fff;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;z-index:1}
.body{flex:1;display:flex;padding:22px 24px;gap:20px}
.photo-frame{width:128px;height:160px;border-radius:12px;overflow:hidden;background:#fff8f0;border:2px solid #ffcc80;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.photo-frame img{width:100%;height:100%;object-fit:cover}
.no-ph{font-size:11px;color:#ffb74d;text-align:center}
.info{flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0}
.name{font-size:26px;font-weight:800;color:#e65100;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.role-row{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.r-tag{background:#fff3e0;color:#f57c00;font-size:12px;font-weight:600;padding:3px 12px;border-radius:12px;border:1px solid #ffcc80}
.orange-line{height:2px;background:linear-gradient(90deg,#ff9800,transparent);margin:14px 0;border-radius:1px}
.id-orange{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(90deg,#e65100,#f57c00);color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;padding:5px 14px;border-radius:8px;margin-bottom:10px;width:fit-content}
.clist{display:flex;flex-direction:column;gap:6px}
.crow{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#78909c}
.cico{width:20px;height:20px;border-radius:50%;background:#fff3e0;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
.qr-col{flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.qr-box{width:108px;height:108px;border:2px solid #ffcc80;border-radius:10px;padding:5px;background:#fff;display:flex;align-items:center;justify-content:center}
.qr-box img{width:100%;height:100%}
.scan{font-size:9px;font-weight:700;letter-spacing:1.5px;color:#ffb74d;text-transform:uppercase}
.ftr{background:linear-gradient(90deg,#e65100,#f57c00);height:38px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;flex-shrink:0}
.ftr span{font-size:11px;color:rgba(255,255,255,.8)}
</style></head><body><div class="card">
<div class="hdr">
  <div class="logo-c">${c.orgLogo?`<img src="${c.orgLogo}"/>`:`${c.orgName.charAt(0)}`}</div>
  <div class="hdr-info"><div class="hdr-org">${c.orgName}</div><div class="hdr-sub">Official ID Card</div></div>
  <div class="badge">Identity Card</div>
</div>
<div class="body">
  <div class="photo-frame">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-ph">No<br>Photo</div>`}</div>
  <div class="info">
    <div class="name">${c.name}</div>
    <div class="role-row">
      ${c.dept?`<span class="r-tag">${c.dept}</span>`:''}
      ${c.desig?`<span class="r-tag">${c.desig}</span>`:''}
    </div>
    <div class="orange-line"></div>
    ${c.id?`<div class="id-orange">&#128203; ${c.id}</div>`:''}
    <div class="clist">
      ${c.email?`<div class="crow"><div class="cico">✉</div><span>${c.email}</span></div>`:''}
      ${c.phone?`<div class="crow"><div class="cico">☎</div><span>${c.phone}</span></div>`:''}
    </div>
  </div>
  <div class="qr-col"><div class="qr-box"><img src="${c.qr}"/></div><div class="scan">Scan to verify</div></div>
</div>
<div class="ftr"><span>Valid: ${c.year}</span><span>${c.orgName}</span></div>
</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLE 6 — Royal Purple
// ═════════════════════════════════════════════════════════════════════════════
function styleRoyalPurple(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${c.W}px;height:${c.H}px;background:#ede7f6;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}
.card{width:${c.W-32}px;height:${c.H-32}px;background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(94,0,200,.12)}
.hdr{background:linear-gradient(135deg,#4a148c 0%,#6a1b9a 50%,#7b1fa2 100%);height:90px;display:flex;align-items:center;padding:0 24px;gap:16px;flex-shrink:0}
.logo-d{width:56px;height:56px;border-radius:12px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;overflow:hidden;flex-shrink:0}
.logo-d img{width:100%;height:100%;object-fit:contain}
.hdr-info{flex:1}
.hdr-org{font-size:20px;font-weight:700;color:#fff}
.hdr-sub{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px}
.badge{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:20px}
.body{flex:1;display:flex;padding:22px 24px;gap:22px}
.photo-frame{width:130px;height:162px;border-radius:12px;overflow:hidden;background:#f3e5f5;border:2px solid #ce93d8;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.photo-frame img{width:100%;height:100%;object-fit:cover}
.no-ph{font-size:11px;color:#ba68c8;text-align:center}
.info{flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0}
.name{font-size:26px;font-weight:800;color:#4a148c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.role-row{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.r-tag{background:#f3e5f5;color:#7b1fa2;font-size:12px;font-weight:600;padding:3px 12px;border-radius:12px}
.r-tag.alt{background:#fce4ec;color:#c2185b}
.purple-line{height:2px;background:linear-gradient(90deg,#7b1fa2,transparent);margin:14px 0;border-radius:1px}
.id-purple{display:inline-flex;align-items:center;gap:8px;background:#4a148c;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;padding:5px 14px;border-radius:8px;margin-bottom:10px;width:fit-content}
.clist{display:flex;flex-direction:column;gap:6px}
.crow{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#78909c}
.cico{width:20px;height:20px;border-radius:50%;background:#f3e5f5;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
.qr-col{flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.qr-box{width:108px;height:108px;border:2px solid #ce93d8;border-radius:10px;padding:5px;background:#fff;display:flex;align-items:center;justify-content:center}
.qr-box img{width:100%;height:100%}
.scan{font-size:9px;font-weight:700;letter-spacing:1.5px;color:#ba68c8;text-transform:uppercase}
.ftr{background:linear-gradient(90deg,#4a148c,#7b1fa2);height:38px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;flex-shrink:0}
.ftr span{font-size:11px;color:rgba(255,255,255,.7)}
</style></head><body><div class="card">
<div class="hdr">
  <div class="logo-d">${c.orgLogo?`<img src="${c.orgLogo}"/>`:`${c.orgName.charAt(0)}`}</div>
  <div class="hdr-info"><div class="hdr-org">${c.orgName}</div><div class="hdr-sub">Official ID Card</div></div>
  <div class="badge">Identity Card</div>
</div>
<div class="body">
  <div class="photo-frame">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-ph">No<br>Photo</div>`}</div>
  <div class="info">
    <div class="name">${c.name}</div>
    <div class="role-row">
      ${c.dept?`<span class="r-tag">${c.dept}</span>`:''}
      ${c.desig?`<span class="r-tag alt">${c.desig}</span>`:''}
    </div>
    <div class="purple-line"></div>
    ${c.id?`<div class="id-purple">&#128203; ${c.id}</div>`:''}
    <div class="clist">
      ${c.email?`<div class="crow"><div class="cico">✉</div><span>${c.email}</span></div>`:''}
      ${c.phone?`<div class="crow"><div class="cico">☎</div><span>${c.phone}</span></div>`:''}
    </div>
  </div>
  <div class="qr-col"><div class="qr-box"><img src="${c.qr}"/></div><div class="scan">Scan to verify</div></div>
</div>
<div class="ftr"><span>Valid: ${c.year}</span><span>${c.orgName}</span></div>
</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLE 7 — Split Panel (dark left / light right)
// ═════════════════════════════════════════════════════════════════════════════
function styleSplitPanel(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${c.W}px;height:${c.H}px;background:#cfd8dc;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}
.card{width:${c.W-28}px;height:${c.H-28}px;background:#fff;border-radius:16px;overflow:hidden;display:flex;box-shadow:0 8px 32px rgba(0,0,0,.15)}
.panel-left{width:260px;background:linear-gradient(160deg,#263238 0%,#37474f 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 20px;gap:16px;flex-shrink:0}
.photo-hex{width:140px;height:140px;border-radius:16px;overflow:hidden;background:#37474f;border:3px solid #546e7a;display:flex;align-items:center;justify-content:center}
.photo-hex img{width:100%;height:100%;object-fit:cover}
.no-ph{font-size:11px;color:#78909c;text-align:center}
.left-name{font-size:18px;font-weight:700;color:#fff;text-align:center;line-height:1.2}
.left-role{font-size:12px;color:#90a4ae;text-align:center;margin-top:4px}
.left-id{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#cfd8dc;font-size:12px;font-weight:600;padding:4px 14px;border-radius:20px;letter-spacing:1px;text-align:center}
.panel-right{flex:1;display:flex;flex-direction:column;padding:0;overflow:hidden}
.right-top{background:#eceff1;padding:20px 24px 16px;border-bottom:1px solid #e0e0e0}
.org-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.org-logo-sm{width:32px;height:32px;border-radius:6px;background:#546e7a;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;overflow:hidden;flex-shrink:0}
.org-logo-sm img{width:100%;height:100%;object-fit:contain}
.org-name-r{font-size:15px;font-weight:700;color:#37474f}
.badge-row{display:flex;gap:6px;flex-wrap:wrap}
.tag-blue{background:#e3f2fd;color:#1565c0;font-size:11px;font-weight:600;padding:2px 10px;border-radius:10px}
.tag-teal{background:#e0f2f1;color:#00695c;font-size:11px;font-weight:600;padding:2px 10px;border-radius:10px}
.right-body{flex:1;padding:20px 24px;display:flex;flex-direction:column;justify-content:center;gap:12px}
.field-row{display:flex;align-items:flex-start;gap:12px}
.field-label{width:80px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#90a4ae;padding-top:2px;flex-shrink:0}
.field-val{font-size:13px;color:#37474f;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.right-bottom{background:#eceff1;border-top:1px solid #e0e0e0;padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
.qr-mini{width:64px;height:64px;border:1px solid #b0bec5;border-radius:6px;padding:3px;display:flex;align-items:center;justify-content:center;background:#fff}
.qr-mini img{width:100%;height:100%}
.valid-txt{font-size:11px;color:#90a4ae}
</style></head><body><div class="card">
<div class="panel-left">
  <div class="photo-hex">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-ph">No<br>Photo</div>`}</div>
  <div>
    <div class="left-name">${c.name}</div>
    <div class="left-role">${[c.desig,c.dept].filter(Boolean).join(' · ')}</div>
  </div>
  ${c.id?`<div class="left-id">${c.id}</div>`:''}
</div>
<div class="panel-right">
  <div class="right-top">
    <div class="org-row">
      <div class="org-logo-sm">${c.orgLogo?`<img src="${c.orgLogo}"/>`:`${c.orgName.charAt(0)}`}</div>
      <span class="org-name-r">${c.orgName}</span>
    </div>
    <div class="badge-row">
      ${c.dept?`<span class="tag-blue">${c.dept}</span>`:''}
      ${c.desig?`<span class="tag-teal">${c.desig}</span>`:''}
    </div>
  </div>
  <div class="right-body">
    ${c.id?`<div class="field-row"><span class="field-label">ID Number</span><span class="field-val">${c.id}</span></div>`:''}
    ${c.email?`<div class="field-row"><span class="field-label">Email</span><span class="field-val">${c.email}</span></div>`:''}
    ${c.phone?`<div class="field-row"><span class="field-label">Phone</span><span class="field-val">${c.phone}</span></div>`:''}
    ${c.dept?`<div class="field-row"><span class="field-label">Department</span><span class="field-val">${c.dept}</span></div>`:''}
  </div>
  <div class="right-bottom">
    <span class="valid-txt">Valid through ${c.year} &nbsp;·&nbsp; ${c.orgName}</span>
    <div class="qr-mini"><img src="${c.qr}"/></div>
  </div>
</div>
</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLE 8 — Tech Card (dark slate, cyan accents)
// ═════════════════════════════════════════════════════════════════════════════
function styleTechCard(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${c.W}px;height:${c.H}px;background:#0d1117;display:flex;align-items:center;justify-content:center;font-family:'Courier New',Courier,monospace}
.card{width:${c.W-28}px;height:${c.H-28}px;background:#161b22;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;border:1px solid #30363d;box-shadow:0 0 30px rgba(0,210,210,.08)}
.hdr{background:#0d1117;border-bottom:1px solid #30363d;height:56px;display:flex;align-items:center;padding:0 24px;gap:16px;flex-shrink:0}
.traffic{display:flex;gap:6px;align-items:center}
.dot-r{width:12px;height:12px;border-radius:50%;background:#ff5f56}
.dot-y{width:12px;height:12px;border-radius:50%;background:#ffbd2e}
.dot-g{width:12px;height:12px;border-radius:50%;background:#27c93f}
.hdr-title{flex:1;font-size:13px;color:#8b949e;letter-spacing:.5px}
.hdr-badge{background:rgba(0,210,210,.1);border:1px solid rgba(0,210,210,.3);color:#00d2d2;font-size:10px;font-weight:700;letter-spacing:2px;padding:4px 12px;border-radius:4px}
.body{flex:1;display:flex;padding:20px 24px;gap:20px}
.left-col{display:flex;flex-direction:column;align-items:center;gap:12px;flex-shrink:0}
.photo-sq{width:120px;height:150px;border-radius:6px;overflow:hidden;background:#0d1117;border:1px solid #30363d;display:flex;align-items:center;justify-content:center}
.photo-sq img{width:100%;height:100%;object-fit:cover}
.no-ph{font-size:11px;color:#484f58;text-align:center;font-family:monospace}
.mid-col{flex:1;display:flex;flex-direction:column;justify-content:center;gap:0;min-width:0}
.cmd-line{font-size:11px;color:#8b949e;margin-bottom:4px;letter-spacing:.5px}
.cmd-val{font-size:13px;color:#58a6ff;font-family:'Courier New',monospace;margin-bottom:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.person-name{font-size:26px;font-weight:700;color:#e6edf3;font-family:Arial,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cyan-line{height:1px;background:linear-gradient(90deg,#00d2d2,transparent);margin:14px 0}
.tag-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.tag{background:rgba(0,210,210,.1);border:1px solid rgba(0,210,210,.2);color:#00d2d2;font-size:11px;padding:2px 10px;border-radius:4px;font-family:monospace}
.tag.green{background:rgba(39,201,63,.1);border-color:rgba(39,201,63,.2);color:#27c93f}
.field-list{display:flex;flex-direction:column;gap:5px}
.fld{display:flex;gap:8px;align-items:baseline}
.fld-key{font-size:10px;color:#484f58;text-transform:uppercase;letter-spacing:1px;flex-shrink:0;width:54px}
.fld-val{font-size:12px;color:#8b949e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.right-col{flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.qr-box{width:108px;height:108px;border:1px solid #30363d;border-radius:6px;padding:4px;background:#0d1117;display:flex;align-items:center;justify-content:center}
.qr-box img{width:100%;height:100%}
.scan{font-size:9px;color:#484f58;letter-spacing:1.5px;text-transform:uppercase;font-family:monospace}
.ftr{background:#0d1117;border-top:1px solid #30363d;height:36px;display:flex;align-items:center;padding:0 24px;gap:8px;flex-shrink:0}
.ftr-text{font-size:11px;color:#484f58;font-family:monospace}
.ftr-cursor{display:inline-block;width:8px;height:13px;background:#00d2d2;animation:none;opacity:.8}
</style></head><body><div class="card">
<div class="hdr">
  <div class="traffic"><div class="dot-r"></div><div class="dot-y"></div><div class="dot-g"></div></div>
  <div class="hdr-title">${c.orgName} — identity.card</div>
  <div class="hdr-badge">VERIFIED</div>
</div>
<div class="body">
  <div class="left-col">
    <div class="photo-sq">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-ph">[no<br>photo]</div>`}</div>
  </div>
  <div class="mid-col">
    <div class="cmd-line">$ whoami</div>
    <div class="person-name">${c.name}</div>
    <div class="cyan-line"></div>
    <div class="tag-row">
      ${c.dept?`<span class="tag">${c.dept}</span>`:''}
      ${c.desig?`<span class="tag green">${c.desig}</span>`:''}
    </div>
    <div class="field-list">
      ${c.id?`<div class="fld"><span class="fld-key">id</span><span class="fld-val" style="color:#00d2d2;font-weight:700">${c.id}</span></div>`:''}
      ${c.email?`<div class="fld"><span class="fld-key">email</span><span class="fld-val">${c.email}</span></div>`:''}
      ${c.phone?`<div class="fld"><span class="fld-key">phone</span><span class="fld-val">${c.phone}</span></div>`:''}
    </div>
  </div>
  <div class="right-col"><div class="qr-box"><img src="${c.qr}"/></div><div class="scan">$ scan --verify</div></div>
</div>
<div class="ftr">
  <span class="ftr-text">valid_until=${c.year} &nbsp;|&nbsp; org=${c.orgName}</span>
  <div class="ftr-cursor"></div>
</div>
</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// BADGE 1 — Badge Blue  (punch hole · diagonal header · passport photo · field rows · signature)
// ═════════════════════════════════════════════════════════════════════════════
function stylePortraitClassic(c) {
  const W = c.W, H = c.H;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;background:#cfd8dc;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}
.wrap{width:${W-20}px;height:${H-20}px;display:flex;flex-direction:column;align-items:center}
/* Lanyard clip */
.clip{width:28px;height:18px;background:linear-gradient(90deg,#1565c0,#42a5f5);border-radius:4px 4px 0 0;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.hole{width:10px;height:10px;border-radius:50%;background:#fff;opacity:.7}
.card{width:100%;flex:1;background:#fff;border-radius:0 0 14px 14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 28px rgba(0,0,0,.18)}
/* Header with diagonal */
.hdr{height:110px;position:relative;overflow:hidden;flex-shrink:0;background:#1565c0}
.hdr-bg{position:absolute;inset:0;background:linear-gradient(135deg,#1565c0 55%,#42a5f5 100%)}
.hdr-wave{position:absolute;bottom:-1px;left:0;right:0;height:30px;background:#fff;border-radius:60% 60% 0 0}
.hdr-content{position:relative;z-index:1;padding:14px 16px 0;display:flex;align-items:flex-start;justify-content:space-between}
.logo-box{width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;overflow:hidden}
.logo-box img{width:100%;height:100%;object-fit:contain}
.logo-init{font-size:18px;font-weight:800;color:#fff}
.hdr-text{text-align:right}
.org-name{font-size:13px;font-weight:700;color:#fff;line-height:1.2}
.id-card-label{font-size:9px;color:rgba(255,255,255,.8);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px}
/* Photo */
.photo-wrap{display:flex;justify-content:center;margin-top:-14px;flex-shrink:0}
.photo-frame{width:90px;height:110px;border-radius:8px;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.15);overflow:hidden;background:#e3f2fd;display:flex;align-items:center;justify-content:center}
.photo-frame img{width:100%;height:100%;object-fit:cover}
.no-ph{font-size:10px;color:#90caf9;text-align:center}
/* Info */
.info{flex:1;padding:10px 16px 0;display:flex;flex-direction:column}
.person-name{font-size:16px;font-weight:800;color:#1565c0;text-align:center;line-height:1.2}
.designation{font-size:11px;color:#546e7a;text-align:center;margin-top:3px}
.divider{height:1px;background:linear-gradient(90deg,transparent,#bbdefb,transparent);margin:10px 0}
.field-list{display:flex;flex-direction:column;gap:5px}
.field-row{display:flex;align-items:flex-start;gap:6px}
.field-bullet{width:14px;height:14px;border-radius:50%;background:#e3f2fd;border:1.5px solid #90caf9;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.field-dot{width:4px;height:4px;border-radius:50%;background:#1565c0}
.field-content{flex:1}
.field-label{font-size:8.5px;color:#90a4ae;text-transform:uppercase;letter-spacing:.8px;line-height:1}
.field-value{font-size:11.5px;color:#37474f;font-weight:600;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.field-value.accent{color:#1565c0;font-weight:700}
/* Dates row */
.dates-row{display:flex;gap:10px;margin-top:8px}
.date-box{flex:1;background:#e3f2fd;border-radius:6px;padding:5px 8px}
.date-label{font-size:8px;color:#90a4ae;text-transform:uppercase;letter-spacing:.8px}
.date-val{font-size:11px;color:#1565c0;font-weight:700;margin-top:1px}
/* Signature */
.sig-area{margin-top:8px;display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:2px}
.sig-line-wrap{flex:1}
.sig-line{height:1px;background:#cfd8dc;margin-bottom:3px;width:80%}
.sig-label{font-size:8.5px;color:#90a4ae;letter-spacing:.5px}
.qr-mini{width:48px;height:48px;border:1px solid #e3f2fd;border-radius:5px;padding:2px;display:flex;align-items:center;justify-content:center}
.qr-mini img{width:100%;height:100%}
/* Footer */
.ftr{background:#1565c0;height:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ftr-text{font-size:10px;color:rgba(255,255,255,.85);letter-spacing:.5px}
</style></head><body>
<div class="wrap">
  <div class="clip"><div class="hole"></div></div>
  <div class="card">
    <div class="hdr">
      <div class="hdr-bg"></div>
      <div class="hdr-wave"></div>
      <div class="hdr-content">
        <div class="logo-box">${c.orgLogo?`<img src="${c.orgLogo}"/>`:`<span class="logo-init">${c.orgName.charAt(0)}</span>`}</div>
        <div class="hdr-text"><div class="org-name">${c.orgName}</div><div class="id-card-label">ID Card</div></div>
      </div>
    </div>
    <div class="photo-wrap">
      <div class="photo-frame">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-ph">No<br>Photo</div>`}</div>
    </div>
    <div class="info">
      <div class="person-name">${c.name}</div>
      <div class="designation">${c.desig || ''}</div>
      <div class="divider"></div>
      <div class="field-list">
        ${c.id?`<div class="field-row"><div class="field-bullet"><div class="field-dot"></div></div><div class="field-content"><div class="field-label">ID No.</div><div class="field-value accent">${c.id}</div></div></div>`:''}
        ${c.dept?`<div class="field-row"><div class="field-bullet"><div class="field-dot"></div></div><div class="field-content"><div class="field-label">Department</div><div class="field-value">${c.dept}</div></div></div>`:''}
        ${c.phone?`<div class="field-row"><div class="field-bullet"><div class="field-dot"></div></div><div class="field-content"><div class="field-label">Phone</div><div class="field-value">${c.phone}</div></div></div>`:''}
        ${c.email?`<div class="field-row"><div class="field-bullet"><div class="field-dot"></div></div><div class="field-content"><div class="field-label">Email</div><div class="field-value">${c.email}</div></div></div>`:''}
      </div>
      <div class="dates-row">
        <div class="date-box"><div class="date-label">Issue Date</div><div class="date-val">01/01/${c.year}</div></div>
        <div class="date-box"><div class="date-label">Expiry Date</div><div class="date-val">31/12/${c.year}</div></div>
      </div>
      <div class="sig-area">
        <div class="sig-line-wrap"><div class="sig-line"></div><div class="sig-label">Signature</div></div>
        <div class="qr-mini"><img src="${c.qr}"/></div>
      </div>
    </div>
    <div class="ftr"><span class="ftr-text">${c.orgName}</span></div>
  </div>
</div>
</body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// BADGE 2 — Badge Dark  (dark card, neon accent, circular photo, punch hole)
// ═════════════════════════════════════════════════════════════════════════════
function stylePortraitDark(c) {
  const W = c.W, H = c.H;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;background:#090910;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}
.wrap{width:${W-20}px;height:${H-20}px;display:flex;flex-direction:column;align-items:center}
.clip{width:28px;height:18px;background:linear-gradient(90deg,#748ffc,#5c7cfa);border-radius:4px 4px 0 0;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.hole{width:10px;height:10px;border-radius:50%;background:#0d0d1a;opacity:.7}
.card{width:100%;flex:1;background:#13131f;border-radius:0 0 14px 14px;overflow:hidden;display:flex;flex-direction:column;border:1px solid #2a2a3e;box-shadow:0 0 40px rgba(116,143,252,.15)}
.hdr{height:100px;position:relative;overflow:hidden;flex-shrink:0;background:#0d0d1a}
.hdr-glow{position:absolute;top:-30px;left:50%;transform:translateX(-50%);width:200px;height:100px;background:radial-gradient(circle,rgba(116,143,252,.3) 0%,transparent 70%)}
.hdr-content{position:relative;z-index:1;padding:16px;display:flex;flex-direction:column;align-items:center;gap:6px}
.org-name{font-size:14px;font-weight:700;color:#e6edf3;letter-spacing:.3px}
.id-badge{background:rgba(116,143,252,.15);border:1px solid rgba(116,143,252,.3);color:#748ffc;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:3px 12px;border-radius:10px}
.photo-wrap{display:flex;justify-content:center;margin-top:4px;flex-shrink:0}
.photo-ring{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#748ffc,#5c7cfa);padding:2.5px;flex-shrink:0}
.photo-inner{width:100%;height:100%;border-radius:50%;overflow:hidden;background:#1e2a4a;display:flex;align-items:center;justify-content:center}
.photo-inner img{width:100%;height:100%;object-fit:cover}
.no-ph{font-size:9px;color:#4a5568;text-align:center}
.info{flex:1;padding:10px 16px 0;display:flex;flex-direction:column}
.person-name{font-size:16px;font-weight:800;color:#e6edf3;text-align:center}
.designation{font-size:10.5px;color:#748ffc;text-align:center;margin-top:3px;font-weight:600}
.neon-line{height:1px;background:linear-gradient(90deg,transparent,#748ffc,transparent);margin:10px 0}
.field-list{display:flex;flex-direction:column;gap:6px}
.field-row{display:flex;align-items:flex-start;gap:8px}
.field-icon{width:18px;height:18px;border-radius:4px;background:rgba(116,143,252,.12);border:1px solid rgba(116,143,252,.2);display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;margin-top:1px}
.field-content{flex:1;min-width:0}
.field-label{font-size:8px;color:#484f58;text-transform:uppercase;letter-spacing:1px}
.field-value{font-size:11px;color:#8b949e;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.field-value.neon{color:#748ffc;font-weight:700}
.dates-row{display:flex;gap:8px;margin-top:8px}
.date-box{flex:1;background:rgba(116,143,252,.07);border:1px solid rgba(116,143,252,.15);border-radius:6px;padding:5px 8px}
.date-label{font-size:8px;color:#484f58;text-transform:uppercase;letter-spacing:.8px}
.date-val{font-size:10.5px;color:#748ffc;font-weight:700;margin-top:1px}
.sig-area{margin-top:8px;display:flex;align-items:flex-end;justify-content:space-between}
.sig-line-wrap{flex:1}
.sig-line{height:1px;background:#2a2a3e;margin-bottom:3px;width:80%}
.sig-label{font-size:8px;color:#484f58;letter-spacing:.5px}
.qr-mini{width:46px;height:46px;border:1px solid #2a2a3e;border-radius:5px;padding:2px;display:flex;align-items:center;justify-content:center;background:#0d0d1a}
.qr-mini img{width:100%;height:100%}
.ftr{background:#0d0d1a;border-top:1px solid #2a2a3e;height:26px;display:flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0}
.ftr-dot{width:4px;height:4px;border-radius:50%;background:#748ffc}
.ftr-text{font-size:9.5px;color:#484f58}
</style></head><body>
<div class="wrap">
  <div class="clip"><div class="hole"></div></div>
  <div class="card">
    <div class="hdr">
      <div class="hdr-glow"></div>
      <div class="hdr-content">
        <div class="org-name">${c.orgName}</div>
        <div class="id-badge">IDENTITY CARD</div>
      </div>
    </div>
    <div class="photo-wrap">
      <div class="photo-ring"><div class="photo-inner">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-ph">No<br>Photo</div>`}</div></div>
    </div>
    <div class="info">
      <div class="person-name">${c.name}</div>
      <div class="designation">${c.desig || ''}</div>
      <div class="neon-line"></div>
      <div class="field-list">
        ${c.id?`<div class="field-row"><div class="field-icon">#</div><div class="field-content"><div class="field-label">ID No.</div><div class="field-value neon">${c.id}</div></div></div>`:''}
        ${c.dept?`<div class="field-row"><div class="field-icon">▦</div><div class="field-content"><div class="field-label">Department</div><div class="field-value">${c.dept}</div></div></div>`:''}
        ${c.phone?`<div class="field-row"><div class="field-icon">☎</div><div class="field-content"><div class="field-label">Phone</div><div class="field-value">${c.phone}</div></div></div>`:''}
        ${c.email?`<div class="field-row"><div class="field-icon">✉</div><div class="field-content"><div class="field-label">Email</div><div class="field-value">${c.email}</div></div></div>`:''}
      </div>
      <div class="dates-row">
        <div class="date-box"><div class="date-label">Issue</div><div class="date-val">01/01/${c.year}</div></div>
        <div class="date-box"><div class="date-label">Expiry</div><div class="date-val">31/12/${c.year}</div></div>
      </div>
      <div class="sig-area">
        <div class="sig-line-wrap"><div class="sig-line"></div><div class="sig-label">Signature</div></div>
        <div class="qr-mini"><img src="${c.qr}"/></div>
      </div>
    </div>
    <div class="ftr"><div class="ftr-dot"></div><span class="ftr-text">valid_until=${c.year}</span><div class="ftr-dot"></div></div>
  </div>
</div>
</body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// BADGE 3 — Badge Elegant  (purple arc top, photo overlapping, field list)
// ═════════════════════════════════════════════════════════════════════════════
function stylePortraitElegant(c) {
  const W = c.W, H = c.H;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;background:#ede7f6;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}
.wrap{width:${W-20}px;height:${H-20}px;display:flex;flex-direction:column;align-items:center}
.clip{width:28px;height:18px;background:linear-gradient(90deg,#6a1b9a,#ab47bc);border-radius:4px 4px 0 0;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.hole{width:10px;height:10px;border-radius:50%;background:#fff;opacity:.5}
.card{width:100%;flex:1;background:#fff;border-radius:0 0 16px 16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 10px 32px rgba(106,27,154,.16)}
/* Arc header */
.hdr{height:120px;position:relative;overflow:hidden;flex-shrink:0}
.hdr-bg{position:absolute;inset:0;background:linear-gradient(135deg,#6a1b9a 0%,#8e24aa 60%,#ab47bc 100%)}
.hdr-arc{position:absolute;bottom:-24px;left:-10%;width:120%;height:60px;background:#fff;border-radius:50%}
.hdr-content{position:relative;z-index:1;padding:14px 16px 0;display:flex;align-items:flex-start;justify-content:space-between}
.logo-box{width:42px;height:42px;border-radius:8px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;overflow:hidden}
.logo-box img{width:100%;height:100%;object-fit:contain}
.logo-init{font-size:17px;font-weight:800;color:#fff}
.hdr-right{text-align:right}
.org-name{font-size:13px;font-weight:700;color:#fff}
.id-label{font-size:8.5px;color:rgba(255,255,255,.75);letter-spacing:1.2px;text-transform:uppercase;margin-top:2px}
/* Photo */
.photo-wrap{display:flex;justify-content:center;margin-top:-18px;flex-shrink:0;position:relative;z-index:2}
.photo-ring{width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#8e24aa,#ce93d8);padding:3px;box-shadow:0 4px 16px rgba(106,27,154,.25)}
.photo-inner{width:100%;height:100%;border-radius:50%;overflow:hidden;background:#f3e5f5;display:flex;align-items:center;justify-content:center}
.photo-inner img{width:100%;height:100%;object-fit:cover}
.no-ph{font-size:9px;color:#ba68c8;text-align:center}
/* Info */
.info{flex:1;padding:8px 16px 0;display:flex;flex-direction:column}
.person-name{font-size:16px;font-weight:800;color:#4a148c;text-align:center}
.designation{font-size:10.5px;color:#9c27b0;text-align:center;margin-top:3px;font-weight:600}
.div{height:1px;background:linear-gradient(90deg,transparent,#e1bee7,transparent);margin:8px 0}
.field-list{display:flex;flex-direction:column;gap:5px}
.frow{display:flex;align-items:flex-start;gap:7px}
.fbullet{width:14px;height:14px;border-radius:50%;background:#f3e5f5;border:1.5px solid #ce93d8;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.fdot{width:4px;height:4px;border-radius:50%;background:#8e24aa}
.fcontent{flex:1;min-width:0}
.flabel{font-size:8px;color:#ba68c8;text-transform:uppercase;letter-spacing:.8px}
.fval{font-size:11px;color:#4a148c;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fval.accent{color:#6a1b9a;font-weight:700}
.dates-row{display:flex;gap:8px;margin-top:8px}
.date-box{flex:1;background:#f3e5f5;border-radius:6px;padding:5px 8px}
.dlabel{font-size:8px;color:#ce93d8;text-transform:uppercase;letter-spacing:.8px}
.dval{font-size:10.5px;color:#6a1b9a;font-weight:700;margin-top:1px}
.sig-area{margin-top:8px;display:flex;align-items:flex-end;justify-content:space-between}
.sig-lw{flex:1}
.sline{height:1px;background:#e1bee7;margin-bottom:3px;width:80%}
.slabel{font-size:8px;color:#ce93d8;letter-spacing:.5px}
.qr-mini{width:46px;height:46px;border:2px solid #e1bee7;border-radius:6px;padding:2px;display:flex;align-items:center;justify-content:center}
.qr-mini img{width:100%;height:100%}
.ftr{background:linear-gradient(90deg,#6a1b9a,#8e24aa);height:26px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ftr-text{font-size:9.5px;color:rgba(255,255,255,.8);letter-spacing:.5px}
</style></head><body>
<div class="wrap">
  <div class="clip"><div class="hole"></div></div>
  <div class="card">
    <div class="hdr">
      <div class="hdr-bg"></div>
      <div class="hdr-arc"></div>
      <div class="hdr-content">
        <div class="logo-box">${c.orgLogo?`<img src="${c.orgLogo}"/>`:`<span class="logo-init">${c.orgName.charAt(0)}</span>`}</div>
        <div class="hdr-right"><div class="org-name">${c.orgName}</div><div class="id-label">ID Card</div></div>
      </div>
    </div>
    <div class="photo-wrap">
      <div class="photo-ring"><div class="photo-inner">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-ph">No<br>Photo</div>`}</div></div>
    </div>
    <div class="info">
      <div class="person-name">${c.name}</div>
      <div class="designation">${c.desig||''}</div>
      <div class="div"></div>
      <div class="field-list">
        ${c.id?`<div class="frow"><div class="fbullet"><div class="fdot"></div></div><div class="fcontent"><div class="flabel">ID No.</div><div class="fval accent">${c.id}</div></div></div>`:''}
        ${c.dept?`<div class="frow"><div class="fbullet"><div class="fdot"></div></div><div class="fcontent"><div class="flabel">Department</div><div class="fval">${c.dept}</div></div></div>`:''}
        ${c.phone?`<div class="frow"><div class="fbullet"><div class="fdot"></div></div><div class="fcontent"><div class="flabel">Phone</div><div class="fval">${c.phone}</div></div></div>`:''}
        ${c.email?`<div class="frow"><div class="fbullet"><div class="fdot"></div></div><div class="fcontent"><div class="flabel">Email</div><div class="fval">${c.email}</div></div></div>`:''}
      </div>
      <div class="dates-row">
        <div class="date-box"><div class="dlabel">Issue Date</div><div class="dval">01/01/${c.year}</div></div>
        <div class="date-box"><div class="dlabel">Expiry Date</div><div class="dval">31/12/${c.year}</div></div>
      </div>
      <div class="sig-area">
        <div class="sig-lw"><div class="sline"></div><div class="slabel">Signature</div></div>
        <div class="qr-mini"><img src="${c.qr}"/></div>
      </div>
    </div>
    <div class="ftr"><span class="ftr-text">${c.orgName}</span></div>
  </div>
</div>
</body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// BADGE 4 — Badge Teal  (teal/green, rectangular photo left, split layout)
// ═════════════════════════════════════════════════════════════════════════════
function stylePortraitMinimal(c) {
  const W = c.W, H = c.H;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;background:#b2dfdb;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}
.wrap{width:${W-20}px;height:${H-20}px;display:flex;flex-direction:column;align-items:center}
.clip{width:28px;height:18px;background:linear-gradient(90deg,#00695c,#26a69a);border-radius:4px 4px 0 0;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.hole{width:10px;height:10px;border-radius:50%;background:#fff;opacity:.6}
.card{width:100%;flex:1;background:#fff;border-radius:0 0 14px 14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 28px rgba(0,105,92,.18)}
/* Split header */
.hdr{height:90px;display:flex;flex-shrink:0;overflow:hidden;position:relative}
.hdr-left{width:45%;background:linear-gradient(160deg,#00695c,#00897b);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px}
.hdr-right{flex:1;background:#e0f2f1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px}
.logo-circle{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;overflow:hidden}
.logo-circle img{width:100%;height:100%;object-fit:contain}
.logo-letter{font-size:18px;font-weight:800;color:#fff}
.card-title{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#004d40;text-align:center}
.org-name{font-size:12px;font-weight:700;color:#00695c;text-align:center;line-height:1.3}
/* Photo centered */
.photo-wrap{display:flex;justify-content:center;margin-top:-18px;position:relative;z-index:2;flex-shrink:0}
.photo-frame{width:88px;height:108px;border-radius:8px;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,105,92,.2);overflow:hidden;background:#e0f2f1;display:flex;align-items:center;justify-content:center}
.photo-frame img{width:100%;height:100%;object-fit:cover}
.no-ph{font-size:9.5px;color:#80cbc4;text-align:center}
/* Info */
.info{flex:1;padding:8px 16px 0;display:flex;flex-direction:column}
.person-name{font-size:16px;font-weight:800;color:#00695c;text-align:center}
.designation{font-size:10.5px;color:#26a69a;text-align:center;margin-top:3px;font-weight:600}
.teal-line{height:2px;background:linear-gradient(90deg,#00897b,#80cbc4,transparent);margin:8px 0;border-radius:1px}
.field-list{display:flex;flex-direction:column;gap:5px}
.frow{display:flex;align-items:flex-start;gap:7px;padding:3px 6px;border-radius:6px;background:#f0faf9}
.ficon{font-size:10px;margin-top:1px;flex-shrink:0;color:#00897b}
.fcontent{flex:1;min-width:0}
.flabel{font-size:7.5px;color:#80cbc4;text-transform:uppercase;letter-spacing:.8px}
.fval{font-size:11px;color:#37474f;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fval.accent{color:#00695c;font-weight:800}
.dates-row{display:flex;gap:8px;margin-top:8px}
.dbox{flex:1;background:#e0f2f1;border-radius:6px;padding:5px 8px;border-left:3px solid #00897b}
.dlabel{font-size:7.5px;color:#80cbc4;text-transform:uppercase;letter-spacing:.8px}
.dval{font-size:10.5px;color:#00695c;font-weight:700;margin-top:1px}
.sig-area{margin-top:8px;display:flex;align-items:flex-end;justify-content:space-between}
.slw{flex:1}
.sline{height:1px;background:#b2dfdb;margin-bottom:3px;width:80%}
.slabel{font-size:8px;color:#80cbc4;letter-spacing:.5px}
.qr-mini{width:46px;height:46px;border:2px solid #b2dfdb;border-radius:6px;padding:2px;display:flex;align-items:center;justify-content:center}
.qr-mini img{width:100%;height:100%}
.ftr{background:linear-gradient(90deg,#00695c,#00897b);height:26px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ftr-text{font-size:9.5px;color:rgba(255,255,255,.85);letter-spacing:.5px}
</style></head><body>
<div class="wrap">
  <div class="clip"><div class="hole"></div></div>
  <div class="card">
    <div class="hdr">
      <div class="hdr-left">
        <div class="logo-circle">${c.orgLogo?`<img src="${c.orgLogo}"/>`:`<span class="logo-letter">${c.orgName.charAt(0)}</span>`}</div>
        <div class="card-title">ID Card</div>
      </div>
      <div class="hdr-right">
        <div class="org-name">${c.orgName}</div>
      </div>
    </div>
    <div class="photo-wrap">
      <div class="photo-frame">${c.photo?`<img src="${c.photo}"/>`:`<div class="no-ph">No<br>Photo</div>`}</div>
    </div>
    <div class="info">
      <div class="person-name">${c.name}</div>
      <div class="designation">${c.desig||''}</div>
      <div class="teal-line"></div>
      <div class="field-list">
        ${c.id?`<div class="frow"><span class="ficon">#</span><div class="fcontent"><div class="flabel">ID No.</div><div class="fval accent">${c.id}</div></div></div>`:''}
        ${c.dept?`<div class="frow"><span class="ficon">▦</span><div class="fcontent"><div class="flabel">Department</div><div class="fval">${c.dept}</div></div></div>`:''}
        ${c.phone?`<div class="frow"><span class="ficon">☎</span><div class="fcontent"><div class="flabel">Phone</div><div class="fval">${c.phone}</div></div></div>`:''}
        ${c.email?`<div class="frow"><span class="ficon">✉</span><div class="fcontent"><div class="flabel">Email</div><div class="fval">${c.email}</div></div></div>`:''}
      </div>
      <div class="dates-row">
        <div class="dbox"><div class="dlabel">Issue Date</div><div class="dval">01/01/${c.year}</div></div>
        <div class="dbox"><div class="dlabel">Expiry Date</div><div class="dval">31/12/${c.year}</div></div>
      </div>
      <div class="sig-area">
        <div class="slw"><div class="sline"></div><div class="slabel">Signature</div></div>
        <div class="qr-mini"><img src="${c.qr}"/></div>
      </div>
    </div>
    <div class="ftr"><span class="ftr-text">${c.orgName}</span></div>
  </div>
</div>
</body></html>`;
}

// ── Element-based custom layout ───────────────────────────────────────────────
async function buildElementsHTML({ record, template, org, qrDataUrl }) {
  const { width, height, backgroundColor, backgroundImage, elements } = template;

  // Pre-resolve all image elements to base64 data URIs (Puppeteer can't load external URLs)
  const resolvedImages = {};
  const imageEls = (elements || []).filter((el) => el.type === 'image');
  await Promise.all(imageEls.map(async (el) => {
    const url = getFieldValue(el, record, org);
    if (url) resolvedImages[el.id] = await toDataUri(url);
  }));
  // Background image
  let bgDataUri = '';
  if (backgroundImage) bgDataUri = await toDataUri(backgroundImage);

  const styles = `* { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${width}px; height: ${height}px; overflow: hidden; position: relative;
           background-color: ${backgroundColor || '#fff'}; font-family: Arial, Helvetica, sans-serif; }
    ${bgDataUri ? `.bg { position:absolute;inset:0;background-image:url('${bgDataUri}');background-size:cover;background-position:center; }` : ''}`;

  const elementHTML = (elements || []).map((el) => renderElement(el, record, org, qrDataUrl, resolvedImages)).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head>
<body>${bgDataUri ? '<div class="bg"></div>' : ''}${elementHTML}</body></html>`;
}

function renderElement(el, record, org, qrDataUrl, resolvedImages = {}) {
  const base = `position:absolute;left:${el.x}px;top:${el.y}px;`;

  if (el.type === 'text') {
    const value = getFieldValue(el, record, org);
    const text  = (el.prefix || '') + value + (el.suffix || '');
    const style = `${base}font-size:${el.fontSize || 14}px;font-weight:${el.fontWeight || 'normal'};color:${el.color || '#000'};`
      + `font-style:${el.italic ? 'italic' : (el.fontStyle || 'normal')};white-space:nowrap;line-height:1.2;`;
    return `<div style="${style}">${esc(text)}</div>`;
  }
  if (el.type === 'image') {
    const src = resolvedImages[el.id] || '';
    const w = el.width || 100, h = el.height || 100;
    const radius = el.rounded ? '50%' : (el.radius ? `${el.radius}px` : '4px');
    if (!src) return `<div style="${base}width:${w}px;height:${h}px;background:#e0e0e0;border-radius:${radius};display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;overflow:hidden;">Photo</div>`;
    return `<img src="${src}" style="${base}width:${w}px;height:${h}px;object-fit:cover;border-radius:${radius};">`;
  }
  if (el.type === 'qr') {
    const w = el.width || 100;
    return qrDataUrl ? `<img src="${qrDataUrl}" style="${base}width:${w}px;height:${w}px;">` : '';
  }
  if (el.type === 'rect') {
    return `<div style="${base}width:${el.width || 100}px;height:${el.height || 10}px;background:${el.color || '#1a237e'};border-radius:${el.radius || 0}px;"></div>`;
  }
  if (el.type === 'line') {
    return `<div style="${base}width:${el.width || 200}px;height:${el.thickness || 2}px;background:${el.color || '#000'};"></div>`;
  }
  return '';
}

function getFieldValue(el, record, org) {
  switch (el.field) {
    case 'name':        return record.name || '';
    case 'idNumber':    return record.idNumber || '';
    case 'department':  return record.department || '';
    case 'designation': return record.designation || '';
    case 'email':       return record.email || '';
    case 'phone':       return record.phone || '';
    case 'photoUrl':    return record.photoUrl || '';
    case 'orgName':     return org?.name || '';
    case 'orgLogo':     return org?.logo || '';
    default:
      return record.extraFields?.get ? (record.extraFields.get(el.field) || '') : '';
  }
}

module.exports = generateIDCard;
module.exports.buildCardHTML = buildCardHTML;
