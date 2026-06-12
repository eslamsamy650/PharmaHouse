-- ============================================================
-- PharmaHouse — Clean Seed Script (Bulletproof Version)
-- ============================================================
-- PURPOSE : Wipe all test data and insert a fresh clean dataset.
-- REQUIRES: CancerPharmacyDB must already exist with base tables.
--           (Base tables were created by SQL.sql)
-- THIS SCRIPT ALSO:
--   - Creates Donations table if it doesn't exist yet
--   - Creates RewardPoints table if it doesn't exist yet
--   - Adds RewardPoints column to Users if it doesn't exist yet
-- HOW TO RUN:
--   1. Open this file in SSMS
--   2. Make sure "CancerPharmacyDB" is selected in the top-left dropdown
--   3. Press F5 (or click Execute)
-- ============================================================

USE CancerPharmacyDB;
GO

-- ============================================================
-- STEP 1: CREATE MISSING TABLES (safe — only runs if not there)
--         The migration scripts (createDonationsTable.js,
--         createLoyaltyTables.js) may not have been run yet.
--         We handle that here directly.
-- ============================================================

-- 1A: Add RewardPoints column to Users if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Users') AND name = 'RewardPoints'
)
BEGIN
    ALTER TABLE Users ADD RewardPoints INT DEFAULT 0;
    PRINT 'Created: RewardPoints column added to Users table.';
END
ELSE
    PRINT 'OK: RewardPoints column already exists on Users.';
GO

-- 1B: Create Donations table if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'Donations'
)
BEGIN
    CREATE TABLE Donations (
        DonationID     INT IDENTITY(1,1) PRIMARY KEY,
        InvoiceID      INT NOT NULL UNIQUE,
        DonationAmount DECIMAL(18, 2) NOT NULL,
        DonationDate   DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Donations_Invoices
            FOREIGN KEY (InvoiceID) REFERENCES Invoices(InvoiceID)
    );
    CREATE NONCLUSTERED INDEX IX_Donations_DonationDate
        ON Donations(DonationDate);
    PRINT 'Created: Donations table and index.';
END
ELSE
    PRINT 'OK: Donations table already exists.';
GO

-- 1C: Create RewardPoints table if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'RewardPoints'
)
BEGIN
    CREATE TABLE RewardPoints (
        RewardPointID  INT IDENTITY(1,1) PRIMARY KEY,
        UserID         INT NOT NULL,
        OrderID        INT NULL,
        PointsEarned   INT DEFAULT 0,
        PointsRedeemed INT DEFAULT 0,
        TransactionDate DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_RewardPoints_Users
            FOREIGN KEY (UserID)  REFERENCES Users(UserID),
        CONSTRAINT FK_RewardPoints_Orders
            FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    );
    PRINT 'Created: RewardPoints table.';
END
ELSE
    PRINT 'OK: RewardPoints table already exists.';
GO

-- ============================================================
-- STEP 2: DELETE all data — safe FK order
--         Children deleted before parents.
--         Optional tables (Donations, RewardPoints) wrapped in
--         IF EXISTS so the script never crashes if they're absent.
-- ============================================================

-- Leaf tables first (nothing depends on them)
DELETE FROM MedicineAlerts;

IF OBJECT_ID('Donations', 'U')    IS NOT NULL DELETE FROM Donations;
IF OBJECT_ID('RewardPoints', 'U') IS NOT NULL DELETE FROM RewardPoints;

-- Order children
DELETE FROM OrderItems;

-- Orders and invoices
DELETE FROM Invoices;
DELETE FROM Orders;

-- Inventory layer
DELETE FROM Inventory;
DELETE FROM MedicineBatches;
DELETE FROM MedicineSuppliers;

-- Core data
DELETE FROM Medicines;
DELETE FROM Suppliers;
DELETE FROM Warehouses;
DELETE FROM Companies;

-- Users and pharmacies (no FK parents)
DELETE FROM Pharmacies;
DELETE FROM Users;

PRINT 'Step 2 complete: All data cleared.';
GO

-- ============================================================
-- STEP 3: RESET auto-increment counters to 0
--         Wrapped in IF EXISTS so missing tables don't error.
-- ============================================================

