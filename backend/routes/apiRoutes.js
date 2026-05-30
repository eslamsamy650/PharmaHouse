const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../db');
const { authenticateToken } = require('../middleware/auth');

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
        .input('Description', sql.Text, `Inventory item: ${MedicineName}`)
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

    const medicinePrice = Price != null && Price !== '' && !isNaN(parseFloat(Price)) ? parseFloat(Price) : null;
    if (medicinePrice !== null) {
      await pool.request()
        .input('medicineId', sql.Int, medicineId)
        .input('Price', sql.Decimal(10, 2), medicinePrice)
        .query(`UPDATE Medicines SET Price = @Price WHERE ID = @medicineId`);
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

// ==================== ORDERS ROUTES ====================

// GET /api/orders - Get orders for current logged-in user only
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query(`
        SELECT 
          o.OrderID,
          o.UserID,
          o.PharmacyID,
          o.SupplierID,
          p.Name AS PharmacyName,
          s.Name AS SupplierName,
          o.OrderDate,
          o.TotalAmount,
          i.PaymentStatus,
          i.InvoiceDate,
          i.InvoiceID
        FROM Orders o
        LEFT JOIN Pharmacies p ON o.PharmacyID = p.ID
        LEFT JOIN Suppliers s ON o.SupplierID = s.SupplierID
        LEFT JOIN Invoices i ON o.OrderID = i.OrderID
        WHERE o.UserID = @userId
        ORDER BY o.OrderDate DESC
      `);

    // Get order items for each order
    const orders = result.recordset;
    for (const order of orders) {
      const itemsResult = await pool.request()
        .input('orderId', sql.Int, order.OrderID)
        .query(`
          SELECT 
            oi.OrderItemID,
            oi.MedicineID,
            oi.Quantity,
            oi.UnitPrice,
            m.Name AS MedicineName
          FROM OrderItems oi
          LEFT JOIN Medicines m ON oi.MedicineID = m.ID
          WHERE oi.OrderID = @orderId
        `);
      order.items = itemsResult.recordset;
      order.itemCount = itemsResult.recordset.length;
    }

    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to get orders', message: err.message });
  }
});

