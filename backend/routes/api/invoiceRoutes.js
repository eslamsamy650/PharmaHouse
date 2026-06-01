const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

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
        SELECT i.InvoiceID, i.PaymentStatus, i.TotalAmount
        FROM Invoices i
        INNER JOIN Orders o ON i.OrderID = o.OrderID
        WHERE i.InvoiceID = @invoiceId AND o.UserID = @userId
      `);

    if (verifyResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const currentStatus = verifyResult.recordset[0].PaymentStatus;
    const totalAmount = verifyResult.recordset[0].TotalAmount;
    const newStatus = paymentStatus || 'Paid';

    // Enforce Option A: Prevent Reversion from 'Paid'
    if (currentStatus === 'Paid' && newStatus !== 'Paid') {
      return res.status(409).json({ message: 'Paid invoices cannot be reverted.' });
    }

    // Check if transitioning to 'Paid'
    if (newStatus === 'Paid' && currentStatus !== 'Paid') {
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Defensive check for existing Donation
        const existingDonation = await transaction.request()
          .input('invoiceId', sql.Int, req.params.id)
          .query(`SELECT DonationID FROM Donations WHERE InvoiceID = @invoiceId`);
        
        if (existingDonation.recordset.length > 0) {
          await transaction.rollback();
          return res.status(409).json({ error: 'Donation already exists for this invoice' });
        }

        // Update Invoice Status
        await transaction.request()
          .input('invoiceId', sql.Int, req.params.id)
          .input('paymentStatus', sql.VarChar, 'Paid')
          .query(`
            UPDATE Invoices
            SET PaymentStatus = @paymentStatus
            WHERE InvoiceID = @invoiceId
          `);

        // Insert Donation (Amount = 2.5% of Invoice Total)
        const donationAmount = totalAmount * 0.025;
        await transaction.request()
          .input('invoiceId', sql.Int, req.params.id)
          .input('donationAmount', sql.Decimal(18, 2), donationAmount)
          .query(`
            INSERT INTO Donations (InvoiceID, DonationAmount)
            VALUES (@invoiceId, @donationAmount)
          `);

        await transaction.commit();
        return res.json({ message: 'Payment status updated and donation recorded successfully' });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } else {
      // Normal update for other statuses
      await pool.request()
        .input('invoiceId', sql.Int, req.params.id)
        .input('paymentStatus', sql.VarChar, newStatus)
        .query(`
          UPDATE Invoices
          SET PaymentStatus = @paymentStatus
          WHERE InvoiceID = @invoiceId
        `);

      res.json({ message: 'Payment status updated successfully' });
    }
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Failed to update payment', message: err.message });
  }
});

module.exports = router;
