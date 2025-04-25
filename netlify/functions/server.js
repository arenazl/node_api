const express = require('express');
const serverless = require('serverless-http');
const path = require('path');
const fs = require('fs-extra');
const fileUpload = require('express-fileupload');
const cors = require('cors');

// Import routes
const apiRoutes = require('../../routes/api');
const excelRoutes = require('../../routes/excel');
const serviceRoutes = require('../../routes/services');

// Create directories if they don't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const structuresDir = path.join(__dirname, '../../structures');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(structuresDir);

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../../public')));

// Routes
app.use('/.netlify/functions/server/api', apiRoutes);
app.use('/.netlify/functions/server/excel', excelRoutes); 
app.use('/.netlify/functions/server/api/services', serviceRoutes);

// Main route
app.get('/.netlify/functions/server', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Catch-all route for navigation - important for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Export the serverless function
module.exports.handler = serverless(app);
