const Database = require('better-sqlite3');
const path = require('path');
const dbPath = process.argv[2] || path.join(__dirname, 'data', 'billflow.sqlite');
const db = new Database(dbPath);

const invoices = db.prepare('SELECT id, number, subtotal FROM invoices ORDER BY id').all();
let allOk = true;
for (const inv of invoices) {
    const lines = db.prepare('SELECT total_price, amount, quantity, unit_price FROM invoice_lines WHERE invoice_id = ?').all(inv.id);
    let sumFromLines = 0;
    for (const l of lines) {
        let t = 0;
        if (l.total_price) t = l.total_price;
        else if (l.amount) t = l.amount;
        else t = (l.quantity || 0) * (l.unit_price || 0);
        sumFromLines += t;
    }
    const match = Math.abs((inv.subtotal || 0) - sumFromLines) < 0.01;
    if (!match) allOk = false;
    console.log(`${match ? '✅' : '❌'} ${inv.number}: subtotal=${inv.subtotal}, lines_sum=${sumFromLines}`);
}
console.log(allOk ? '\nAll subtotals correct!' : '\nSome subtotals are still wrong!');
db.close();
