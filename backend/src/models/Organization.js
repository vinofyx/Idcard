const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    type:    { type: String, enum: ['school', 'college', 'corporate', 'institute'], default: 'school' },
    logo:    { type: String, default: '' },
    plan:    { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // ID auto-generation settings
    idPrefix:  { type: String, default: '' },   // e.g. 'SCH', 'EMP', 'COL'
    idFormat:  { type: String, default: '' },   // e.g. 'SCH-{NNN}', 'COL-{YYYY}-{NNN}'
    // Onboarding: true = done, false = show wizard, undefined = legacy (skip wizard)
    onboardingDone: { type: Boolean },
    // Billing
    lastPaymentId:   { type: String, default: '' },
    planActivatedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
