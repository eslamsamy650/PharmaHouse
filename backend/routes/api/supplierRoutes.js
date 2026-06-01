const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

// ==================== SUPPLIERS ROUTES ====================

// GET /api/suppliers - Get all suppliers
router.get('/suppliers', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM Suppliers ORDER BY Name
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get suppliers error:', err);
    res.status(500).json({ error: 'Failed to get suppliers', message: err.message });
  }
});

module.exports = router;
