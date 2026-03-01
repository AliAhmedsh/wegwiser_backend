const express = require('express');
const router = express.Router();
const axios = require('axios');
const { verifyJWT, requireRole } = require('../middleware/auth');

// FastAPI RAG service configuration
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

// Role mapping for FastAPI endpoints
const ROLE_ENDPOINT_MAPPING = {
  'product_manager': '/ask/product-manager',
  'designer': '/ask/designer',
  'engineer': '/ask/product-manager',
  'user': '/ask/product-manager'
};

// AI chat endpoint with authentication and role-based forwarding
router.post('/chat', 
  verifyJWT, 
  requireRole(['product_manager', 'designer', 'engineer', 'user']), 
  async (req, res) => {
    try {
      const { message, context } = req.body;
      const userRole = req.user.role;
      const userEmail = req.user.email;

      console.log(`AI Chat request from ${userEmail} (${userRole}):`, message);

      // Validate request
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Determine FastAPI endpoint based on user role
      const endpoint = ROLE_ENDPOINT_MAPPING[userRole] || '/ask/product-manager';
      const fastapiUrl = `${FASTAPI_URL}${endpoint}`;

      console.log(`Forwarding to FastAPI: ${fastapiUrl}`);

      // FastAPI /ask routes expect form-data fields like `question`.
      const formData = new URLSearchParams();
      formData.append('question', message);
      if (context) {
        formData.append('context', typeof context === 'string' ? context : JSON.stringify(context));
      }
      if (req.user?.sub) {
        formData.append('user_id', req.user.sub);
      }

      // Forward request to FastAPI RAG service
      const fastapiResponse = await axios.post(fastapiUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': req.headers.authorization // Forward the JWT token
        },
        timeout: 30000 // 30 second timeout
      });

      // Return FastAPI response
      res.json({
        success: true,
        response: fastapiResponse.data,
        role: userRole,
        endpoint: endpoint,
        forwarded_user: userEmail
      });

    } catch (error) {
      console.error('Error forwarding to FastAPI:', error.response?.data || error.message);
      
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          error: 'RAG service unavailable',
          message: 'The AI service is currently unavailable. Please try again later.'
        });
      }

      if (error.response?.status === 403) {
        return res.status(403).json({ 
          error: 'Access denied by RAG service',
          message: 'You do not have permission to access this AI feature.'
        });
      }

      if (error.response?.status === 401) {
        return res.status(401).json({
          error: 'Unauthorized by RAG service',
          message: 'Your token is missing or invalid for AI access.'
        });
      }

      res.status(500).json({ 
        error: 'AI service error',
        message: error.response?.data?.detail || 'An error occurred while processing your request.'
      });
    }
  }
);

// Test endpoint (no authentication required)
router.get('/test', (req, res) => {
  res.json({
    message: 'AI routes are working',
    status: 'success',
    endpoints: {
      chat: 'POST /api/ai/chat (requires authentication)',
      test: 'GET /api/ai/test'
    }
  });
});

// Health check for AI service
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_URL}/health`, {
      timeout: 5000
    });
    
    res.json({
      status: 'healthy',
      rag_service: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      rag_service: 'unavailable',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
