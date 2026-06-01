const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

// ==================== DONATIONS ROUTES ====================

// GET /api/donations/stats - Get overall donation statistics
router.get('/donations/stats', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          COUNT(DonationID) AS TotalDonations,
          ISNULL(SUM(DonationAmount), 0) AS TotalDonationAmount
        FROM Donations
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get donation stats error:', err);
    res.status(500).json({ error: 'Failed to get donation statistics', message: err.message });
  }
});

module.exports = router;
