CREATE DATABASE IF NOT EXISTS Warehouse_Management;
use Warehouse_Management;


CREATE TABLE Supplier (
    Supplier_id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    Contact_person VARCHAR(100),
    Bank_Account_No VARCHAR(20),
    Supplier_Status VARCHAR(50) DEFAULT 'Active'
);


CREATE TABLE Product (
    Product_id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    quantity_on_hand INT DEFAULT 0 CHECK (quantity_on_hand >= 0),
    Description TEXT
);


CREATE TABLE Product_Pricing (
    Unit_price DECIMAL(10, 2) NOT NULL,
    Product_id VARCHAR(10) NOT NULL,
    discount DECIMAL(5, 2) DEFAULT 0.00 CHECK (discount >= 0 AND discount <= 1),
    tax DECIMAL(5, 2) DEFAULT 0.00 CHECK (tax >= 0 AND tax <= 1),
    PRIMARY KEY (Product_id, Unit_price),
    FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
);


CREATE TABLE Purchase_Order (
    po_id VARCHAR(15) PRIMARY KEY,
    Supplier_id VARCHAR(10) NOT NULL,
    order_date DATE NOT NULL,
    Expected_delivery_date DATE,
    Status VARCHAR(50) DEFAULT 'Pending',
    FOREIGN KEY (Supplier_id) REFERENCES Supplier(Supplier_id)
);


CREATE TABLE Purchase_Order_Items (
    Item_id INT PRIMARY KEY AUTO_INCREMENT,
    po_id VARCHAR(15) NOT NULL,
    Product_id VARCHAR(10) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    UNIQUE (po_id, Product_id),
    FOREIGN KEY (po_id) REFERENCES Purchase_Order(po_id),
    FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
);


CREATE TABLE Sale_Order (
    So_id VARCHAR(15) PRIMARY KEY,
    Customer_name VARCHAR(100) NOT NULL,
    order_date DATE NOT NULL,
    Status VARCHAR(50) DEFAULT 'New',
    Total_amount DECIMAL(10, 2) CHECK (Total_amount >= 0)
);


CREATE TABLE Sale_Order_Items (
    Item_id INT PRIMARY KEY AUTO_INCREMENT,
    So_id VARCHAR(15) NOT NULL,
    Product_id VARCHAR(10) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    Net_amount DECIMAL(10, 2) CHECK (Net_amount >= 0),
    UNIQUE (So_id, Product_id),
    FOREIGN KEY (So_id) REFERENCES Sale_Order(So_id),
    FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
);

ALTER TABLE Product
ADD COLUMN Warehouse_Location VARCHAR(50) DEFAULT 'Unassigned';

DELIMITER //

DROP FUNCTION IF EXISTS fn_calculate_net_price//
DROP TRIGGER IF EXISTS trg_update_inventory_on_po_receipt//
DROP PROCEDURE IF EXISTS sp_process_sale//

CREATE FUNCTION fn_calculate_net_price(
    p_product_id VARCHAR(10),
    p_unit_price DECIMAL(10, 2)
)
RETURNS DECIMAL(10, 2)
DETERMINISTIC
BEGIN
    DECLARE v_discount DECIMAL(5, 2);
    DECLARE v_tax DECIMAL(5, 2);
    DECLARE v_net_price DECIMAL(10, 2);
 
    SELECT discount, tax INTO v_discount, v_tax
    FROM Product_Pricing
    WHERE Product_id = p_product_id AND Unit_price = p_unit_price
    LIMIT 1;

    SET v_net_price = p_unit_price * (1 - v_discount) * (1 + v_tax);

    RETURN v_net_price;
END//

CREATE TRIGGER trg_update_inventory_on_po_receipt
AFTER UPDATE ON Purchase_Order
FOR EACH ROW
BEGIN
    
    IF OLD.Status <> 'Received' AND NEW.Status = 'Received' THEN
        
        UPDATE Product p
        INNER JOIN Purchase_Order_Items poi ON p.Product_id = poi.Product_id
        SET p.quantity_on_hand = p.quantity_on_hand + poi.quantity
        WHERE poi.po_id = NEW.po_id;
    END IF;
