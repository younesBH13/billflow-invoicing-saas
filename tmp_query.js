
const path = require('path');
const Database = require(path.join(__dirname, 'billflow-backend', 'node_modules', 'better-sqlite3'));
const db = new Database(path.join(__dirname, 'billflow-backend', 'data', 'billflow.sqlite'));

// Check raw date for invoice 014/26
const inv = db.prepare("SELECT id, number, date, typeof(date) as date_type FROM invoices WHERE id = 23").get();
console.log('Invoice 014/26 raw date:', JSON.stringify(inv));

// Check which query pattern would match it
const jan = db.prepare("SELECT id, number, date FROM invoices WHERE id=23 AND date LIKE '2026-01%'").get();
const feb = db.prepare("SELECT id, number, date FROM invoices WHERE id=23 AND date LIKE '2026-02%'").get();
console.log('Matches Jan pattern:', jan ? 'YES' : 'NO');
console.log('Matches Feb pattern:', feb ? 'YES' : 'NO');

// Also show all unique dates in February query to understand
const febAll = db.prepare("SELECT id, number, date FROM invoices WHERE date LIKE '2026-02%' ORDER BY id").all();
console.log('\nAll invoices matching 2026-02%:');
febAll.forEach(r => console.log(`id=${r.id} num=${r.number} raw_date="${r.date}"`));