DBCC CHECKIDENT ('Users',           RESEED, 0);
DBCC CHECKIDENT ('Suppliers',       RESEED, 0);
DBCC CHECKIDENT ('MedicineBatches', RESEED, 0);
DBCC CHECKIDENT ('OrderItems',      RESEED, 0);
DBCC CHECKIDENT ('Orders',          RESEED, 0);
DBCC CHECKIDENT ('Invoices',        RESEED, 0);
DBCC CHECKIDENT ('MedicineAlerts',  RESEED, 0);
DBCC CHECKIDENT ('Pharmacies',      RESEED, 0);

IF OBJECT_ID('Donations', 'U')    IS NOT NULL
    DBCC CHECKIDENT ('Donations',    RESEED, 0);

IF OBJECT_ID('RewardPoints', 'U') IS NOT NULL
    DBCC CHECKIDENT ('RewardPoints', RESEED, 0);

PRINT 'Step 3 complete: Identity counters reset.';
GO

-- ============================================================
-- STEP 4: INSERT Companies (manual IDs — no IDENTITY)
-- ============================================================

INSERT INTO Companies (CompanyID, Name, Address, Phone, Email, Specialization)
VALUES
(1, 'EIPICO',     'Cairo, Egypt',      '+20245678901', 'info@eipico.com',    'Oncology'),
(2, 'Pharco',     'Alexandria, Egypt', '+20345612345', 'contact@pharco.org', 'Oncology'),
(3, 'Eva Pharma', 'Cairo, Egypt',      '+20212345678', 'info@evapharma.com', 'General Medicine');

PRINT 'Step 4 complete: Companies inserted.';
GO

-- ============================================================
-- STEP 5: INSERT Medicines (manual IDs — no IDENTITY)
-- ============================================================

INSERT INTO Medicines (ID, Name, Description, CompanyID, ProductionDate, ExpiryDate, Price)
VALUES
(201, 'Doxorubicin',  'Breast cancer chemotherapy drug',  1, '2024-01-15', '2026-01-15', 3500.00),
(202, 'Imatinib',     'Leukemia treatment medication',    2, '2024-02-01', '2026-02-01', 4200.00),
(203, 'Paclitaxel',   'Ovarian cancer chemotherapy',      1, '2024-01-20', '2026-01-20', 3800.00);

PRINT 'Step 5 complete: Medicines inserted.';
GO

-- ============================================================
-- STEP 6: INSERT Suppliers (IDENTITY — IDs auto-assigned 1,2,3)
-- ============================================================

INSERT INTO Suppliers (Name, Address, Phone, Email, ContactPerson)
VALUES
('EIPICO Pharmaceuticals',  'Cairo, Egypt',      '+20245678901', 'supply@eipico.com',    'Ahmed Mohamed'),
('Pharco International',    'Alexandria, Egypt', '+20345612345', 'supply@pharco.org',    'Fatima Ali');

PRINT 'Step 6 complete: Suppliers inserted.';
GO

-- ============================================================
-- STEP 7: INSERT Warehouses (manual IDs — no IDENTITY)
-- ============================================================

INSERT INTO Warehouses (WarehouseID, Name, Location, Capacity)
VALUES
(1, 'Main Warehouse - Cairo', 'Cairo, Egypt', 10000),
(2, 'Cold Storage - Giza',   'Giza, Egypt',  5000);

PRINT 'Step 7 complete: Warehouses inserted.';
GO

-- ============================================================
-- STEP 8: INSERT MedicineBatches (IDENTITY — IDs auto-assigned)
--         Stock is deliberately varied for meaningful testing:
--           201 Doxorubicin  = 50  → normal
--           202 Imatinib     = 15  → low
--           203 Paclitaxel   =  5  → critical
--           204 Capecitabine = 80  → normal
--           205 Rituximab    = 30  → normal
-- ============================================================

INSERT INTO MedicineBatches
    (MedicineID, WarehouseID, BatchNumber, ProductionDate, ExpiryDate, Quantity, MaxCapacity)
VALUES
(201, 1, 'DOX-2024-001', '2024-01-15', '2026-01-15',  50, 100),
(202, 1, 'IMA-2024-001', '2024-02-01', '2026-02-01',  15, 150),
(203, 1, 'PAC-2024-001', '2024-01-20', '2026-01-20',   5,  80);

