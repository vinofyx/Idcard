const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/auth');
const Organization = require('../models/Organization');
const { PLANS } = require('../utils/plans');

const router = express.Router();

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured in .env');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// GET /api/billing/plans — public plan list
router.get('/plans', (req, res) => {
  const plans = Object.values(PLANS).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    currency: p.currency,
    features: p.features,
    limits: p.limits,
  }));
  res.json(plans);
});

// POST /api/billing/create-order — create Razorpay order
router.post('/create-order', protect, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];
    if (!plan || plan.price === 0) {
      return res.status(400).json({ message: 'Invalid paid plan selected' });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: plan.price,
      currency: plan.currency,
      receipt: `order_${req.user.organizationId}_${Date.now()}`,
      notes: {
        organizationId: String(req.user.organizationId),
        planId,
        userId: String(req.user._id),
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planName: plan.name,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/billing/verify — verify Razorpay payment + upgrade plan
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generated = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed — signature mismatch' });
    }

    // Upgrade org plan
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });

    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      {
        plan: planId,
        lastPaymentId: razorpay_payment_id,
        planActivatedAt: new Date(),
      },
      { new: true }
    );

    res.json({ message: `Upgraded to ${plan.name} successfully!`, organization: org });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/billing/webhook — Razorpay webhook (server-side backup verification)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secret) {
      const generated = crypto
        .createHmac('sha256', secret)
        .update(req.body)
        .digest('hex');
      if (generated !== signature) {
        return res.status(400).json({ message: 'Invalid webhook signature' });
      }
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === 'payment.captured') {
      const notes = event.payload?.payment?.entity?.notes || {};
      if (notes.organizationId && notes.planId) {
        Organization.findByIdAndUpdate(notes.organizationId, {
          plan: notes.planId,
          planActivatedAt: new Date(),
        }).catch(console.error);
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/billing/status — current org plan info
router.get('/status', protect, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    const plan = PLANS[org?.plan] || PLANS.free;
    res.json({ plan, organization: org });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
