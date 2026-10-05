const BetterSqlite3 = require('better-sqlite3');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data/billflow.sqlite');
const db = new BetterSqlite3(DB_FILE);

try {
    db.transaction(() => {
        // Disable foreign keys temporarily
        db.pragma('foreign_keys = OFF');

        // Check if there is data in quote_items we need to save
        const existingData = db.prepare('SELECT * FROM quote_items').all();
        console.log(`Saving ${existingData.length} items from quote_items...`);

        // Drop the old table
        db.exec('DROP TABLE quote_items');

        // Recreate the table pointing to the correct 'quotes' table
        db.exec(`
            CREATE TABLE quote_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quote_id INTEGER NOT NULL,
                item_type TEXT NOT NULL CHECK(item_type IN ('main', 'sub')),
                display_type TEXT NOT NULL DEFAULT 'quantity' CHECK(display_type IN ('text', 'quantity')),
                item_number TEXT NOT NULL,
                designation TEXT NOT NULL,
                unit TEXT,
                unit_price REAL,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
            )
        `);
        console.log('Recreated quote_items table with correct foreign key.');

        // Restore data if any
        if (existingData.length > 0) {
            const insert = db.prepare(`
                INSERT INTO quote_items (
                    id, quote_id, item_type, display_type, item_number, designation,
                    unit, unit_price, display_order, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const item of existingData) {
                insert.run(
                    item.id, item.quote_id, item.item_type, item.display_type, 
                    item.item_number, item.designation, item.unit, 
                    item.unit_price, item.display_order, item.created_at
                );
            }
            console.log(`Restored ${existingData.length} items.`);
        }

        db.pragma('foreign_keys = ON');
    })();
    console.log('✅ Successfully fixed quote_items schema.');
} catch (error) {
    console.error('❌ Failed to fix quote_items schema:', error);
} finally {
    db.close();
}
