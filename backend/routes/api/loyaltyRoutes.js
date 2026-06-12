const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

// ==================== LOYALTY ROUTES ====================

// GET /api/loyalty/balance
// Returns the logged-in user's current reward point balance
// and their full transaction history (earned + redeemed per order).
router.get('/loyalty/balance', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();

    // ── 1. Get the current balance stored on the Users row ──────────────────
    // This is the "live" balance — it gets updated every time points
    // are earned (invoice paid) or redeemed (order with points).
    const balanceResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query(`
        SELECT
          ISNULL(RewardPoints, 0) AS CurrentBalance
        FROM Users
        WHERE UserID = @userId
      `);

    const currentBalance = balanceResult.recordset[0].CurrentBalance;

    // ── 2. Get the full transaction history from the RewardPoints ledger ─────
    // The RewardPoints table acts like a bank statement.
    // Every time points are earned or redeemed, a new row is added.
    // This lets us show the user a history of all their point activity.
    const historyResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query(`
        SELECT
          rp.RewardPointID,
          rp.OrderID,
          rp.PointsEarned,
          rp.PointsRedeemed,
          rp.TransactionDate,
          CASE
            WHEN rp.PointsEarned  > 0 THEN 'earned'
            WHEN rp.PointsRedeemed > 0 THEN 'redeemed'
            ELSE 'other'
          END AS TransactionType
        FROM RewardPoints rp
        WHERE rp.UserID = @userId
        ORDER BY rp.TransactionDate DESC
      `);

    // ── 3. Send everything back in one clean response ────────────────────────
    res.json({
      currentBalance,
      history: historyResult.recordset
    });

  } catch (err) {
    console.error('Get loyalty balance error:', err);
    res.status(500).json({
      error: 'Failed to get loyalty balance',
      message: err.message
    });
  }
});

module.exports = router;

