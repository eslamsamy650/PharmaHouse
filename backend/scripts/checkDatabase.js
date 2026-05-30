const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME ,
  options: {
    trustServerCertificate: true,
    encrypt: false
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  port: parseInt(process.env.DB_PORT) || 1433
};

async function checkTables() {
  try {
    await sql.connect(config);
    console.log('✅ Connected to database:', config.database);
    
    // Check if Users table exists
    const result = await sql.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_CATALOG = '${config.database}'
      ORDER BY TABLE_NAME
    `);
    
    const tables = result.recordset.map(row => row.TABLE_NAME);
    
    console.log('\n📊 Existing tables:');
    if (tables.length === 0) {
      console.log('   ⚠️  No tables found!');
    } else {
      tables.forEach(table => {
        console.log(`   ✓ ${table}`);
      });
    }
    
    // Check for required tables
    const requiredTables = ['Users', 'Medicines', 'Companies', 'Suppliers', 'MedicineBatches', 'Inventory', 'Orders', 'Invoices'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing required tables:');
      missingTables.forEach(table => {
        console.log(`   ✗ ${table}`);
      });
      console.log('\n⚠️  Please run the SQL script: database/SQL.sql');
      console.log('   Or use: sqlcmd -S localhost -U sa -P your_password -i database/SQL.sql');
    } else {
      console.log('\n✅ All required tables exist!');
    }
    
    // Check Users table structure if it exists
    if (tables.includes('Users')) {
      const usersColumns = await sql.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Users'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('\n📋 Users table structure:');
      usersColumns.recordset.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : ''}`);
      });
    }
    
    await sql.close();
    process.exit(missingTables.length > 0 ? 1 : 0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkTables();
