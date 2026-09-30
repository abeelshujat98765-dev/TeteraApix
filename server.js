const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;

const DATA_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'bills.json')
  : path.join(__dirname, 'bills.json');

// CORS FIX
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Tetra-Source', 'Authorization'],
  credentials: false
}));

app.options('*', cors());
app.use(express.json());
app.use(express.static(__dirname));

let bills = [];

function loadBills() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Load error:', err.message);
  }
  return [];
}

function saveBills(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Save error:', err.message);
  }
}

bills = loadBills();
console.log('📂 Loaded:', bills.length);

app.get('/', (req, res) => {
  res.json({
    service: 'Tetra Apix Backend',
    status: 'running',
    bills: bills.length,
    env: process.env.VERCEL ? 'vercel' : 'local'
  });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date(), db: 'file' });
});

app.post('/api/sync-from-ke', (req, res) => {
  console.log('📥 Received:', req.body);

  const bill = {
    id: bills.length + 1,
    billNumber: req.body.billNumber || null,
    accountNumber: req.body.accountNumber || null,
    billMonth: req.body.billMonth || null,
    issueDate: req.body.issueDate || null,
    units: req.body.units || null,
    amount: req.body.amount || null,
    isDemo: req.body.isDemo || false,
    source: req.body.source || 'unknown',
    timestamp: new Date(),
    raw: req.body
  };

  bills.push(bill);
  saveBills(bills);
  console.log('✅ Saved. Total:', bills.length);

  res.json({ success: true, message: 'Bill synced', billId: bill.id });
});

app.get('/api/bills', (req, res) => {
  res.json({ success: true, count: bills.length, bills: bills });
});

app.get('/api/bills/latest', (req, res) => {
  res.json({ success: true, bill: bills[bills.length - 1] || null });
});

app.delete('/api/bills', (req, res) => {
  bills = [];
  saveBills(bills);
  res.json({ success: true, message: 'All bills cleared' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('========================================');
    console.log('⚡ Tetra Apix Backend running!');
    console.log('🌐 http://localhost:' + PORT);
    console.log('========================================');
  });
}

module.exports = app;