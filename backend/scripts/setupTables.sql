-- Quick setup script to create essential tables
-- Run this if the main SQL.sql script hasn't been executed

USE CancerPharmacyDB;
GO

-- Create Users table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        Username VARCHAR(50) UNIQUE NOT NULL,
        PasswordHash VARCHAR(255) NOT NULL,
        Email VARCHAR(100),
        FullName VARCHAR(100),
        Role VARCHAR(50) DEFAULT 'user'
    );
    PRINT 'Users table created successfully';
END
ELSE
BEGIN
    PRINT 'Users table already exists';
END
GO

-- Create Companies table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Companies]') AND type in (N'U'))
BEGIN
    CREATE TABLE Companies (
        CompanyID INT PRIMARY KEY,
        Name VARCHAR(100),
        Address VARCHAR(255),
        Phone VARCHAR(20),
        Email VARCHAR(100),
        Specialization VARCHAR(100)
    );
    PRINT 'Companies table created successfully';
END
GO

-- Create Medicines table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Medicines]') AND type in (N'U'))
BEGIN
    CREATE TABLE Medicines (
        ID INT PRIMARY KEY,
        Name VARCHAR(100),
        Description TEXT,
        CompanyID INT,
        ProductionDate DATE,
        ExpiryDate DATE,
        Price DECIMAL(10, 2),
        FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID)
    );
    PRINT 'Medicines table created successfully';
END
GO

-- Create Suppliers table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Suppliers]') AND type in (N'U'))
BEGIN
    CREATE TABLE Suppliers (
        SupplierID INT IDENTITY(1,1) PRIMARY KEY,
        Name VARCHAR(100) NOT NULL,
        Address VARCHAR(255),
        Phone VARCHAR(20),
        Email VARCHAR(100),
        ContactPerson VARCHAR(100)
    );
    PRINT 'Suppliers table created successfully';
END
GO

-- Create Warehouses table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Warehouses]') AND type in (N'U'))
BEGIN
    CREATE TABLE Warehouses (
        WarehouseID INT IDENTITY(1,1) PRIMARY KEY,
        Name VARCHAR(100),
        Location VARCHAR(100),
        Capacity INT
    );
    PRINT 'Warehouses table created successfully';
END
GO

-- Create MedicineBatches table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MedicineBatches]') AND type in (N'U'))
BEGIN
    CREATE TABLE MedicineBatches (
        BatchID INT IDENTITY(1,1) PRIMARY KEY,
        MedicineID INT,
        WarehouseID INT,
        BatchNumber VARCHAR(50),
        ProductionDate DATE,
        ExpiryDate DATE,
        Quantity INT,
        MaxCapacity INT,
        FOREIGN KEY (MedicineID) REFERENCES Medicines(ID),
        FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)
    );
    PRINT 'MedicineBatches table created successfully';
END
GO

-- Create Inventory table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Inventory]') AND type in (N'U'))
BEGIN
    CREATE TABLE Inventory (
        MedicineID INT PRIMARY KEY,
        TotalQuantity INT,
        FOREIGN KEY (MedicineID) REFERENCES Medicines(ID)
    );
    PRINT 'Inventory table created successfully';
END
GO

-- Create Pharmacies table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Pharmacies]') AND type in (N'U'))
BEGIN
    CREATE TABLE Pharmacies (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Name VARCHAR(100),
        Address VARCHAR(255),
        Phone VARCHAR(20),
        Email VARCHAR(100)
    );
    PRINT 'Pharmacies table created successfully';
END
GO

-- Create Orders table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND type in (N'U'))
BEGIN
    CREATE TABLE Orders (
        OrderID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT,
        PharmacyID INT,
        OrderDate DATE,
        TotalAmount DECIMAL(10,2),
        FOREIGN KEY (UserID) REFERENCES Users(UserID),
        FOREIGN KEY (PharmacyID) REFERENCES Pharmacies(ID)
    );
    PRINT 'Orders table created successfully';
END
GO

-- Create Invoices table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Invoices]') AND type in (N'U'))
BEGIN
    CREATE TABLE Invoices (
        InvoiceID INT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT,
        InvoiceDate DATE NOT NULL,
        TotalAmount DECIMAL(10, 2) NOT NULL,
        PaymentStatus VARCHAR(50),
        FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    );
    PRINT 'Invoices table created successfully';
END
GO

-- Create MedicineAlerts table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MedicineAlerts]') AND type in (N'U'))
BEGIN
    CREATE TABLE MedicineAlerts (
        AlertID INT IDENTITY(1,1) PRIMARY KEY,
        MedicineID INT,
        AlertDate DATETIME DEFAULT GETDATE(),
        Quantity INT,
        AlertMessage VARCHAR(255),
        FOREIGN KEY (MedicineID) REFERENCES Medicines(ID)
    );
    PRINT 'MedicineAlerts table created successfully';
END
GO

PRINT 'Database setup completed!';
GO
