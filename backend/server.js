import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// CORS (safe even if same-origin)
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:4000";
app.use(cors({ origin: corsOrigin }));

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "Warehouse_Management",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ---- API ----
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Suppliers
app.get("/api/suppliers", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM Supplier ORDER BY name");
  res.json(rows);
});
app.post("/api/suppliers", async (req, res) => {
  const { Supplier_id, name, Contact_person, Bank_Account_No, Supplier_Status } = req.body;
  try {
    await pool.query(
      "INSERT INTO Supplier (Supplier_id, name, Contact_person, Bank_Account_No, Supplier_Status) VALUES (?, ?, ?, ?, ?)",
      [Supplier_id, name, Contact_person, Bank_Account_No, Supplier_Status || "Active"]
    );
    res.status(201).json({ message: "Supplier created" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Products
app.get("/api/products", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM Product ORDER BY name");
  res.json(rows);
});
app.post("/api/products", async (req, res) => {
  const { Product_id, name, quantity_on_hand, Description, Warehouse_Location } = req.body;
  try {
    await pool.query(
      "INSERT INTO Product (Product_id, name, quantity_on_hand, Description, Warehouse_Location) VALUES (?, ?, ?, ?, ?)",
      [Product_id, name, quantity_on_hand ?? 0, Description ?? null, Warehouse_Location ?? "Unassigned"]
    );
    res.status(201).json({ message: "Product created" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Product pricing
app.get("/api/product-pricing/:productId", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM Product_Pricing WHERE Product_id = ? ORDER BY Unit_price",
    [req.params.productId]
  );
  res.json(rows);
});
app.post("/api/product-pricing", async (req, res) => {
  const { Product_id, Unit_price, discount, tax } = req.body;
  try {
    await pool.query(
      "INSERT INTO Product_Pricing (Product_id, Unit_price, discount, tax) VALUES (?, ?, ?, ?)",
      [Product_id, Unit_price, discount ?? 0, tax ?? 0]
    );
    res.status(201).json({ message: "Pricing added" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Purchase orders
app.get("/api/purchase-orders", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT po.*, s.name AS Supplier_Name
     FROM Purchase_Order po
     JOIN Supplier s ON s.Supplier_id = po.Supplier_id
     ORDER BY po.order_date DESC`
  );
  res.json(rows);
});
app.post("/api/purchase-orders", async (req, res) => {
  const { po_id, Supplier_id, order_date, Expected_delivery_date, Status } = req.body;
  try {
    await pool.query(
      "INSERT INTO Purchase_Order (po_id, Supplier_id, order_date, Expected_delivery_date, Status) VALUES (?, ?, ?, ?, ?)",
      [po_id, Supplier_id, order_date, Expected_delivery_date ?? null, Status ?? "Pending"]
    );
    res.status(201).json({ message: "PO created" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post("/api/purchase-order-items", async (req, res) => {
  const { po_id, Product_id, quantity } = req.body;
  try {
    await pool.query(
      "INSERT INTO Purchase_Order_Items (po_id, Product_id, quantity) VALUES (?, ?, ?)",
      [po_id, Product_id, quantity]
    );
    res.status(201).json({ message: "PO item added" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.patch("/api/purchase-orders/:po_id/status", async (req, res) => {
  const { Status, Expected_delivery_date } = req.body;
  try {
    await pool.query(
      "UPDATE Purchase_Order SET Status = ?, Expected_delivery_date = IFNULL(?, Expected_delivery_date) WHERE po_id = ?",
      [Status, Expected_delivery_date ?? null, req.params.po_id]
    );
  res.json({ message: "PO status updated" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Sales
app.get("/api/sales", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM Sale_Order ORDER BY order_date DESC");
  res.json(rows);
});
app.post("/api/sales/process", async (req, res) => {
  const { So_id, Customer_name, Product_id, Quantity, Unit_Price } = req.body;
  try {
    await pool.query("CALL sp_process_sale(?, ?, ?, ?, ?)", [
      So_id, Customer_name, Product_id, Quantity, Unit_Price
    ]);
    res.status(201).json({ message: "Sale processed" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Net prices (uses DB function)
app.get("/api/products/net-prices", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.Product_id, p.name, pp.Unit_price,
            fn_calculate_net_price(p.Product_id, pp.Unit_price) AS Net_Price
     FROM Product p
     JOIN Product_Pricing pp ON p.Product_id = pp.Product_id
     ORDER BY p.name, pp.Unit_price`
  );
  res.json(rows);
});

// ---- Static frontend (same server) ----
const FRONTEND_DIR = path.join(__dirname, "../frontend");
app.use(express.static(FRONTEND_DIR));

// SPA fallback (non-API routes return index.html)
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// ---- Start ----
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log("Server listening on port", port));
