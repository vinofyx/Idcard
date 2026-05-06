/**
 * uploadPhoto — uploads a photo buffer to Cloudinary if credentials are real,
 * otherwise saves it locally under /uploads/photos/ and returns a local URL.
 */
const path = require('path');
const fs   = require('fs');
const cloudinary = require('./cloudinary');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/photos');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function isCloudinaryConfigured() {
  const key = process.env.CLOUDINARY_API_KEY || '';
  return key && key !== 'your_api_key' && key.length > 6;
}

/**
 * @param {Buffer} buffer     — raw image buffer
 * @param {string} mimetype   — e.g. 'image/jpeg'
 * @param {string} orgId      — used for folder/filename scoping
 * @returns {Promise<string>} — public URL of the saved photo
 */
async function uploadPhoto(buffer, mimetype, orgId) {
  if (isCloudinaryConfigured()) {
    const b64     = buffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${b64}`;
    const result  = await cloudinary.uploader.upload(dataUri, {
      folder: `idflow/photos/${orgId}`,
      transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
    });
    return result.secure_url;
  }

  // ── Local fallback ────────────────────────────────────────────────────────
  const ext      = mimetype.split('/')[1]?.split('+')[0] || 'jpg';
  const filename = `${orgId}_${Date.now()}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
  return `${serverUrl}/uploads/photos/${filename}`;
}

module.exports = uploadPhoto;
