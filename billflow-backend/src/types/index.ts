import { Request } from 'express';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'commercial';
  current_session_token?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Client {
  id: number;
  code: string;
  name: string;
  type: 'local' | 'foreign';
  classification: 'new' | 'recurring' | 'good' | 'very_good';
  fiscal_id?: string;
  commerce_registry?: string;
  tax_article?: string;
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
  revenue: number;
  tva_rate: number;
  has_tva: boolean;
  article_imposition?: string;
  matricule_fiscale?: string;
  registre_commerce?: string;
  nom_contact?: string;
  tel_fixe?: string;
  tel_mobile?: string;
  fax?: string;
  nis?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: number;
  number: string;
  date: string;
  type: 'proforma' | 'definitive' | 'credit_note';
  client_id: number;
  client_code?: string;
  amount: number;
  advance_amount?: number | null;
  timbre_amount?: number | null;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  payment_method?: string;
  project_name?: string;
  affair_number?: string;
  service_prestation?: string;
  billing_period?: string;
  contract_ref?: string;
  order_ref?: string;
  observations?: string;
  tva_rate?: number;
  ref_contract_n?: string;
  ref_convention?: string;
  tx_retenue_garantie?: number;
  tx_remise_percent?: number;
  montant_remise?: number;
  advance_percentage?: number | null;
  company_entity?: 'principal' | 'secondary';
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceLine {
  id: number;
  invoice_id: number;
  item_type: 'text' | 'text_with_quantity' | 'amount';
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  amount?: number;
  total_price: number;
  created_at: Date;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  date: string;
  method: 'cash' | 'bank_transfer' | 'check' | 'card' | 'other';
  reference?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryNote {
  id: number;
  number: string;
  date: string;
  client_id: number;
  designation: string;
  observations?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentTemplate {
  id: number;
  name: string;
  type: 'invoice' | 'quote' | 'delivery_note';
  is_default: boolean;
  template_config: any;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateClientRequest {
  code?: string;
  name: string;
  type: 'local' | 'foreign';
  classification: 'new' | 'recurring' | 'good' | 'very_good';
  fiscal_id?: string;
  commerce_registry?: string;
  tax_article?: string;
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
  revenue?: number;
  tva_rate?: number;
  has_tva?: boolean;
  article_imposition?: string;
  matricule_fiscale?: string;
  registre_commerce?: string;
  nom_contact?: string;
  tel_fixe?: string;
  tel_mobile?: string;
  fax?: string;
  nis?: string;
}

export interface CreatePaymentRequest {
  invoice_id: number;
  amount: number;
  date: string;
  method: 'cash' | 'bank_transfer' | 'check' | 'card' | 'other';
  reference?: string;
  notes?: string;
}

export interface CreateDeliveryNoteRequest {
  date: string;
  client_id: number;
  designation: string;
  observations?: string;
}

export interface CreateDocumentTemplateRequest {
  name: string;
  type: 'invoice' | 'quote' | 'delivery_note';
  is_default?: boolean;
  template_config: any;
}

export * from './invoice';
