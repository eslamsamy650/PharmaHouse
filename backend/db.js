const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER ,
  database: process.env.DB_NAME ,
  driver: 'ODBC Driver 17 for SQL Server',
  options: {
    trustServerCertificate: true,
    encrypt: false,
    trustedConnection: true // Needed for Integrated Security
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

async function connectDB() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log('✅ SQL Server connected to', config.database);
    }
    return pool;
  } catch (err) {
    console.error('❌ DB connection error:', err.message);
    throw err;
  }
}

async function getPool() {
  if (!pool) {
    try {
      await connectDB();
    } catch (err) {
      // If connection fails, try to reconnect
      pool = null;
      throw new Error(`Database connection failed: ${err.message}. Please ensure SQL Server is running and the database exists.`);
    }
  }
  return pool;
}

async function query(queryString, params = []) {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Add parameters if provided
    params.forEach(param => {
      request.input(param.name, param.type || sql.VarChar, param.value);
    });
    
    const result = await request.query(queryString);
    return result;
  } catch (err) {
    // If connection is lost, reset pool and throw
    if (err.code === 'ESOCKET' || err.code === 'ECONNREFUSED' || err.message.includes('connection')) {
      pool = null;
    }
    console.error('Query error:', err.message);
    throw err;
  }
}

// Test database connection
async function testConnection() {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT @@VERSION AS Version');
    console.log('✅ Database connection test successful');
    return true;
  } catch (err) {
    console.error('❌ Database connection test failed:', err.message);
    return false;
  }
}

module.exports = { connectDB, getPool, query, sql, testConnection };
