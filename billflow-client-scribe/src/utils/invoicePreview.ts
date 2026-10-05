import { Client, Invoice, InvoiceLine } from '@/services/api';
import { amountToFrenchWords } from './frenchNumberToWords';
import { normalizePaymentMethod } from './paymentMethods';
import { InvoiceTemplateData, InvoiceTemplateItem } from '@/components/invoices/InvoiceTemplate';
import { calculateInvoiceTotals } from './invoiceTotals';

export type BuildInvoicePreviewOptions = {
  clients?: Client[];
  timbreAmount?: number;
  defaultPaymentMethod?: string;
  language?: 'fr' | 'en';
  showWatermark?: boolean;
};

const firstLineDescription = (lines?: Array<Pick<InvoiceLine, 'description'>>): string | undefined => {
  if (!Array.isArray(lines)) return undefined;
  const first = lines.find(l => typeof l?.description === 'string' && l.description.trim().length > 0);
  return first?.description;
};

const getLineTotal = (line: InvoiceLine): number => {
  if (typeof line.total_price === 'number' && !Number.isNaN(line.total_price)) {
    return line.total_price;
  }
  if (typeof line.amount === 'number' && !Number.isNaN(line.amount)) {
    return line.amount;
  }
  const quantity = typeof line.quantity === 'number' ? line.quantity : 0;
  const unitPrice = typeof line.unit_price === 'number' ? line.unit_price : 0;
  return quantity * unitPrice;
};

const normalizeLine = (line: InvoiceLine): InvoiceTemplateItem => {
  const total = getLineTotal(line);
  const unitPrice =
    typeof line.unit_price === 'number' && !Number.isNaN(line.unit_price)
      ? line.unit_price
      : total && line.quantity
        ? total / line.quantity
        : undefined;

  return {
    description: line.description,
    quantity: typeof line.quantity === 'number' ? line.quantity : undefined,
    unit: line.unit,
    unitPrice,
    total,
    type: line.item_type,
  };
};

const findClientForInvoice = (invoice: Invoice, clients?: Client[]): Client | undefined => {
  if (!clients || clients.length === 0) {
    return undefined;
  }

  const identifier = invoice.client_id?.toString() ?? '';
  return (
    clients.find(client => client.id === identifier) ??
    clients.find(client => client.name === invoice.client_name)
  );
};

const formatDate = (value: string | Date): string => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  if (typeof value === 'string') {
    const parts = value.split(/[/-]/);
    if (parts.length === 3) {
      const [part1, part2, part3] = parts;
      const year = part3.length === 2 ? `20${part3}` : part3.padStart(4, '0');
      return `${part1.padStart(2, '0')}/${part2.padStart(2, '0')}/${year}`;
    }
    return value;
  }

  return '';
};

const resolvePrestation = (invoice: Invoice): string => {
  const candidates: Array<unknown> = [
    (invoice as any).service_prestation,
    (invoice as any).servicePrestation,
    (invoice as any).prestation,
    (invoice as any).service?.prestation,
    (invoice as any).service?.service_prestation,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }

  const fallback = firstLineDescription((invoice as any).lines);
  return (fallback?.trim() || 'PRESTATION DE SERVICE');
};


const parseAmount = (value: unknown): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const parseOptionalAmount = (value: unknown): number | undefined => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

export const calculateTimbreAmount = (paymentMethod: string, baseAmount: number): number => {
  const normalizedMethod = normalizePaymentMethod(paymentMethod);

  if (normalizedMethod !== 'Espèces') {
    return 0;
  }

  if (baseAmount < 30000) {
    return Number((baseAmount * 0.01).toFixed(2));
  }

  if (baseAmount <= 100000) {
    return Number((baseAmount * 0.015).toFixed(2));
  }

  return Number((baseAmount * 0.02).toFixed(2));
};

