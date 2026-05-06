/**
 * Plan definitions and limit helpers.
 * Single source of truth — used by billing routes, middleware, and frontend.
 */

const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'INR',
    limits: {
      records: 100,
      templates: 1,
      bulkDownload: false,
      teamMembers: 1,       // owner only
      ocr: false,
      customBranding: false,
    },
    features: [
      '100 ID cards total',
      '1 template',
      'QR verification',
      'Excel upload',
    ],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 99900,           // paise (₹999)
    currency: 'INR',
    limits: {
      records: 2000,
      templates: 5,
      bulkDownload: true,
      teamMembers: 3,
      ocr: true,
      customBranding: false,
    },
    features: [
      '2,000 ID cards/month',
      '5 templates',
      'Bulk PDF download',
      'Image OCR + PDF extraction',
      'Up to 3 team members',
      'Email support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 299900,          // paise (₹2,999)
    currency: 'INR',
    limits: {
      records: Infinity,
      templates: Infinity,
      bulkDownload: true,
      teamMembers: Infinity,
      ocr: true,
      customBranding: true,
    },
    features: [
      'Unlimited ID cards',
      'Unlimited templates',
      'All upload sources (Excel, PDF, OCR)',
      'Custom branding on cards',
      'Unlimited team members',
      'Priority support',
      'Analytics dashboard',
    ],
  },
};

function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

function canUseFeature(org, feature) {
  const plan = getPlan(org?.plan);
  return plan.limits[feature] === true || plan.limits[feature] === Infinity;
}

function isWithinLimit(org, feature, currentCount) {
  const plan = getPlan(org?.plan);
  const limit = plan.limits[feature];
  if (limit === Infinity || limit === true) return true;
  if (limit === false) return false;
  return currentCount < limit;
}

module.exports = { PLANS, getPlan, canUseFeature, isWithinLimit };