PRINT 'Step 8 complete: Medicine batches inserted.';
GO

-- ============================================================
-- STEP 9: INSERT Inventory (the summary stock view)
-- ============================================================

INSERT INTO Inventory
    (MedicineID, MedicineName, Category, CurrentStock, ExpiryDate, Status, TotalQuantity)
VALUES
(201, 'Doxorubicin',  'Oncology', 50, '2026-01-15', 'normal',   50),
(202, 'Imatinib',     'Oncology', 15, '2026-02-01', 'low',      15),
(203, 'Paclitaxel',   'Oncology',  5, '2026-01-20', 'critical',  5);

PRINT 'Step 9 complete: Inventory inserted.';
GO

-- ============================================================
-- STEP 10: INSERT MedicineSuppliers (junction table)
-- ============================================================

INSERT INTO MedicineSuppliers (MedicineID, SupplierID, SupplyPrice)
VALUES
(201, 1, 3200.00),
(202, 2, 3900.00),
(203, 1, 3500.00);

PRINT 'Step 10 complete: Medicine-Supplier links inserted.';
GO

-- ============================================================
-- STEP 11: INSERT Pharmacies (IDENTITY — IDs auto-assigned 1,2)
-- ============================================================

INSERT INTO Pharmacies (Name, Address, Phone, Email)
VALUES
('Cairo Central Pharmacy',    '123 Tahrir Square, Cairo',      '+20212345678', 'info@cairopharmacy.com');

PRINT 'Step 11 complete: Pharmacies inserted.';
GO

-- ============================================================
-- STEP 11B: INSERT Users (1 Admin, 1 Pharmacy)
-- ============================================================

INSERT INTO Users (Username, PasswordHash, Email, FullName, Role, RewardPoints)
VALUES
('admin', '$2b$10$2K6hxPGjZs9ven0Zk/ejAuh0ZTWs6Y68Ms0YLp1xTcCmY8l47vxIi', 'admin@pharmahouse.com', 'System Admin', 'admin', 0),
('pharmacy', '$2b$10$3BEMmPPC/ZTlcb7YiYYjuOXdqbwUrLl7Li/WHCVQfn9U3dPYH2Ww2', 'info@cairopharmacy.com', 'Cairo Central Pharmacy', 'pharmacy', 0);

PRINT 'Step 11B complete: Users inserted.';
GO

-- ============================================================
-- STEP 12: VERIFY — Count rows in every table
-- ============================================================

SELECT 'Companies'         AS TableName, COUNT(*) AS Rows FROM Companies         UNION ALL
SELECT 'Medicines',                       COUNT(*)         FROM Medicines          UNION ALL
SELECT 'Suppliers',                       COUNT(*)         FROM Suppliers          UNION ALL
SELECT 'Warehouses',                      COUNT(*)         FROM Warehouses         UNION ALL
SELECT 'MedicineBatches',                 COUNT(*)         FROM MedicineBatches    UNION ALL
SELECT 'Inventory',                       COUNT(*)         FROM Inventory          UNION ALL
SELECT 'MedicineSuppliers',               COUNT(*)         FROM MedicineSuppliers  UNION ALL
SELECT 'Pharmacies',                      COUNT(*)         FROM Pharmacies         UNION ALL
SELECT 'Users',                           COUNT(*)         FROM Users              UNION ALL
SELECT 'Orders',                          COUNT(*)         FROM Orders             UNION ALL
SELECT 'Invoices',                        COUNT(*)         FROM Invoices           UNION ALL
SELECT 'Donations',                       COUNT(*)         FROM Donations          UNION ALL
SELECT 'RewardPoints',                    COUNT(*)         FROM RewardPoints
ORDER BY TableName;

PRINT '';
PRINT '============================================================';
PRINT 'SEED COMPLETE — Expected row counts:';
PRINT '  Companies=3  Medicines=3  Suppliers=2   Warehouses=2';
PRINT '  MedicineBatches=3  Inventory=3  MedicineSuppliers=3';
PRINT '  Pharmacies=1  Donations=0  RewardPoints=0';
PRINT '  Users=2  Orders=0  Invoices=0';
PRINT '';
PRINT 'NEXT STEP: Start backend then register your admin account at:';
PRINT '  http://localhost:3001';
PRINT '============================================================';
GO
