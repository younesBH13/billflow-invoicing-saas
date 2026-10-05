import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { normalizePaymentMethod, uniquePaymentLabels } from '@/utils/paymentMethods';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { getLastHT } from '@/utils/invoiceTotals';

interface Client {
  id: string;
  code: string;
  name: string;
  type: "local" | "foreign";
  classification: "new" | "recurring" | "good" | "very_good";
  email: string;
  phone: string;
  address: string;
  siret?: string;
  revenue: number;
  tvaRate: number;
  hasTva: boolean;
  fiscalId?: string;
  commerceRegistry?: string;
  taxArticle?: string;
  articleImposition?: string;
  matriculeFiscale?: string;
  registreCommerce?: string;
  nomContact?: string;
  telFixe?: string;
  telMobile?: string;
  fax?: string;
  nis?: string;
}

type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

interface InvoiceLine {
  id?: string;
  description?: string;
  designation?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  unit_price?: number;
  amount?: number;
  total?: number;
  total_price?: number;
  type?: "text" | "quantity" | "amount";
  item_type?: "text" | "text_with_quantity" | "amount";
}

interface NormalizedInvoiceLine {
  description: string;
  item_type: "text" | "text_with_quantity" | "amount";
  quantity: number;
  unit: string;
  unit_price: number;
  amount?: number;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  type: "proforma" | "definitive" | "credit_note";
  client: string;
  clientCode?: string;
  clientId: string;
  amount: number; // TTC
  subtotal: number; // HT
  status: InvoiceStatus;
  paymentMethod?: string;
  projectName?: string;
  affairNumber?: string;
  servicePrestation?: string;
  billingPeriod?: string;
  contractRef?: string;
  orderRef?: string;
  observations?: string;
  tvaRate: number;
  lines: InvoiceLine[];
  refContractN?: string;
  refConvention?: string;
  txRetenueGarantie?: number;
  txRemisePercent?: number;
  montantRemise?: number;
  timbreAmount?: number;
  advanceAmount?: number;
  advance_payment?: number;
  advance_amount?: number;
  advancePercentage?: number;
  advance_percentage?: number;
  company_entity?: 'principal' | 'secondary';
  companyEntity?: 'principal' | 'secondary';
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: "cash" | "bank_transfer" | "check" | "card" | "other";
  reference?: string;
  notes?: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  type: "invoice" | "quote" | "delivery_note";
  isDefault: boolean;
  template: {
    header: {
      showLogo: boolean;
      companyName: string;
      companyAddress: string;
      companyPhone: string;
      companyEmail: string;
    };
    body: {
      showClientDetails: boolean;
      showProjectInfo: boolean;
      showPaymentTerms: boolean;
      customFields: string[];
    };
    footer: {
      showSignature: boolean;
      showTerms: boolean;
      customText: string;
    };
    styling: {
      primaryColor: string;
      secondaryColor: string;
      fontSize: "small" | "medium" | "large";
      layout: "classic" | "modern" | "minimal";
    };
  };
}

interface DeliveryNote {
  id: string;
  number: string;
  date: string;
  clientId: string;
  client: string;
  designation: string;
  observations: string;
}

interface User {
  id: number;
  username: string;
  name: string;
  role: "admin" | "commercial";
}

