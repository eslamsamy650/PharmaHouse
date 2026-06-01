const sql = require('mssql');
require('dotenv').config({ path: '../.env' });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    trustServerCertificate: true,
    encrypt: false
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  port: parseInt(process.env.DB_PORT) || 1433
};

async function createTable() {
  try {
    await sql.connect(config);
    console.log('Connected to database:', config.database);
    
    // Check if Donations table exists
    const checkResult = await sql.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_CATALOG = '${config.database}'
      AND TABLE_NAME = 'Donations'
    `);
    
    if (checkResult.recordset.length === 0) {
      console.log('Creating Donations table...');
      await sql.query(`
        CREATE TABLE Donations (
            DonationID INT IDENTITY(1,1) PRIMARY KEY,
            InvoiceID INT NOT NULL UNIQUE,
            DonationAmount DECIMAL(18, 2) NOT NULL,
            DonationDate DATETIME DEFAULT GETDATE(),
            CONSTRAINT FK_Donations_Invoices FOREIGN KEY (InvoiceID) REFERENCES Invoices(InvoiceID)
        );
      `);
      console.log('Donations table created successfully.');
      
      console.log('Creating index on DonationDate...');
      await sql.query(`
        CREATE NONCLUSTERED INDEX IX_Donations_DonationDate ON Donations(DonationDate);
      `);
      console.log('Index created successfully.');
    } else {
      console.log('Donations table already exists.');
    }
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createTable();
