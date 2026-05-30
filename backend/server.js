const path = require('path');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/apiRoutes');

// DB connection
const { connectDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ----------------------
// Middleware
// ----------------------
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------
// API Routes (MUST come before static files)
// ----------------------
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Serve frontend static files (after API routes to avoid conflicts)
app.use(express.static(path.join(__dirname, '../frontend')));

// ----------------------
// Frontend Routes
// ----------------------

// Root → frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await connectDB();
    res.json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all for frontend routes (SPA support)
app.get('*', (req, res) => {
  // Don't serve HTML for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ----------------------
// Error Handling Middleware
// ----------------------
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ----------------------
// Start server
// ----------------------
async function startServer() {
  const { testConnection } = require('./db');

  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.warn('\n⚠️  WARNING: Database connection failed!');
    console.warn('⚠️  The server will start, but database operations will fail.');
    console.warn('⚠️  To fix this:');
    console.warn('   1. Ensure SQL Server is running');
    console.warn('   2. Verify database credentials in .env or db.js');
    console.warn('   3. Make sure the database "CancerPharmacyDB" exists');
    console.warn('   4. Check SQL Server is configured to accept connections\n');
  }

  app.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📁 Frontend served from: ${path.join(__dirname, '../frontend')}`);
    console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api`);
    if (dbConnected) {
      console.log(`💾 Database: Connected to ${process.env.DB_NAME || 'CancerPharmacyDB'}\n`);
    } else {
      console.log(`💾 Database: Not connected\n`);
    }
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