interface AppContextType {
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  documentTemplates: DocumentTemplate[];
  deliveryNotes: DeliveryNote[];
  quotes: any[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  addClient: (client: Partial<Client> & { name: string }) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  setClients: (clients: Client[]) => void;
  addInvoice: (invoice: Record<string, any>) => Promise<void>;
  updateInvoice: (id: string, updates: Record<string, any>) => Promise<void>;
  convertInvoiceType: (id: string, newType: "proforma" | "definitive" | "credit_note") => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  setInvoices: (invoices: Invoice[]) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  addDocumentTemplate: (template: Omit<DocumentTemplate, 'id'>) => Promise<void>;
  updateDocumentTemplate: (id: string, updates: Partial<DocumentTemplate>) => Promise<void>;
  deleteDocumentTemplate: (id: string) => Promise<void>;
  setDocumentTemplate: (id: string, isDefault: boolean) => Promise<void>;
  addDeliveryNote: (deliveryNote: Omit<DeliveryNote, 'id' | 'number'>) => Promise<void>;
  updateDeliveryNote: (id: string, updates: Partial<DeliveryNote>) => Promise<void>;
  deleteDeliveryNote: (id: string) => Promise<void>;
  setDeliveryNotes: (deliveryNotes: DeliveryNote[]) => void;
  addQuote: (quote: Record<string, any>) => Promise<void>;
  updateQuote: (id: string, updates: Record<string, any>) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  setQuotes: (quotes: any[]) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getNextClientCode: () => string;
  getNextInvoiceNumber: (type: string) => Promise<string>;
  getTotalRevenue: () => number;
  getClientStatistics: (clientId: string) => Promise<any>;
  getAdvancedReporting: () => Promise<any>;
  formatCurrency: (amount: number) => string;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const parseNumeric = (value: unknown): number => {
  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').replace(',', '.');
    return Number(normalized);
  }
  return Number(value);
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = parseNumeric(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = parseNumeric(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const pickValue = (source: Record<string, any>, ...keys: string[]) => {
  for (const key of keys) {
    if (source[key] !== undefined) {
      return source[key];
    }
  }
  return undefined;
};

const normalizeInvoiceLineForApi = (rawLine: InvoiceLine | Record<string, any>): NormalizedInvoiceLine => {
  const line = rawLine as Record<string, any>;
  const descriptionSource = line.description ?? line.designation ?? '';
  const description = typeof descriptionSource === 'string' ? descriptionSource.trim() : '';
  const rawType = line.item_type ?? line.type;

  let itemType: NormalizedInvoiceLine['item_type'];
  switch (rawType) {
    case 'text':
      itemType = 'text';
      break;
    case 'amount':
      itemType = 'amount';
      break;
    case 'text_with_quantity':
    case 'quantity':
      itemType = 'text_with_quantity';
      break;
    default:
      itemType = 'text_with_quantity';
  }

  if (itemType === 'text') {
    return {
      description,
      item_type: 'text',
      quantity: 0,
      unit: '',
      unit_price: 0,
      amount: 0,
    };
  }

  if (itemType === 'amount') {
    const amountValue = toNumber(line.amount ?? line.total ?? line.unitPrice ?? line.unit_price, 0);
    return {
      description,
      item_type: 'amount',
      quantity: 1,
      unit: line.unit ?? line.unite ?? 'Unité',
      unit_price: amountValue,
      amount: amountValue,
    };
  }

  const quantityValue = toNumber(line.quantity, 0);
  const unitPriceValue = toNumber(line.unitPrice ?? line.unit_price, 0);
  const amountValue = toOptionalNumber(line.amount) ?? quantityValue * unitPriceValue;

  return {
    description,
    item_type: 'text_with_quantity',
    quantity: quantityValue,
    unit: line.unit ?? line.unite ?? 'Unité',
    unit_price: unitPriceValue,
    amount: amountValue,
  };
};

const firstLineDescription = (lines?: Array<Pick<InvoiceLine, 'description'>>): string | undefined => {
  if (!Array.isArray(lines)) return undefined;
  return lines.find(line => line.description?.trim())?.description?.trim();
};

const buildInvoiceCreationPayload = (invoiceData: Record<string, any>): Record<string, unknown> => {
  const service = invoiceData.service ?? {};
  const rawClientId = pickValue(invoiceData, 'clientId', 'client_id') ?? service.clientId ?? invoiceData.client?.id;
  const clientId = Number(rawClientId);

  if (!Number.isFinite(clientId) || clientId <= 0) {
    throw new Error('Client ID is required to create the invoice');
  }

  if (!invoiceData.date) {
    throw new Error('Invoice date is required');
  }

  const contractRef = pickValue(invoiceData, 'contractRef', 'contract_ref', 'ref_contract_n', 'refContractN') ?? service.contractRef;
  const servicePrestation = pickValue(invoiceData, 'servicePrestation', 'service_prestation', 'prestation') ?? service.prestation;
  const billingPeriod = pickValue(invoiceData, 'billingPeriod', 'billing_period') ?? service.period;
  const projectName = pickValue(invoiceData, 'projectName', 'project_name') ?? service.project;
  const orderRef = pickValue(invoiceData, 'orderRef', 'order_ref') ?? service.bcRef;
  const affairNumber = pickValue(invoiceData, 'affairNumber', 'affair_number') ?? service.affairNumber;
  const refConvention = pickValue(invoiceData, 'refConvention', 'ref_convention') ?? service.conventionRef;
  const advanceAmount = toOptionalNumber(pickValue(invoiceData, 'advance_amount', 'advanceAmount', 'advance_payment', 'advancePayment'));
  const timbreAmount = toOptionalNumber(pickValue(invoiceData, 'timbre_amount', 'timbreAmount'));
  const linesSource = pickValue(invoiceData, 'lines', 'items');
  const linesArray = Array.isArray(linesSource) ? linesSource : [];

  const normalizedLines = (linesArray as InvoiceLine[])
    .map(line => normalizeInvoiceLineForApi(line))
    // Drop placeholder rows that don't have any content to avoid backend validation errors
    .filter(line => {
      const hasDescription = Boolean(line.description?.trim());
      const hasAmount =
        line.item_type === 'amount'
          ? Number.isFinite(line.amount) && line.amount! > 0
          : (Number.isFinite(line.quantity) && line.quantity! > 0)
          || (Number.isFinite(line.unit_price) && line.unit_price! > 0)
          || (Number.isFinite(line.amount) && line.amount! > 0);

      return hasDescription || hasAmount;
    });

  const derivedPrestation = servicePrestation || firstLineDescription(normalizedLines);

  return {
    number: pickValue(invoiceData, 'number', 'invoiceNumber') || undefined,
    date: invoiceData.date,
    type: invoiceData.type ?? 'definitive',
    client_id: clientId,
    amount: toNumber(pickValue(invoiceData, 'amount', 'total'), 0),
    payment_method: pickValue(invoiceData, 'paymentMethod', 'payment_method') ?? service.paymentMethod ?? undefined,
    project_name: projectName || undefined,
    affair_number: affairNumber || undefined,
    billing_period: billingPeriod || undefined,
    contract_ref: contractRef || undefined,
    order_ref: orderRef || undefined,
    observations: pickValue(invoiceData, 'observations', 'notes') || undefined,
    service_prestation: derivedPrestation || undefined,
    ref_contract_n: contractRef || undefined,
    ref_convention: refConvention || undefined,
    tx_retenue_garantie: toOptionalNumber(pickValue(invoiceData, 'txRetenueGarantie', 'tx_retenue_garantie', 'retentionRate')),
    tx_remise_percent: toOptionalNumber(pickValue(invoiceData, 'txRemisePercent', 'tx_remise_percent', 'discountRate')),
    montant_remise: toOptionalNumber(pickValue(invoiceData, 'montantRemise', 'montant_remise', 'discountAmount')),
    tva_rate: toOptionalNumber(pickValue(invoiceData, 'tvaRate', 'tva_rate')),
    advance_amount: advanceAmount,
    timbre_amount: timbreAmount,
    company_entity: pickValue(invoiceData, 'company_entity', 'companyEntity') === 'secondary' ? 'secondary' : 'principal',
    lines: normalizedLines,
  };
};

const mapInvoiceUpdatesToPayload = (updates: Record<string, any>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  const service = updates.service ?? {};

  const numberValue = pickValue(updates, 'number', 'invoiceNumber');
  if (numberValue !== undefined) {
    payload.number = numberValue;
  }

  const dateValue = pickValue(updates, 'date');
  if (dateValue !== undefined) {
    payload.date = dateValue;
  }

  const companyEntity = pickValue(updates, 'company_entity', 'companyEntity');
  if (companyEntity !== undefined) {
    payload.company_entity = companyEntity === 'secondary' ? 'secondary' : 'principal';
  }

  const status = pickValue(updates, 'status');
  if (status !== undefined) {
    payload.status = status;
  }

  const paymentMethod = pickValue(updates, 'paymentMethod', 'payment_method');
  if (paymentMethod !== undefined) {
    payload.payment_method = paymentMethod;
  }

  const projectName = pickValue(updates, 'projectName', 'project_name') ?? service.project;
  if (projectName !== undefined) {
    payload.project_name = projectName;
  }

  const servicePrestation = pickValue(updates, 'servicePrestation', 'service_prestation', 'prestation') ?? service.prestation;
  if (servicePrestation !== undefined) {
    payload.service_prestation = servicePrestation;
  }

  const billingPeriod = pickValue(updates, 'billingPeriod', 'billing_period') ?? service.period;
  if (billingPeriod !== undefined) {
    payload.billing_period = billingPeriod;
  }

  const contractRef = pickValue(updates, 'contractRef', 'contract_ref', 'ref_contract_n', 'refContractN') ?? service.contractRef;
  if (contractRef !== undefined) {
    payload.contract_ref = contractRef;
    payload.ref_contract_n = contractRef;
  }

  const orderRef = pickValue(updates, 'orderRef', 'order_ref') ?? service.bcRef;
  if (orderRef !== undefined) {
    payload.order_ref = orderRef;
  }

  const affairNumber = pickValue(updates, 'affairNumber', 'affair_number') ?? service.affairNumber;
  if (affairNumber !== undefined) {
    payload.affair_number = affairNumber;
  }

  const observations = pickValue(updates, 'observations', 'notes');
  if (observations !== undefined) {
    payload.observations = observations;
  }

  const refConvention = pickValue(updates, 'refConvention', 'ref_convention') ?? service.conventionRef;
  if (refConvention !== undefined) {
    payload.ref_convention = refConvention;
  }

  const advanceAmount = pickValue(updates, 'advance_amount', 'advanceAmount', 'advance_payment', 'advancePayment');
  if (advanceAmount !== undefined) {
    const parsedAdvance = toNumber(advanceAmount, 0);
    payload.advance_amount = parsedAdvance;
  }

  const advancePercentage = pickValue(updates, 'advance_percentage', 'advancePercentage');
  if (advancePercentage !== undefined) {
    payload.advance_percentage = toNumber(advancePercentage, 0);
  }

  const timbreAmount = pickValue(updates, 'timbre_amount', 'timbreAmount');
  if (timbreAmount !== undefined) {
    payload.timbre_amount = toNumber(timbreAmount, 0);
  }

  const tvaRate = pickValue(updates, 'tvaRate', 'tva_rate');
  if (tvaRate !== undefined) {
    payload.tva_rate = toNumber(tvaRate, 0);
  }

  const amount = pickValue(updates, 'amount');
  if (amount !== undefined) {
    payload.amount = toNumber(amount, 0);
  }

  const txRetenue = pickValue(updates, 'txRetenueGarantie', 'tx_retenue_garantie', 'retentionRate');
  if (txRetenue !== undefined) {
    payload.tx_retenue_garantie = toNumber(txRetenue, 0);
  }

  const txRemise = pickValue(updates, 'txRemisePercent', 'tx_remise_percent', 'discountRate');
  if (txRemise !== undefined) {
    payload.tx_remise_percent = toNumber(txRemise, 0);
  }

  const montantRemise = pickValue(updates, 'montantRemise', 'montant_remise', 'discountAmount');
  if (montantRemise !== undefined) {
    payload.montant_remise = toNumber(montantRemise, 0);
  }

  const clientIdValue = pickValue(updates, 'clientId', 'client_id');
  if (clientIdValue !== undefined) {
    const clientId = Number(clientIdValue);
    if (Number.isFinite(clientId) && clientId > 0) {
      payload.client_id = clientId;
    }
  }

  const linesSource = pickValue(updates, 'lines', 'items');
  if (Array.isArray(linesSource)) {
    const normalizedLines = (linesSource as InvoiceLine[]).map(normalizeInvoiceLineForApi);
    payload.lines = normalizedLines;

    if (payload.service_prestation === undefined) {
      const derivedPrestation = firstLineDescription(normalizedLines);
      if (derivedPrestation) {
        payload.service_prestation = derivedPrestation;
      }
    }
  }

  return payload;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [deliveryNotesState, setDeliveryNotesState] = useState<DeliveryNote[]>([]);
  const [quotes, setQuotesState] = useState<any[]>([]);

  const setDeliveryNotesList = (notes: DeliveryNote[]): void => {
    setDeliveryNotesState(notes.map(note => normalizeDeliveryNoteInput(note)));
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (user: User | null): Promise<void> => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [clientsRes, invoicesRes, paymentsRes, templatesRes, deliveryNotesRes, quotesRes] = await Promise.all([
        apiService.getClients(),
        apiService.getInvoices(),
        apiService.getPayments(),
        apiService.getTemplates(),
        apiService.getDeliveryNotes(),
        apiService.getQuotes()
      ]);

      if (clientsRes.data) {
        setClients(clientsRes.data.map(transformClientFromApi));
      }
      if (invoicesRes.data) {
        setInvoices(invoicesRes.data.map(transformInvoiceFromApi));
      }
      if (paymentsRes.data) {
        setPayments(paymentsRes.data.map(transformPaymentFromApi));
      }
      if (templatesRes.data) {
        setDocumentTemplates(templatesRes.data.map(transformTemplateFromApi));
      }
      if (deliveryNotesRes.data) {
        setDeliveryNotesList(deliveryNotesRes.data.map(transformDeliveryNoteFromApi));
      }
      if (quotesRes.data) {
        setQuotesState(quotesRes.data);
      }
    } catch (err) {
      setError('Failed to load data');
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async (): Promise<void> => {
    await loadData(currentUser);
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      const token = localStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      try {
        const response = await apiService.getCurrentUser();
        if (response.data) {
          setCurrentUser(response.data.user);
          await loadData(response.data.user);
        } else {
          apiService.clearToken();
        }
      } catch (err) {
        console.error('Error restoring session:', err);
        apiService.clearToken();
      }
    };

    void checkAuth();

    const handleUnauthorized = () => {
      console.log('Session expired or invalidated. Logging out.');
      setCurrentUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Transform functions to convert API data to frontend format
  const transformClientFromApi = (apiClient: any): Client => ({
    id: apiClient.id.toString(),
    code: apiClient.code,
    name: apiClient.name,
    type: apiClient.type,
    classification: apiClient.classification,
    email: apiClient.email || '',
    phone: apiClient.phone || '',
    address: apiClient.address || '',
    siret: apiClient.siret || undefined,
    revenue: apiClient.revenue !== undefined ? parseFloat(apiClient.revenue) : 0,
    tvaRate: apiClient.tva_rate !== undefined ? parseFloat(apiClient.tva_rate) : 19,
    hasTva: apiClient.has_tva !== undefined ? Boolean(apiClient.has_tva) : true,
    fiscalId: apiClient.fiscal_id || '',
    commerceRegistry: apiClient.commerce_registry || apiClient.registre_commerce || '',
    taxArticle: apiClient.tax_article || apiClient.article_imposition || '',
    articleImposition: apiClient.article_imposition || '',
    matriculeFiscale: apiClient.matricule_fiscale || '',
    registreCommerce: apiClient.registre_commerce || '',
    nomContact: apiClient.nom_contact || '',
    telFixe: apiClient.tel_fixe || '',
    telMobile: apiClient.tel_mobile || '',
    fax: apiClient.fax || '',
    nis: apiClient.nis || ''
  });

  const mapClientToApiPayload = (client: Partial<Client>): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};

    if (client.code !== undefined) payload.code = client.code;
    if (client.name !== undefined) payload.name = client.name;
    if (client.type !== undefined) payload.type = client.type;
    if (client.classification !== undefined) payload.classification = client.classification;
    if (client.email !== undefined) payload.email = client.email;
    if (client.phone !== undefined) payload.phone = client.phone;
    if (client.address !== undefined) payload.address = client.address;
    if (client.revenue !== undefined) payload.revenue = Number(client.revenue);
    if (client.tvaRate !== undefined) payload.tva_rate = Number(client.tvaRate);
    if (client.hasTva !== undefined) payload.has_tva = client.hasTva;
    if (client.articleImposition !== undefined) {
      payload.article_imposition = client.articleImposition;
      payload.tax_article = client.articleImposition;
    }
    if (client.matriculeFiscale !== undefined) {
      payload.matricule_fiscale = client.matriculeFiscale;
      payload.fiscal_id = client.matriculeFiscale;
    }
    if (client.registreCommerce !== undefined) {
      payload.registre_commerce = client.registreCommerce;
      payload.commerce_registry = client.registreCommerce;
    }
    if (client.nomContact !== undefined) payload.nom_contact = client.nomContact;
    if (client.telFixe !== undefined) payload.tel_fixe = client.telFixe;
    if (client.telMobile !== undefined) payload.tel_mobile = client.telMobile;
    if (client.fax !== undefined) payload.fax = client.fax;
    if (client.nis !== undefined) payload.nis = client.nis;
    if (client.fiscalId !== undefined && payload.fiscal_id === undefined) payload.fiscal_id = client.fiscalId;
    if (client.commerceRegistry !== undefined && payload.commerce_registry === undefined) {
      payload.commerce_registry = client.commerceRegistry;
    }
    if (client.taxArticle !== undefined && payload.tax_article === undefined) {
      payload.tax_article = client.taxArticle;
    }

    return payload;
  };

  const transformInvoiceFromApi = (apiInvoice: any): Invoice => {
    const linePrestation = firstLineDescription(apiInvoice.lines);
    const servicePrestation =
      apiInvoice.service_prestation
      ?? apiInvoice.servicePrestation
      ?? apiInvoice.prestation
      ?? linePrestation;

    const advanceAmount = toOptionalNumber(apiInvoice.advance_amount ?? apiInvoice.advance_payment);

    const rawDate = (apiInvoice as any).invoice_date ?? apiInvoice.date ?? '';
    const normalizedDate = typeof rawDate === 'string' ? rawDate.split('T')[0] : rawDate;

    // Calculate HT (subtotal) with robust fallbacks:
    // 1. Use subtotal from API if present (backend SQL subquery)
    // 2. Sum lines total_price if lines are available
    // 3. Reverse-calculate from amount: amount = HT * (1 + tva/100) as stored by InvoiceForm
    let amountHT = 0;
    if (apiInvoice.subtotal != null && apiInvoice.subtotal !== undefined) {
      amountHT = toNumber(apiInvoice.subtotal, 0);
    } else if (Array.isArray(apiInvoice.lines) && apiInvoice.lines.length > 0) {
      // Sum from lines
      for (const line of apiInvoice.lines) {
        const tp = toNumber(line.total_price, 0) || toNumber(line.amount, 0) || (toNumber(line.quantity, 0) * toNumber(line.unit_price, 0));
        amountHT += tp;
      }
    } else {
      // The stored amount = HT + TVA = HT * (1 + tvaRate/100)
      // So: HT = amount / (1 + tvaRate/100)
      const tvaRate = toNumber(apiInvoice.tva_rate, 19);
      const totalAmount = toNumber(apiInvoice.amount, 0);
      const tvaFactor = 1 + tvaRate / 100;
      amountHT = tvaFactor > 0 ? Math.round((totalAmount / tvaFactor) * 100) / 100 : totalAmount;
    }

    const base: Invoice = {
      id: apiInvoice.id?.toString?.() ?? '',
      number: apiInvoice.number ?? '',
      date: normalizedDate,
      type: apiInvoice.type ?? 'definitive',
      client: apiInvoice.client_name || apiInvoice.client || '',
      clientCode: apiInvoice.client_code ?? apiInvoice.client?.code ?? undefined,
      clientId: apiInvoice.client_id?.toString?.() ?? '',
      amount: toNumber(apiInvoice.amount, 0),
      subtotal: amountHT,
      status: (apiInvoice.status ?? 'pending') as InvoiceStatus,
      paymentMethod: normalizePaymentMethod(apiInvoice.payment_method),
      lines: Array.isArray(apiInvoice.lines) ? apiInvoice.lines : [],
      projectName: apiInvoice.project_name || undefined,
      affairNumber: apiInvoice.affair_number || undefined,
      servicePrestation: servicePrestation || undefined,
      billingPeriod: apiInvoice.billing_period || undefined,
      contractRef: apiInvoice.contract_ref || apiInvoice.ref_contract_n || undefined,
      orderRef: apiInvoice.order_ref || undefined,
      observations: apiInvoice.observations || undefined,
      tvaRate: toNumber(apiInvoice.tva_rate, 19),
      refContractN: apiInvoice.ref_contract_n || undefined,
      refConvention: apiInvoice.ref_convention || undefined,
      txRetenueGarantie: toOptionalNumber(apiInvoice.tx_retenue_garantie),
      txRemisePercent: toOptionalNumber(apiInvoice.tx_remise_percent),
      montantRemise: toOptionalNumber(apiInvoice.montant_remise),
      timbreAmount: toOptionalNumber(apiInvoice.timbre_amount),
      advanceAmount,
      advancePercentage: toOptionalNumber(apiInvoice.advance_percentage || apiInvoice.advancePercentage),
      company_entity: (apiInvoice as any).company_entity || 'principal',
      companyEntity: (apiInvoice as any).company_entity || 'principal',
    };

    return {
      ...base,
      ...(servicePrestation ? { service_prestation: servicePrestation } : {}),
      ...(advanceAmount !== undefined ? { advance_amount: advanceAmount } : {}),
      advance_percentage: base.advancePercentage,
    } as Invoice & { service_prestation?: string; advance_amount?: number; advance_percentage?: number };
  };

  const normalizeDeliveryNoteInput = (note: Partial<DeliveryNote> & Record<string, any>): DeliveryNote => {
    const rawClientId = note.clientId ?? note.client_id;
    const clientId = rawClientId !== undefined && rawClientId !== null ? rawClientId.toString() : '';
    const fallbackClientName = clientId ? clients.find(client => client.id === clientId)?.name : undefined;

    return {
      id: note.id?.toString() ?? `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      number: note.number ?? note.numero ?? '',
      date: note.date ?? new Date().toISOString().split('T')[0],
      clientId,
      client: note.client ?? note.client_name ?? fallbackClientName ?? '',
      designation: note.designation ?? note.description ?? '',
      observations: note.observations ?? note.notes ?? '',
    };
  };

  const transformPaymentFromApi = (apiPayment: any): Payment => ({
    id: apiPayment.id.toString(),
    invoiceId: apiPayment.invoice_id.toString(),
    amount: parseFloat(apiPayment.amount),
    date: apiPayment.date,
    method: apiPayment.method,
    reference: apiPayment.reference,
    notes: apiPayment.notes
  });

  const transformTemplateFromApi = (apiTemplate: any): DocumentTemplate => ({
    id: apiTemplate.id.toString(),
    name: apiTemplate.name,
    type: apiTemplate.type,
    isDefault: apiTemplate.is_default,
    template: apiTemplate.template_config
  });

  const transformDeliveryNoteFromApi = (apiNote: any): DeliveryNote => normalizeDeliveryNoteInput(apiNote);

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.login(username, password);
      if (response.data) {
        setCurrentUser(response.data.user);
        await loadData(response.data.user);
        return true;
      } else {
        setError(response.error || 'Login failed');
        return false;
      }
    } catch (err) {
      setError('Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await apiService.logout();
    setCurrentUser(null);
    setClients([]);
    setInvoices([]);
    setPayments([]);
    setDocumentTemplates([]);
    setDeliveryNotesState([]);
  };

  // Session timeout: auto-logout after 10 minutes of inactivity
  useSessionTimeout({
    timeoutDuration: 10 * 60 * 1000, // 10 minutes
    onTimeout: logout,
  });

  const addClient = async (clientData: Partial<Client> & { name: string }): Promise<void> => {
    const response = await apiService.createClient(mapClientToApiPayload(clientData));

    if (response.data) {
      const newClient = transformClientFromApi(response.data);
      setClients(prev => [newClient, ...prev]);
    } else {
      throw new Error(response.error || 'Failed to create client');
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>): Promise<void> => {
    const response = await apiService.updateClient(id, mapClientToApiPayload(updates));
    if (response.data) {
      const updatedClient = transformClientFromApi(response.data);
      setClients(prev => prev.map(client =>
        client.id === id ? updatedClient : client
      ));
    } else {
      throw new Error(response.error || 'Failed to update client');
    }
  };

  const deleteClient = async (id: string): Promise<void> => {
    const response = await apiService.deleteClient(id);
    if (response.error) {
      throw new Error(response.error);
    }
    setClients(prev => prev.filter(client => client.id !== id));
    setInvoices(prev => prev.filter(invoice => invoice.clientId !== id));
  };

  const addInvoice = async (invoiceData: Record<string, any>): Promise<void> => {
    const payload = buildInvoiceCreationPayload(invoiceData);
    const response = await apiService.createInvoice(payload);

    if (response.data) {
      // Refresh all data to get the latest from database
      await refreshData();
    } else {
      throw new Error(response.error || 'Failed to create invoice');
    }
  };

  const updateInvoice = async (id: string, updates: Record<string, any>): Promise<void> => {
    const payload = mapInvoiceUpdatesToPayload(updates);
    const response = await apiService.updateInvoice(id, payload);
    if (response.data) {
      // Use the fresh response data to update the invoice immediately
      const updatedInvoice = transformInvoiceFromApi(response.data);
      setInvoices(prev => prev.map(invoice =>
        invoice.id === id ? updatedInvoice : invoice
      ));

      // Refresh only payments to update payment-related displays
      // Don't re-fetch invoices since we already have the fresh data
      const paymentsRes = await apiService.getPayments();
      if (paymentsRes.data) {
        setPayments(paymentsRes.data.map(transformPaymentFromApi));
      }
    } else {
      throw new Error(response.error || 'Failed to update invoice');
    }
  };

  const convertInvoiceType = async (id: string, newType: "proforma" | "definitive" | "credit_note"): Promise<void> => {
    const response = await apiService.convertInvoiceType(id, newType);
    if (response.data) {
      const newInvoice = transformInvoiceFromApi(response.data);
      setInvoices(prev => {
        const exists = prev.some(invoice => invoice.id === id);
        if (exists) {
          return prev.map(invoice =>
            invoice.id === id ? newInvoice : invoice
          );
        }
        return [newInvoice, ...prev];
      });
    } else {
      throw new Error(response.error || 'Failed to convert invoice');
    }
  };

  const deleteInvoice = async (id: string): Promise<void> => {
    const response = await apiService.deleteInvoice(id);
    if (response.error) {
      throw new Error(response.error);
    }
    setInvoices(prev => prev.filter(invoice => invoice.id !== id));
  };

  const addPayment = async (paymentData: Omit<Payment, 'id'>): Promise<void> => {
    const response = await apiService.createPayment({
      invoice_id: parseInt(paymentData.invoiceId),
      amount: paymentData.amount,
      date: paymentData.date,
      method: paymentData.method,
      reference: paymentData.reference,
      notes: paymentData.notes
    });

    if (response.data) {
      const newPayment = transformPaymentFromApi(response.data);
      setPayments(prev => [...prev, newPayment]);

      // Update invoice status if needed
      await refreshData();
    } else {
      throw new Error(response.error || 'Failed to create payment');
    }
  };

  const updatePayment = async (id: string, updates: Partial<Payment>): Promise<void> => {
    const response = await apiService.updatePayment(id, updates);
    if (response.data) {
      const updatedPayment = transformPaymentFromApi(response.data);
      setPayments(prev => prev.map(payment =>
        payment.id === id ? updatedPayment : payment
      ));
      await refreshData();
    } else {
      throw new Error(response.error || 'Failed to update payment');
    }
  };

  const deletePayment = async (id: string): Promise<void> => {
    const response = await apiService.deletePayment(id);
    if (response.error) {
      throw new Error(response.error);
    }
    setPayments(prev => prev.filter(payment => payment.id !== id));
    await refreshData();
  };

  const addDocumentTemplate = async (templateData: Omit<DocumentTemplate, 'id'>): Promise<void> => {
    const response = await apiService.createTemplate({
      name: templateData.name,
      type: templateData.type,
      is_default: templateData.isDefault,
      template_config: templateData.template
    });

    if (response.data) {
      const newTemplate = transformTemplateFromApi(response.data);
      setDocumentTemplates(prev => [...prev, newTemplate]);
    } else {
      throw new Error(response.error || 'Failed to create template');
    }
  };

  const updateDocumentTemplate = async (id: string, updates: Partial<DocumentTemplate>): Promise<void> => {
    const response = await apiService.updateTemplate(id, {
      name: updates.name,
      is_default: updates.isDefault,
      template_config: updates.template
    });

    if (response.data) {
      const updatedTemplate = transformTemplateFromApi(response.data);
      setDocumentTemplates(prev => prev.map(template =>
        template.id === id ? updatedTemplate : template
      ));
    } else {
      throw new Error(response.error || 'Failed to update template');
    }
  };

  const deleteDocumentTemplate = async (id: string): Promise<void> => {
    const response = await apiService.deleteTemplate(id);
    if (response.error) {
      throw new Error(response.error);
    }
    setDocumentTemplates(prev => prev.filter(template => template.id !== id));
  };

  const setDocumentTemplate = async (id: string, isDefault: boolean): Promise<void> => {
    const response = await apiService.setDefaultTemplate(id, isDefault);
    if (response.data) {
      await refreshData();
    } else {
      throw new Error(response.error || 'Failed to set default template');
    }
  };

  const addDeliveryNote = async (deliveryNoteData: Omit<DeliveryNote, 'id' | 'number'>): Promise<void> => {
    const numericClientId = Number(deliveryNoteData.clientId);
    if (!Number.isFinite(numericClientId) || numericClientId <= 0) {
      throw new Error('Client requis pour créer le bordereau');
    }

    const response = await apiService.createDeliveryNote({
      date: deliveryNoteData.date,
      client_id: numericClientId,
      designation: deliveryNoteData.designation,
      observations: deliveryNoteData.observations
    });

    if (response.data) {
      const newDeliveryNote = transformDeliveryNoteFromApi(response.data);
      setDeliveryNotesState(prev => [newDeliveryNote, ...prev]);
    } else {
      throw new Error(response.error || 'Failed to create delivery note');
    }
  };

  const updateDeliveryNote = async (id: string, updates: Partial<DeliveryNote>): Promise<void> => {
    const payload: Record<string, unknown> = {};

    if (updates.date) {
      payload.date = updates.date;
    }

    if (updates.clientId) {
      const numericClientId = Number(updates.clientId);
      if (Number.isFinite(numericClientId) && numericClientId > 0) {
        payload.client_id = numericClientId;
      }
    }

    if (updates.designation !== undefined) {
      payload.designation = updates.designation;
    }

    if (updates.observations !== undefined) {
      payload.observations = updates.observations;
    }

    const response = await apiService.updateDeliveryNote(id, payload);

    if (response.data) {
      const updatedNote = transformDeliveryNoteFromApi(response.data);
      setDeliveryNotesState(prev => prev.map(note => (note.id === id ? updatedNote : note)));
    } else {
      throw new Error(response.error || 'Failed to update delivery note');
    }
  };

  const deleteDeliveryNote = async (id: string): Promise<void> => {
    const response = await apiService.deleteDeliveryNote(id);
    if (response.error) {
      throw new Error(response.error);
    }
    setDeliveryNotesState(prev => prev.filter(note => note.id !== id));
  };

  const getNextClientCode = (): string => {
    const maxCode = clients.reduce((max, client) => {
      const numCode = parseInt(client.code);
      return numCode > max ? numCode : max;
    }, 0);
    return (maxCode + 1).toString().padStart(3, '0');
  };

  const getNextInvoiceNumber = async (type: string): Promise<string> => {
    const response = await apiService.getNextInvoiceNumber(type);
    if (response.data) {
      return response.data.nextNumber;
    }
    throw new Error(response.error || 'Failed to get next invoice number');
  };

  const getTotalRevenue = (): number => {
    return invoices
      .filter(inv => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.subtotal, 0);
  };

  const getClientStatistics = async (clientId: string): Promise<any> => {
    const id = clientId.toString();
    const clientInvoices = invoices.filter(inv => inv.clientId === id);

    const totalInvoices = clientInvoices.length;
    const totalRevenue = clientInvoices.reduce((sum, inv) => {
      if (inv.type === 'credit_note') {
        return sum - getLastHT(inv);
      }
      return sum + getLastHT(inv);
    }, 0);
    const totalPaid = clientInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.subtotal, 0);
    const overdueCount = clientInvoices.filter(inv => inv.status === 'overdue').length;
    const outstanding = Math.max(totalRevenue - totalPaid, 0);
    const averageInvoiceAmount = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
    const paymentMethods = uniquePaymentLabels(clientInvoices.map(inv => inv.paymentMethod));

    const lastInvoiceDate = clientInvoices
      .map(inv => inv.date)
      .filter(Boolean)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .pop() ?? null;

    return {
      totalInvoices,
      totalRevenue,
      totalPaid,
      outstanding,
      overdueCount,
      averageInvoiceAmount,
      paymentMethods,
      lastInvoiceDate,
    };
  };

  const getAdvancedReporting = async (): Promise<any> => {
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce((sum, invoice) => {
      if (invoice.type === 'credit_note') {
        return sum - getLastHT(invoice);
      }
      return sum + getLastHT(invoice);
    }, 0);
    const totalPaid = invoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.subtotal, 0);
    const outstanding = Math.max(totalRevenue - totalPaid, 0);

    const statusDistribution = invoices.reduce<Record<string, number>>((acc, invoice) => {
      acc[invoice.status] = (acc[invoice.status] ?? 0) + 1;
      return acc;
    }, {});

    const monthlyRevenueMap = new Map<string, number>();
    invoices.forEach(invoice => {
      if (!invoice.date) {
        return;
      }
      const date = new Date(invoice.date);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenueMap.set(key, (monthlyRevenueMap.get(key) ?? 0) + invoice.subtotal);
    });

    const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, revenue]) => ({ month, revenue }));

    const topClientsMap = new Map<string, { name: string; revenue: number }>();
    invoices.forEach(invoice => {
      const key = invoice.clientId || invoice.client;
      if (!key) {
        return;
      }
      const entry = topClientsMap.get(key) ?? { name: invoice.client, revenue: 0 };
      entry.revenue += invoice.amount;
      topClientsMap.set(key, entry);
    });

    const topClients = Array.from(topClientsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const serviceBreakdownMap = new Map<string, number>();
    invoices.forEach(invoice => {
      const service = invoice.servicePrestation || 'Autres services';
      serviceBreakdownMap.set(service, (serviceBreakdownMap.get(service) ?? 0) + invoice.amount);
    });

    const serviceBreakdown = Array.from(serviceBreakdownMap.entries()).map(([service, revenue]) => ({
      service,
      revenue,
    }));

    return {
      totalInvoices,
      totalRevenue,
      totalPaid,
      outstanding,
      statusDistribution,
      monthlyRevenue,
      topClients,
      serviceBreakdown,
    };
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'DZD',
    });
  };

  return (
    <AppContext.Provider
      value={{
        clients,
        invoices,
        payments,
        documentTemplates,
        deliveryNotes: deliveryNotesState,
        quotes: quotes,
        currentUser,
        loading,
        error,
        addClient,
        updateClient,
        deleteClient,
        setClients,
        addInvoice,
        updateInvoice,
        convertInvoiceType,
        deleteInvoice,
        setInvoices,
        addPayment,
        updatePayment,
        deletePayment,
        addDocumentTemplate,
        updateDocumentTemplate,
        deleteDocumentTemplate,
        setDocumentTemplate,
        addDeliveryNote,
        updateDeliveryNote,
        deleteDeliveryNote,
        setDeliveryNotes: setDeliveryNotesList,
        addQuote: async (quote: Record<string, any>) => {
          const response = await apiService.createQuote(quote);
          if (response.error) throw new Error(response.error);
          await refreshData(); // Refresh to show the new quote
        },
        updateQuote: async (id: string, updates: Record<string, any>) => {
          const response = await apiService.updateQuote(id, updates);
          if (response.error) throw new Error(response.error);
          await refreshData();
        },
        deleteQuote: async (id: string) => {
          const response = await apiService.deleteQuote(id);
          if (response.error) throw new Error(response.error);
          await refreshData();
        },
        setQuotes: () => { }, // TODO: Implement
        login,
        logout,
        getNextClientCode,
        getNextInvoiceNumber,
        getTotalRevenue,
        getClientStatistics,
        getAdvancedReporting,
        formatCurrency,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
