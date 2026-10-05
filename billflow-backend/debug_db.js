const BetterSqlite3 = require('better-sqlite3');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data/billflow.sqlite');
const db = new BetterSqlite3(DB_FILE);

console.log('--- Tables ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables.map(t => t.name));

console.log('\n--- quote_items info ---');
console.log(db.prepare("PRAGMA table_info(quote_items)").all());

console.log('\n--- quote_items foreign keys ---');
console.log(db.prepare("PRAGMA foreign_key_list(quote_items)").all());

console.log('\n--- quotes info ---');
console.log(db.prepare("PRAGMA table_info(quotes)").all());

console.log('\n--- Triggers ---');
console.log(db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'").all());

db.close();
