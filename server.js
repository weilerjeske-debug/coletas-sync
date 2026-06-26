const express = require('express');
const fs      = require('fs');
const path    = require('path');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'coletas_db.json');

// CORS aberto para qualquer origem (necessário para o HTML rodando localmente no tablet)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors()); // responde preflight

app.use(express.json({ limit: '10mb' }));

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch(e) {}
  return { records: [] };
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db), 'utf8');
}

let db = loadDB();

// GET /records
app.get('/records', (req, res) => {
  res.json({ records: db.records, total: db.records.length });
});

// POST /records
app.post('/records', (req, res) => {
  const { record } = req.body;
  if (!record || !record.id) return res.status(400).json({ error: 'Registro inválido' });

  const exists = db.records.find(r => r.id === record.id);
  if (exists) return res.json({ ok: true, duplicate: true });

  const maxNum = db.records.length > 0
    ? Math.max(...db.records.map(r => r.num || 0))
    : 0;
  record.num = maxNum + 1;

  db.records.push(record);
  saveDB(db);
  res.json({ ok: true, num: record.num, total: db.records.length });
});

// GET /export
app.get('/export', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="coletas_export.json"');
  res.json(db);
});

// DELETE /records
app.delete('/records', (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASS) return res.status(401).json({ error: 'Não autorizado' });
  db = { records: [] };
  saveDB(db);
  res.json({ ok: true });
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', total: db.records.length, uptime: Math.round(process.uptime()) + 's' });
});

app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
