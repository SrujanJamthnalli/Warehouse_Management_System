
# Full-Stack Warehouse Management (MySQL + Node.js + Vanilla JS)

This project wires a simple website to your existing MySQL schema (tables, trigger, function, and stored procedure).

## 0) Requirements
- MySQL 8+
- Node.js 18+
- A browser

## 1) Import your SQL
From the project root:
```sh
mysql -u root -p < Warehouse_Management.sql
```

## 2) Start the backend
```sh
cd backend
cp .env.sample .env   # then edit DB credentials
npm install
npm start
```
Backend runs on http://localhost:4000

## 3) Start the frontend
Use any static server for the `frontend` folder, e.g.:
```sh
npx serve -l 5500 frontend
```
Then open http://localhost:5500

## 4) What happens when you add a product?
- It is inserted into `Product`.
- It appears immediately under **Products** and in the dropdowns for **Pricing**, **PO Items**, and **Sales**.
- Adding pricing writes to `Product_Pricing`.
- Creating a PO and marking it **Received** updates inventory via your DB trigger.
- Processing a sale calls `sp_process_sale` which checks stock, computes total using `fn_calculate_net_price`, inserts `Sale_Order` + `Sale_Order_Items`, and decrements stock.

## 5) Common issues
- **CORS**: update `CORS_ORIGIN` in `backend/.env` to match your frontend URL.
- **MySQL auth**: ensure user/password and host/port in `.env` are correct.
- **Date formats**: forms use `YYYY-MM-DD` which MySQL accepts for `DATE` columns.

## 6) Production notes
- Serve frontend from a real web server (Nginx/Apache) and set HTTPS.
- Run backend with a process manager (PM2/systemd) and restrict DB user privileges.
- Add validation/auth before exposing to the internet.
