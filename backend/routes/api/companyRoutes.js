const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

// ==================== COMPANIES ROUTES ====================

// GET /api/companies - Get all companies
router.get('/companies', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM Companies ORDER BY Name
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get companies error:', err);
    res.status(500).json({ error: 'Failed to get companies', message: err.message });
  }
});

module.exports = router;
