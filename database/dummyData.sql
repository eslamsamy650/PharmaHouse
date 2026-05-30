-- Dummy Data Script for Pharmaceutical Management System
-- Run this after creating the tables to populate with test data

USE CancerPharmacyDB;
GO

-- Clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM MedicineAlerts;
-- DELETE FROM Invoices;
-- DELETE FROM Orders;
-- DELETE FROM MedicineBatches;
-- DELETE FROM Inventory;
-- DELETE FROM MedicineSuppliers;
-- DELETE FROM Medicines;
-- DELETE FROM Suppliers;
-- DELETE FROM Companies;
-- DELETE FROM Users WHERE Username != 'admin';
-- GO

-- ============================================
-- INSERT COMPANIES
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Companies WHERE CompanyID = 1)
BEGIN
    INSERT INTO Companies (CompanyID, Name, Address, Phone, Email, Specialization)
    VALUES
    (1, 'EIPICO', 'Cairo, Egypt', '+20245678901', 'info@eipico.com', 'Oncology'),
    (2, 'Pharco', 'Alexandria, Egypt', '+20345612345', 'contact@pharco.org', 'Oncology'),
    (3, 'Eva Pharma', 'Cairo, Egypt', '+20212345678', 'info@evapharma.com', 'General Medicine'),
    (4, 'Sedico Pharmaceuticals', 'Giza, Egypt', '+20298765432', 'contact@sedico.com', 'Cardiology'),
    (5, 'Global Napi', 'Cairo, Egypt', '+20255512345', 'info@globalnapi.com', 'Oncology');
    PRINT 'Companies inserted successfully';
END
ELSE
    PRINT 'Companies already exist';
GO

-- ============================================
-- INSERT MEDICINES
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Medicines WHERE ID = 201)
BEGIN
    INSERT INTO Medicines (ID, Name, Description, CompanyID, ProductionDate, ExpiryDate, Price)
    VALUES
    (201, 'Doxorubicin', 'Breast cancer chemotherapy drug', 1, '2024-01-15', '2026-01-15', 3500.00),
    (202, 'Imatinib', 'Leukemia treatment medication', 2, '2024-02-01', '2026-02-01', 4200.00),
    (203, 'Paclitaxel', 'Ovarian cancer chemotherapy', 1, '2024-01-20', '2026-01-20', 3800.00),
    (204, 'Capecitabine', 'Colon cancer oral therapy', 2, '2024-02-10', '2026-02-10', 2900.00),
    (205, 'Rituximab', 'Lymphoma immunotherapy', 1, '2024-01-25', '2026-01-25', 7500.00),
    (206, 'Bevacizumab', 'Lung cancer targeted therapy', 2, '2024-02-15', '2026-02-15', 8000.00),
    (207, 'Pembrolizumab', 'Immunotherapy for various cancers', 5, '2024-03-01', '2026-03-01', 9200.00),
    (208, 'Trastuzumab', 'Breast cancer targeted therapy', 1, '2024-01-30', '2026-01-30', 6800.00),
    (209, 'Cisplatin', 'Platinum-based chemotherapy', 3, '2024-02-20', '2026-02-20', 2500.00),
    (210, 'Methotrexate', 'Chemotherapy and immunosuppressant', 4, '2024-03-05', '2026-03-05', 1800.00),
    (211, 'Cyclophosphamide', 'Chemotherapy agent', 3, '2024-02-25', '2026-02-25', 2200.00),
    (212, '5-Fluorouracil', 'Colorectal cancer treatment', 4, '2024-03-10', '2026-03-10', 1500.00),
    -- Additional medicines for more inventory and offers
    (213, 'Lipitor (Atorvastatin)', 'Cholesterol-lowering medication, 20mg tablets', 3, '2024-03-15', '2026-03-15', 125.00),
    (214, 'Metformin Hydrochloride', 'Diabetes medication, 500mg extended release', 4, '2024-03-20', '2026-03-20', 95.00),
    (215, 'Amoxicillin Capsules', 'Antibiotic, 500mg, 100 capsules per bottle', 3, '2024-03-25', '2026-03-25', 78.00),
    (216, 'Omeprazole', 'Proton pump inhibitor for acid reflux', 4, '2024-04-01', '2026-04-01', 65.00),
    (217, 'Amlodipine', 'Calcium channel blocker for hypertension', 4, '2024-04-05', '2026-04-05', 45.00),
    (218, 'Levothyroxine', 'Thyroid hormone replacement', 3, '2024-04-10', '2026-04-10', 55.00),
    (219, 'Metoprolol', 'Beta-blocker for heart conditions', 4, '2024-04-15', '2026-04-15', 42.00),
    (220, 'Atorvastatin', 'Statin for cholesterol management', 3, '2024-04-20', '2026-04-20', 88.00),
    (221, 'Losartan', 'Angiotensin receptor blocker', 4, '2024-04-25', '2026-04-25', 52.00),
    (222, 'Gabapentin', 'Anticonvulsant and nerve pain medication', 3, '2024-05-01', '2026-05-01', 68.00),
    (223, 'Sertraline', 'SSRI antidepressant', 4, '2024-05-05', '2026-05-05', 75.00),
    (224, 'Tramadol', 'Opioid pain medication', 3, '2024-05-10', '2026-05-10', 95.00),
    (225, 'Ciprofloxacin', 'Broad-spectrum antibiotic', 4, '2024-05-15', '2026-05-15', 82.00),
    (226, 'Paracetamol', 'Pain reliever and fever reducer', 3, '2024-05-20', '2026-05-20', 25.00),
    (227, 'Ibuprofen', 'NSAID anti-inflammatory', 4, '2024-05-25', '2026-05-25', 35.00),
    (228, 'Aspirin', 'Blood thinner and pain reliever', 3, '2024-06-01', '2026-06-01', 28.00),
    (229, 'Vitamin D3', 'Vitamin supplement, 1000 IU', 4, '2024-06-05', '2026-06-05', 32.00),
    (230, 'Calcium Carbonate', 'Calcium supplement', 3, '2024-06-10', '2026-06-10', 38.00);
    PRINT 'Medicines inserted successfully';