export const buildInvoicePreview = (
  invoice: Invoice,
  options: BuildInvoicePreviewOptions = {}
): InvoiceTemplateData => {
  const { clients, timbreAmount, defaultPaymentMethod = 'Par chèque bancaire' } = options;
  const client = findClientForInvoice(invoice, clients);
  const lines = Array.isArray(invoice.lines) ? invoice.lines.map(normalizeLine) : [];
  const subtotal = lines.reduce((sum, line) => sum + (line.total ?? 0), 0);
  const tvaRate = typeof invoice.tva_rate === 'number' ? invoice.tva_rate : 0;
  const txRemisePercent = parseOptionalAmount((invoice as any).tx_remise_percent);
  const txRetenueGarantie = parseOptionalAmount((invoice as any).tx_retenue_garantie);
  const montantRemise = parseOptionalAmount((invoice as any).montant_remise);
  const paymentMethod = normalizePaymentMethod(invoice.payment_method ?? defaultPaymentMethod);
  const advanceAmount = parseAmount(
    (invoice as any).advance_amount ?? (invoice as any).advance_payment ?? (invoice as any).advanceAmount
  );
  const advancePercentage = parseOptionalAmount(
    (invoice as any).advance_percentage || (invoice as any).advancePercentage
  );

  const baseTotals = calculateInvoiceTotals({
    subtotal,
    tvaRate,
    txRemisePercent,
    montantRemise,
    txRetenueGarantie,
    advanceAmount,
    advancePercentage,
    timbreAmount: 0,
  });
  const timbreOverride =
    timbreAmount !== undefined
      ? timbreAmount
      : (invoice as any).timbre_amount !== undefined
        ? parseAmount((invoice as any).timbre_amount)
        : undefined;
  const computedTimbre =
    timbreOverride !== undefined
      ? timbreOverride
      : calculateTimbreAmount(paymentMethod, baseTotals.totalTTC);
  const totals = calculateInvoiceTotals({
    subtotal,
    tvaRate,
    txRemisePercent,
    montantRemise,
    txRetenueGarantie,
    advanceAmount,
    advancePercentage,
    timbreAmount: computedTimbre,
  });

  const prestation = resolvePrestation(invoice);
  // Temporary debug log to verify prestation mapping for the preview output.
  console.log('[InvoicePreview] service_prestation', prestation);

  return {
    invoiceNumber: invoice.number,
    date: formatDate((invoice as any).invoice_date ?? invoice.date ?? ''),
    type: invoice.type,
    client: {
      code: client?.code ?? (invoice as any).client_code ?? '',
      name: client?.name ?? invoice.client_name ?? '',
      fiscalId: client?.fiscalId ?? client?.matriculeFiscale ?? '',
      commerceRegistry: client?.commerceRegistry ?? client?.registreCommerce ?? '',
      taxArticle: client?.taxArticle ?? client?.articleImposition ?? '',
      address: client?.address ?? '',
      nis: (client as any)?.nis ?? '',
    },
    service: {
      prestation,
      period: invoice.billing_period ?? '',
      project: invoice.project_name ?? '',
      affairNumber: invoice.affair_number ?? '',
      conventionRef: invoice.ref_convention
        || (invoice as any).convention_ref
        || (invoice as any).service?.conventionRef
        || (invoice as any).service?.ref_convention
        || '',
      contractRef: invoice.contract_ref ?? (invoice as any).ref_contract_n ?? '',
      bcRef: invoice.order_ref ?? '',
    },
    items: lines,
    subtotal,
    tvaRate,
    tvaAmount: totals.tvaAmount,
    total: totals.totalTTC,
    timbreAmount: computedTimbre,
    advanceAmount,
    advancePercentage,
    amountDue: totals.netToPay,
    totalInWords: amountToFrenchWords(totals.netToPay),
    paymentMethod,
    observations: invoice.observations ?? '',
    txRemisePercent,
    txRetenueGarantie,
    montantRemise,
    company_entity: (invoice as any).company_entity || (invoice as any).companyEntity || 'principal',
  };
};

