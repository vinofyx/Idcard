const express = require('express');
const { protect } = require('../middleware/auth');
const planLimit = require('../middleware/planLimit');
const Template = require('../models/Template');
const { seedBuiltinTemplates } = require('../utils/builtinTemplates');

const router = express.Router();

// GET /api/templates — auto-seed built-in styles on first load
router.get('/', protect, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    // Seed all 12 built-in templates if none exist yet for this org
    await seedBuiltinTemplates(orgId);
    const templates = await Template.find({ organizationId: orgId })
      .sort({ isDefault: -1, createdAt: 1 }); // default first, then by creation order
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/templates
router.post('/', protect, planLimit('templates'), async (req, res) => {
  try {
    const { name, width, height, backgroundColor, backgroundImage, elements } = req.body;
    if (!name) return res.status(400).json({ message: 'Template name required' });

    // If first template, make it default
    const count = await Template.countDocuments({ organizationId: req.user.organizationId });
    const template = await Template.create({
      organizationId: req.user.organizationId,
      name,
      width: width || 856,
      height: height || 540,
      backgroundColor: backgroundColor || '#ffffff',
      backgroundImage: backgroundImage || '',
      elements: elements || getDefaultElements(),
      isDefault: count === 0,
    });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/templates/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Template.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/templates/:id/set-default
router.put('/:id/set-default', protect, async (req, res) => {
  try {
    await Template.updateMany({ organizationId: req.user.organizationId }, { isDefault: false });
    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { isDefault: true },
      { new: true }
    );
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function getDefaultElements() {
  return [
    {
      id: 'logo',
      type: 'image',
      field: 'orgLogo',
      x: 20, y: 20, width: 80, height: 80,
      label: 'Organization Logo',
    },
    {
      id: 'photo',
      type: 'image',
      field: 'photoUrl',
      x: 700, y: 20, width: 120, height: 120,
      label: 'Photo',
      rounded: true,
    },
    {
      id: 'orgName',
      type: 'text',
      field: 'orgName',
      x: 110, y: 30,
      fontSize: 22, fontWeight: 'bold', color: '#1a237e',
      label: 'Organization Name',
    },
    {
      id: 'name',
      type: 'text',
      field: 'name',
      x: 20, y: 160,
      fontSize: 20, fontWeight: 'bold', color: '#212121',
      label: 'Name',
    },
    {
      id: 'idNumber',
      type: 'text',
      field: 'idNumber',
      x: 20, y: 200,
      fontSize: 14, color: '#555555',
      prefix: 'ID: ',
      label: 'ID Number',
    },
    {
      id: 'department',
      type: 'text',
      field: 'department',
      x: 20, y: 230,
      fontSize: 14, color: '#555555',
      label: 'Department',
    },
    {
      id: 'qrCode',
      type: 'qr',
      field: 'qrCode',
      x: 600, y: 160, width: 120, height: 120,
      label: 'QR Code',
    },
  ];
}

module.exports = router;
