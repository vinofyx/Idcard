const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { signToken } = require('../utils/jwt');
const { protect } = require('../middleware/auth');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('orgName').trim().notEmpty().withMessage('Organization name required'),
    body('orgType').optional().isIn(['school', 'college', 'corporate', 'institute']),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, password, orgName, orgType } = req.body;
      if (await User.findOne({ email }))
        return res.status(409).json({ message: 'Email already registered' });

      const user = await User.create({ name, email, password, role: 'admin' });
      const org = await Organization.create({
        name: orgName,
        type: orgType || 'school',
        ownerId: user._id,
        onboardingDone: false,   // triggers setup wizard on first login
      });
      user.organizationId = org._id;
      await user.save();

      const token = signToken(user._id);
      res.status(201).json({ token, user, organization: org });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password)))
        return res.status(401).json({ message: 'Invalid credentials' });

      const org = await Organization.findById(user.organizationId);
      const token = signToken(user._id);
      res.json({ token, user, organization: org });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const org = await Organization.findById(req.user.organizationId);
  res.json({ user: req.user, organization: org });
});

module.exports = router;
