const express = require('express');
const crypto = require('crypto');
const { protect, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Invite = require('../models/Invite');
const Organization = require('../models/Organization');
const { getPlan } = require('../utils/plans');
const { signToken } = require('../utils/jwt');

const router = express.Router();

// GET /api/team — list all members in org
router.get('/', protect, async (req, res) => {
  try {
    const [members, pendingInvites] = await Promise.all([
      User.find({ organizationId: req.user.organizationId }).select('-password'),
      Invite.find({ organizationId: req.user.organizationId, accepted: false, expiresAt: { $gt: new Date() } }),
    ]);
    res.json({ members, pendingInvites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/team/invite — send invite (admin only)
router.post('/invite', protect, requireRole('admin'), async (req, res) => {
  try {
    const { email, role = 'staff' } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    // Check plan team member limit
    const org = await Organization.findById(req.user.organizationId);
    const plan = getPlan(org.plan);
    const currentCount = await User.countDocuments({ organizationId: org._id });
    if (currentCount >= plan.limits.teamMembers) {
      return res.status(403).json({
        message: `Team member limit (${plan.limits.teamMembers}) reached on ${plan.name} plan. Upgrade to add more.`,
        upgrade: true,
      });
    }

    // Check if already a member
    const existing = await User.findOne({ email, organizationId: req.user.organizationId });
    if (existing) return res.status(409).json({ message: 'User is already a team member' });

    const token = crypto.randomBytes(32).toString('hex');
    const invite = await Invite.findOneAndUpdate(
      { email, organizationId: req.user.organizationId },
      { invitedBy: req.user._id, role, token, accepted: false, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      { upsert: true, new: true }
    );

    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/accept-invite?token=${token}`;

    // Email sending (optional — only if SMTP is configured)
    try {
      const nodemailer = require('nodemailer');
      if (process.env.SMTP_HOST) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from: `IDFlow <${process.env.SMTP_USER}>`,
          to: email,
          subject: `You've been invited to join ${org.name} on IDFlow`,
          html: `<p>Hi,</p>
<p><strong>${req.user.name}</strong> has invited you to join <strong>${org.name}</strong> as a <strong>${role}</strong> on IDFlow.</p>
<p><a href="${inviteLink}" style="background:#3b5bdb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0">Accept Invitation</a></p>
<p>This link expires in 7 days.</p>`,
        });
      }
    } catch { /* silent — email is optional */ }

    res.json({ invite, inviteLink });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/team/accept — accept invite & create/link account
router.post('/accept', async (req, res) => {
  try {
    const { token, name, password } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });

    const invite = await Invite.findOne({ token, accepted: false, expiresAt: { $gt: new Date() } });
    if (!invite) return res.status(400).json({ message: 'Invite link is invalid or expired' });

    // Check if user already exists
    let user = await User.findOne({ email: invite.email });
    if (user) {
      // Link existing user to org
      user.organizationId = invite.organizationId;
      user.role = invite.role;
      await user.save();
    } else {
      if (!name || !password) return res.status(400).json({ message: 'Name and password required to create account' });
      user = await User.create({
        name,
        email: invite.email,
        password,
        role: invite.role,
        organizationId: invite.organizationId,
      });
    }

    invite.accepted = true;
    await invite.save();

    const org = await Organization.findById(invite.organizationId);
    const jwtToken = signToken(user._id);
    res.json({ token: jwtToken, user, organization: org });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/team/:userId — remove member (admin only)
router.delete('/:userId', protect, requireRole('admin'), async (req, res) => {
  try {
    if (String(req.params.userId) === String(req.user._id)) {
      return res.status(400).json({ message: 'Cannot remove yourself' });
    }
    const member = await User.findOne({ _id: req.params.userId, organizationId: req.user.organizationId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    member.organizationId = undefined;
    member.role = 'viewer';
    await member.save();
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/team/invites/:inviteId — cancel invite
router.delete('/invites/:inviteId', protect, requireRole('admin'), async (req, res) => {
  try {
    await Invite.findOneAndDelete({ _id: req.params.inviteId, organizationId: req.user.organizationId });
    res.json({ message: 'Invite cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
