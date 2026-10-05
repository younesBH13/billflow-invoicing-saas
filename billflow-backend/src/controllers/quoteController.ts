import { Request, Response } from 'express';
import { db } from '../config/database';

// ─── helpers ────────────────────────────────────────────────────────────────

const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/\s+/g, '').replace(/,/g, '.'));
    return isFinite(n) ? n : fallback;
  }
  return fallback;
};

const toNullable = <T>(value: T | undefined | null): T | null =>
  value == null ? null : value;

const isSQLiteError = (error: unknown): error is Error & { code?: string } =>
  error instanceof Error && 'code' in error;

const VALID_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
const VALID_ITEM_TYPES = ['main', 'sub'] as const;
const VALID_DISPLAY_TYPES = ['text', 'quantity'] as const;

// Generate a quote reference: DEVIS-YYYY-NNN (fallback only — frontend generates OC refs)
const getNextQuoteReference = (): string => {
  const year = new Date().getFullYear();
  const prefix = `DEVIS-${year}-`;
  const row = db
    .prepare(
      `SELECT reference FROM quotes
       WHERE reference LIKE ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(`${prefix}%`) as { reference: string } | undefined;

  let next = 1;
  if (row) {
    const parts = row.reference.split('-');
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last)) next = last + 1;
  }
  return `${prefix}${next.toString().padStart(3, '0')}`;
};

// ─── GET /api/quotes ─────────────────────────────────────────────────────────

export const getAllQuotes = (_req: Request, res: Response): void => {
  try {
    const rows = db
      .prepare(
        `SELECT q.*,
           c.name  AS client_name,
           c.code  AS client_code,
           (SELECT COUNT(*) FROM quote_items qi WHERE qi.quote_id = q.id) AS item_count
         FROM quotes q
         LEFT JOIN clients c ON q.client_id = c.id
         ORDER BY q.created_at DESC`
      )
      .all();
    res.json(rows);
  } catch (error) {
    console.error('Get all quotes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── GET /api/quotes/:id ─────────────────────────────────────────────────────

export const getQuoteById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const quote = db
      .prepare(
        `SELECT q.*, c.name AS client_name, c.code AS client_code
         FROM quotes q
         LEFT JOIN clients c ON q.client_id = c.id
         WHERE q.id = ?`
      )
      .get(id);

    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    const items = db
      .prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY display_order, id')
      .all(id);

    res.json({ ...(quote as object), items });
  } catch (error) {
    console.error('Get quote by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── POST /api/quotes ────────────────────────────────────────────────────────

export const createQuote = (req: Request, res: Response): void => {
  try {
    const data = req.body;

    const manualMode = data.manual_client_mode ? 1 : 0;

    // Validate client unless manual mode
    if (!manualMode && data.client_id) {
      const clientRow = db
        .prepare('SELECT id FROM clients WHERE id = ? LIMIT 1')
        .get(Number(data.client_id));
      if (!clientRow) {
        res.status(400).json({ error: 'Client introuvable pour ce devis.' });
        return;
      }
    }

    const reference: string = (data.reference?.trim()) || getNextQuoteReference();
    const date: string = data.date || new Date().toISOString().split('T')[0];
    const status: string = VALID_STATUSES.includes(data.status) ? data.status : 'draft';
    const clientId: number | null = (!manualMode && data.client_id && Number(data.client_id) !== 0)
      ? Number(data.client_id)
      : null;

    // Prepare statements outside the transaction
    const insertQuote = db.prepare(`
      INSERT INTO quotes (
        reference, client_id, date, status, validity_days, terms,
        manual_client_mode, manual_client_name, manual_client_email,
        manual_client_contact, manual_client_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO quote_items (
        quote_id, item_type, display_type, item_number, designation,
        unit, unit_price, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Use db.transaction() — the correct better-sqlite3 API
    const createTx = db.transaction(() => {
      const result = insertQuote.run(
        reference,
        clientId,
        date,
        status,
        parseNumber(data.validity_days, 30),
        toNullable(data.terms),
        manualMode,
        toNullable(data.manual_client_name),
        toNullable(data.manual_client_email),
        toNullable(data.manual_client_contact),
        toNullable(data.manual_client_phone)
      );

      const quoteId = result.lastInsertRowid;

      if (Array.isArray(data.items) && data.items.length > 0) {
        data.items.forEach((item: any, idx: number) => {
          insertItem.run(
            quoteId,
            VALID_ITEM_TYPES.includes(item.item_type) ? item.item_type : 'main',
            VALID_DISPLAY_TYPES.includes(item.display_type) ? item.display_type : 'quantity',
            item.item_number?.toString() || `${idx + 1}`,
            item.designation?.trim() || '',
            toNullable(item.unit),
            item.unit_price != null ? parseNumber(item.unit_price) : null,
            parseNumber(item.display_order, idx)
          );
        });
      }

      return quoteId;
    });

    const quoteId = createTx();

    // Return the created quote with items
    const createdQuote = db
      .prepare(
        `SELECT q.*, c.name AS client_name, c.code AS client_code
         FROM quotes q
         LEFT JOIN clients c ON q.client_id = c.id
         WHERE q.id = ?`
      )
      .get(quoteId);

    const items = db
      .prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY display_order, id')
      .all(quoteId);

    res.status(201).json({ ...(createdQuote as object), items });

  } catch (error) {
    if (isSQLiteError(error) && error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Cette référence de devis est déjà utilisée.' });
      return;
    }
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── PUT /api/quotes/:id ─────────────────────────────────────────────────────

export const updateQuote = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing: any = db.prepare('SELECT id, manual_client_mode FROM quotes WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    const insertItem = db.prepare(`
      INSERT INTO quote_items (
        quote_id, item_type, display_type, item_number, designation,
        unit, unit_price, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateTx = db.transaction(() => {
      const fields: string[] = [];
      const values: any[] = [];

      if (data.reference !== undefined) { fields.push('reference = ?'); values.push(data.reference); }
      if (data.client_id !== undefined || data.manual_client_mode !== undefined) {
        // If manual mode is active (either already or being set), client_id MUST be null
        const effectiveManualMode = data.manual_client_mode !== undefined ? !!data.manual_client_mode : !!existing.manual_client_mode;
        const targetClientId = effectiveManualMode ? null : (data.client_id && Number(data.client_id) !== 0 ? Number(data.client_id) : null);
        
        fields.push('client_id = ?');
        values.push(targetClientId);
      }
      if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
      if (data.status !== undefined && VALID_STATUSES.includes(data.status)) { fields.push('status = ?'); values.push(data.status); }
      if (data.validity_days !== undefined) { fields.push('validity_days = ?'); values.push(parseNumber(data.validity_days, 30)); }
      if (data.terms !== undefined) { fields.push('terms = ?'); values.push(data.terms); }
      if (data.manual_client_mode !== undefined) { fields.push('manual_client_mode = ?'); values.push(data.manual_client_mode ? 1 : 0); }
      if (data.manual_client_name !== undefined) { fields.push('manual_client_name = ?'); values.push(data.manual_client_name); }
      if (data.manual_client_email !== undefined) { fields.push('manual_client_email = ?'); values.push(data.manual_client_email); }
      if (data.manual_client_contact !== undefined) { fields.push('manual_client_contact = ?'); values.push(data.manual_client_contact); }
      if (data.manual_client_phone !== undefined) { fields.push('manual_client_phone = ?'); values.push(data.manual_client_phone); }

      if (fields.length > 0) {
        values.push(id);
        db.prepare(`UPDATE quotes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      }

      // Replace items if provided
      if (Array.isArray(data.items)) {
        db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(id);

        data.items.forEach((item: any, idx: number) => {
          insertItem.run(
            id,
            VALID_ITEM_TYPES.includes(item.item_type) ? item.item_type : 'main',
            VALID_DISPLAY_TYPES.includes(item.display_type) ? item.display_type : 'quantity',
            item.item_number?.toString() || `${idx + 1}`,
            item.designation?.trim() || '',
            toNullable(item.unit),
            item.unit_price != null ? parseNumber(item.unit_price) : null,
            parseNumber(item.display_order, idx)
          );
        });
      }
    });

    updateTx();

    const updatedQuote = db
      .prepare(
        `SELECT q.*, c.name AS client_name, c.code AS client_code
         FROM quotes q
         LEFT JOIN clients c ON q.client_id = c.id
         WHERE q.id = ?`
      )
      .get(id);

    const items = db
      .prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY display_order, id')
      .all(id);

    res.json({ ...(updatedQuote as object), items });

  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── DELETE /api/quotes/:id ───────────────────────────────────────────────────

export const deleteQuote = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM quotes WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    // quote_items cascade-delete via FK ON DELETE CASCADE
    db.prepare('DELETE FROM quotes WHERE id = ?').run(id);

    res.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('Delete quote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};