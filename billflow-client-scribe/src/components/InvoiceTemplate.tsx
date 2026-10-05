import React, { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import InvoiceDocument, { InvoiceTemplateData } from '@/components/invoices/InvoiceTemplate';
import { buildInvoicePreview } from '@/utils/invoicePreview';
import type { Invoice as ApiInvoice, InvoiceLine as ApiInvoiceLine, Client } from '@/services/api';

interface LegacyInvoiceLine {
  id?: string;
  description?: string;
  designation?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  unit_price?: number;
  amount?: number;
  total?: number;
  total_price?: number;
}

interface LegacyInvoice {
  id: string;
  number: string;
  date: string;
  type: 'proforma' | 'definitive' | 'credit_note';
  client: string;
  clientId?: string;
  client_id?: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paymentMethod?: string;
  payment_method?: string;
  projectName?: string;
  project_name?: string;
  billingPeriod?: string;
  billing_period?: string;
  contractRef?: string;
  contract_ref?: string;
  orderRef?: string;
  order_ref?: string;
  observations?: string;
  tvaRate?: number;
  tva_rate?: number;
  txRemisePercent?: number;
  tx_remise_percent?: number;
  txRetenueGarantie?: number;
  tx_retenue_garantie?: number;
  montantRemise?: number;
  montant_remise?: number;
  company_entity?: 'principal' | 'secondary';
  companyEntity?: 'principal' | 'secondary';
  lines?: LegacyInvoiceLine[];
}

interface InvoiceTemplateProps {
  invoice: LegacyInvoice;
  onClose?: () => void;
}

const normalizeLine = (invoiceId: string, line: LegacyInvoiceLine, index: number): ApiInvoiceLine => {
  const quantity = line.quantity ?? (line as any).quantite ?? 0;

  let unitPrice = line.unitPrice ?? line.unit_price;
  if ((unitPrice === undefined || unitPrice === null) && quantity) {
    const baseTotal = line.total ?? line.total_price ?? line.amount;
    if (typeof baseTotal === 'number') {
      unitPrice = baseTotal / quantity;
    }
  }
  if (unitPrice === undefined || unitPrice === null) {
    unitPrice = 0;
  }

  let total = line.total ?? line.total_price;
  if (total === undefined || total === null) {
    total = line.amount ?? quantity * unitPrice;
  }

  return {
    id: (line.id ?? `${invoiceId}-${index}`).toString(),
    invoice_id: invoiceId,
    description: line.description ?? line.designation ?? '',
    quantity: quantity ?? 0,
    unit: line.unit,
    unit_price: unitPrice,
    amount: line.amount,
    total_price: total,
  };
};

const mapInvoiceToApiInvoice = (invoice: LegacyInvoice): ApiInvoice => {
  const lines = Array.isArray(invoice.lines)
    ? invoice.lines.map((line, index) => normalizeLine(invoice.id, line, index))
    : undefined;

  return {
    id: invoice.id,
    number: invoice.number,
    date: invoice.date,
    type: invoice.type,
    client_id: invoice.clientId ?? invoice.client_id ?? '',
    client_name: invoice.client,
    amount: invoice.amount,
    status: invoice.status,
    payment_method: invoice.paymentMethod ?? invoice.payment_method,
    project_name: invoice.projectName ?? invoice.project_name,
    billing_period: invoice.billingPeriod ?? invoice.billing_period,
    service_prestation:
      (invoice as any).service_prestation ??
      (invoice as any).servicePrestation ??
      (invoice as any).prestation ??
      (invoice as any).service?.prestation ??
      '',
    contract_ref: invoice.contractRef ?? invoice.contract_ref,
    order_ref: invoice.orderRef ?? invoice.order_ref,
    observations: invoice.observations,
    advance_payment: (invoice as any).advance_payment ?? (invoice as any).advance_amount,
    advance_percentage: (invoice as any).advance_percentage || (invoice as any).advancePercentage,
    timbre_amount: (invoice as any).timbre_amount,
    tva_rate: invoice.tvaRate ?? invoice.tva_rate ?? 0,
    tx_remise_percent: invoice.txRemisePercent ?? invoice.tx_remise_percent,
    tx_retenue_garantie: invoice.txRetenueGarantie ?? invoice.tx_retenue_garantie,
    montant_remise: invoice.montantRemise ?? invoice.montant_remise,
    company_entity: (invoice as any).company_entity || (invoice as any).companyEntity || 'principal',
    created_at: '',
    updated_at: '',
    lines,
  };
};

const buildPreviewData = (invoice: LegacyInvoice, clients: Client[]): InvoiceTemplateData => {
  const apiInvoice = mapInvoiceToApiInvoice(invoice);
  return buildInvoicePreview(apiInvoice, { clients });
};

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice, onClose }) => {
  const { clients } = useApp();
  const printRef = useRef<HTMLDivElement>(null);

  const previewData = useMemo(() => buildPreviewData(invoice, clients || []), [invoice, clients]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Facture ${invoice.number}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 print:items-start print:justify-start print:p-0">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:w-auto print:max-h-none print:overflow-visible">
        <div className="flex justify-between items-center p-4 border-b no-print">
          <h2 className="text-xl font-bold">Aperçu de la facture</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
            {onClose && (
              <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
                <X className="w-4 h-4" />
                Fermer
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-auto max-h-[calc(95vh-72px)] bg-gray-100 p-6 print-container print:overflow-visible print:max-h-none print:bg-transparent print:p-0">
          {/* IMPORTANT: invoice-print-page is applied HERE */}
          <Card ref={printRef} className="invoice-print-page shadow-none print:shadow-none">
            <CardContent className="p-0">
              <InvoiceDocument data={previewData} />
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        @media print {
          html,
          body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }

          /* hide everything by default */
          body * {
            visibility: hidden;
          }

          /* show only the invoice */
          .invoice-print-page,
          .invoice-print-page * {
            visibility: visible;
          }

          /* force the invoice to A4 */
          .invoice-print-page {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;

            width: 210mm !important;
            min-height: 297mm !important;

            margin: 0 !important;
            padding: 10mm !important;
            box-sizing: border-box !important;

            background: #fff !important;
            border: none !important;
            box-shadow: none !important;

            transform: none !important;
            zoom: 1 !important;
          }

          /* remove modal overlay effects */
          .fixed.inset-0 {
            background: transparent !important;
          }

          /* ensure the preview wrapper doesn't constrain */
          .print-container {
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            background: transparent !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceTemplate;
