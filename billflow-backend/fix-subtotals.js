#!/usr/bin/env node
/**
 * Fix Subtotals Migration Script
 * 
 * This script recalculates the correct HT (subtotal) for all existing invoices
 * based on their invoice_lines, and updates the subtotal column in the database.
 * 
 * Usage: node fix-subtotals.js [path-to-database.sqlite]
 * Default path: ./data/database.sqlite
 */

const path = require('path');
const Database = require('better-sqlite3');

// Use provided path or default
const dbPath = process.argv[2] || path.join(__dirname, 'data', 'database.sqlite');
console.log(`Using database at: ${dbPath}`);

const n = (v) => (typeof v === 'number' && !isNaN(v) ? v : parseFloat(v) || 0);

try {
    const db = new Database(dbPath);

    const invoices = db.prepare('SELECT * FROM invoices').all();
    console.log(`Found ${invoices.length} invoices. Recalculating subtotals...\n`);

    let updatedCount = 0;

    for (const invoice of invoices) {
        const lines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id').all(invoice.id);

        let calculatedHT = 0;

        for (const line of lines) {
            // Prefer total_price, then amount, then quantity*unit_price
            let lineTotal = n(line.total_price);
            if (lineTotal === 0) lineTotal = n(line.amount);
            if (lineTotal === 0) lineTotal = n(line.quantity) * n(line.unit_price);
            calculatedHT += lineTotal;
        }

        const currentSubtotal = n(invoice.subtotal);
        const diff = Math.abs(currentSubtotal - calculatedHT);

        if (diff > 0.01) {
            console.log(`Invoice ${invoice.number} (ID: ${invoice.id}): ${currentSubtotal} → ${calculatedHT} (diff: ${diff.toFixed(2)})`);
            db.prepare('UPDATE invoices SET subtotal = ? WHERE id = ?').run(calculatedHT, invoice.id);
            updatedCount++;
        }
    }

    console.log(`\n✅ Done! Updated ${updatedCount} of ${invoices.length} invoices.`);
    db.close();
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
