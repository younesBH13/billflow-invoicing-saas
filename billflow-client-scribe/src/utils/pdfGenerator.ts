
// PDF Generation utility for invoices and delivery notes
// This would integrate with a PDF library like jsPDF or react-pdf

export interface InvoiceData {
  number: string;
  date: string;
  type: "proforma" | "definitive" | "credit_note";
  client: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  lines: Array<{
    designation: string;
    quantity?: number;
    unitPrice?: number;
    total: number;
  }>;
  subtotal: number;
  tva: number;
  total: number;
  observations?: string;
}

export interface DeliveryNoteData {
  number: string;
  date: string;
  client: string;
  designation: string;
  observations: string;
}

export const generateInvoicePDF = (data: InvoiceData): void => {
  // This would generate a PDF using a library like jsPDF
  console.log("Generating invoice PDF for:", data.number);

  // For now, we'll create a simple HTML version that can be printed
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Facture ${data.number}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; -webkit-print-color-adjust: exact; }
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company { font-weight: bold; }
            .invoice-details { background: #f5f5f5; padding: 15px; margin: 20px 0; }
            .client-info { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .totals { text-align: right; margin-top: 20px; }
            .total-line { margin: 5px 0; }
            .final-total { font-weight: bold; font-size: 1.2em; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">
              <h2>Inspection Power</h2>
              <p>Gestion de facturation</p>
            </div>
            <div class="invoice-details">
              <h3>Facture ${data.number}</h3>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;"></p>
              <p>Date: ${new Date(data.date).toLocaleDateString('fr-FR')}</p>
              <p>Type: ${data.type === 'definitive' ? 'Définitive' : data.type === 'proforma' ? 'Proforma' : 'Avoir'}</p>
            </div>
          </div>
          
          <div class="client-info">
            <h4>Client:</h4>
            <p><strong>${data.client.name}</strong></p>
            <p>${data.client.address}</p>
            <p>${data.client.email} - ${data.client.phone}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Désignation</th>
                <th>Quantité</th>
                <th>Prix unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.lines.map(line => `
                <tr>
                  <td>${line.designation}</td>
                  <td>${line.quantity || '-'}</td>
                  <td>${line.unitPrice ? line.unitPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' €' : '-'}</td>
                  <td>${line.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-line">Sous-total HT: ${data.subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €</div>
            <div class="total-line">TVA: ${data.tva.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €</div>
            <div class="total-line final-total">Total TTC: ${data.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €</div>
          </div>
          
          ${data.observations ? `<div style="margin-top: 30px;"><strong>Observations:</strong><br>${data.observations}</div>` : ''}
          
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};

export const generateDeliveryNotePDF = (data: DeliveryNoteData): void => {
  console.log("Generating delivery note PDF for:", data.number);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Bordereau ${data.number}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; -webkit-print-color-adjust: exact; }
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin: 20px 0; }
            .signature-area { margin-top: 50px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Inspection Power</h2>
            <h3>Bordereau d'Envoi ${data.number}</h3>
          </div>
          
          <div class="details">
            <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString('fr-FR')}</p>
            <p><strong>Client:</strong> ${data.client}</p>
            <p><strong>Désignation:</strong> ${data.designation}</p>
            ${data.observations ? `<p><strong>Observations:</strong> ${data.observations}</p>` : ''}
          </div>
          
          <div class="signature-area">
            <div>
              <p>Signature expéditeur:</p>
              <div style="border-bottom: 1px solid #000; width: 200px; height: 50px;"></div>
            </div>
            <div>
              <p>Signature destinataire:</p>
              <div style="border-bottom: 1px solid #000; width: 200px; height: 50px;"></div>
            </div>
          </div>
          
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};
