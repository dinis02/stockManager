const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let items = [];
let nextId = 1;
let movements = [];
let nextMovementId = 1;
let brands = [];
let nextBrandId = 1;
let suppliers = [];
let nextSupplierId = 1;

app.get('/api/items', (req, res) => {
  console.log('[mock] GET /api/items ->', items.length, 'items');
  res.json(items);
});

app.post('/api/items', (req, res) => {
  const item = req.body || {};
  if (!item.name) return res.status(400).json({ error: 'name required' });
  console.log('[mock] POST /api/items payload:', item);
  // simple duplicate check by name
  const exists = items.find(it => it.name.trim().toLowerCase() === item.name.trim().toLowerCase());
  if (exists) {
    console.log('[mock] POST duplicate name -> 409');
    return res.status(409).json({ error: 'product name exists' });
  }
  const row = { id: nextId++, ...item };
  items.push(row);
  console.log('[mock] Created item id', row.id);
  res.status(201).json(row);
});

app.put('/api/items/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = items.findIndex(it => it.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  items[idx] = { ...items[idx], ...req.body };
  res.json(items[idx]);
});

// Movements endpoints
app.post('/api/movements', (req, res) => {
  const { subproduct_id, type, quantity, username, notes } = req.body || {};
  console.log('[mock] POST /api/movements payload:', req.body);
  if (!subproduct_id || !type || quantity == null) return res.status(400).json({ error: 'subproduct_id, type, quantity required' });
  if (!['entry', 'exit'].includes(type)) return res.status(400).json({ error: 'type must be entry or exit' });
  const spId = Number(subproduct_id);
  const sp = items.find(it => it.id === spId);
  console.log('[mock] subproduct lookup for', spId, 'found=', !!sp);
  if (!sp) return res.status(404).json({ error: 'subproduct not found' });
  const currentQty = sp.quantity != null ? Number(sp.quantity) : 0;
  const newQty = type === 'entry' ? currentQty + Number(quantity) : currentQty - Number(quantity);
  sp.quantity = newQty;
  const mv = { id: nextMovementId++, subproduct_id: spId, type, quantity: Number(quantity), username: username || null, timestamp: Math.floor(Date.now()/1000), notes: notes || null, name: sp ? sp.name : null, brand: sp ? sp.brand : null };
  movements.unshift(mv);
  console.log('[mock] Created movement id', mv.id, 'newQty=', newQty);
  res.status(201).json({ id: mv.id, ok: true });
});

app.get('/api/movements', (req, res) => {
  // return movements enriched with product name and brand
  const enriched = movements.map(m => {
    const sp = items.find(it => it.id === Number(m.subproduct_id));
    return {
      ...m,
      name: sp ? sp.name : null,
      brand: sp ? sp.brand : null
    };
  });
  res.json(enriched);
});

app.get('/api/movements/:subproduct_id', (req, res) => {
  const subproduct_id = Number(req.params.subproduct_id);
  const list = movements.filter(m => Number(m.subproduct_id) === subproduct_id).map(m => {
    const sp = items.find(it => it.id === Number(m.subproduct_id));
    return { ...m, name: sp ? sp.name : null, brand: sp ? sp.brand : null };
  });
  res.json(list);
});

// Brands endpoints
app.get('/api/brands', (req, res) => {
  res.json(brands);
});

app.post('/api/brands', (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const exists = brands.find(b => b.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (exists) return res.status(409).json({ error: 'brand exists' });
  const row = { id: nextBrandId++, name };
  brands.push(row);
  res.status(201).json(row);
});

app.delete('/api/brands/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  brands.splice(idx, 1);
  res.json({ ok: true });
});

// Suppliers endpoints
app.get('/api/suppliers', (req, res) => {
  res.json(suppliers);
});

app.post('/api/suppliers', (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const exists = suppliers.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (exists) return res.status(409).json({ error: 'supplier exists' });
  const row = { id: nextSupplierId++, name };
  suppliers.push(row);
  res.status(201).json(row);
});

app.delete('/api/suppliers/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = suppliers.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  suppliers.splice(idx, 1);
  res.json({ ok: true });
});

app.listen(3000, () => console.log('Mock dev API listening on http://localhost:3000'));
