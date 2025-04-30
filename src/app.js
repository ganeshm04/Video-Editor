const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const videoRoutes = require('./routes/videoRoutes');

// Initialize Express app
const app = express();
const prisma = new PrismaClient();


// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));

// Make uploads directory accessible
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/processed', express.static(path.join(__dirname, '../processed')));
app.use('/subtitles', express.static(path.join(__dirname, '../subtitles')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  });


// Create required directories if they don't exist
const fs = require('fs');
const directories = ['uploads', 'processed', 'subtitles'];
directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Export app for testing
module.exports = app;