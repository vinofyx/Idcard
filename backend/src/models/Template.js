const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    // Card dimensions
    width: { type: Number, default: 856 },  // px at 96dpi ≈ 3.375" (CR80)
    height: { type: Number, default: 540 }, // px at 96dpi ≈ 2.125" (CR80)
    backgroundColor: { type: String, default: '#ffffff' },
    backgroundImage: { type: String, default: '' },
    // 'classic' = built-in beautiful HTML layout | 'elements' = drag-and-drop builder
    layout: { type: String, enum: ['classic', 'elements'], default: 'elements' },
    // Which built-in style to use when layout='classic'
    cardStyle: { type: String, default: 'classic-blue' },
    // Thumbnail preview color for UI display
    previewColor: { type: String, default: '#1e2a4a' },
    // Array of element objects: { id, type, x, y, width, height, ...props }
    elements: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Template', templateSchema);
