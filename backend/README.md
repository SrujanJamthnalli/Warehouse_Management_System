# Warehouse Management Backend (Node.js + MySQL)

## Prereqs
- Node.js 18+
- MySQL 8+
- Import your SQL schema/data: `Warehouse_Management.sql`

## Quick Start
1) Copy `.env.sample` to `.env` and set DB credentials.
2) Ensure database exists and run the SQL file:
   ```sh
   mysql -u root -p < ../Warehouse_Management.sql
   ```
3) Install deps and run:
   ```sh
   npm install
   npm start
   ```

## Endpoints (high level)
- `GET /api/products` — list products
- `POST /api/products` — add product
- `GET /api/product-pricing/:productId` — pricing for a product
- `POST /api/product-pricing` — add pricing row
- `GET /api/suppliers` — list suppliers
- `POST /api/suppliers` — add supplier
- `GET /api/purchase-orders` — list POs (with supplier name)
- `POST /api/purchase-orders` — create PO
- `POST /api/purchase-order-items` — add an item to PO
- `PATCH /api/purchase-orders/:po_id/status` — update PO status (set to 'Received' to auto-increase stock via DB trigger)
- `GET /api/sales` — list sale orders
- `POST /api/sales/process` — process a sale (uses `sp_process_sale`)