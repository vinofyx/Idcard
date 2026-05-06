const Template = require('../models/Template');

// All 12 built-in styles (8 landscape + 4 portrait badge)
const BUILTIN_STYLES = [
  // ── Landscape (856 × 540) ─────────────────────────────────────────────────
  { name: 'Classic Blue',    cardStyle: 'classic-blue',    previewColor: '#1e2a4a', width: 856, height: 540 },
  { name: 'Modern Dark',     cardStyle: 'modern-dark',     previewColor: '#13131f', width: 856, height: 540 },
  { name: 'Minimal White',   cardStyle: 'minimal-white',   previewColor: '#3b5bdb', width: 856, height: 540 },
  { name: 'Corporate Green', cardStyle: 'corporate-green', previewColor: '#1b5e20', width: 856, height: 540 },
  { name: 'Sunset Orange',   cardStyle: 'sunset-orange',   previewColor: '#e65100', width: 856, height: 540 },
  { name: 'Royal Purple',    cardStyle: 'royal-purple',    previewColor: '#4a148c', width: 856, height: 540 },
  { name: 'Split Panel',     cardStyle: 'split-panel',     previewColor: '#263238', width: 856, height: 540 },
  { name: 'Tech Card',       cardStyle: 'tech-card',       previewColor: '#00d2d2', width: 856, height: 540 },
  // ── Portrait Badge (400 × 620) ────────────────────────────────────────────
  { name: 'Badge Blue',      cardStyle: 'portrait-classic', previewColor: '#1565c0', width: 400, height: 620 },
  { name: 'Badge Dark',      cardStyle: 'portrait-dark',    previewColor: '#1a1a2e', width: 400, height: 620 },
  { name: 'Badge Elegant',   cardStyle: 'portrait-elegant', previewColor: '#6a1b9a', width: 400, height: 620 },
  { name: 'Badge Teal',      cardStyle: 'portrait-minimal', previewColor: '#00695c', width: 400, height: 620 },
];

// Which cardStyle should be the default for each org type
const ORG_DEFAULT_STYLE = {
  school:    'classic-blue',
  institute: 'classic-blue',
  college:   'minimal-white',
  corporate: 'modern-dark',
};

/**
 * Creates all built-in templates for an org if they don't already exist.
 * Marks the org-type-appropriate style as default (e.g. corporate → modern-dark).
 * Safe to call multiple times — skips if already seeded.
 *
 * @param {string} orgId
 * @param {string} [orgType] - 'school' | 'college' | 'corporate' | 'institute'
 */
async function seedBuiltinTemplates(orgId, orgType) {
  const existing = await Template.countDocuments({ organizationId: orgId, layout: 'classic' });
  if (existing >= BUILTIN_STYLES.length) return; // already seeded

  const defaultStyle = ORG_DEFAULT_STYLE[orgType] || 'classic-blue';

  const toCreate = BUILTIN_STYLES.map((s) => ({
    organizationId: orgId,
    name:         s.name,
    isDefault:    s.cardStyle === defaultStyle,
    layout:       'classic',
    cardStyle:    s.cardStyle,
    previewColor: s.previewColor,
    width:        s.width,
    height:       s.height,
    backgroundColor: '#f8fafc',
    elements: [],
  }));

  await Template.insertMany(toCreate, { ordered: false }).catch(() => {});
}

module.exports = { BUILTIN_STYLES, seedBuiltinTemplates };
