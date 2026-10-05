export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type QuoteItemType = 'main' | 'sub';
export type QuoteItemDisplayType = 'text' | 'quantity'; // text = header only, quantity = with unit/price

export interface QuoteItem {
    id?: number;
    item_type: QuoteItemType;
    display_type: QuoteItemDisplayType; // controls how the item is displayed
    item_number: string; // e.g., "1/", "1.1", "1.2"
    designation: string;
    unit?: string; // Optional for text-only items
    unit_price?: number; // Optional for text-only items
}

export interface Quote {
    id: number;
    reference: string; // e.g., "OC702/5/IP/DTC"
    client_id?: number | null;
    date: string;
    status: QuoteStatus;
    validity_days?: number;
    terms?: string;
    // Manual client fields (used when manual_client_mode = true)
    manual_client_mode?: boolean | number;
    manual_client_name?: string;
    manual_client_email?: string;
    manual_client_contact?: string;
    manual_client_phone?: string;
    items: QuoteItem[];
    created_at: string;
    updated_at: string;
}

export interface CreateQuoteRequest {
    reference: string;
    client_id?: number | null; // optional when manual_client_mode is true
    date: string;
    validity_days?: number;
    terms?: string;
    // Manual client fields
    manual_client_mode?: boolean | number;
    manual_client_name?: string;
    manual_client_email?: string;
    manual_client_contact?: string;
    manual_client_phone?: string;
    items: Omit<QuoteItem, 'id'>[];
}

export interface UpdateQuoteRequest {
    reference?: string;
    client_id?: number | null;
    date?: string;
    status?: QuoteStatus;
    validity_days?: number;
    terms?: string;
    // Manual client fields
    manual_client_mode?: boolean | number;
    manual_client_name?: string;
    manual_client_email?: string;
    manual_client_contact?: string;
    manual_client_phone?: string;
    items?: Omit<QuoteItem, 'id'>[];
}
