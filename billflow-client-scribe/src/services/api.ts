import { normalizePaymentMethod } from '../utils/paymentMethods';

// Extract the base path dynamically from the current window location in production,
// or fallback to localhost for local development
const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port !== '5173' ? '/api' : 'http://127.0.0.1:3001/api');

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'commercial';
}

export interface LoginSuccess {
  token: string;
  user: AuthUser;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  item_type?: 'text' | 'text_with_quantity' | 'amount';
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  amount?: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  type: 'proforma' | 'definitive' | 'credit_note';
  client_id: string;
  client_name?: string;
  client_code?: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: string;
  project_name?: string;
  affair_number?: string;
  service_prestation?: string;
  billing_period?: string;
  ref_convention?: string;
  contract_ref?: string;
  order_ref?: string;
  observations?: string;
  tva_rate: number;
  tx_retenue_garantie?: number;
  tx_remise_percent?: number;
  montant_remise?: number;
  timbre_amount?: number;
  advance_percentage?: number;
  advance_amount?: number;
  advance_payment?: number;
  company_entity?: 'principal' | 'secondary';
  created_at: string;
  updated_at: string;
  lines?: InvoiceLine[];
}


export interface Client {
  id: string;
  code?: string;
  name: string;
  type?: 'local' | 'foreign';
  classification?: 'new' | 'recurring' | 'good' | 'very_good';
  fiscalId?: string;
  commerceRegistry?: string;
  taxArticle?: string;
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
  revenue?: number;
  tvaRate: number;
  hasTva?: boolean;
  articleImposition?: string;
  matriculeFiscale?: string;
  registreCommerce?: string;
  nomContact?: string;
  telFixe?: string;
  telMobile?: string;
  fax?: string;
  nis?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInvoiceLineInput {
  description: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  amount?: number;
  item_type?: 'text' | 'text_with_quantity' | 'amount';
}

export interface CreateInvoiceRequest {
  number?: string;
  date: string;
  type: 'proforma' | 'definitive' | 'credit_note';
  client_id: number;
  amount: number;
  payment_method?: string;
  project_name?: string;
  affair_number?: string;
  billing_period?: string;
  contract_ref?: string;
  service_prestation?: string;
  order_ref?: string;
  observations?: string;
  ref_contract_n?: string;
  ref_convention?: string;
  tx_retenue_garantie?: number;
  tx_remise_percent?: number;
  montant_remise?: number;
  advance_amount?: number;
  timbre_amount?: number;
  tva_rate?: number;
  advance_percentage?: number;
  company_entity?: 'principal' | 'secondary';
  lines: CreateInvoiceLineInput[];
}

class ApiService {
  private readonly baseURL: string;
  private token: string | null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = this.getStoredToken();
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('auth_token');
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private buildHeaders(extra?: HeadersInit): Headers {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    if (extra) {
      new Headers(extra).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    return headers;
  }

  private async parseResponse(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const config: RequestInit = {
      method: options.method || 'GET',
      ...options,
    };

    config.headers = this.buildHeaders(options.headers);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const payload = await this.parseResponse(response);

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;

        if (typeof payload === 'string') {
          errorMessage = payload;
        } else if (payload && typeof payload === 'object') {
          if (payload.error === 'Validation failed' && Array.isArray(payload.details)) {
            const details = payload.details
              .map((d: any) => `${d.path || d.param}: ${d.msg}`)
              .join(', ');
            errorMessage = `Validation failed: ${details}`;
          } else {
            errorMessage = payload.error || payload.message || errorMessage;
          }
        }

        if (response.status === 401) {
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
        }

        return {
          data: null,
          error: errorMessage,
          status: response.status,
        };
      }

      return {
        data: (payload as T) ?? null,
        error: null,
        status: response.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network request failed';
      return {
        data: null,
        error: message,
        status: 0,
      };
    }
  }

  async login(username: string, password: string): Promise<ApiResponse<LoginSuccess>> {
    const response = await this.request<LoginSuccess>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
    this.clearToken();
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: AuthUser }>> {
    return this.request<{ user: AuthUser }>('/auth/me');
  }

  async getClients(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/clients');
  }

  async getClientById(id: string | number): Promise<ApiResponse<any>> {
    return this.request<any>(`/clients/${id}`);
  }