// POST /api/orders - Create new order and reduce stock
router.post('/orders', authenticateToken, async (req, res) => {
  try {
    const { PharmacyID, SupplierID, items, TotalAmount } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      
      

      // Create order
  const orderResult = await transaction.request()
  .input('UserID', sql.Int, req.user.UserID)
  .input('PharmacyID', sql.Int, PharmacyID || null)
  .input('SupplierID', sql.Int, SupplierID || null)
  .input('OrderDate', sql.Date, new Date())
  .input('TotalAmount', sql.Decimal(10, 2), TotalAmount)
  .query(`
    INSERT INTO Orders (
      UserID,
      PharmacyID,
      SupplierID,
      OrderDate,
      TotalAmount
    )
    OUTPUT INSERTED.OrderID
    VALUES (
      @UserID,
      @PharmacyID,
      @SupplierID,
      @OrderDate,
      @TotalAmount
    )
  `);

  const orderId = orderResult.recordset[0].OrderID;
    

      // Store order items
      for (const item of items) {
        const medicineId = item.MedicineID || item.id;
        const quantity = item.Quantity || item.quantity || 1;
        const unitPrice = item.UnitPrice || item.unitPrice || 0;

        await transaction.request()
          .input('OrderID', sql.Int, orderId)
          .input('MedicineID', sql.Int, medicineId)
          .input('Quantity', sql.Int, quantity)
          .input('UnitPrice', sql.Decimal(10, 2), unitPrice)
          .query(`
            INSERT INTO OrderItems ( OrderID, MedicineID, Quantity, UnitPrice)
            VALUES ( @OrderID, @MedicineID, @Quantity, @UnitPrice)
          `);
      }

   

      await transaction.request()
        .input('OrderID', sql.Int, orderId)
        .input('InvoiceDate', sql.Date, new Date())
        .input('TotalAmount', sql.Decimal(10, 2), TotalAmount)
        .input('PaymentStatus', sql.VarChar, 'Pending')
        .query(`
          INSERT INTO Invoices (OrderID, InvoiceDate, TotalAmount, PaymentStatus)
          VALUES (@OrderID, @InvoiceDate, @TotalAmount, @PaymentStatus)
        `);

      // Reduce stock from Inventory and MedicineBatches
      for (const item of items) {
        const medicineId = item.MedicineID || item.id;
        const quantity = item.Quantity || item.quantity || 1;

        // Update Inventory
        await transaction.request()
          .input('medicineId', sql.Int, medicineId)
          .input('quantity', sql.Int, quantity)
          .query(`
            UPDATE Inventory
            SET CurrentStock = CurrentStock - @quantity,
                TotalQuantity = TotalQuantity - @quantity,
                Status = CASE 
                  WHEN (CurrentStock - @quantity) >= 1 AND (CurrentStock - @quantity) <= 20 THEN 'critical'
                  WHEN (CurrentStock - @quantity) >= 21 AND (CurrentStock - @quantity) <= 40 THEN 'low'
                  WHEN (CurrentStock - @quantity) >= 41 AND (CurrentStock - @quantity) <= 100 THEN 'normal'
                  WHEN (CurrentStock - @quantity) > 100 THEN 'normal'
                  ELSE 'out-of-stock'
                END
            WHERE MedicineID = @medicineId AND CurrentStock >= @quantity
          `);

        // Update MedicineBatches (reduce from batches, oldest first)
       let remainingQuantity = quantity;

  while (remainingQuantity > 0) {

  // Get oldest batch with stock
  const batchResult = await transaction.request()
    .input('medicineId', sql.Int, medicineId)
    .query(`
      SELECT TOP 1 BatchID, Quantity
      FROM MedicineBatches
      WHERE MedicineID = @medicineId
        AND Quantity > 0
      ORDER BY ExpiryDate ASC
    `);

  const batch = batchResult.recordset[0];

  // No batch found
  if (!batch) {
    throw new Error('Not enough batch stock available');
  }

  // Amount to deduct from this batch
  const amountToDeduct = Math.min(
    remainingQuantity,
    batch.Quantity
  );

  // Update batch
  await transaction.request()
    .input('batchId', sql.Int, batch.BatchID)
    .input('amount', sql.Int, amountToDeduct)
    .query(`
      UPDATE MedicineBatches
      SET Quantity = Quantity - @amount
      WHERE BatchID = @batchId
    `);

  // Reduce remaining order quantity
  remainingQuantity -= amountToDeduct;
}
      }

      await transaction.commit();

      res.status(201).json({
        message: 'Order created successfully',
        orderId,
        invoiceId,
        redirectTo: '/payments.html'
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order', message: err.message });
  }
});

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

// ==================== PHARMACY PROFILE ROUTES ====================

// GET /api/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();

    // Get user info
    const userResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query(`
        SELECT UserID, Username, Email, FullName, Role
        FROM Users
        WHERE UserID = @userId
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.recordset[0];

    // Get pharmacy info by matching email (since pharmacy email matches user email during registration)
    // Check if LicenseNumber and OperatingHours columns exist first
    let pharmacyResult;
    try {
      pharmacyResult = await pool.request()
        .input('email', sql.VarChar, user.Email)
        .query(`
          SELECT 
            ID, 
            Name, 
            Address, 
            Phone, 
            Email, 
            SocialMedia, 
            Website, 
            DeliveryService, 
            LicenseNumber,
            OperatingHours,
            EstablishedDate
          FROM Pharmacies
          WHERE Email = @email
        `);
    } catch (err) {
      // If columns don't exist, try without them
      const errMessage = err.message || '';
      if (errMessage.includes('LicenseNumber') || errMessage.includes('OperatingHours') || errMessage.includes('EstablishedDate') || errMessage.includes('Invalid column name')) {
        pharmacyResult = await pool.request()
          .input('email', sql.VarChar, user.Email)
          .query(`
            SELECT 
              ID, 
              Name, 
              Address, 
              Phone, 
              Email, 
              SocialMedia, 
              Website, 
              DeliveryService
            FROM Pharmacies
            WHERE Email = @email
          `);
      } else {
        throw err;
      }
    }

    const pharmacy = pharmacyResult.recordset[0] || null;

    // Ensure LicenseNumber, OperatingHours, and EstablishedDate are always present (even if null/undefined)
    if (pharmacy) {
      if (pharmacy.LicenseNumber === undefined) {
        pharmacy.LicenseNumber = null;
      }
      if (pharmacy.OperatingHours === undefined) {
        pharmacy.OperatingHours = null;
      }
      if (pharmacy.EstablishedDate === undefined) {
        pharmacy.EstablishedDate = null;
      }
    }

    // Get order statistics
    const statsResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query(`
        SELECT 
          COUNT(DISTINCT o.OrderID) AS TotalOrders,
          (SELECT COUNT(DISTINCT MedicineID) FROM MedicineBatches) AS TotalMedicines,
          SUM(CASE WHEN o.OrderDate >= DATEADD(MONTH, -1, GETDATE()) THEN 1 ELSE 0 END) AS OrdersThisMonth
        FROM Orders o
        WHERE o.UserID = @userId
      `);

    const stats = statsResult.recordset[0] || { TotalOrders: 0, TotalMedicines: 0, OrdersThisMonth: 0 };

    res.json({ user, pharmacy, stats });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile', message: err.message });
  }
});

// PUT /api/profile - Update user profile and pharmacy details
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, email, address, phone, socialMedia, website, deliveryService, licenseNumber, operatingHours, establishedDate } = req.body;
    const pool = await getPool();

    // Update user info (Owner is stored as FullName in Users table)
    await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .input('fullName', sql.VarChar, fullName || null)
      .input('email', sql.VarChar, email || null)
      .query(`
        UPDATE Users
        SET FullName = ISNULL(@fullName, FullName),
            Email = ISNULL(@email, Email)
        WHERE UserID = @userId
      `);

    // Update pharmacy info if user has associated pharmacy
    const userResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query(`SELECT Email FROM Users WHERE UserID = @userId`);

    if (userResult.recordset.length > 0) {
      const userEmail = userResult.recordset[0].Email;

      // Process values - trim if string, convert empty strings to null for database
      const processValue = (val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed === '' ? null : trimmed;
        }
        return val;
      };

      // Process date value - validate and convert to Date object or null
      const processDateValue = (val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed === '') return null;
          // Validate date format (YYYY-MM-DD)
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(trimmed)) {
            return trimmed; // Return as string in YYYY-MM-DD format for SQL Server
          }
          return null;
        }
        return val;
      };

      const addressValue = processValue(address);
      const phoneValue = processValue(phone);
      const socialMediaValue = processValue(socialMedia);
      const websiteValue = processValue(website);
      const deliveryServiceValue = processValue(deliveryService);
      const licenseNumberValue = processValue(licenseNumber);
      const operatingHoursValue = processValue(operatingHours);
      const establishedDateValue = processDateValue(establishedDate);


      // First, verify the pharmacy exists and get its current values
      const checkPharmacy = await pool.request()
        .input('email', sql.VarChar(100), userEmail)
        .query(`SELECT ID, Name, Email, LicenseNumber, OperatingHours, EstablishedDate FROM Pharmacies WHERE Email = @email`);

      if (checkPharmacy.recordset.length === 0) {
        throw new Error(`Pharmacy not found with email: ${userEmail}`);
      }


      // Build the update request with all parameters
      // Use explicit parameter setting to ensure values are passed correctly
      const updateRequest = pool.request()
        .input('email', sql.VarChar(100), userEmail);

      // Add all inputs - use VarChar with explicit lengths matching database schema
      // LicenseNumber: VARCHAR(50), OperatingHours: VARCHAR(100), EstablishedDate: DATE
      updateRequest.input('address', sql.VarChar(255), addressValue);
      updateRequest.input('phone', sql.VarChar(20), phoneValue);
      updateRequest.input('socialMedia', sql.VarChar(255), socialMediaValue);
      updateRequest.input('website', sql.VarChar(255), websiteValue);
      updateRequest.input('deliveryService', sql.VarChar(100), deliveryServiceValue);
      updateRequest.input('licenseNumber', sql.VarChar(50), licenseNumberValue);
      updateRequest.input('operatingHours', sql.VarChar(100), operatingHoursValue);
      updateRequest.input('establishedDate', sql.Date, establishedDateValue);

      // Execute update - use direct assignment (SQL Server will handle NULL correctly)
      // Build query with explicit parameter values for debugging
      const updateQuery = `
        UPDATE Pharmacies
        SET Address = @address,
            Phone = @phone,
            SocialMedia = @socialMedia,
            Website = @website,
            DeliveryService = @deliveryService,
            LicenseNumber = @licenseNumber,
            OperatingHours = @operatingHours,
            EstablishedDate = @establishedDate
        WHERE Email = @email
      `;


      try {
        const updateResult = await updateRequest.query(updateQuery);

        const rowsAffected = updateResult.rowsAffected ? updateResult.rowsAffected[0] : 0;

        if (rowsAffected === 0) {
          throw new Error('Update failed: No rows affected. Email may not match any pharmacy record.');
        }

        // Immediately verify the update was successful by querying the database
        const verifyResult = await pool.request()
          .input('email', sql.VarChar(100), userEmail)
          .query(`
            SELECT ID, Name, Email, LicenseNumber, OperatingHours, EstablishedDate, Address, Phone
            FROM Pharmacies 
            WHERE Email = @email
          `);

        if (verifyResult.recordset.length > 0) {
          const updated = verifyResult.recordset[0];

          // Return the updated pharmacy data in the response
          res.json({
            message: 'Profile updated successfully',
            pharmacy: updated
          });
        } else {
          throw new Error('Pharmacy not found after update');
        }
      } catch (updateErr) {

        // If columns don't exist, provide helpful error message
        if (updateErr.message && (updateErr.message.includes('LicenseNumber') || updateErr.message.includes('OperatingHours') || updateErr.message.includes('Invalid column name'))) {
          throw new Error('LicenseNumber or OperatingHours columns do not exist in Pharmacies table. Please run the addPharmacyBasicFields.sql script first.');
        }
        throw updateErr;
      }
    } else {
      res.json({ message: 'Profile updated successfully (no pharmacy associated)' });
    }
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile', message: err.message });
  }
});

// GET /api/pharmacies - Get all pharmacies
router.get('/pharmacies', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM Pharmacies ORDER BY Name
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get pharmacies error:', err);
    res.status(500).json({ error: 'Failed to get pharmacies', message: err.message });
  }
});

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

// ==================== PAYMENTS/INVOICES ROUTES ====================

// GET /api/invoices - Get all invoices
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query(`
        SELECT 
          i.InvoiceID,
          i.OrderID,
          i.InvoiceDate,
          i.TotalAmount,
          i.PaymentStatus,
          o.OrderDate,
          o.UserID,
          p.Name AS PharmacyName
        FROM Invoices i
        INNER JOIN Orders o ON i.OrderID = o.OrderID
        LEFT JOIN Pharmacies p ON o.PharmacyID = p.ID
        WHERE o.UserID = @userId
        ORDER BY i.InvoiceDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get invoices error:', err);
    res.status(500).json({ error: 'Failed to get invoices', message: err.message });
  }
});

