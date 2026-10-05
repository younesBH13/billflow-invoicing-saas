
import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Data') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToCSV = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportInvoicesToExcel = (invoices: any[]) => {
  const exportData = invoices.map(invoice => ({
    'Numéro': invoice.number,
    'Date': new Date(invoice.date).toLocaleDateString('fr-FR'),
    'Type': invoice.type,
    'Client': invoice.client,
    'Montant (DA)': invoice.amount,
    'Statut': invoice.status,
    'Mode de paiement': invoice.paymentMethod || '-',
    'Projet': invoice.projectName || '-'
  }));
  
  exportToExcel(exportData, 'factures', 'Factures');
};

export const exportClientsToExcel = (clients: any[]) => {
  const exportData = clients.map(client => ({
    'Code': client.code,
    'Nom': client.name,
    'Type': client.type,
    'Classification': client.classification,
    'Email': client.email,
    'Téléphone': client.phone,
    'CA (DA)': client.revenue,
    'Adresse': client.address || '-'
  }));
  
  exportToExcel(exportData, 'clients', 'Clients');
};
