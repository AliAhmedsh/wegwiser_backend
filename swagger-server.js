const express = require('express');
const path = require('path');

const app = express();
const PORT = 3002;

// Serve static files
app.use(express.static(__dirname));

// Serve the Swagger UI HTML
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'swagger-ui.html');
    res.sendFile(htmlPath);
});

// Serve the swagger.json file
app.get('/swagger.json', (req, res) => {
    const swaggerPath = path.join(__dirname, 'swagger.json');
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(swaggerPath);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Swagger Documentation Server is running',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`📚 Swagger Documentation Server running on http://localhost:${PORT}`);
    console.log(`📖 API Documentation available at http://localhost:${PORT}`);
    console.log(`🔗 Swagger JSON available at http://localhost:${PORT}/swagger.json`);
});

module.exports = app; 