// GET /api/invoices/:id - Get single invoice
router.get('/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('invoiceId', sql.Int, req.params.id)
      .input('userId', sql.Int, req.user.UserID)
      .query(`
        SELECT 
          i.*,
          o.OrderDate,
          o.UserID,
          p.Name AS PharmacyName
        FROM Invoices i
        INNER JOIN Orders o ON i.OrderID = o.OrderID
        LEFT JOIN Pharmacies p ON o.PharmacyID = p.ID
        WHERE i.InvoiceID = @invoiceId AND o.UserID = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get invoice error:', err);
    res.status(500).json({ error: 'Failed to get invoice', message: err.message });
  }
});

// PUT /api/invoices/:id/payment - Update invoice payment status
router.put('/invoices/:id/payment', authenticateToken, async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    const pool = await getPool();

    // Verify invoice belongs to user
    const verifyResult = await pool.request()
      .input('invoiceId', sql.Int, req.params.id)
      .input('userId', sql.Int, req.user.UserID)
      .query(`
        SELECT i.InvoiceID
        FROM Invoices i
        INNER JOIN Orders o ON i.OrderID = o.OrderID
        WHERE i.InvoiceID = @invoiceId AND o.UserID = @userId
      `);

    if (verifyResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await pool.request()
      .input('invoiceId', sql.Int, req.params.id)
      .input('paymentStatus', sql.VarChar, paymentStatus || 'Paid')
      .query(`
        UPDATE Invoices
        SET PaymentStatus = @paymentStatus
        WHERE InvoiceID = @invoiceId
      `);

    res.json({ message: 'Payment status updated successfully' });
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Failed to update payment', message: err.message });
  }
});

module.exports = router;
