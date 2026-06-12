const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

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
    const { PharmacyID, SupplierID, items, TotalAmount, redeemedPoints } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      
      // Loyalty redemption
      let finalTotalAmount = TotalAmount;
      let pointsToRedeem = 0;
      if (redeemedPoints && redeemedPoints > 0) {
        const userPointsResult = await transaction.request()
          .input('checkUserId', sql.Int, req.user.UserID)
          .query(`SELECT ISNULL(RewardPoints, 0) as RewardPoints FROM Users WHERE UserID = @checkUserId`);
          
        const userPoints = userPointsResult.recordset[0].RewardPoints;
        if (userPoints < redeemedPoints) {
           await transaction.rollback();
           return res.status(400).json({ error: 'Insufficient reward points' });
        }
        
        pointsToRedeem = redeemedPoints;
        const discount = pointsToRedeem * 1; // 1 point = 1 EGP
        finalTotalAmount = Math.max(0, TotalAmount - discount);
      }

      // ── STOCK VALIDATION ──────────────────────────────────────────────────
      // Check EVERY item before writing anything to the database.
      // If any medicine has insufficient stock, reject the whole order immediately.
      for (const item of items) {
        const medicineId = item.MedicineID || item.id;
        const quantity   = item.Quantity   || item.quantity || 1;

        const stockCheck = await transaction.request()
          .input('stockMedicineId', sql.Int, medicineId)
          .query(`
            SELECT MedicineName, CurrentStock
            FROM Inventory
            WHERE MedicineID = @stockMedicineId
          `);

        // Medicine not found in inventory at all
        if (stockCheck.recordset.length === 0) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Medicine ID ${medicineId} not found in inventory`
          });
        }

        const { MedicineName, CurrentStock } = stockCheck.recordset[0];

        // Not enough stock
        if (CurrentStock < quantity) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Insufficient stock for "${MedicineName}". ` +
                   `Requested: ${quantity}, Available: ${CurrentStock}`
          });
        }
      }
      // ── END STOCK VALIDATION ───────────────────────────────────────────────

      // Create order
      const orderResult = await transaction.request()
      .input('UserID', sql.Int, req.user.UserID)
      .input('PharmacyID', sql.Int, PharmacyID || null)
      .input('SupplierID', sql.Int, SupplierID || null)
      .input('OrderDate', sql.Date, new Date())
      .input('TotalAmount', sql.Decimal(10, 2), finalTotalAmount)
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

      const invoiceResult = await transaction.request()
        .input('OrderID', sql.Int, orderId)
        .input('InvoiceDate', sql.Date, new Date())
        .input('TotalAmount', sql.Decimal(10, 2), finalTotalAmount)
        .input('PaymentStatus', sql.VarChar, finalTotalAmount <= 0 ? 'Paid' : 'Pending')
        .query(`
          INSERT INTO Invoices (OrderID, InvoiceDate, TotalAmount, PaymentStatus)
          OUTPUT INSERTED.InvoiceID
          VALUES (@OrderID, @InvoiceDate, @TotalAmount, @PaymentStatus)
        `);

      const invoiceId = invoiceResult.recordset[0].InvoiceID;

      if (pointsToRedeem > 0) {
        // Record redemption in ledger
        await transaction.request()
          .input('ledgerUserId', sql.Int, req.user.UserID)
          .input('ledgerOrderId', sql.Int, orderId)
          .input('pointsRedeemed', sql.Int, pointsToRedeem)
          .query(`
            INSERT INTO RewardPoints (UserID, OrderID, PointsRedeemed)
            VALUES (@ledgerUserId, @ledgerOrderId, @pointsRedeemed)
          `);

        // Update User's balance
        await transaction.request()
          .input('updateUserId', sql.Int, req.user.UserID)
          .input('deductPoints', sql.Int, pointsToRedeem)
          .query(`
            UPDATE Users
            SET RewardPoints = RewardPoints - @deductPoints
            WHERE UserID = @updateUserId
          `);
      }

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
        isFullyPaid: finalTotalAmount <= 0,
        redirectTo: finalTotalAmount <= 0 ? '/orders.html' : '/payments.html'
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

module.exports = router;
