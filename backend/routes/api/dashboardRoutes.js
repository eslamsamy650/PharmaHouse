const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

// ==================== DASHBOARD ROUTES ====================

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();

     const userResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query('SELECT Role FROM Users WHERE UserID = @userId');

    if (userResult.recordset.length === 0 || userResult.recordset[0].Role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    // Critical alerts (1-20 units) from Inventory
    const criticalResult = await pool.request().query(`
      SELECT COUNT(*) AS Count
      FROM Inventory
      WHERE Status = 'critical' OR (CurrentStock >= 1 AND CurrentStock <= 20)
    `);

    // Low stock (21-40 units) from Inventory
    const lowStockResult = await pool.request().query(`
      SELECT COUNT(*) AS Count
      FROM Inventory
      WHERE Status = 'low' OR (CurrentStock >= 21 AND CurrentStock <= 40)
    `);

    // Total medicines from Inventory
    const totalMedsResult = await pool.request().query(`
      SELECT COUNT(*) AS Count
      FROM Inventory
      WHERE CurrentStock > 0 OR TotalQuantity > 0
    `);

    // Pending orders for current logged-in user only
    const pendingOrdersResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query(`
        SELECT COUNT(*) AS Count
        FROM Orders o
        WHERE o.UserID = @userId
        AND o.OrderDate >= DATEADD(day, -30, GETDATE())
        AND o.OrderID NOT IN (
          SELECT DISTINCT OrderID FROM Invoices WHERE PaymentStatus = 'Paid'
        )
      `);

    // Recent alerts - get critical and low stock items from Inventory
    const alertsResult = await pool.request().query(`
      SELECT TOP 5
        i.MedicineID AS AlertID,
        i.MedicineName,
        i.CurrentStock AS Quantity,
        CASE 
          WHEN i.Status = 'critical' THEN 'Critical stock level: ' + CAST(i.CurrentStock AS VARCHAR) + ' units remaining'
          WHEN i.Status = 'low' THEN 'Low stock level: ' + CAST(i.CurrentStock AS VARCHAR) + ' units remaining'
          ELSE 'Stock alert'
        END AS AlertMessage,
        GETDATE() AS AlertDate
      FROM Inventory i
      WHERE i.Status IN ('critical', 'low')
      ORDER BY 
        CASE i.Status
          WHEN 'critical' THEN 1
          WHEN 'low' THEN 2
          ELSE 3
        END,
        i.CurrentStock ASC
    `);

    res.json({
      criticalAlerts: criticalResult.recordset[0].Count,
      lowStock: lowStockResult.recordset[0].Count,
      totalMeds: totalMedsResult.recordset[0].Count,
      pendingOrders: pendingOrdersResult.recordset[0].Count,
      recentAlerts: alertsResult.recordset
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to get dashboard stats', message: err.message });
  }
});

module.exports = router;