END//

CREATE PROCEDURE sp_process_sale (
    IN p_So_id VARCHAR(15),
    IN p_Customer_name VARCHAR(100),
    IN p_Product_id VARCHAR(10),
    IN p_Quantity INT,
    IN p_Unit_Price DECIMAL(10, 2)
)
BEGIN
    DECLARE v_net_amount DECIMAL(10, 2);

    
    IF (SELECT quantity_on_hand FROM Product WHERE Product_id = p_Product_id) < p_Quantity THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient quantity on hand for this product. Sale cannot be completed.';
    END IF;

    
    SET v_net_amount = p_Quantity * fn_calculate_net_price(p_Product_id, p_Unit_Price);

    
    INSERT INTO Sale_Order (So_id, Customer_name, order_date, Status, Total_amount)
    VALUES (p_So_id, p_Customer_name, CURDATE(), 'Processed', v_net_amount);

    
    INSERT INTO Sale_Order_Items (So_id, Product_id, quantity, Net_amount)
    VALUES (p_So_id, p_Product_id, p_Quantity, v_net_amount);

    
    UPDATE Product
    SET quantity_on_hand = quantity_on_hand - p_Quantity
    WHERE Product_id = p_Product_id;

END//

DELIMITER ;


INSERT INTO Supplier (Supplier_id, name, Contact_person) VALUES
('S001', 'Tech Distributors Inc.', 'Alice Johnson'),
('S002', 'Raw Materials Co.', 'Bob Smith');


INSERT INTO Product (Product_id, name, quantity_on_hand, Description) VALUES
('P101', 'Laptop Model X', 50, 'High-end business laptop.'),
('P202', 'USB-C Cable', 200, 'Standard 1m USB-C charging cable.'),
('P303', 'Office Chair Ergonomic', 10, 'Adjustable ergonomic chair.');


INSERT INTO Product_Pricing (Product_id, Unit_price, discount, tax) VALUES
('P101', 950.00, 0.05, 0.10), 
('P202', 4.00, 0.00, 0.05),    
('P303', 150.00, 0.10, 0.07);  


INSERT INTO Purchase_Order (po_id, Supplier_id, order_date, Expected_delivery_date, Status) VALUES
('PO-2025-001', 'S001', '2025-10-01', '2025-10-15', 'Pending'),
('PO-2025-002', 'S002', '2025-10-05', '2025-10-20', 'Pending');


INSERT INTO Purchase_Order_Items (po_id, Product_id, quantity) VALUES
('PO-2025-001', 'P101', 5),
('PO-2025-001', 'P202', 20),
('PO-2025-002', 'P303', 10);

UPDATE Purchase_Order
SET Status = 'In Transit', Expected_delivery_date = '2025-10-18'
WHERE po_id = 'PO-2025-002';

UPDATE Purchase_Order
SET Status = 'Received'
WHERE po_id = 'PO-2025-001';

UPDATE Product
SET Description = 'High-end business laptop with extended warranty.'
WHERE Product_id = 'P101';

DELETE FROM Purchase_Order_Items
WHERE po_id = 'PO-2025-002' AND Product_id = 'P303';

SELECT Product_id, name, quantity_on_hand
FROM Product;

SELECT
    p.Product_id,
    p.name,
    pp.Unit_price,
    fn_calculate_net_price(p.Product_id, pp.Unit_price) AS Net_Price
FROM Product p
JOIN Product_Pricing pp ON p.Product_id = pp.Product_id;


SELECT
    s.name AS Supplier_Name,
    po.po_id,
    po.order_date,
    po.Status
FROM Supplier s
JOIN Purchase_Order po ON s.Supplier_id = po.Supplier_id
WHERE s.Supplier_Status = 'Active'
ORDER BY po.order_date;

CALL sp_process_sale('SO-2025-001', 'Global Tech', 'P101', 5, 950.00);