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
  min_quantity INTEGER DEFAULT 0,
  price REAL,
  supplier TEXT,
  notes TEXT,
  date TEXT,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subproduct_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  username TEXT,
  timestamp INTEGER,
  notes TEXT,
  FOREIGN KEY(subproduct_id) REFERENCES subproducts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subproducts_product_id ON subproducts(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_subproduct ON movements(subproduct_id);
CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON movements(timestamp);
`);

// Add min_quantity column if it doesn't exist (migration)
try {
  db.prepare('SELECT min_quantity FROM subproducts LIMIT 1').get();
} catch (e) {
  if (e.message.includes('no such column')) {
    console.log('[server] Adding min_quantity column to subproducts...');
    db.exec('ALTER TABLE subproducts ADD COLUMN min_quantity INTEGER DEFAULT 0');
  }
}

// Initialize default categories if empty
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
if (categoryCount === 0) {
  db.prepare('INSERT INTO categories (name) VALUES (?)').run('Outros');
  db.prepare('INSERT INTO categories (name) VALUES (?)').run('Shampoo');
  db.prepare('INSERT INTO categories (name) VALUES (?)').run('Tratamento');
}

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
             s.brand, s.color, s.unit, s.quantity, s.min_quantity, s.price, s.supplier, s.notes, s.date
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
      INSERT INTO subproducts (product_id, brand, color, unit, quantity, min_quantity, price, supplier, notes, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = insert.run(
      productId,
      item.brand || null,
      item.color || null,
      item.unit || null,
      item.quantity != null ? item.quantity : null,
      item.min_quantity != null ? item.min_quantity : 0,
      item.price != null ? item.price : null,
      item.supplier || null,
      item.notes || null,
      item.date || null
    );
    const row = db.prepare(`
      SELECT s.id as id, p.id as product_id, p.name as name, p.category as category,
             s.brand, s.color, s.unit, s.quantity, s.min_quantity, s.price, s.supplier, s.notes, s.date
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
      UPDATE subproducts SET product_id = ?, brand = ?, color = ?, unit = ?, quantity = ?, min_quantity = ?, price = ?, supplier = ?, notes = ?, date = ?
      WHERE id = ?
    `);
    const info = update.run(
      productId,
      item.brand || null,
      item.color || null,
      item.unit || null,
      item.quantity != null ? item.quantity : null,
      item.min_quantity != null ? item.min_quantity : 0,
      item.price != null ? item.price : null,
      item.supplier || null,
      item.notes || null,
      item.date || null,
      id
    );

    if (info.changes === 0) return res.status(404).json({ error: 'not found' });

    const row = db.prepare(`
      SELECT s.id as id, p.id as product_id, p.name as name, p.category as category,
             s.brand, s.color, s.unit, s.quantity, s.min_quantity, s.price, s.supplier, s.notes, s.date
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

// Categories endpoints
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();
    res.json(categories);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    res.status(201).json({ id: info.lastInsertRowid, name });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'category already exists' });
    } else {
      console.error(e);
      res.status(500).json({ error: 'failed' });
    }
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    const id = req.params.id;
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

// Movements endpoints
app.post('/api/movements', (req, res) => {
  try {
    const { subproduct_id, type, quantity, username, notes } = req.body || {};
    if (!subproduct_id || !type || !quantity) {
      return res.status(400).json({ error: 'subproduct_id, type, quantity required' });
    }
    if (!['entry', 'exit'].includes(type)) {
      return res.status(400).json({ error: 'type must be entry or exit' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const info = db.prepare(`
      INSERT INTO movements (subproduct_id, type, quantity, username, timestamp, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(subproduct_id, type, quantity, username || null, timestamp, notes || null);

    // Update quantity in subproduct
    const current = db.prepare('SELECT quantity FROM subproducts WHERE id = ?').get(subproduct_id);
    const newQuantity = type === 'entry' ? (current.quantity || 0) + quantity : (current.quantity || 0) - quantity;
    db.prepare('UPDATE subproducts SET quantity = ? WHERE id = ?').run(newQuantity, subproduct_id);

    res.status(201).json({ id: info.lastInsertRowid, ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api/movements', (req, res) => {
  try {
    const movements = db.prepare(`
      SELECT m.*, s.id as subproduct_id, p.name, s.brand
      FROM movements m
      JOIN subproducts s ON s.id = m.subproduct_id
      JOIN products p ON p.id = s.product_id
      ORDER BY m.timestamp DESC
    `).all();
    res.json(movements);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api/movements/:subproduct_id', (req, res) => {
  try {
    const subproduct_id = req.params.subproduct_id;
    const movements = db.prepare(`
      SELECT * FROM movements WHERE subproduct_id = ? ORDER BY timestamp DESC
    `).all(subproduct_id);
    res.json(movements);
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

