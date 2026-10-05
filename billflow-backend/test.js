function parseNumber(val, defaultVal) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? defaultVal : parsed;
    }
    return defaultVal;
}

function normalizeInvoiceLineInput(line) {
    const itemType = 'text_with_quantity';

    const quantity = parseNumber(line.quantity, 0);
    const unitPrice = parseNumber(line.unit_price || line.unitPrice, 0);
    const totalPrice = quantity * unitPrice;
    
    // Fallback logic
    const amount = typeof line.amount !== 'undefined' ? line.amount :
                   typeof line.totalPrice !== 'undefined' ? line.totalPrice :
                   typeof line.total !== 'undefined' ? line.total : totalPrice;

    return {
        itemType,
        quantity,
        unit: line.unit ?? 'Unité',
        unitPrice,
        amount,
        totalPrice: amount 
    };
}

console.log(normalizeInvoiceLineInput({ type: 'quantity', designation: 'Test', unit: 'Day', quantity: 1, unitPrice: 20000, total: 20000 }));
