const express = require('express');
const { protect } = require('../middleware/auth');
const Record = require('../models/Record');

const router = express.Router();

// GET /api/analytics/overview — full analytics for dashboard
router.get('/overview', protect, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const days = Number(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [timeSeries, byDepartment, byStatus, topBatches] = await Promise.all([
      // IDs generated per day (last N days)
      Record.aggregate([
        { $match: { organizationId: orgId, status: 'generated', updatedAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Records by department (top 10)
      Record.aggregate([
        { $match: { organizationId: orgId, department: { $ne: '' } } },
        { $group: { _id: '$department', total: { $sum: 1 }, generated: { $sum: { $cond: [{ $eq: ['$status', 'generated'] }, 1, 0] } } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),

      // Status breakdown
      Record.aggregate([
        { $match: { organizationId: orgId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Top upload batches by size
      Record.aggregate([
        { $match: { organizationId: orgId } },
        {
          $group: {
            _id: '$uploadBatchId',
            total: { $sum: 1 },
            generated: { $sum: { $cond: [{ $eq: ['$status', 'generated'] }, 1, 0] } },
            createdAt: { $first: '$createdAt' },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Fill in missing days with 0
    const filledTimeSeries = fillDays(timeSeries, days);

    res.json({ timeSeries: filledTimeSeries, byDepartment, byStatus, topBatches, days });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function fillDays(data, days) {
  const map = {};
  data.forEach((d) => { map[d._id] = d.count; });

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map[key] || 0 });
  }
  return result;
}

module.exports = router;
