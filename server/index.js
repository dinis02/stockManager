import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'stock-manager-data.json');

app.use(cors());
app.use(bodyParser.json());

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/items', (req, res) => {
  const items = readData();
  res.json(items);
});

app.post('/api/items', (req, res) => {
  const items = readData();
  const item = req.body;
  item.id = Date.now().toString();
  items.push(item);
  writeData(items);
  res.status(201).json(item);
});

app.delete('/api/items/:id', (req, res) => {
  const id = req.params.id;
  let items = readData();
  const before = items.length;
  items = items.filter(i => i.id !== id);
  writeData(items);
  res.json({ deleted: before - items.length });
});

app.get('/', (req, res) => {
  res.send({ status: 'backend running' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
