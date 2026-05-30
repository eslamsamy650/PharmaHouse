IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'CancerPharmacyDB')
BEGIN
    CREATE DATABASE CancerPharmacyDB;
END
GO

USE CancerPharmacyDB;
GO

CREATE TABLE Companies (
    CompanyID INT PRIMARY KEY,
    Name VARCHAR(100),
    Address VARCHAR(255),
    Phone VARCHAR(20),
    Email VARCHAR(100),
    Specialization VARCHAR(100)
);
GO

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
GO

CREATE TABLE Pharmacies (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Name VARCHAR(100),
    Address VARCHAR(255),
    Phone VARCHAR(20),
    Email VARCHAR(100),
    SocialMedia VARCHAR(255),
    Website VARCHAR(255),
    DeliveryService VARCHAR(100),
    LicenseNumber VARCHAR(50),
    OperatingHours VARCHAR(100),
    EstablishedDate DATE
);
GO

CREATE TABLE Warehouses (
    WarehouseID INT PRIMARY KEY,
    Name VARCHAR(100),
    Location VARCHAR(100),
    Capacity INT
);
GO

CREATE TABLE Users (
    UserID INT IDENTITY PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    Email VARCHAR(100),
    FullName VARCHAR(100),
    Role VARCHAR(50)
);
GO

CREATE TABLE Suppliers (
    SupplierID INT IDENTITY PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Address VARCHAR(255),
    Phone VARCHAR(20),
    Email VARCHAR(100),
    ContactPerson VARCHAR(100)
);
GO

CREATE TABLE MedicineSuppliers (
    MedicineID INT,
    SupplierID INT,
    SupplyPrice DECIMAL(10,2),
    PRIMARY KEY (MedicineID, SupplierID),
    FOREIGN KEY (MedicineID) REFERENCES Medicines(ID),
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID)
);
GO

CREATE TABLE MedicineBatches (
    BatchID INT IDENTITY PRIMARY KEY,
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
GO

CREATE TABLE Inventory (
    MedicineID INT PRIMARY KEY,
    MedicineName VARCHAR(100),
    Category VARCHAR(50),
    CurrentStock INT,
    ExpiryDate DATE,
    Status VARCHAR(20),
    TotalQuantity INT,
    SupplierID INT,
    FOREIGN KEY (MedicineID) REFERENCES Medicines(ID),
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID)
);
GO

CREATE TABLE Orders (
    OrderID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT,
    PharmacyID INT,
    SupplierID INT,
    OrderDate DATE,
    TotalAmount DECIMAL(10,2),
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (PharmacyID) REFERENCES Pharmacies(ID),
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID)
);
GO

CREATE TABLE OrderItems (
    OrderItemID INT IDENTITY PRIMARY KEY,
    OrderID INT NOT NULL,
    MedicineID INT NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(10, 2),
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    FOREIGN KEY (MedicineID) REFERENCES Medicines(ID)
);
GO

CREATE TABLE Invoices (
    InvoiceID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID INT,
    InvoiceDate DATE NOT NULL,
    TotalAmount DECIMAL(10, 2) NOT NULL,
    PaymentStatus VARCHAR(50),
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
);
GO

CREATE TABLE MedicineAlerts (
    AlertID INT PRIMARY KEY IDENTITY,
    MedicineID INT,
    AlertDate DATETIME DEFAULT GETDATE(),
    Quantity INT,
    AlertMessage VARCHAR(255),
    FOREIGN KEY (MedicineID) REFERENCES Medicines(ID)
);
GO

INSERT INTO Companies (CompanyID, Name, Address, Phone, Email, Specialization)
VALUES
(1, 'EIPICO', 'Cairo', '+20245678901', 'info@eipico.com', 'Oncology'),
(2, 'Pharco', 'Alexandria', '+20345612345', 'contact@pharco.org', 'Oncology');
GO

INSERT INTO Medicines (ID, Name, Description, CompanyID, ProductionDate, ExpiryDate, Price)
VALUES
(201, 'Doxorubicin', 'Breast cancer chemo', 1, '2023-01-01', '2025-01-01', 3500.00),
(202, 'Imatinib', 'Leukemia treatment', 2, '2023-03-01', '2025-03-01', 4200.00),
(203, 'Paclitaxel', 'Ovarian cancer drug', 1, '2023-02-01', '2025-02-01', 3800.00),
(204, 'Capecitabine', 'Colon cancer therapy', 2, '2023-04-01', '2025-04-01', 2900.00),
(205, 'Rituximab', 'Lymphoma treatment', 1, '2023-05-01', '2025-05-01', 7500.00),
(206, 'Bevacizumab', 'Lung cancer drug', 2, '2023-06-01', '2025-06-01', 8000.00);
GO

CREATE OR ALTER PROCEDURE CheckAndAlertLowStock
AS
BEGIN
    DECLARE @Threshold FLOAT = 0.4;

    INSERT INTO MedicineAlerts (MedicineID, Quantity, AlertMessage)
    SELECT 
        B.MedicineID, 
        B.Quantity,
        'Low stock alert: Quantity below 40% of capacity'
    FROM MedicineBatches B
    WHERE B.Quantity < (B.MaxCapacity * @Threshold);
END;
GO

CREATE OR ALTER PROCEDURE AddMedicine
    @ID INT,
    @Name VARCHAR(100),
    @Description TEXT,
    @CompanyID INT,
    @ProductionDate DATE,
    @ExpiryDate DATE,
    @Price DECIMAL(10, 2)
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Companies WHERE CompanyID = @CompanyID)
    BEGIN
        INSERT INTO Medicines (ID, Name, Description, CompanyID, ProductionDate, ExpiryDate, Price)
        VALUES (@ID, @Name, @Description, @CompanyID, @ProductionDate, @ExpiryDate, @Price);
    END
    ELSE
    BEGIN
        RAISERROR('Invalid CompanyID.', 16, 1);
    END
END;
GO

CREATE OR ALTER PROCEDURE DeleteMedicine
    @MedicineID INT
AS
BEGIN
    DELETE FROM OrderItems WHERE MedicineID = @MedicineID;
    DELETE FROM MedicineBatches WHERE MedicineID = @MedicineID;
    DELETE FROM MedicineSuppliers WHERE MedicineID = @MedicineID;
    DELETE FROM Inventory WHERE MedicineID = @MedicineID;
    DELETE FROM MedicineAlerts WHERE MedicineID = @MedicineID;

    IF EXISTS (SELECT 1 FROM Medicines WHERE ID = @MedicineID)
    BEGIN
        DELETE FROM Medicines WHERE ID = @MedicineID;
        PRINT 'Medicine deleted successfully.';
    END
    ELSE
    BEGIN
        RAISERROR('Medicine not found.', 16, 1);
    END
END;
GO

EXEC CheckAndAlertLowStock;
GO