END
ELSE
    PRINT 'Medicines already exist';
GO

-- ============================================
-- INSERT SUPPLIERS
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Suppliers WHERE Name = 'EIPICO Pharmaceuticals')
BEGIN
    INSERT INTO Suppliers (Name, Address, Phone, Email, ContactPerson)
    VALUES
    ('EIPICO Pharmaceuticals', 'Cairo, Egypt', '+20245678901', 'supply@eipico.com', 'Ahmed Mohamed'),
    ('Pharco International', 'Alexandria, Egypt', '+20345612345', 'supply@pharco.org', 'Fatima Ali'),
    ('Eva Pharma Distributors', 'Cairo, Egypt', '+20212345678', 'supply@evapharma.com', 'Mohamed Hassan'),
    ('Sedico Supply Chain', 'Giza, Egypt', '+20298765432', 'supply@sedico.com', 'Sara Ibrahim'),
    ('Global Napi Distribution', 'Cairo, Egypt', '+20255512345', 'supply@globalnapi.com', 'Omar Khaled');
    PRINT 'Suppliers inserted successfully';
END
ELSE
    PRINT 'Suppliers already exist';
GO

-- ============================================
-- INSERT WAREHOUSES
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Warehouses WHERE WarehouseID = 1)
BEGIN
    INSERT INTO Warehouses (WarehouseID, Name, Location, Capacity)
    VALUES
    (1, 'Main Warehouse - Cairo', 'Cairo, Egypt', 10000),
    (2, 'Warehouse - Alexandria', 'Alexandria, Egypt', 8000),
    (3, 'Cold Storage - Giza', 'Giza, Egypt', 5000),
    (4, 'Distribution Center - Mansoura', 'Mansoura, Egypt', 6000);
    PRINT 'Warehouses inserted successfully';
END
ELSE
    PRINT 'Warehouses already exist';
