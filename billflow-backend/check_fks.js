const BetterSqlite3 = require('better-sqlite3');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data/billflow.sqlite');
const db = new BetterSqlite3(DB_FILE);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const table of tables) {
    const fks = db.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
    for (const fk of fks) {
        if (fk.table === 'quotes_old') {
            console.log(`Table ${table.name} points to quotes_old!`);
        } else if (fk.table === 'quotes') {
            console.log(`Table ${table.name} points to quotes (Correct).`);
        }
    }
}

db.close();
