// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const productRoutes = require('./routes/products');
const swotFileRoutes = require('./routes/swotFiles');
const userRoutes = require('./routes/user');
const invitationRoutes = require('./routes/invitations');
const messagingRoutes = require('./routes/messaging');
const vehicleRoutes = require('./routes/vehicles');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'exp://localhost:8081'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/products', productRoutes);
app.use('/api/swot-files', swotFileRoutes);
app.use('/api/user', userRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Wegwiser API Gateway is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Wegwiser API Gateway',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      ai: '/api/ai',
      products: '/api/products',
      swotFiles: '/api/swot-files',
      user: '/api/user',
      invitations: '/api/invitations',
      messaging: '/api/messaging',
      vehicles: '/api/vehicles',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Wegwiser API Gateway running on port ${PORT}`);
  console.log(`🩺 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoint available at http://localhost:${PORT}/api`);
  console.log(`🔐 Auth endpoints available at http://localhost:${PORT}/api/auth`);
  console.log(`🧠 AI endpoints available at http://localhost:${PORT}/api/ai`);
  console.log(`📦 Product endpoints available at http://localhost:${PORT}/api/products`);
  console.log(`🗂️ SWOT file endpoints available at http://localhost:${PORT}/api/swot-files`);
  console.log(`👤 User endpoints available at http://localhost:${PORT}/api/user`);
  console.log(`✉️ Invitation endpoints available at http://localhost:${PORT}/api/invitations`);
  console.log(`💬 Messaging endpoints available at http://localhost:${PORT}/api/messaging`);
  console.log(`🚗 Vehicle endpoints available at http://localhost:${PORT}/api/vehicles`);
});

module.exports = app; 