GO

-- ============================================
-- INSERT MEDICINE BATCHES (with inventory)
-- ============================================
IF NOT EXISTS (SELECT 1 FROM MedicineBatches WHERE BatchID = 1)
BEGIN
    INSERT INTO MedicineBatches (MedicineID, WarehouseID, BatchNumber, ProductionDate, ExpiryDate, Quantity, MaxCapacity)
    VALUES
    -- Doxorubicin batches
    (201, 1, 'DOX-2024-001', '2024-01-15', '2026-01-15', 15, 100),
    (201, 1, 'DOX-2024-002', '2024-01-20', '2026-01-20', 8, 100),
    
    -- Imatinib batches
    (202, 1, 'IMA-2024-001', '2024-02-01', '2026-02-01', 25, 150),
    (202, 2, 'IMA-2024-002', '2024-02-05', '2026-02-05', 30, 150),
    
    -- Paclitaxel batches (low stock)
    (203, 1, 'PAC-2024-001', '2024-01-20', '2026-01-20', 8, 80),
    (203, 3, 'PAC-2024-002', '2024-01-25', '2026-01-25', 12, 80),
    
    -- Capecitabine batches
    (204, 1, 'CAP-2024-001', '2024-02-10', '2026-02-10', 42, 200),
    (204, 2, 'CAP-2024-002', '2024-02-15', '2026-02-15', 35, 200),
    
    -- Rituximab batches
    (205, 1, 'RIT-2024-001', '2024-01-25', '2026-01-25', 18, 50),
    (205, 3, 'RIT-2024-002', '2024-02-01', '2026-02-01', 22, 50),
    
    -- Bevacizumab batches (critical stock)
    (206, 1, 'BEV-2024-001', '2024-02-15', '2026-02-15', 12, 60),
    (206, 2, 'BEV-2024-002', '2024-02-20', '2026-02-20', 5, 60),
    
    -- Pembrolizumab batches
    (207, 1, 'PEM-2024-001', '2024-03-01', '2026-03-01', 30, 100),
    (207, 2, 'PEM-2024-002', '2024-03-05', '2026-03-05', 25, 100),
    
    -- Trastuzumab batches
    (208, 1, 'TRA-2024-001', '2024-01-30', '2026-01-30', 22, 80),
    (208, 3, 'TRA-2024-002', '2024-02-05', '2026-02-05', 18, 80),
    
    -- Cisplatin batches
    (209, 2, 'CIS-2024-001', '2024-02-20', '2026-02-20', 45, 150),
    (209, 4, 'CIS-2024-002', '2024-02-25', '2026-02-25', 38, 150),
    
    -- Methotrexate batches
    (210, 1, 'MET-2024-001', '2024-03-05', '2026-03-05', 55, 200),
    (210, 2, 'MET-2024-002', '2024-03-10', '2026-03-10', 48, 200),
    
    -- Cyclophosphamide batches
    (211, 1, 'CYC-2024-001', '2024-02-25', '2026-02-25', 40, 120),
    (211, 3, 'CYC-2024-002', '2024-03-01', '2026-03-01', 35, 120),
    
    -- 5-Fluorouracil batches
    (212, 2, 'FLU-2024-001', '2024-03-10', '2026-03-10', 60, 180),
    (212, 4, 'FLU-2024-002', '2024-03-15', '2026-03-15', 52, 180),
    
    -- Additional medicine batches for more inventory
    -- Lipitor (Atorvastatin) - Good stock for offers
    (213, 1, 'LIP-2024-001', '2024-03-15', '2026-03-15', 85, 200),
    (213, 2, 'LIP-2024-002', '2024-03-20', '2026-03-20', 92, 200),
    
    -- Metformin - Low stock (high discount)
    (214, 1, 'METF-2024-001', '2024-03-20', '2026-03-20', 35, 150),
    (214, 3, 'METF-2024-002', '2024-03-25', '2026-03-25', 28, 150),
    
    -- Amoxicillin - Medium stock
    (215, 1, 'AMOX-2024-001', '2024-03-25', '2026-03-25', 65, 180),
    (215, 2, 'AMOX-2024-002', '2024-03-30', '2026-03-30', 58, 180),
    
    -- Omeprazole - Good stock
    (216, 1, 'OME-2024-001', '2024-04-01', '2026-04-01', 120, 250),
    (216, 3, 'OME-2024-002', '2024-04-05', '2026-04-05', 105, 250),
    
    -- Amlodipine - Critical stock (high discount)
    (217, 1, 'AML-2024-001', '2024-04-05', '2026-04-05', 12, 100),
    (217, 2, 'AML-2024-002', '2024-04-10', '2026-04-10', 8, 100),
    
    -- Levothyroxine - Normal stock
    (218, 1, 'LEV-2024-001', '2024-04-10', '2026-04-10', 75, 150),
    (218, 4, 'LEV-2024-002', '2024-04-15', '2026-04-15', 68, 150),
    
    -- Metoprolol - Low stock
    (219, 1, 'METOP-2024-001', '2024-04-15', '2026-04-15', 32, 120),
    (219, 2, 'METOP-2024-002', '2024-04-20', '2026-04-20', 28, 120),
    
    -- Atorvastatin - Good stock
    (220, 1, 'ATOR-2024-001', '2024-04-20', '2026-04-20', 95, 200),
    (220, 3, 'ATOR-2024-002', '2024-04-25', '2026-04-25', 88, 200),
    
    -- Losartan - Normal stock
    (221, 1, 'LOS-2024-001', '2024-04-25', '2026-04-25', 70, 160),
    (221, 4, 'LOS-2024-002', '2024-04-30', '2026-04-30', 65, 160),
    
    -- Gabapentin - Low stock
    (222, 1, 'GAB-2024-001', '2024-05-01', '2026-05-01', 38, 140),
    (222, 2, 'GAB-2024-002', '2024-05-05', '2026-05-05', 35, 140),
    
    -- Sertraline - Good stock
    (223, 1, 'SER-2024-001', '2024-05-05', '2026-05-05', 110, 220),
    (223, 3, 'SER-2024-002', '2024-05-10', '2026-05-10', 98, 220),
    
    -- Tramadol - Critical stock (high discount)
    (224, 1, 'TRA-2024-001', '2024-05-10', '2026-05-10', 15, 100),
    (224, 2, 'TRA-2024-002', '2024-05-15', '2026-05-15', 10, 100),
    
    -- Ciprofloxacin - Normal stock
    (225, 1, 'CIP-2024-001', '2024-05-15', '2026-05-15', 80, 180),
    (225, 4, 'CIP-2024-002', '2024-05-20', '2026-05-20', 72, 180),
    
    -- Paracetamol - Excellent stock (low discount)
    (226, 1, 'PAR-2024-001', '2024-05-20', '2026-05-20', 180, 300),
    (226, 2, 'PAR-2024-002', '2024-05-25', '2026-05-25', 165, 300),
    (226, 3, 'PAR-2024-003', '2024-05-30', '2026-05-30', 155, 300),
    
    -- Ibuprofen - Good stock
    (227, 1, 'IBU-2024-001', '2024-05-25', '2026-05-25', 140, 280),
    (227, 2, 'IBU-2024-002', '2024-05-30', '2026-05-30', 130, 280),
    
    -- Aspirin - Normal stock
    (228, 1, 'ASP-2024-001', '2024-06-01', '2026-06-01', 95, 200),
    (228, 3, 'ASP-2024-002', '2024-06-05', '2026-06-05', 88, 200),
    
    -- Vitamin D3 - Good stock
    (229, 1, 'VITD-2024-001', '2024-06-05', '2026-06-05', 125, 250),
    (229, 4, 'VITD-2024-002', '2024-06-10', '2026-06-10', 115, 250),
    
    -- Calcium Carbonate - Normal stock
    (230, 1, 'CAL-2024-001', '2024-06-10', '2026-06-10', 100, 220),
    (230, 2, 'CAL-2024-002', '2024-06-15', '2026-06-15', 92, 220);
    PRINT 'Medicine batches inserted successfully';
