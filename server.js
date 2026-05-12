'use strict';

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const initSqlJs  = require('sql.js');

const app     = express();
const PORT    = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.db');

// ─── Bootstrap DB ─────────────────────────────────────────────────────────────
let db;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS filaments (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      brand            TEXT NOT NULL,
      material_type    TEXT NOT NULL,
      color            TEXT NOT NULL,
      price_per_spool  REAL NOT NULL,
      total_weight     REAL NOT NULL DEFAULT 1000,
      remaining_weight REAL NOT NULL DEFAULT 1000,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name    TEXT NOT NULL,
      model_name     TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'Нове',
      filament_id    INTEGER NOT NULL,
      part_weight_g  REAL NOT NULL,
      print_time_h   REAL NOT NULL,
      total_price    REAL NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO settings VALUES ('electricity_rate', 4.32);
    INSERT OR IGNORE INTO settings VALUES ('printer_power_kw', 0.1);
    INSERT OR IGNORE INTO settings VALUES ('markup', 50);
  `);
  persist();
}

function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ─── Query helpers ─────────────────────────────────────────────────────────────
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function get(sql, params = []) { return all(sql, params)[0] || null; }
function run(sql, params = []) {
  db.run(sql, params);
  persist();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: r[0]?.values[0][0] };
}

// ─── Business Logic ────────────────────────────────────────────────────────────
function calcPrice({ filament_id, part_weight_g, print_time_h }) {
  const fil = get('SELECT * FROM filaments WHERE id = ?', [filament_id]);
  if (!fil) throw new Error('Filament not found');
  const s = Object.fromEntries(all('SELECT key, value FROM settings').map(r => [r.key, r.value]));
  const material   = (fil.price_per_spool / fil.total_weight) * part_weight_g;
  const electricity = s.printer_power_kw * print_time_h * s.electricity_rate;
  return parseFloat((material + electricity + Number(s.markup)).toFixed(2));
}

function handleFilamentDeduction(orderId, newStatus) {
  const order = get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order || order.status === newStatus) return;
  if (newStatus === 'Друк' && order.status !== 'Друк') {
    run('UPDATE filaments SET remaining_weight = MAX(0, remaining_weight - ?) WHERE id = ?',
      [order.part_weight_g, order.filament_id]);
  }
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Settings ─────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  res.json(Object.fromEntries(all('SELECT key, value FROM settings').map(r => [r.key, r.value])));
});
app.put('/api/settings', (req, res) => {
  const { electricity_rate, printer_power_kw, markup } = req.body;
  if (electricity_rate !== undefined) run('INSERT OR REPLACE INTO settings VALUES (?,?)', ['electricity_rate', Number(electricity_rate)]);
  if (printer_power_kw !== undefined) run('INSERT OR REPLACE INTO settings VALUES (?,?)', ['printer_power_kw', Number(printer_power_kw)]);
  if (markup           !== undefined) run('INSERT OR REPLACE INTO settings VALUES (?,?)', ['markup', Number(markup)]);
  res.json({ ok: true });
});

// ─── Filaments ────────────────────────────────────────────────────────────────
app.get('/api/filaments', (req, res) => {
  res.json(all('SELECT * FROM filaments ORDER BY id DESC'));
});
app.post('/api/filaments', (req, res) => {
  const { brand, material_type, color, price_per_spool, total_weight = 1000 } = req.body;
  if (!brand || !material_type || !color || !price_per_spool)
    return res.status(400).json({ error: 'Missing required fields' });
  const r = run(
    'INSERT INTO filaments (brand, material_type, color, price_per_spool, total_weight, remaining_weight) VALUES (?,?,?,?,?,?)',
    [brand, material_type, color, Number(price_per_spool), Number(total_weight), Number(total_weight)]
  );
  res.status(201).json(get('SELECT * FROM filaments WHERE id = ?', [r.lastInsertRowid]));
});
app.delete('/api/filaments/:id', (req, res) => {
  run('DELETE FROM filaments WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ─── Orders ───────────────────────────────────────────────────────────────────
app.get('/api/orders', (req, res) => {
  res.json(all(`
    SELECT o.*, f.brand, f.material_type, f.color
    FROM orders o JOIN filaments f ON o.filament_id = f.id
    ORDER BY o.created_at DESC
  `));
});
app.post('/api/orders', (req, res) => {
  const { client_name, model_name, filament_id, part_weight_g, print_time_h } = req.body;
  if (!client_name || !model_name || !filament_id || !part_weight_g || !print_time_h)
    return res.status(400).json({ error: 'Missing required fields' });
  const total_price = calcPrice({ filament_id, part_weight_g, print_time_h });
  const r = run(
    'INSERT INTO orders (client_name, model_name, filament_id, part_weight_g, print_time_h, total_price) VALUES (?,?,?,?,?,?)',
    [client_name, model_name, Number(filament_id), Number(part_weight_g), Number(print_time_h), total_price]
  );
  res.status(201).json(get(`
    SELECT o.*, f.brand, f.material_type, f.color
    FROM orders o JOIN filaments f ON o.filament_id = f.id WHERE o.id = ?
  `, [r.lastInsertRowid]));
});
app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const valid = ['Нове','Слайсинг','Друк','Постобробка','Готово','Видано'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  handleFilamentDeduction(req.params.id, status);
  run(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, req.params.id]);
  res.json(get('SELECT * FROM orders WHERE id = ?', [req.params.id]));
});
app.delete('/api/orders/:id', (req, res) => {
  run('DELETE FROM orders WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ─── Calculator ───────────────────────────────────────────────────────────────
app.post('/api/calculate', (req, res) => {
  try { res.json({ total_price: calcPrice(req.body) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── Stats ────────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const active          = get(`SELECT COUNT(*) as c FROM orders WHERE status != 'Видано'`).c;
  const revenue         = get(`SELECT COALESCE(SUM(total_price),0) as s FROM orders WHERE status = 'Видано'`).s;
  const pending_revenue = get(`SELECT COALESCE(SUM(total_price),0) as s FROM orders WHERE status != 'Видано'`).s;
  const low_filaments   = get(`SELECT COUNT(*) as c FROM filaments WHERE remaining_weight < 100`).c;
  res.json({ active_orders: active, revenue, pending_revenue, low_filaments });
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => console.log(`🖨  3dManage → http://localhost:${PORT}`));
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });