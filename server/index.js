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

CREATE TABLE IF NOT EXISTS brands (
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

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  username TEXT,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subproducts_product_id ON subproducts(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_subproduct ON movements(subproduct_id);
CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON movements(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp);
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

// Initialize brands from existing stock entries if the table is empty
const brandCount = db.prepare('SELECT COUNT(*) as count FROM brands').get().count;
if (brandCount === 0) {
  const existingBrands = db.prepare(`
    SELECT DISTINCT TRIM(brand) as name
    FROM subproducts
    WHERE brand IS NOT NULL AND TRIM(brand) <> ''
    ORDER BY name
  `).all();
  const insertBrand = db.prepare('INSERT OR IGNORE INTO brands (name) VALUES (?)');
  existingBrands.forEach(row => insertBrand.run(row.name));
}

// Helpers
const findOrCreateProduct = (name, category) => {
  const get = db.prepare('SELECT id FROM products WHERE name = ?').get(name);
  if (get) return get.id;
  const info = db.prepare('INSERT INTO products (name, category) VALUES (?, ?)').run(name, category);
  return info.lastInsertRowid;
};

const logAudit = ({ entityType, entityId, action, title, details = null, username = null }) => {
  try {
    db.prepare(`
      INSERT INTO audit_events (entity_type, entity_id, action, title, details, username, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entityType,
      entityId != null ? String(entityId) : null,
      action,
      title,
      details,
      username,
      Math.floor(Date.now() / 1000)
    );
  } catch (e) {
    console.error('[audit] failed to log event', e);
  }
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
    logAudit({
      entityType: 'product',
      entityId: row.id,
      action: 'create',
      title: `Produto criado: ${row.name}`,
      details: `${row.quantity || 0} ${row.unit || 'un'} em ${row.category || 'Sem categoria'}`
    });
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
    const existing = db.prepare(`
      SELECT s.id as id, p.name as name, p.category as category, s.brand, s.quantity, s.unit
      FROM subproducts s
      JOIN products p ON p.id = s.product_id
      WHERE s.id = ?
    `).get(id);
    const info = db.prepare('DELETE FROM subproducts WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    logAudit({
      entityType: 'product',
      entityId: id,
      action: 'delete',
      title: `Produto apagado: ${existing?.name || id}`,
      details: existing ? `${existing.quantity || 0} ${existing.unit || 'un'} - ${existing.category || 'Sem categoria'}` : null
    });
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
    const before = db.prepare(`
      SELECT s.id as id, p.name as name, p.category as category,
             s.brand, s.unit, s.quantity, s.min_quantity, s.price, s.supplier, s.notes, s.date
      FROM subproducts s
      JOIN products p ON p.id = s.product_id
      WHERE s.id = ?
    `).get(id);
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
    const changedFields = before
      ? ['name', 'category', 'brand', 'unit', 'quantity', 'min_quantity', 'price', 'supplier', 'notes', 'date']
          .filter(field => String(before[field] ?? '') !== String(row[field] ?? ''))
      : [];
    logAudit({
      entityType: 'product',
      entityId: row.id,
      action: 'update',
      title: `Produto atualizado: ${row.name}`,
      details: changedFields.length ? `Campos alterados: ${changedFields.join(', ')}` : 'Produto guardado sem alteracoes visiveis'
    });
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
    const cleanName = String(name || '').trim();
    if (!cleanName) return res.status(400).json({ error: 'name required' });
    const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(cleanName);
    logAudit({
      entityType: 'category',
      entityId: info.lastInsertRowid,
      action: 'create',
      title: `Categoria criada: ${cleanName}`
    });
    res.status(201).json({ id: info.lastInsertRowid, name: cleanName });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'category already exists' });
    } else {
      console.error(e);
      res.status(500).json({ error: 'failed' });
    }
  }
});

app.put('/api/categories/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { name } = req.body || {};
    const cleanName = String(name || '').trim();
    if (!cleanName) return res.status(400).json({ error: 'name required' });

    const current = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id);
    if (!current) return res.status(404).json({ error: 'not found' });

    const updateCategory = db.prepare('UPDATE categories SET name = ? WHERE id = ?');
    const updateProducts = db.prepare('UPDATE products SET category = ? WHERE category = ?');
    const tx = db.transaction(() => {
      updateCategory.run(cleanName, id);
      updateProducts.run(cleanName, current.name);
    });
    tx();

    logAudit({
      entityType: 'category',
      entityId: id,
      action: 'update',
      title: `Categoria atualizada: ${current.name} -> ${cleanName}`
    });
    res.json({ id: Number(id), name: cleanName });
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
    const existing = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id);
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    logAudit({
      entityType: 'category',
      entityId: id,
      action: 'delete',
      title: `Categoria apagada: ${existing?.name || id}`
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

// Brands endpoints
app.get('/api/brands', (req, res) => {
  try {
    const brands = db.prepare('SELECT id, name FROM brands ORDER BY name').all();
    res.json(brands);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.post('/api/brands', (req, res) => {
  try {
    const { name } = req.body || {};
    const cleanName = String(name || '').trim();
    if (!cleanName) return res.status(400).json({ error: 'name required' });
    const info = db.prepare('INSERT INTO brands (name) VALUES (?)').run(cleanName);
    logAudit({
      entityType: 'brand',
      entityId: info.lastInsertRowid,
      action: 'create',
      title: `Marca criada: ${cleanName}`
    });
    res.status(201).json({ id: info.lastInsertRowid, name: cleanName });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'brand already exists' });
    } else {
      console.error(e);
      res.status(500).json({ error: 'failed' });
    }
  }
});

app.put('/api/brands/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { name } = req.body || {};
    const cleanName = String(name || '').trim();
    if (!cleanName) return res.status(400).json({ error: 'name required' });

    const current = db.prepare('SELECT id, name FROM brands WHERE id = ?').get(id);
    if (!current) return res.status(404).json({ error: 'not found' });

    const updateBrand = db.prepare('UPDATE brands SET name = ? WHERE id = ?');
    const updateSubproducts = db.prepare('UPDATE subproducts SET brand = ? WHERE brand = ?');
    const tx = db.transaction(() => {
      updateBrand.run(cleanName, id);
      updateSubproducts.run(cleanName, current.name);
    });
    tx();

    logAudit({
      entityType: 'brand',
      entityId: id,
      action: 'update',
      title: `Marca atualizada: ${current.name} -> ${cleanName}`
    });
    res.json({ id: Number(id), name: cleanName });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'brand already exists' });
    } else {
      console.error(e);
      res.status(500).json({ error: 'failed' });
    }
  }
});

app.delete('/api/brands/:id', (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT id, name FROM brands WHERE id = ?').get(id);
    const info = db.prepare('DELETE FROM brands WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    logAudit({
      entityType: 'brand',
      entityId: id,
      action: 'delete',
      title: `Marca apagada: ${existing?.name || id}`
    });
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
    const parsedQuantity = Number(quantity);
    const parsedSubproductId = Number(subproduct_id);
    if (!parsedSubproductId || !type || !parsedQuantity) {
      return res.status(400).json({ error: 'subproduct_id, type, quantity required' });
    }
    if (!['entry', 'exit'].includes(type)) {
      return res.status(400).json({ error: 'type must be entry or exit' });
    }
    if (parsedQuantity <= 0) {
      return res.status(400).json({ error: 'quantity must be greater than zero' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const current = db.prepare('SELECT quantity FROM subproducts WHERE id = ?').get(parsedSubproductId);
    if (!current) {
      return res.status(404).json({ error: 'product not found' });
    }
    const currentQuantity = Number(current.quantity || 0);
    const newQuantity = type === 'entry' ? currentQuantity + parsedQuantity : currentQuantity - parsedQuantity;
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'insufficient stock' });
    }

    const info = db.prepare(`
      INSERT INTO movements (subproduct_id, type, quantity, username, timestamp, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(parsedSubproductId, type, parsedQuantity, username || null, timestamp, notes || null);

    db.prepare('UPDATE subproducts SET quantity = ? WHERE id = ?').run(newQuantity, parsedSubproductId);

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

app.get('/api/history', (req, res) => {
  try {
    const movementRows = db.prepare(`
      SELECT m.id, m.type, m.quantity, m.username, m.timestamp, m.notes,
             s.id as subproduct_id, p.name, s.brand
      FROM movements m
      JOIN subproducts s ON s.id = m.subproduct_id
      JOIN products p ON p.id = s.product_id
    `).all().map(row => ({
      id: `movement-${row.id}`,
      source: 'movement',
      entityType: 'stock',
      action: row.type,
      title: `${row.type === 'entry' ? 'Entrada' : 'Saida'} de stock: ${row.name}`,
      details: `${row.quantity} un.${row.notes ? ` - ${row.notes}` : ''}`,
      name: row.name,
      brand: row.brand,
      quantity: row.quantity,
      username: row.username,
      timestamp: row.timestamp
    }));

    const auditRows = db.prepare(`
      SELECT id, entity_type, entity_id, action, title, details, username, timestamp
      FROM audit_events
    `).all().map(row => ({
      id: `audit-${row.id}`,
      source: 'audit',
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      title: row.title,
      details: row.details,
      username: row.username,
      timestamp: row.timestamp
    }));

    res.json([...movementRows, ...auditRows].sort((a, b) => b.timestamp - a.timestamp));
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