END
ELSE
    PRINT 'Medicine batches already exist';
GO

-- ============================================
-- INSERT/UPDATE INVENTORY TABLE
-- ============================================
-- Populate Inventory table with all required fields
-- First, clear existing inventory if needed (optional)
-- DELETE FROM Inventory;
-- GO

-- Insert/Update inventory with all fields from related tables
MERGE Inventory AS target
USING (
    SELECT 
        m.ID AS MedicineID,
        m.Name AS MedicineName,
        ISNULL(c.Specialization, 'General') AS Category,
        ISNULL(SUM(mb.Quantity), 0) AS CurrentStock,
        MIN(mb.ExpiryDate) AS ExpiryDate,
        CASE 
            WHEN ISNULL(SUM(mb.Quantity), 0) = 0 THEN 'out-of-stock'
            WHEN ISNULL(SUM(mb.Quantity), 0) < 20 THEN 'critical'
            WHEN ISNULL(SUM(mb.Quantity), 0) < 50 THEN 'low'
            ELSE 'normal'
        END AS Status,
        ISNULL(SUM(mb.Quantity), 0) AS TotalQuantity
    FROM Medicines m
    LEFT JOIN Companies c ON m.CompanyID = c.CompanyID
    LEFT JOIN MedicineBatches mb ON m.ID = mb.MedicineID
    GROUP BY m.ID, m.Name, ISNULL(c.Specialization, 'General')
) AS source
ON target.MedicineID = source.MedicineID
WHEN MATCHED THEN
    UPDATE SET 
        MedicineName = source.MedicineName,
        Category = source.Category,
        CurrentStock = source.CurrentStock,
        ExpiryDate = source.ExpiryDate,
        Status = source.Status,
        TotalQuantity = source.TotalQuantity
