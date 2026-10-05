export type InvoiceType = 'proforma' | 'definitive' | 'credit_note';
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';
export type InvoiceLineType = 'text' | 'text_with_quantity' | 'amount';

export interface InvoiceLineInput {
  description: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  amount?: number;
  item_type?: InvoiceLineType;
}

export interface CreateInvoiceRequest {
  number?: string;
  date: string;
  type: InvoiceType;
  client_id: number;
  amount: number;
  advance_amount?: number;
  timbre_amount?: number;
  status?: InvoiceStatus;
  payment_method?: string;
  project_name?: string;
  affair_number?: string;
  service_prestation?: string;
  billing_period?: string;
  contract_ref?: string;
  order_ref?: string;
  observations?: string;
  ref_contract_n?: string;
  ref_convention?: string;
  tx_retenue_garantie?: number;
  tx_remise_percent?: number;
  montant_remise?: number;
  tva_rate?: number;
  advance_percentage?: number;
  company_entity?: 'principal' | 'secondary';
  lines?: InvoiceLineInput[];
}
