const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const DB_PATH = path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

// Initialize schema
db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT
);

CREATE TABLE IF NOT EXISTS subproducts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  brand TEXT,
  color TEXT,
  unit TEXT,
  quantity INTEGER,
  price REAL,
  supplier TEXT,
  notes TEXT,
  date TEXT,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subproducts_product_id ON subproducts(product_id);
`);

// Helpers
const findOrCreateProduct = (name, category) => {
  const get = db.prepare('SELECT id FROM products WHERE name = ?').get(name);
  if (get) return get.id;
  const info = db.prepare('INSERT INTO products (name, category) VALUES (?, ?)').run(name, category);
  return info.lastInsertRowid;
};

// GET items (joins products -> subproducts)
app.get('/api/items', (req, res) => {
  try {
    const start = Date.now();
    const rows = db.prepare(`
      SELECT s.id as id, p.id as product_id, p.name as name, p.category as category,
             s.brand, s.color, s.unit, s.quantity, s.price, s.supplier, s.notes, s.date
      FROM subproducts s
      JOIN products p ON p.id = s.product_id
      ORDER BY s.id DESC
    `).all();
    res.json(rows);
    console.log(`[server] GET /api/items -> ${rows.length} rows (${Date.now()-start}ms)`);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

// POST item: body should include name (product name) and other fields
app.post('/api/items', (req, res) => {
  try {
    const start = Date.now();
    const item = req.body || {};
    if (!item.name) return res.status(400).json({ error: 'name required' });
    const productId = findOrCreateProduct(item.name, item.category || null);
    const insert = db.prepare(`
      INSERT INTO subproducts (product_id, brand, color, unit, quantity, price, supplier, notes, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = insert.run(
      productId,
      item.brand || null,
      item.color || null,
      item.unit || null,
      item.quantity != null ? item.quantity : null,
      item.price != null ? item.price : null,
      item.supplier || null,
      item.notes || null,
      item.date || null
    );
    const row = db.prepare(`
      SELECT s.id as id, p.id as product_id, p.name as name, p.category as category,
             s.brand, s.color, s.unit, s.quantity, s.price, s.supplier, s.notes, s.date
      FROM subproducts s
      JOIN products p ON p.id = s.product_id
      WHERE s.id = ?
    `).get(info.lastInsertRowid);
    res.status(201).json(row);
    console.log(`[server] POST /api/items -> created id ${row.id} (${Date.now()-start}ms)`);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

// DELETE item (subproduct)
app.delete('/api/items/:id', (req, res) => {
  try {
    const id = req.params.id;
    const info = db.prepare('DELETE FROM subproducts WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

// UPDATE item (subproduct)
app.put('/api/items/:id', (req, res) => {
  try {
    const start = Date.now();
    const id = req.params.id;
    const item = req.body || {};
    // if name provided, find or create product and set product_id
    let productId = null;
    if (item.name) {
      productId = findOrCreateProduct(item.name, item.category || null);
    } else {
      const existing = db.prepare('SELECT product_id FROM subproducts WHERE id = ?').get(id);
      productId = existing ? existing.product_id : null;
    }

    const update = db.prepare(`
      UPDATE subproducts SET product_id = ?, brand = ?, color = ?, unit = ?, quantity = ?, price = ?, supplier = ?, notes = ?, date = ?
      WHERE id = ?
    `);
    const info = update.run(
      productId,
      item.brand || null,
      item.color || null,
      item.unit || null,
      item.quantity != null ? item.quantity : null,
      item.price != null ? item.price : null,
      item.supplier || null,
      item.notes || null,
      item.date || null,
      id
    );

    if (info.changes === 0) return res.status(404).json({ error: 'not found' });

    const row = db.prepare(`
      SELECT s.id as id, p.id as product_id, p.name as name, p.category as category,
             s.brand, s.color, s.unit, s.quantity, s.price, s.supplier, s.notes, s.date
      FROM subproducts s
      JOIN products p ON p.id = s.product_id
      WHERE s.id = ?
    `).get(id);
    res.json(row);
    console.log(`[server] PUT /api/items/${id} -> updated (${Date.now()-start}ms)`);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

// List products
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT id, name, category FROM products ORDER BY name').all();
    res.json(products);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

// Serve nothing else; server is only API for dev
app.listen(PORT, () => {
  console.log(`StockManager dev API listening on http://localhost:${PORT}`);
});

