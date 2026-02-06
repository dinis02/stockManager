# StockManager Dev API

Small Express + SQLite dev API used by the frontend during development.

Install dependencies and run:

```bash
cd server
npm install
npm start
```

The server listens on `http://localhost:3000` by default and exposes:

- `GET /api/items` - list all subproducts joined with their product
- `POST /api/items` - create a subproduct (body: JSON with `name` (product name) and fields like `brand`, `quantity`, `unit`, `price`, `supplier`, `notes`, `date`, `color`)
- `DELETE /api/items/:id` - remove a subproduct
- `GET /api/products` - list products

Data is persisted in `server/data.db` (SQLite).
