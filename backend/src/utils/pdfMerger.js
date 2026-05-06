// Lightweight PDF merger using raw byte concatenation.
// For production, replace with pdf-lib for proper merging.
class PDFMerger {
  constructor() {
    this.buffers = [];
  }

  async add(buffer) {
    this.buffers.push(buffer);
  }

  async saveAsBuffer() {
    if (this.buffers.length === 1) return this.buffers[0];
    // Use pdf-lib for proper multi-page merging
    const { PDFDocument } = require('pdf-lib');
    const merged = await PDFDocument.create();
    for (const buf of this.buffers) {
      const doc = await PDFDocument.load(buf);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    const bytes = await merged.save();
    return Buffer.from(bytes);
  }
}

module.exports = PDFMerger;
