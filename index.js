
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const certificateRoutes = require('./routes/certificates');
const rewardRoutes = require('./routes/rewards');
const paymentRoutes = require('./routes/payments');
const validationRoutes = require('./routes/validation');
const adminRoutes = require('./routes/admin');
const nftRoutes = require('./routes/nft');
const roleRoutes = require('./routes/roles');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/nft', nftRoutes);
app.use('/api/roles', roleRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'NEAR Certificate API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      certificates: '/api/certificates', 
      rewards: '/api/rewards',
      payments: '/api/payments',
      validation: '/api/validation',
      admin: '/api/admin',
      nft: '/api/nft',
      roles: '/api/roles',
      health: '/health'
    },
    status: 'Server is running'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
