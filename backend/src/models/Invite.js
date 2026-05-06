const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['staff', 'viewer'], default: 'staff' },
    token: { type: String, required: true, unique: true },
    accepted: { type: Boolean, default: false },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invite', inviteSchema);