export const buildPreviewFromForm = (
  formData: any,
  options: BuildInvoicePreviewOptions = {}
): InvoiceTemplateData => {
  const { timbreAmount, defaultPaymentMethod = 'Par chèque bancaire' } = options;
  const items: InvoiceTemplateItem[] = Array.isArray(formData.items)
    ? formData.items.map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice ?? item.unit_price ?? item.amount,
      total: item.total ?? item.amount ?? 0,
      type: item.type ?? item.item_type,
    }))
    : [];

  const subtotal = formData.subtotal ?? items.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const tvaRate = formData.tvaRate ?? formData.tva_rate ?? 0;
  const txRemisePercent = parseOptionalAmount(formData.tx_remise_percent ?? formData.txRemisePercent);
  const txRetenueGarantie = parseOptionalAmount(formData.tx_retenue_garantie ?? formData.txRetenueGarantie);
  const montantRemise = parseOptionalAmount(formData.montant_remise ?? formData.montantRemise);
  const paymentMethod = normalizePaymentMethod(formData.paymentMethod ?? defaultPaymentMethod);
  const advanceAmount = parseAmount(formData.advanceAmount ?? formData.advance_amount ?? formData.advance_payment);
  const advancePercentage = parseOptionalAmount(
    (formData as any).advancePercentage || (formData as any).advance_percentage
  );

  const baseTotals = calculateInvoiceTotals({
    subtotal,
    tvaRate,
    txRemisePercent,
    montantRemise,
    txRetenueGarantie,
    advanceAmount,
    advancePercentage,
    timbreAmount: 0,
  });
  const timbreOverride =
    timbreAmount !== undefined
      ? timbreAmount
      : formData.timbreAmount !== undefined
        ? parseAmount(formData.timbreAmount)
        : undefined;
  const computedTimbre =
    timbreOverride !== undefined
      ? timbreOverride
      : calculateTimbreAmount(paymentMethod, baseTotals.totalTTC);
  const totals = calculateInvoiceTotals({
    subtotal,
    tvaRate,
    txRemisePercent,
    montantRemise,
    txRetenueGarantie,
    advanceAmount,
    advancePercentage,
    timbreAmount: computedTimbre,
  });

  const derivedPrestation =
    formData.service?.prestation
    ?? (formData as any).servicePrestation
    ?? formData.prestation
    ?? '';

  return {
    invoiceNumber: formData.invoiceNumber ?? '',
    date: formatDate(formData.date ?? ''),
    type: formData.type,
    client: {
      code: formData.client?.code ?? '',
      name: formData.client?.name ?? '',
      fiscalId: formData.client?.fiscalId ?? '',
      commerceRegistry: formData.client?.commerceRegistry ?? '',
      taxArticle: formData.client?.taxArticle ?? '',
      address: formData.client?.address ?? '',
      nis: formData.client?.nis ?? '',
    },
    service: {
      prestation: derivedPrestation,
      period: formData.service?.period ?? '',
      project: formData.service?.project ?? '',
      affairNumber: formData.service?.affairNumber ?? '',
      conventionRef: formData.service?.conventionRef ?? '',
      contractRef: formData.service?.contractRef ?? '',
      bcRef: formData.service?.bcRef ?? '',
    },
    items,
    subtotal,
    tvaRate,
    tvaAmount: totals.tvaAmount,
    total: totals.totalTTC,
    timbreAmount: computedTimbre,
    advanceAmount,
    advancePercentage,
    amountDue: totals.netToPay,
    totalInWords: amountToFrenchWords(totals.netToPay),
    paymentMethod,
    observations: formData.observations ?? '',
    txRemisePercent,
    txRetenueGarantie,
    montantRemise,
    company_entity: formData.company_entity === 'secondary' || formData.companyEntity === 'secondary' ? 'secondary' : 'principal',
  };
};
