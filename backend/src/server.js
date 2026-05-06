require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes      = require('./routes/auth');
const orgRoutes       = require('./routes/organizations');
const uploadRoutes    = require('./routes/upload');
const recordRoutes    = require('./routes/records');
const templateRoutes  = require('./routes/templates');
const pdfRoutes       = require('./routes/pdf');
const billingRoutes   = require('./routes/billing');
const teamRoutes      = require('./routes/team');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Serve locally uploaded photos (fallback when Cloudinary not configured)
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

// Webhook needs raw body — mount before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',       authRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/upload',     uploadRoutes);
app.use('/api/records',    recordRoutes);
app.use('/api/templates',  templateRoutes);
app.use('/api/pdf',        pdfRoutes);
app.use('/api/billing',    billingRoutes);
app.use('/api/team',       teamRoutes);
app.use('/api/analytics',  analyticsRoutes);

// Public QR verification page
app.use('/verify', require('./routes/verify'));

app.get('/health', (req, res) => res.json({ status: 'ok', version: '4.0.0' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });
