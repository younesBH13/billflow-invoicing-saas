const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'billflow.sqlite');
const db = new Database(dbPath);

console.log('Testing quote creation...\n');

try {
    // Start transaction
    const createQuoteStmt = db.prepare(`
        INSERT INTO quotes (reference, client_id, date, validity_days, terms, status)
        VALUES (?, ?, ?, ?, ?, 'draft')
    `);

    const createItemStmt = db.prepare(`
        INSERT INTO quote_items (quote_id, item_type, display_type, item_number, designation, unit, unit_price, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
        // Insert quote
        const result = createQuoteStmt.run(
            'TEST001',
            1, // client_id
            '2024-02-08',
            30,
            'Test terms'
        );

        const quoteId = result.lastInsertRowid;
        console.log('Created quote with ID:', quoteId);

        // Insert text item
        createItemStmt.run(
            quoteId,
            'main',
            'text',
            '1/',
            'Test text item',
            null,
            null,
            0
        );
        console.log('Added text item');

        // Insert quantity item
        createItemStmt.run(
            quoteId,
            'sub',
            'quantity',
            '1.1',
            'Test quantity item',
            'Jour',
            100.00,
            1
        );
        console.log('Added quantity item');

        return quoteId;
    });

    const quoteId = transaction();
    console.log('\n✅ SUCCESS! Quote created with ID:', quoteId);

    // Fetch the created quote
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(quoteId);
    const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ?').all(quoteId);

    console.log('\nQuote:', JSON.stringify(quote, null, 2));
    console.log('\nItems:', JSON.stringify(items, null, 2));

} catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
}

db.close();
