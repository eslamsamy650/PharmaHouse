const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

// ==================== MEDICINES ROUTES ====================

// GET /api/medicines - Get all medicines
router.get('/medicines', authenticateToken, async (req, res) => {
  try {
    const supplierId = req.query.supplierId;
    const pool = await getPool();
    
    let query;

    if (supplierId) {
      // When filtering by supplier, use a subquery to avoid duplicates
      query = `
        SELECT 
          m.ID,
          m.Name,
          CAST(m.Description AS NVARCHAR(MAX)) AS Description,
          m.CompanyID,
          c.Name AS CompanyName,
          m.ProductionDate,
          m.ExpiryDate,
          m.Price,
          ISNULL(i.TotalQuantity, 0) AS TotalQuantity
        FROM Medicines m
        LEFT JOIN Companies c ON m.CompanyID = c.CompanyID
        LEFT JOIN Inventory i ON m.ID = i.MedicineID
        WHERE m.ID IN (
          SELECT DISTINCT MedicineID 
          FROM MedicineSuppliers 
          WHERE SupplierID = @supplierId
        )
        ORDER BY m.Name
      `;
    } else {
      // When not filtering, no need for DISTINCT
      query = `
        SELECT 
          m.ID,
          m.Name,
          CAST(m.Description AS NVARCHAR(MAX)) AS Description,
          m.CompanyID,
          c.Name AS CompanyName,
          m.ProductionDate,
          m.ExpiryDate,
          m.Price,
          ISNULL(i.TotalQuantity, 0) AS TotalQuantity
        FROM Medicines m
        LEFT JOIN Companies c ON m.CompanyID = c.CompanyID
        LEFT JOIN Inventory i ON m.ID = i.MedicineID
        ORDER BY m.Name
      `;
    }

    const request = pool.request();
    if (supplierId) {
      request.input('supplierId', sql.Int, parseInt(supplierId));
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get medicines error:', err);
    res.status(500).json({ error: 'Failed to get medicines', message: err.message });
  }
});

// GET /api/medicines/:id - Get single medicine
router.get('/medicines/:id', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT 
          m.*,
          c.Name AS CompanyName,
          ISNULL(i.TotalQuantity, 0) AS TotalQuantity
        FROM Medicines m
        LEFT JOIN Companies c ON m.CompanyID = c.CompanyID
        LEFT JOIN Inventory i ON m.ID = i.MedicineID
        WHERE m.ID = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get medicine error:', err);
    res.status(500).json({ error: 'Failed to get medicine', message: err.message });
  }
});

// POST /api/medicines - Add new medicine
router.post('/medicines', authenticateToken, async (req, res) => {
  try {
    const { ID, Name, Description, CompanyID, ProductionDate, ExpiryDate, Price } = req.body;

    if (!ID || !Name || !CompanyID || !Price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = await getPool();
    await pool.request()
      .input('ID', sql.Int, ID)
      .input('Name', sql.VarChar, Name)
      .input('Description', sql.Text, Description || null)
      .input('CompanyID', sql.Int, CompanyID)
      .input('ProductionDate', sql.Date, ProductionDate || null)
      .input('ExpiryDate', sql.Date, ExpiryDate || null)
      .input('Price', sql.Decimal(10, 2), Price)
      .execute('AddMedicine');

    res.status(201).json({ message: 'Medicine added successfully' });
  } catch (err) {
    console.error('Add medicine error:', err);
    res.status(500).json({ error: 'Failed to add medicine', message: err.message });
  }
});

// DELETE /api/medicines/:id - Delete medicine
router.delete('/medicines/:id', authenticateToken, async (req, res) => {
  try {

    const medicineId = parseInt(req.params.id);
    if (isNaN(medicineId) || medicineId <= 0) {
      return res.status(400).json({ error: 'Invalid medicine ID' });
    }

    const pool = await getPool();

    // 1. Find the user's PharmacyID using their email
    const pharmacyLookup = await pool.request()
      .input('email', sql.VarChar, req.user.email)
      .query('SELECT ID FROM Pharmacies WHERE Email = @email');

    if (pharmacyLookup.recordset.length === 0) {
      return res.status(403).json({ error: 'No pharmacy associated with this user' });
    }
    const userPharmacyID = pharmacyLookup.recordset[0].ID;

    // 2. Check if the medicine belongs to that PharmacyID
    const medicineCheck = await pool.request()
      .input('MedicineID', sql.Int, medicineId)
      .input('PharmacyID', sql.Int, userPharmacyID)
      .query(`
          SELECT ID
          FROM Medicines
          WHERE ID = @MedicineID
          AND PharmacyID = @PharmacyID
      `);

    if (medicineCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Medicine not found or access denied' });
    }

    await pool.request()
      .input('MedicineID', sql.Int, medicineId)
      .execute('DeleteMedicine');

    res.json({ message: 'Medicine deleted successfully' });
  } catch (err) {
    console.error('Delete medicine error:', err);
    res.status(500).json({ error: 'Failed to delete medicine', message: err.message });
  }
});

module.exports = router;
