const express = require('express');
const router = express.Router();
const { getPool, query, sql } = require('../../db');
const { authenticateToken } = require('../../middleware/auth');

// ==================== PHARMACY PROFILE ROUTES ====================

// GET /api/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();

    // Get user info
    const userResult = await pool.request()
      .input('userId', sql.Int, req.user.UserID)
      .query(`
        SELECT UserID, Username, Email, FullName, Role, ISNULL(RewardPoints, 0) AS RewardPoints
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

module.exports = router;
