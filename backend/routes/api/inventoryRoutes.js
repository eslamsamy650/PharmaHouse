const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

// ==================== INVENTORY ROUTES ====================

// Test route to verify routing works
router.get('/inventory/test', (req, res) => {
  res.json({ message: 'Inventory routes are working!' });
});

// GET /api/inventory - Get inventory from Inventory table
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        i.MedicineID,
        i.MedicineName,
        i.Category,
        i.CurrentStock,
        i.ExpiryDate,
        i.Status,
        i.TotalQuantity,
        i.SupplierID,
        s.Name AS SupplierName,
        m.Price
      FROM Inventory i
      LEFT JOIN Suppliers s ON i.SupplierID = s.SupplierID
      LEFT JOIN Medicines m ON i.MedicineID = m.ID
      WHERE i.CurrentStock > 0 OR i.Status IS NOT NULL
      ORDER BY i.MedicineName
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: 'Failed to get inventory', message: err.message });
  }
});

// POST /api/inventory - Add new inventory item (Admin only)
router.post('/inventory', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const pool = await getPool();
    const userResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query('SELECT Role FROM Users WHERE UserID = @userId');

    if (userResult.recordset.length === 0 || userResult.recordset[0].Role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const { MedicineID, MedicineName, Category, CurrentStock, ExpiryDate, SupplierID, Price } = req.body;

    if (!MedicineName) {
      return res.status(400).json({ error: 'MedicineName is required' });
    }

    // Auto-generate MedicineID if not provided
    let finalMedicineID = MedicineID;
    if (!finalMedicineID || finalMedicineID === null || finalMedicineID === undefined || finalMedicineID === '') {
      // Get the maximum MedicineID from Inventory table
      const maxIdResult = await pool.request()
        .query('SELECT ISNULL(MAX(MedicineID), 0) AS MaxID FROM Inventory');
      
      const maxId = maxIdResult.recordset[0].MaxID || 0;
      
      // Also check Medicines table to ensure we don't conflict
      const maxMedicineIdResult = await pool.request()
        .query('SELECT ISNULL(MAX(ID), 0) AS MaxID FROM Medicines');
      
      const maxMedicineId = maxMedicineIdResult.recordset[0].MaxID || 0;
      
      // Use the higher of the two, plus 1
      finalMedicineID = Math.max(maxId, maxMedicineId) + 1;
    }

    // Calculate status based on CurrentStock
    let status = 'normal';
    const stock = parseInt(CurrentStock || 0);
    if (stock >= 1 && stock <= 20) {
      status = 'critical';
    } else if (stock >= 21 && stock <= 40) {
      status = 'low';
    } else if (stock >= 41 && stock <= 100) {
      status = 'normal';
    } else if (stock > 100) {
      status = 'normal';
    } else {
      status = 'out-of-stock';
    }

    // Check if MedicineID exists in Medicines table, if not create it
    const medicineCheck = await pool.request()
      .input('MedicineID', sql.Int, finalMedicineID)
      .query('SELECT ID FROM Medicines WHERE ID = @MedicineID');
    
    if (medicineCheck.recordset.length === 0) {
      // Medicine doesn't exist, create it with default values
      // We need at least CompanyID - use a default company (ID 1) or get the first available
      const companyCheck = await pool.request()
        .query('SELECT TOP 1 CompanyID FROM Companies ORDER BY CompanyID');
      
      const defaultCompanyID = companyCheck.recordset.length > 0 
        ? companyCheck.recordset[0].CompanyID 
        : 1;
      
      const medicinePrice = Price != null && Price !== '' && !isNaN(parseFloat(Price)) ? parseFloat(Price) : 0.00;
      await pool.request()
        .input('ID', sql.Int, finalMedicineID)
        .input('Name', sql.VarChar(100), MedicineName)
        .input('Description', sql.VarChar(sql.MAX), `Inventory item: ${MedicineName}`)
        .input('CompanyID', sql.Int, defaultCompanyID)
        .input('Price', sql.Decimal(10, 2), medicinePrice)
        .query(`
          INSERT INTO Medicines (ID, Name, Description, CompanyID, Price)
          VALUES (@ID, @Name, @Description, @CompanyID, @Price)
        `);
    }

    await pool.request()
      .input('MedicineID', sql.Int, finalMedicineID)
      .input('MedicineName', sql.VarChar(100), MedicineName)
      .input('Category', sql.VarChar(50), Category || 'General')
      .input('CurrentStock', sql.Int, stock)
      .input('ExpiryDate', sql.Date, ExpiryDate || null)
      .input('Status', sql.VarChar(20), status)
      .input('TotalQuantity', sql.Int, stock)
      .input('SupplierID', sql.Int, SupplierID || null)
      .query(`
        MERGE Inventory AS target
        USING (SELECT @MedicineID AS MedicineID) AS source
        ON target.MedicineID = source.MedicineID
        WHEN MATCHED THEN
          UPDATE SET
            MedicineName = @MedicineName,
            Category = @Category,
            CurrentStock = @CurrentStock,
            ExpiryDate = @ExpiryDate,
            Status = @Status,
            TotalQuantity = @TotalQuantity,
            SupplierID = @SupplierID
        WHEN NOT MATCHED THEN
          INSERT (MedicineID, MedicineName, Category, CurrentStock, ExpiryDate, Status, TotalQuantity, SupplierID)
          VALUES (@MedicineID, @MedicineName, @Category, @CurrentStock, @ExpiryDate, @Status, @TotalQuantity, @SupplierID);
      `);

    // Ensure MedicineSuppliers table is updated to link the medicine to the supplier
    if (SupplierID) {
      const medicinePrice = Price != null && Price !== '' && !isNaN(parseFloat(Price)) ? parseFloat(Price) : 0.00;
      await pool.request()
        .input('MedicineID', sql.Int, finalMedicineID)
        .input('SupplierID', sql.Int, SupplierID)
        .input('Price', sql.Decimal(10, 2), medicinePrice)
        .query(`
          MERGE MedicineSuppliers AS target
          USING (SELECT @MedicineID AS MedicineID, @SupplierID AS SupplierID) AS source
          ON target.MedicineID = source.MedicineID AND target.SupplierID = source.SupplierID
          WHEN MATCHED THEN
            UPDATE SET SupplyPrice = @Price
          WHEN NOT MATCHED THEN
            INSERT (MedicineID, SupplierID, SupplyPrice)
            VALUES (@MedicineID, @SupplierID, @Price);
        `);
    }

    res.status(201).json({ 
      message: 'Inventory item added/updated successfully',
      MedicineID: finalMedicineID 
    });
  } catch (err) {
    console.error('Add inventory error:', err);
    res.status(500).json({ error: 'Failed to add inventory item', message: err.message });
  }
});