WHEN NOT MATCHED THEN
    INSERT (MedicineID, MedicineName, Category, CurrentStock, ExpiryDate, Status, TotalQuantity)
    VALUES (source.MedicineID, source.MedicineName, source.Category, source.CurrentStock, source.ExpiryDate, source.Status, source.TotalQuantity);
PRINT 'Inventory table updated with all fields';
GO

-- ============================================
-- ENSURE ALL MEDICINES HAVE INVENTORY ENTRIES
-- ============================================
-- Add inventory entries for any medicines that don't have entries yet
MERGE Inventory AS target
USING (
    SELECT 
        m.ID AS MedicineID,
        m.Name AS MedicineName,
        ISNULL(c.Specialization, 'General') AS Category,
        0 AS CurrentStock,
        NULL AS ExpiryDate,
        'out-of-stock' AS Status,
        0 AS TotalQuantity
    FROM Medicines m
    LEFT JOIN Companies c ON m.CompanyID = c.CompanyID
    WHERE NOT EXISTS (
        SELECT 1 FROM Inventory i WHERE i.MedicineID = m.ID
    )
) AS source
ON target.MedicineID = source.MedicineID
WHEN NOT MATCHED THEN
    INSERT (MedicineID, MedicineName, Category, CurrentStock, ExpiryDate, Status, TotalQuantity)
    VALUES (source.MedicineID, source.MedicineName, source.Category, source.CurrentStock, source.ExpiryDate, source.Status, source.TotalQuantity);
PRINT 'Inventory entries ensured for all medicines';
GO

