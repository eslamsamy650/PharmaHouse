const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

// ==================== SPECIAL OFFERS ROUTES ====================

// GET /api/offers - Get special offers (medicines with discounts)
router.get('/offers', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();

    // Query to get all medicines from Inventory with their details
    // Show all medicines that have inventory entries, regardless of stock level
    let query = `
      SELECT 
        i.MedicineID AS ID,
        ISNULL(i.MedicineName, m.Name) AS Name,
        ISNULL(m.Description, 'Special offer on this medicine') AS Description,
        ISNULL(m.Price, 0) AS Price,
        ISNULL(c.Name, 'Unknown Company') AS CompanyName,
        ISNULL(i.CurrentStock, ISNULL(i.TotalQuantity, 0)) AS Stock,
        CASE 
          WHEN ISNULL(i.CurrentStock, ISNULL(i.TotalQuantity, 0)) = 0 THEN 30
          WHEN ISNULL(i.CurrentStock, ISNULL(i.TotalQuantity, 0)) < 20 THEN 25
          WHEN ISNULL(i.CurrentStock, ISNULL(i.TotalQuantity, 0)) < 50 THEN 20
          WHEN ISNULL(i.CurrentStock, ISNULL(i.TotalQuantity, 0)) < 100 THEN 15
          ELSE 10
        END AS DiscountPercent,
        ISNULL(m.Price, 0) * (1 - CASE 
          WHEN ISNULL(i.CurrentStock, ISNULL(i.TotalQuantity, 0)) = 0 THEN 0.30
          WHEN ISNULL(i.CurrentStock, ISNULL(i.TotalQuantity, 0)) < 20 THEN 0.25
          WHEN ISNULL(i.CurrentStock, ISNULL(i.TotalQuantity, 0)) < 50 THEN 0.20
          WHEN ISNULL(i.CurrentStock, ISNULL(i.TotalQuantity, 0)) < 100 THEN 0.15
          ELSE 0.10
        END) AS DiscountedPrice
      FROM Inventory i
      LEFT JOIN Medicines m ON i.MedicineID = m.ID
      LEFT JOIN Companies c ON m.CompanyID = c.CompanyID
      WHERE m.ID IS NOT NULL
      ORDER BY DiscountPercent DESC, ISNULL(i.MedicineName, m.Name)
    `;

    const result = await pool.request().query(query);


    if (!result.recordset || result.recordset.length === 0) {
      return res.json([]);
    }

    res.json(result.recordset);
  } catch (err) {
    console.error('Get offers error:', err);
    res.status(500).json({ error: 'Failed to get offers', message: err.message });
  }
});

module.exports = router;