// PUT /api/inventory/:id - Update inventory item (Admin only)
router.put('/inventory/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const pool = await getPool();
    const userResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query('SELECT Role FROM Users WHERE UserID = @userId');

    if (userResult.recordset.length === 0 || userResult.recordset[0].Role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const { MedicineName, Category, CurrentStock, ExpiryDate, SupplierID, Price } = req.body;
    const medicineId = parseInt(req.params.id);

    // Calculate status based on CurrentStock
    let status = 'normal';
    const stock = parseInt(CurrentStock || 0);
    if (stock >= 1 && stock <= 20) {
      status = 'critical';
    } else if (stock >= 21 && stock <= 40) {
      status = 'low';
    } else if (stock >= 41 && stock <= 100) {
      status = 'normal';
    } else if (stock > 100) {
      status = 'normal';
    } else {
      status = 'out-of-stock';
    }

    await pool.request()
      .input('MedicineID', sql.Int, medicineId)
      .input('MedicineName', sql.VarChar(100), MedicineName)
      .input('Category', sql.VarChar(50), Category)
      .input('CurrentStock', sql.Int, stock)
      .input('ExpiryDate', sql.Date, ExpiryDate || null)
      .input('Status', sql.VarChar(20), status)
      .input('TotalQuantity', sql.Int, stock)
      .input('SupplierID', sql.Int, SupplierID || null)
      .query(`
        UPDATE Inventory
        SET MedicineName = @MedicineName,
            Category = @Category,
            CurrentStock = @CurrentStock,
            ExpiryDate = @ExpiryDate,
            Status = @Status,
            TotalQuantity = @TotalQuantity,
            SupplierID = @SupplierID
        WHERE MedicineID = @MedicineID
      `);

    const medicinePrice = Price != null && Price !== '' && !isNaN(parseFloat(Price)) ? parseFloat(Price) : 0.00;
    if (medicinePrice !== 0.00) {
      await pool.request()
        .input('medicineId', sql.Int, medicineId)
        .input('Price', sql.Decimal(10, 2), medicinePrice)
        .query(`UPDATE Medicines SET Price = @Price WHERE ID = @medicineId`);
    }

    // Ensure MedicineSuppliers table is updated to link the medicine to the supplier
    if (SupplierID) {
      await pool.request()
        .input('MedicineID', sql.Int, medicineId)
        .input('SupplierID', sql.Int, SupplierID)
        .input('Price', sql.Decimal(10, 2), medicinePrice)
        .query(`
          MERGE MedicineSuppliers AS target
          USING (SELECT @MedicineID AS MedicineID, @SupplierID AS SupplierID) AS source
          ON target.MedicineID = source.MedicineID AND target.SupplierID = source.SupplierID
          WHEN MATCHED THEN
            UPDATE SET SupplyPrice = @Price
          WHEN NOT MATCHED THEN
            INSERT (MedicineID, SupplierID, SupplyPrice)
            VALUES (@MedicineID, @SupplierID, @Price);
        `);
    }

    res.json({ message: 'Inventory item updated successfully' });
  } catch (err) {
    console.error('Update inventory error:', err);
    res.status(500).json({ error: 'Failed to update inventory item', message: err.message });
  }
});

// DELETE /api/inventory/:id - Delete inventory item (Admin only)
router.delete('/inventory/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const pool = await getPool();
    const userResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query('SELECT Role FROM Users WHERE UserID = @userId');

    if (userResult.recordset.length === 0 || userResult.recordset[0].Role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const medicineId = parseInt(req.params.id);

    const deleteResult = await pool.request()
      .input('MedicineID', sql.Int, medicineId)
      .query('DELETE FROM Inventory WHERE MedicineID = @MedicineID');

    console.log('Delete result:', deleteResult);

    res.json({ message: 'Inventory item deleted successfully' });
  } catch (err) {
    console.error('Delete inventory error:', err);
    res.status(500).json({ error: 'Failed to delete inventory item', message: err.message });
  }
});

module.exports = router;
