
import { db } from '../config/database';

console.log('🔧 Starting migration: Recalculate Invoice Totals...');

try {
    // Get all invoices
    const invoices = db.prepare('SELECT id, number FROM invoices').all() as { id: number; number: string }[];
    console.log(`Found ${invoices.length} invoices to process.`);

    let updatedCount = 0;

    db.transaction(() => {
        for (const invoice of invoices) {
            // Get lines
            const lines = db.prepare('SELECT total_price FROM invoice_lines WHERE invoice_id = ?').all(invoice.id) as { total_price: number }[];
            const calculatedHT = lines.reduce((sum, l) => sum + l.total_price, 0);

            // Get params
            const params = db.prepare(`
        SELECT 
          amount,
          tva_rate, 
          tx_remise_percent, 
          montant_remise, 
          tx_retenue_garantie 
        FROM invoices WHERE id = ?
      `).get(invoice.id) as any;

            const tvaRate = params.tva_rate || 0;
            const txRemisePercent = params.tx_remise_percent;
            const montantRemise = params.montant_remise;
            const txRetenueGarantie = params.tx_retenue_garantie;

            // Calc Total TTC
            const n = (v?: number | null) => (typeof v === 'number' && !isNaN(v) ? v : 0);

            const remise = n(montantRemise) > 0
                ? n(montantRemise)
                : n(txRemisePercent) > 0
                    ? calculatedHT * (n(txRemisePercent) / 100)
                    : 0;

            const htAfterRemise = calculatedHT - remise;

            const retenue = n(txRetenueGarantie) > 0
                ? htAfterRemise * (n(txRetenueGarantie) / 100)
                : 0;

            const htAfterRetenue = htAfterRemise - retenue;

            const tvaAmount = htAfterRetenue * (n(tvaRate) / 100);

            const calculatedTTC = htAfterRetenue + tvaAmount;

            // Update if different (allowing for small float diffs)
            if (Math.abs(calculatedTTC - params.amount) > 0.001) {
                db.prepare('UPDATE invoices SET amount = ? WHERE id = ?').run(calculatedTTC, invoice.id);
                console.log(`📝 Fixed Invoice ${invoice.number} (ID: ${invoice.id}): ${params.amount} -> ${calculatedTTC}`);
                updatedCount++;
            }
        }
    })();

    console.log(`✅ Migration complete. Updated ${updatedCount} invoices.`);

} catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
}
