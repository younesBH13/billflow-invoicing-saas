const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = process.argv[2] || path.join(__dirname, 'data', 'billflow.sqlite');
console.log(`Using database at: ${dbPath}`);

const db = new Database(dbPath);

const adminHash = bcrypt.hashSync('inspectionpowerIT2026', 10);
const commercialHash = bcrypt.hashSync('commercial123', 10);

db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(adminHash, 'admin');
db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(commercialHash, 'commercial');

console.log('✅ Passwords reset successfully!');
console.log('  admin / inspectionpowerIT2026');
console.log('  commercial / commercial123');

db.close();
