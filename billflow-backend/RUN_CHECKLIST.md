# Backend run & test checklist

Follow these steps after a fresh machine reinstall (e.g., XAMPP reset) or before handing off changes:

## 1) Clean install
- Copy env: `cp .env.example .env` and fill DB/JWT values.
- Install deps: `npm install`.

## 2) (Re)create and seed the database
- Fast path: `npm run setup:db` (creates schema + demo data).
- If users are missing, load defaults: `mysql -u root -p billflow_db < USER_SEED.sql`.
- If the schema already exists but data is stale, you can clear demo rows:
  - `TRUNCATE TABLE payments;`
  - `TRUNCATE TABLE invoice_lines;`
  - `TRUNCATE TABLE invoices;`
  - `TRUNCATE TABLE clients;`
  - then rerun `npm run setup:db` or `mysql ... < USER_SEED.sql`.

## 3) Build / quick test
- Type check + build: `npm run build`.

## 4) Run the API
- Dev server with auto-reload: `npm run dev` (listens on PORT from `.env`).
- Production build + start: `npm run build && npm start`.

## 5) Verify login quickly
- Default users: admin/admin123 and commercial/commercial123.
- If you inserted an argon2-hashed password manually, make sure the `argon2`
  package is installed (`npm install argon2`) so the server can verify it.