-- ============================================
-- INSERT MEDICINE SUPPLIERS (relationships)
-- ============================================
IF NOT EXISTS (SELECT 1 FROM MedicineSuppliers WHERE MedicineID = 201 AND SupplierID = 1)
BEGIN
    INSERT INTO MedicineSuppliers (MedicineID, SupplierID, SupplyPrice)
    VALUES
    (201, 1, 3200.00),  -- Doxorubicin from EIPICO
    (202, 2, 3900.00),  -- Imatinib from Pharco
    (203, 1, 3500.00),  -- Paclitaxel from EIPICO
    (204, 2, 2700.00),  -- Capecitabine from Pharco
    (205, 1, 7000.00),  -- Rituximab from EIPICO
    (206, 2, 7500.00),  -- Bevacizumab from Pharco
    (207, 5, 8500.00),  -- Pembrolizumab from Global Napi
    (208, 1, 6300.00),  -- Trastuzumab from EIPICO
    (209, 3, 2300.00),  -- Cisplatin from Eva Pharma
    (210, 4, 1650.00),  -- Methotrexate from Sedico
    (211, 3, 2000.00),  -- Cyclophosphamide from Eva Pharma
    (212, 4, 1400.00),  -- 5-Fluorouracil from Sedico
    -- Additional medicine-supplier relationships
    (213, 3, 115.00),   -- Lipitor from Eva Pharma
    (214, 4, 85.00),    -- Metformin from Sedico
    (215, 3, 70.00),    -- Amoxicillin from Eva Pharma
    (216, 4, 58.00),    -- Omeprazole from Sedico
    (217, 3, 40.00),    -- Amlodipine from Eva Pharma
    (218, 4, 50.00),    -- Levothyroxine from Sedico
    (219, 3, 38.00),    -- Metoprolol from Eva Pharma
    (220, 4, 80.00),    -- Atorvastatin from Sedico
    (221, 3, 47.00),    -- Losartan from Eva Pharma
    (222, 4, 62.00),    -- Gabapentin from Sedico
    (223, 3, 68.00),    -- Sertraline from Eva Pharma
    (224, 4, 88.00),    -- Tramadol from Sedico
    (225, 3, 75.00),    -- Ciprofloxacin from Eva Pharma
    (226, 4, 22.00),    -- Paracetamol from Sedico
    (227, 3, 32.00),    -- Ibuprofen from Eva Pharma
    (228, 4, 25.00),    -- Aspirin from Sedico
    (229, 3, 29.00),    -- Vitamin D3 from Eva Pharma
    (230, 4, 35.00);    -- Calcium Carbonate from Sedico
    PRINT 'Medicine-Supplier relationships inserted successfully';
END
ELSE
    PRINT 'Medicine-Supplier relationships already exist';
GO

-- ============================================
-- INSERT PHARMACIES
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Pharmacies WHERE Name = 'Cairo Central Pharmacy')
BEGIN
    INSERT INTO Pharmacies (Name, Address, Phone, Email)
    VALUES
    ('Cairo Central Pharmacy', '123 Tahrir Square, Cairo', '+20212345678', 'info@cairopharmacy.com'),
    ('Alexandria Medical Center', '456 Corniche Road, Alexandria', '+20387654321', 'info@alexmed.com'),
    ('Giza Healthcare Pharmacy', '789 Pyramids Road, Giza', '+20298765432', 'info@gizapharmacy.com');
    PRINT 'Pharmacies inserted successfully';
END
ELSE
    PRINT 'Pharmacies already exist';
GO

-- ============================================
-- INSERT SAMPLE USERS (if not exists)
-- ============================================
-- Note: These users will need to be registered through the app to get hashed passwords
-- But we can create some test users with placeholder passwords
-- In production, always use the registration endpoint which hashes passwords properly

IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'admin')
BEGIN
    -- Password: admin123 (hashed with bcrypt, salt rounds 10)
    -- This is a placeholder - in real app, use the registration endpoint
    INSERT INTO Users (Username, PasswordHash, Email, FullName, Role)
    VALUES
    ('admin', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'admin@pharmacy.com', 'System Administrator', 'admin'),
    ('pharmacist1', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'pharmacist1@pharmacy.com', 'Ahmed Pharmacist', 'user'),
    ('manager1', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'manager@pharmacy.com', 'Fatima Manager', 'manager');
    PRINT 'Sample users inserted (NOTE: These need proper password hashes - register through app)';
END
ELSE
    PRINT 'Users already exist';
GO

