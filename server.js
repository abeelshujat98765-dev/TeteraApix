const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;

// Vercel pe /tmp use karo (writable), local pe normal path
const DATA_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'bills.json')
  : path.join(__dirname, 'bills.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/* ============================================================
   DATA LOAD / SAVE
============================================================ */
let bills = [];

function loadBills() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
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
console.log('📂 Loaded bills from file:', bills.length);
console.log('📁 Data file location:', DATA_FILE);

/* ============================================================
   ROUTES
============================================================ */
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

// Data receive karo
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

/* ============================================================
   START
============================================================ */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('========================================');
    console.log('⚡ Tetra Apix Backend running!');
    console.log('🌐 http://localhost:' + PORT);
    console.log('📊 Dashboard: http://localhost:' + PORT + '/dashboard');
    console.log('💾 Data file: bills.json');
    console.log('========================================');
  });
}

module.exports = app;