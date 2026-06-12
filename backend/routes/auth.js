const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { getPool, sql } = require("../db");
const { generateToken } = require("../middleware/auth");
const { registerLimiter, loginLimiter } = require("../middleware/rateLimiter");

// POST /api/auth/register
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { username, email, password, fullName, role, address, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const pool = await getPool();
    
    // Check if user already exists
    const checkUser = await pool.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .query('SELECT UserID FROM Users WHERE Username = @username OR Email = @email');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    // Check if pharmacy with this email already exists
    const checkPharmacy = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT ID FROM Pharmacies WHERE Email = @email');

    if (checkPharmacy.recordset.length > 0) {
      return res.status(400).json({ message: "A pharmacy with this email already exists" });
    }

    // Check if ID column is IDENTITY (before transaction)
    const checkIdentity = await pool.request().query(`
      SELECT is_identity 
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('Pharmacies') 
      AND name = 'ID'
    `);
    
    const isIdentity = checkIdentity.recordset.length > 0 && checkIdentity.recordset[0].is_identity === true;
    
    // Get next ID if not IDENTITY
    let nextPharmacyId = null;
    if (!isIdentity) {
      const maxIdResult = await pool.request().query('SELECT ISNULL(MAX(ID), 0) + 1 AS NextID FROM Pharmacies');
      nextPharmacyId = maxIdResult.recordset[0].NextID;
    }

    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const userRequest = new sql.Request(transaction);
      const userResult = await userRequest
        .input('username', sql.VarChar, username)
        .input('passwordHash', sql.VarChar, passwordHash)
        .input('email', sql.VarChar, email || null)
        .input('fullName', sql.VarChar, fullName || username)
        .input('role', sql.VarChar, role || 'user')
        .query(`
          INSERT INTO Users (Username, PasswordHash, Email, FullName, Role)
          OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email, INSERTED.FullName, INSERTED.Role
          VALUES (@username, @passwordHash, @email, @fullName, @role)
        `);

      const user = userResult.recordset[0];

      // Create pharmacy entry
      const pharmacyRequest = new sql.Request(transaction);
      let pharmacyResult;
      
      if (isIdentity) {
        // ID is IDENTITY, don't include it in INSERT
        pharmacyResult = await pharmacyRequest
          .input('name', sql.VarChar, fullName || username)
          .input('address', sql.VarChar, address || 'Address not provided')
          .input('phone', sql.VarChar, phone || null)
          .input('email', sql.VarChar, email)
          .query(`
            INSERT INTO Pharmacies (Name, Address, Phone, Email)
            OUTPUT INSERTED.ID, INSERTED.Name, INSERTED.Address, INSERTED.Phone, INSERTED.Email
            VALUES (@name, @address, @phone, @email)
          `);
      } else {
        // ID is not IDENTITY, include it in INSERT
        pharmacyResult = await pharmacyRequest
          .input('id', sql.Int, nextPharmacyId)
          .input('name', sql.VarChar, fullName || username)
          .input('address', sql.VarChar, address || 'Address not provided')
          .input('phone', sql.VarChar, phone || null)
          .input('email', sql.VarChar, email)
          .query(`
            INSERT INTO Pharmacies (ID, Name, Address, Phone, Email)
            OUTPUT INSERTED.ID, INSERTED.Name, INSERTED.Address, INSERTED.Phone, INSERTED.Email
            VALUES (@id, @name, @address, @phone, @email)
          `);
      }

      const pharmacy = pharmacyResult.recordset[0];

      // Commit transaction
      await transaction.commit();

      const token = generateToken(user);

      res.status(201).json({
        message: "Registration successful",
        token,
        user: {
          userId: user.UserID,
          username: user.Username,
          email: user.Email,
          fullName: user.FullName,
          role: user.Role
        },
        pharmacy: {
          id: pharmacy.ID,
          name: pharmacy.Name,
          address: pharmacy.Address,
          phone: pharmacy.Phone,
          email: pharmacy.Email
        }
      });
    } catch (err) {
      // Rollback transaction on error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const pool = await getPool();
    
    // Find user by email or username
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT UserID, Username, Email, PasswordHash, FullName, Role
        FROM Users
        WHERE Email = @email OR Username = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.recordset[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.PasswordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        userId: user.UserID,
        username: user.Username,
        email: user.Email,
        fullName: user.FullName,
        role: user.Role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// GET /api/auth/me - Get current user
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET ;
    const decoded = jwt.verify(token, JWT_SECRET);

    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, decoded.userId)
      .query('SELECT UserID, Username, Email, FullName, Role FROM Users WHERE UserID = @userId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: result.recordset[0] });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// PUT /api/auth/change-password - Change user password
router.put("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET ;
    const decoded = jwt.verify(token, JWT_SECRET);

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All password fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirmation do not match" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from current password" });
    }

    const pool = await getPool();
    
    // Get current user with password hash
    const userResult = await pool.request()
      .input('userId', sql.Int, decoded.userId)
      .query('SELECT UserID, PasswordHash FROM Users WHERE UserID = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.recordset[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.PasswordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.request()
      .input('userId', sql.Int, decoded.userId)
      .input('newPasswordHash', sql.VarChar, newPasswordHash)
      .query('UPDATE Users SET PasswordHash = @newPasswordHash WHERE UserID = @userId');

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Failed to change password", error: err.message });
  }
});

module.exports = router;
