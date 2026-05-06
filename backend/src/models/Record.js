const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    uploadBatchId: { type: String, required: true },
    // Core identity fields
    name: { type: String, required: true, trim: true },
    idNumber: { type: String, trim: true },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    photoUrl: { type: String, default: '' },
    // Extra dynamic fields from Excel
    extraFields: { type: Map, of: String, default: {} },
    // Validity
    issueDate:  { type: Date, default: Date.now },
    expiryDate: { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }, // 1 yr
    // QR & generation
    qrCode: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'generated', 'error'], default: 'pending' },
    source: { type: String, enum: ['excel', 'pdf', 'ocr', 'manual'], default: 'excel' },
  },
  { timestamps: true }
);

recordSchema.index({ organizationId: 1, uploadBatchId: 1 });
recordSchema.index({ idNumber: 1, organizationId: 1 });

module.exports = mongoose.model('Record', recordSchema);
