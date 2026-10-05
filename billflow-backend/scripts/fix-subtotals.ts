import Database from 'better-sqlite3';

const dbPath = process.argv[2] || './database.sqlite';
console.log(`Using database at: ${dbPath}`);

try {
    const db = new Database(dbPath);

    // Parse numbers safely
    const n = (v: any) => (typeof v === 'number' && !isNaN(v) ? v : 0);

    console.log('Fetching existing invoices...');
    const invoices = db.prepare('SELECT * FROM invoices').all();

    console.log(`Found ${invoices.length} invoices. Recalculating subtotals based on lines...`);

    let updatedCount = 0;

    for (const invoice of invoices) {
        const lines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(invoice.id);

        let calculatedHT = 0;

        // Calculate HT from lines matching normalizeInvoiceLineInput Logic
        for (const line of lines) {
            let lineAmount = n(line.amount);
            if (lineAmount === 0) {
                lineAmount = line.total_price ? n(line.total_price) : n(line.quantity) * n(line.unit_price)
            }
            calculatedHT += lineAmount;
        }

        // Only update if the subtotal in the database doesn't match the lines HT
        if (Math.abs(n(invoice.subtotal) - calculatedHT) > 0.01) {
            console.log(`Invoice ${invoice.number} (ID: ${invoice.id}): Updating subtotal from ${invoice.subtotal} to ${calculatedHT}`);

            db.prepare('UPDATE invoices SET subtotal = ? WHERE id = ?').run(calculatedHT, invoice.id);
            updatedCount++;
        }
    }

    console.log(`Migration completed successfully. Updated ${updatedCount} invoices.`);
    db.close();
} catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
}
