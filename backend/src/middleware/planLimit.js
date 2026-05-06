/**
 * Plan limit enforcement middleware.
 * Usage: router.post('/upload', protect, planLimit('records'), ...)
 */
const Organization = require('../models/Organization');
const Record = require('../models/Record');
const Template = require('../models/Template');
const { getPlan } = require('../utils/plans');

const planLimit = (feature) => async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const plan = getPlan(org.plan);
    const limit = plan.limits[feature];

    // Boolean features
    if (limit === false) {
      return res.status(403).json({
        message: `This feature requires a paid plan. Upgrade to Basic or Pro.`,
        upgrade: true,
        feature,
      });
    }
    if (limit === true || limit === Infinity) return next();

    // Count-based limits
    let current = 0;
    if (feature === 'records') {
      current = await Record.countDocuments({ organizationId: org._id });
    } else if (feature === 'templates') {
      current = await Template.countDocuments({ organizationId: org._id });
    }

    if (current >= limit) {
      return res.status(403).json({
        message: `You've reached the ${feature} limit (${limit}) on your ${plan.name} plan. Upgrade to continue.`,
        upgrade: true,
        feature,
        limit,
        current,
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = planLimit;
