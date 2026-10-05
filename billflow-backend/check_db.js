const db = require('better-sqlite3')('data/billflow.sqlite');
console.log(db.prepare("SELECT * FROM invoices WHERE id = 56 OR number LIKE '%56%'").all());