  async createClient(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string | number, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string | number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  async getClientStatistics(id: string | number): Promise<ApiResponse<any>> {
    return this.request<any>(`/clients/${id}/statistics`);
  }

  async getInvoices(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/invoices');
  }

  async getInvoiceById(id: string | number): Promise<ApiResponse<any>> {
    return this.request<any>(`/invoices/${id}`);
  }

  async createInvoice(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string | number, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string | number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async convertInvoiceType(id: string | number, newType: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/invoices/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify({ newType }),
    });
  }

  async getNextInvoiceNumber(type: string): Promise<ApiResponse<{ nextNumber: string }>> {
    return this.request<{ nextNumber: string }>(`/invoices/next-number/${type}`);
  }

  async getPayments(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/payments');
  }

  async createPayment(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayment(id: string | number, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: string | number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/payments/${id}`, {
      method: 'DELETE',
    });
  }

  async getTemplates(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/templates');
  }

  async createTemplate(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id: string | number, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: string | number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  async setDefaultTemplate(id: string | number, isDefault: boolean): Promise<ApiResponse<any>> {
    return this.request<any>(`/templates/${id}/set-default`, {
      method: 'PUT',
      body: JSON.stringify({ isDefault }),
    });
  }

  async getDeliveryNotes(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/delivery-notes');
  }

  async createDeliveryNote(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>('/delivery-notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDeliveryNote(id: string | number, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>(`/delivery-notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDeliveryNote(id: string | number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/delivery-notes/${id}`, {
      method: 'DELETE',
    });
  }

  async getQuotes(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/quotes');
  }

  async getQuoteById(id: string | number): Promise<ApiResponse<any>> {
    return this.request<any>(`/quotes/${id}`);
  }

  async createQuote(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>('/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuote(id: string | number, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>(`/quotes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteQuote(id: string | number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/quotes/${id}`, {
      method: 'DELETE',
    });
  }

  async getAdvancedReporting(): Promise<ApiResponse<any>> {
    return this.request<any>('/reports/advanced');
  }
}

export const apiService = new ApiService();

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
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = parseNumeric(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const ITEM_TYPES = ['text', 'text_with_quantity', 'amount'] as const;
type ItemTypeValue = typeof ITEM_TYPES[number];

const normalizeLineType = (rawType: unknown): ItemTypeValue => {
  if (typeof rawType === 'string' && (ITEM_TYPES as readonly string[]).includes(rawType)) {
    return rawType as ItemTypeValue;
  }
  return 'text_with_quantity';
};

const determineInvoiceLineType = (line: InvoiceLine): ItemTypeValue => {
  if (line.item_type && (ITEM_TYPES as readonly string[]).includes(line.item_type)) {
    return line.item_type as ItemTypeValue;
  }

  const quantity = toNumber(line.quantity, 0);
  const unitPrice = toNumber(line.unit_price, 0);
  const amount = toOptionalNumber(line.amount) ?? 0;

  if (quantity === 0 && unitPrice === 0 && amount === 0) {
    return 'text';
  }

  if ((amount > 0 && quantity === 0) || (amount > 0 && quantity === 1 && unitPrice === 0)) {
    return 'amount';
  }

  return 'text_with_quantity';
};

const resolveClientId = (formData: any): number => {
  const candidate = formData?.clientId ?? formData?.client_id ?? formData?.client?.id;
  const parsed = Number(candidate);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Veuillez sélectionner un client valide pour la facture.');
  }

  return parsed;
};

const normalizeFormItems = (
  items: any[] | undefined
): { subtotal: number; lines: CreateInvoiceLineInput[] } => {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      subtotal: 0,
      lines: []
    };
  }

  const normalized = items.map((item) => {
    const type = normalizeLineType(item?.type);
    const description = typeof item?.description === 'string' ? item.description.trim() : '';

    if (type === 'text') {
      return {
        total: 0,
        line: {
          description,
          quantity: 0,
          unit: '',
          unit_price: 0,
          amount: 0,
          item_type: 'text' as ItemTypeValue,
        },
      };
    }

    if (type === 'amount') {
      const amountValue = toNumber(item?.amount ?? item?.total ?? item?.unitPrice, 0);
      return {
        total: amountValue,
        line: {
          description,
          quantity: 1,
          unit: item?.unit ?? 'Unité',
          unit_price: amountValue,
          amount: amountValue,
          item_type: 'amount' as ItemTypeValue,
        },
      };
    }

    const quantity = toNumber(item?.quantity, 0);
    const unitPrice = toNumber(item?.unitPrice ?? item?.unit_price, 0);
    const total = quantity * unitPrice;

    return {
      total,
      line: {
        description,
        quantity,
        unit: item?.unit ?? 'Unité',
        unit_price: unitPrice,
        amount: total,
        item_type: 'text_with_quantity' as ItemTypeValue,
      },
    };
  });

  const subtotal = normalized.reduce((sum, entry) => sum + entry.total, 0);

  return {
    subtotal,
    lines: normalized.map((entry) => entry.line),
  };
};

class ApiClient {
  constructor(private readonly service: ApiService) { }

  private ensureData<T>(response: ApiResponse<T>, fallbackMessage: string): T {
    if (response.data !== null && response.data !== undefined) {
      return response.data;
    }
    throw new Error(response.error || fallbackMessage);
  }

  private transformInvoiceLine = (line: any): InvoiceLine => ({
    id: line?.id?.toString() ?? '',
    invoice_id: line?.invoice_id?.toString() ?? '',
    item_type: line?.item_type ?? undefined,
    description: line?.description ?? '',
    quantity: toNumber(line?.quantity),
    unit: line?.unit ?? undefined,
    unit_price: toNumber(line?.unit_price),
    amount: toOptionalNumber(line?.amount),
    total_price: toNumber(line?.total_price),
  });

  private transformInvoice = (invoice: any): Invoice => ({
    id: invoice?.id?.toString() ?? '',
    number: invoice?.number ?? '',
    date: invoice?.date ?? '',
    type: invoice?.type ?? 'definitive',
    client_id: invoice?.client_id?.toString() ?? '',
    client_name: invoice?.client_name ?? invoice?.client?.name ?? undefined,
    client_code: invoice?.client_code ?? invoice?.client?.code ?? undefined,
    amount: toNumber(invoice?.amount),
    status: (invoice?.status ?? 'pending') as Invoice['status'],
    payment_method: normalizePaymentMethod(invoice?.payment_method),
    project_name: invoice?.project_name ?? undefined,
    affair_number: invoice?.affair_number ?? undefined,
    service_prestation:
      invoice?.service_prestation ??
      invoice?.servicePrestation ??
      invoice?.prestation ??
      invoice?.service?.prestation ??
      undefined,
    billing_period: invoice?.billing_period ?? undefined,
    ref_convention: invoice?.ref_convention ?? undefined,
    contract_ref: invoice?.contract_ref ?? undefined,
    order_ref: invoice?.order_ref ?? undefined,
    observations: invoice?.observations ?? undefined,
    timbre_amount: toOptionalNumber(invoice?.timbre_amount),
    advance_amount: toOptionalNumber(invoice?.advance_amount ?? invoice?.advance_payment),
    advance_percentage: toOptionalNumber(invoice?.advance_percentage),
    tva_rate: toNumber(invoice?.tva_rate, 0),
    tx_retenue_garantie: toOptionalNumber(invoice?.tx_retenue_garantie),
    tx_remise_percent: toOptionalNumber(invoice?.tx_remise_percent),
    montant_remise: toOptionalNumber(invoice?.montant_remise),
    created_at: invoice?.created_at ?? '',
    updated_at: invoice?.updated_at ?? '',
    lines: Array.isArray(invoice?.lines)
      ? invoice.lines.map(this.transformInvoiceLine)
      : undefined,
  });

  private transformClient = (client: any): Client => ({
    id: client?.id?.toString() ?? '',
    code: client?.code !== undefined ? String(client.code) : undefined,
    name: client?.name ?? '',
    type: client?.type ?? undefined,
    classification: client?.classification ?? undefined,
    fiscalId: client?.fiscal_id ?? undefined,
    commerceRegistry: client?.commerce_registry ?? client?.registre_commerce ?? undefined,
    taxArticle: client?.tax_article ?? client?.article_imposition ?? undefined,
    email: client?.email ?? undefined,
    phone: client?.phone ?? undefined,
    address: client?.address ?? undefined,
    siret: client?.siret ?? undefined,
    revenue: toOptionalNumber(client?.revenue),
    tvaRate: toNumber(client?.tva_rate, 0),
    hasTva: client?.has_tva !== undefined ? Boolean(client.has_tva) : undefined,
    articleImposition: client?.article_imposition ?? undefined,
    matriculeFiscale: client?.matricule_fiscale ?? undefined,
    registreCommerce: client?.registre_commerce ?? client?.commerce_registry ?? undefined,
    nomContact: client?.nom_contact ?? undefined,
    telFixe: client?.tel_fixe ?? undefined,
    telMobile: client?.tel_mobile ?? undefined,
    fax: client?.fax ?? undefined,
    nis: client?.nis ?? undefined,
    createdAt: client?.created_at ?? undefined,
    updatedAt: client?.updated_at ?? undefined,
  });

  async getInvoices(): Promise<Invoice[]> {
    const data = this.ensureData(await this.service.getInvoices(), 'Impossible de récupérer les factures');
    return data.map((invoice: any) => this.transformInvoice(invoice));
  }

  async getInvoiceById(id: string): Promise<Invoice> {
    const data = this.ensureData(await this.service.getInvoiceById(id), 'Facture introuvable');
    return this.transformInvoice(data);
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    const payload = {
      ...data,
      client_id: Number(data.client_id),
      amount: Number(data.amount),
      lines: data.lines?.map(line => ({
        description: line.description,
        quantity: line.quantity !== undefined ? Number(line.quantity) : undefined,
        unit: line.unit,
        unit_price: line.unit_price !== undefined ? Number(line.unit_price) : undefined,
        amount: line.amount !== undefined ? Number(line.amount) : undefined,
        item_type: line.item_type,
      })),
    };

    const response = await this.service.createInvoice(payload);
    const invoice = this.ensureData(response, 'Impossible de créer la facture');
    return this.transformInvoice(invoice);
  }

  async updateInvoice(id: string, data: Partial<CreateInvoiceRequest>): Promise<Invoice> {
    const payload = {
      ...data,
      client_id: data.client_id !== undefined ? Number(data.client_id) : undefined,
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
      lines: data.lines?.map(line => ({
        description: line.description,
        quantity: line.quantity !== undefined ? Number(line.quantity) : undefined,
        unit: line.unit,
        unit_price: line.unit_price !== undefined ? Number(line.unit_price) : undefined,
        amount: line.amount !== undefined ? Number(line.amount) : undefined,
        item_type: line.item_type,
      })),
    };

    const response = await this.service.updateInvoice(id, payload);
    const invoice = this.ensureData(response, 'Impossible de mettre à jour la facture');
    return this.transformInvoice(invoice);
  }

  async deleteInvoice(id: string): Promise<{ message: string }> {
    return this.ensureData(await this.service.deleteInvoice(id), 'Impossible de supprimer la facture');
  }

  async convertInvoiceType(id: string, newType: string): Promise<Invoice> {
    const response = await this.service.convertInvoiceType(id, newType);
    const invoice = this.ensureData(response, 'Impossible de convertir le type de facture');
    return this.transformInvoice(invoice);
  }

  async getNextInvoiceNumber(type: string): Promise<{ nextNumber: string }> {
    return this.ensureData(await this.service.getNextInvoiceNumber(type), 'Impossible de récupérer le prochain numéro de facture');
  }

  async getClients(): Promise<Client[]> {
    const data = this.ensureData(await this.service.getClients(), 'Impossible de récupérer les clients');
    return data.map((client: any) => this.transformClient(client));
  }

  async getClientById(id: string): Promise<Client> {
    const data = this.ensureData(await this.service.getClientById(id), 'Client introuvable');
    return this.transformClient(data);
  }

  async createClient(data: Omit<Client, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const payload: Record<string, unknown> = {
      name: data.name,
      type: data.type,
      classification: data.classification,
      email: data.email,
      phone: data.phone,
      address: data.address,
      siret: data.siret,
      revenue: data.revenue !== undefined ? Number(data.revenue) : undefined,
      tva_rate: data.tvaRate !== undefined ? Number(data.tvaRate) : undefined,
      has_tva: data.hasTva,
      article_imposition: data.articleImposition,
      matricule_fiscale: data.matriculeFiscale,
      registre_commerce: data.registreCommerce,
      nom_contact: data.nomContact,
      tel_fixe: data.telFixe,
      tel_mobile: data.telMobile,
      fax: data.fax,
      fiscal_id: data.fiscalId ?? data.matriculeFiscale,
      commerce_registry: data.commerceRegistry ?? data.registreCommerce,
      tax_article: data.taxArticle ?? data.articleImposition,
      nis: data.nis,
    };

    const response = await this.service.createClient(payload);
    const client = this.ensureData(response, 'Impossible de créer le client');
    return this.transformClient(client);
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    const payload: Record<string, unknown> = {};

    if (data.name !== undefined) payload.name = data.name;
    if (data.type !== undefined) payload.type = data.type;
    if (data.classification !== undefined) payload.classification = data.classification;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.address !== undefined) payload.address = data.address;
    if (data.siret !== undefined) payload.siret = data.siret;
    if (data.revenue !== undefined) payload.revenue = Number(data.revenue);
    if (data.tvaRate !== undefined) payload.tva_rate = Number(data.tvaRate);
    if (data.hasTva !== undefined) payload.has_tva = data.hasTva;
    if (data.articleImposition !== undefined) {
      payload.article_imposition = data.articleImposition;
      payload.tax_article = data.articleImposition;
    }
    if (data.matriculeFiscale !== undefined) {
      payload.matricule_fiscale = data.matriculeFiscale;
      payload.fiscal_id = data.matriculeFiscale;
    }
    if (data.registreCommerce !== undefined) {
      payload.registre_commerce = data.registreCommerce;
      payload.commerce_registry = data.registreCommerce;
    }
    if (data.nomContact !== undefined) payload.nom_contact = data.nomContact;
    if (data.telFixe !== undefined) payload.tel_fixe = data.telFixe;
    if (data.telMobile !== undefined) payload.tel_mobile = data.telMobile;
    if (data.fax !== undefined) payload.fax = data.fax;
    if (data.nis !== undefined) payload.nis = data.nis;
    if (data.fiscalId !== undefined && payload.fiscal_id === undefined) payload.fiscal_id = data.fiscalId;
    if (data.commerceRegistry !== undefined && payload.commerce_registry === undefined) {
      payload.commerce_registry = data.commerceRegistry;
    }
    if (data.taxArticle !== undefined && payload.tax_article === undefined) {
      payload.tax_article = data.taxArticle;
    }

    const response = await this.service.updateClient(id, payload);
    const client = this.ensureData(response, 'Impossible de modifier le client');
    return this.transformClient(client);
  }

  async deleteClient(id: string): Promise<{ message: string }> {
    return this.ensureData(await this.service.deleteClient(id), 'Impossible de supprimer le client');
  }
}

export const apiClient = new ApiClient(apiService);

export const transformInvoiceForForm = (invoice: Invoice) => {
  const rawDate = (invoice as any).invoice_date ?? invoice.date ?? '';
  const normalizedDate = typeof rawDate === 'string' ? rawDate.split('T')[0] : rawDate;

  const items = Array.isArray(invoice.lines)
    ? invoice.lines.map(line => {
      const type = determineInvoiceLineType(line);
      const quantity = toOptionalNumber(line.quantity);
      const unitPrice = toOptionalNumber(line.unit_price);
      const baseTotal = toNumber(line.total_price, 0);
      const inferredTotal = baseTotal || (quantity ?? 0) * (unitPrice ?? 0);
      const amount = toOptionalNumber(line.amount) ?? inferredTotal;

      return {
        type,
        description: line.description,
        quantity: type === 'text_with_quantity' ? quantity ?? 0 : undefined,
        unit: type === 'text_with_quantity' ? line.unit || 'Unité' : undefined,
        unitPrice: type === 'text_with_quantity' ? unitPrice ?? 0 : undefined,
        amount: type === 'amount' ? amount : undefined,
        total: type === 'text_with_quantity' ? inferredTotal : amount,
      };
    })
    : [];

  const subtotal = items.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const tvaRate = invoice.tva_rate ?? 0;
  const total = toNumber(invoice.amount, subtotal + subtotal * (tvaRate / 100));
  const tvaAmount = Math.max(total - subtotal, 0);
  const advanceAmount =
    toOptionalNumber((invoice as any).advance_amount) ?? toOptionalNumber((invoice as any).advance_payment) ?? 0;
  const advancePercentage = toOptionalNumber(invoice.advance_percentage);
  const txRetenueGarantie = toOptionalNumber(invoice.tx_retenue_garantie);
  const txRemisePercent = toOptionalNumber(invoice.tx_remise_percent);
  const montantRemise = toOptionalNumber(invoice.montant_remise);

  return {
    invoiceNumber: invoice.number,
    date: normalizedDate,
    clientId: invoice.client_id ?? '',
    client: {
      code: invoice.client_code || '',
      name: invoice.client_name || '',
      fiscalId: '',
      commerceRegistry: '',
      taxArticle: '',
      address: '',
    },
    service: {
      prestation:
        invoice.service_prestation
        ?? (invoice as any).servicePrestation
        ?? (invoice as any).prestation
        ?? (invoice as any).service?.prestation
        ?? '',
      period: invoice.billing_period || '',
      project: invoice.project_name || '',
      affairNumber: invoice.affair_number || '',
      conventionRef: (invoice as any).ref_convention || (invoice as any).convention_ref || '',
      contractRef: invoice.contract_ref || (invoice as any).ref_contract_n || '',
      bcRef: invoice.order_ref || '',
    },
    items,
    tvaRate,
    paymentMethod: normalizePaymentMethod(invoice.payment_method),
    observations: invoice.observations || '',
    subtotal,
    tvaAmount,
    total,
    advanceAmount,
    advance_percentage: advancePercentage,
    advancePercentage: advancePercentage,
    tx_retenue_garantie: txRetenueGarantie,
    txRetenueGarantie: txRetenueGarantie,
    tx_remise_percent: txRemisePercent,
    txRemisePercent: txRemisePercent,
    montant_remise: montantRemise,
    montantRemise: montantRemise,
    company_entity: (invoice as any).company_entity || (invoice as any).companyEntity || 'principal',
  };
};

export const transformFormToInvoice = (formData: any): CreateInvoiceRequest => {
  const { subtotal, lines } = normalizeFormItems(formData.items);
  const tvaRate = toNumber(formData.tvaRate ?? formData.tva_rate, 0);
  const providedTotal = formData.total !== undefined ? toNumber(formData.total, subtotal) : undefined;
  const computedTva = subtotal * (tvaRate / 100);
  const total = providedTotal !== undefined ? providedTotal : subtotal + computedTva;

  return {
    number: formData.invoiceNumber || undefined,
    date: formData.date,
    type: (formData.type ?? 'definitive') as CreateInvoiceRequest['type'],
    client_id: resolveClientId(formData),
    amount: Number(total.toFixed(2)),
    payment_method: normalizePaymentMethod(formData.paymentMethod),
    project_name: formData.service?.project || undefined,
    affair_number: formData.service?.affairNumber || undefined,
    billing_period: formData.service?.period || undefined,
    contract_ref: formData.service?.contractRef || undefined,
    order_ref: formData.service?.bcRef || undefined,
    observations: formData.observations ?? undefined,
    service_prestation: formData.service?.prestation || undefined,
    ref_contract_n: formData.service?.contractRef || undefined,
    ref_convention: formData.service?.conventionRef || undefined,
    tx_retenue_garantie: toOptionalNumber(formData.retentionRate ?? formData.tx_retenue_garantie ?? formData.txRetenueGarantie),
    tx_remise_percent: toOptionalNumber(formData.discountRate ?? formData.tx_remise_percent ?? formData.txRemisePercent),
    montant_remise: toOptionalNumber(formData.discountAmount ?? formData.montant_remise ?? formData.montantRemise),
    advance_amount: toOptionalNumber(formData.advanceAmount ?? formData.advance_amount),
    advance_percentage: toOptionalNumber(formData.advance_percentage ?? formData.advancePercentage),
    timbre_amount: toOptionalNumber(formData.timbreAmount),
    tva_rate: tvaRate,
    company_entity: formData.company_entity === 'secondary' || formData.companyEntity === 'secondary' ? 'secondary' : 'principal',
    lines,
  };
};

export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Une erreur inattendue s'est produite";
};

export default apiClient;
