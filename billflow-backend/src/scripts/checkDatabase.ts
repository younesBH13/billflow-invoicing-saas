import BetterSqlite3 from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../data/billflow.sqlite');
console.log('Checking database at:', dbPath);

const db: BetterSqlite3.Database = BetterSqlite3(dbPath);

// Check tables
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
console.log('\n📋 Tables in database:', tables.map((t: any) => t.name).join(', '));

// Check clients
const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
console.log('\n👥 Total clients:', clientCount.count);

if (clientCount.count > 0) {
    const clients = db.prepare('SELECT id, code, name, type FROM clients ORDER BY created_at DESC LIMIT 5').all();
    console.log('Recent clients:', JSON.stringify(clients, null, 2));
}

// Check users
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
console.log('\n👤 Total users:', userCount.count);

if (userCount.count > 0) {
    const users = db.prepare('SELECT id, username, name, role FROM users').all();
    console.log('Users:', JSON.stringify(users, null, 2));
}

// Check invoices
const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number };
console.log('\n📄 Total invoices:', invoiceCount.count);

db.close();
console.log('\n✅ Database check complete');