-- ============================================
-- GENERATE LOW STOCK ALERTS
-- ============================================
-- Run the stored procedure to check and create alerts
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'CheckAndAlertLowStock')
BEGIN
    EXEC CheckAndAlertLowStock;
    PRINT 'Low stock alerts generated';
END
ELSE
    PRINT 'Alert procedure not found - creating alerts manually';
    
    -- Manual alerts for medicines below 40% capacity
    INSERT INTO MedicineAlerts (MedicineID, Quantity, AlertMessage)
    SELECT 
        mb.MedicineID,
        mb.Quantity,
        'Low stock alert: Quantity below 40% of capacity'
    FROM MedicineBatches mb
    WHERE mb.Quantity < (mb.MaxCapacity * 0.4)
    AND NOT EXISTS (
        SELECT 1 FROM MedicineAlerts ma 
        WHERE ma.MedicineID = mb.MedicineID 
        AND ma.Quantity = mb.Quantity
    );
    PRINT 'Low stock alerts created manually';
GO

-- ============================================
-- INSERT SAMPLE ORDERS (optional)
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Orders WHERE OrderID = 1001)
BEGIN
    -- First, ensure we have a user
    DECLARE @UserId INT;
    SELECT TOP 1 @UserId = UserID FROM Users;
    
    IF @UserId IS NOT NULL
    BEGIN
        DECLARE @PharmacyId INT;
        SELECT TOP 1 @PharmacyId = ID FROM Pharmacies;
        
        INSERT INTO Orders (OrderID, UserID, PharmacyID, OrderDate, TotalAmount)
        VALUES
        (1001, @UserId, @PharmacyId, DATEADD(day, -10, GETDATE()), 15000.00),
        (1002, @UserId, @PharmacyId, DATEADD(day, -5, GETDATE()), 22000.00),
        (1003, @UserId, @PharmacyId, DATEADD(day, -2, GETDATE()), 18000.00);
        
        -- Create corresponding invoices
        INSERT INTO Invoices (InvoiceID, OrderID, InvoiceDate, TotalAmount, PaymentStatus)
        VALUES
        (2001, 1001, DATEADD(day, -10, GETDATE()), 15000.00, 'Paid'),
        (2002, 1002, DATEADD(day, -5, GETDATE()), 22000.00, 'Pending'),
        (2003, 1003, DATEADD(day, -2, GETDATE()), 18000.00, 'Pending');
        
        PRINT 'Sample orders and invoices inserted';
    END
    ELSE
        PRINT 'No users found - skipping order insertion';
END
ELSE
    PRINT 'Orders already exist';
GO

-- ============================================
-- SUMMARY
-- ============================================
PRINT '';
PRINT '========================================';
PRINT 'DUMMY DATA INSERTION COMPLETE';
PRINT '========================================';
PRINT '';

SELECT 
    'Companies' AS TableName, COUNT(*) AS RecordCount FROM Companies
UNION ALL
SELECT 'Medicines', COUNT(*) FROM Medicines
UNION ALL
SELECT 'Suppliers', COUNT(*) FROM Suppliers
UNION ALL
SELECT 'Warehouses', COUNT(*) FROM Warehouses
UNION ALL
SELECT 'MedicineBatches', COUNT(*) FROM MedicineBatches
UNION ALL
SELECT 'Inventory', COUNT(*) FROM Inventory
UNION ALL
SELECT 'Users', COUNT(*) FROM Users
UNION ALL
SELECT 'Pharmacies', COUNT(*) FROM Pharmacies
UNION ALL
SELECT 'Orders', COUNT(*) FROM Orders
UNION ALL
SELECT 'Invoices', COUNT(*) FROM Invoices
UNION ALL
SELECT 'MedicineAlerts', COUNT(*) FROM MedicineAlerts
ORDER BY TableName;

PRINT '';
PRINT '✅ All dummy data has been inserted successfully!';
PRINT '';
PRINT 'NOTE: User passwords need to be set through the registration endpoint';
PRINT '      to get proper bcrypt hashing.';
PRINT '';

GO
