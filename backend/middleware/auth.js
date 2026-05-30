const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET ;

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists in database
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, decoded.userId)
      .query('SELECT UserID, Username, Email, FullName, Role FROM Users WHERE UserID = @userId');
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = result.recordset[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
}

function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.UserID,
      username: user.Username,
      email: user.Email,
      role: user.Role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authenticateToken, generateToken };
