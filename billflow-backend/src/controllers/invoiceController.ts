import { Request, Response } from 'express';
import { db, getNextInvoiceNumber, consumeInvoiceNumber } from '../config/database';
import { Invoice, InvoiceLine, User } from '../types';
import { CreateInvoiceRequest, InvoiceLineInput, InvoiceLineType } from '../types/invoice';

interface AuthenticatedRequest extends Request {
  user?: User;
}

const normalizeNumberInput = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').replace(/,/g, '.');
    return Number(normalized);
  }

  return NaN;
};

const parseNumber = (value: unknown, fallback = 0): number => {
  const parsed = normalizeNumberInput(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOptionalNumber = (value: unknown): number | null => {
  const parsed = normalizeNumberInput(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullable = <T>(value: T | undefined): T | null => (value === undefined ? null : value);

const roundTo2 = (num: number) => Math.round(num * 100) / 100;

const formatDateToLocal = (date: any): string => {
  if (!date) return '';
  if (typeof date === 'string') {
    // If already a string, extract just the date part (in case it's a datetime string)
    return date.split('T')[0].split(' ')[0];
  }
  if (date instanceof Date) {
    // Format Date object as YYYY-MM-DD using local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(date);
};

// SQLite error checking
const isSQLiteError = (error: unknown): error is Error & { code?: string } =>
  error instanceof Error && 'code' in error;

const inferLineType = (line: InvoiceLineInput): InvoiceLineType => {
  const allowedTypes: InvoiceLineType[] = ['text', 'text_with_quantity', 'amount'];
  if (line.item_type && allowedTypes.includes(line.item_type)) {
    return line.item_type;
  }

  const quantity = parseNumber(line.quantity, 0);
  const unitPrice = parseNumber(line.unit_price ?? (line as any).unitPrice, 0);
  const amount = parseOptionalNumber(line.amount) ?? parseOptionalNumber((line as any).totalPrice) ?? parseOptionalNumber((line as any).total) ?? 0;

  if (quantity === 0 && unitPrice === 0 && amount === 0) {
    return 'text';
  }

  if ((amount > 0 && quantity === 0) || (amount > 0 && quantity === 1 && unitPrice === 0)) {
    return 'amount';
  }

  return 'text_with_quantity';
};

const normalizeInvoiceLineInput = (
  line: InvoiceLineInput
): {
  itemType: InvoiceLineType;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  totalPrice: number;
} => {
  const itemType = inferLineType(line);

  if (itemType === 'text') {
    return {
      itemType,
      quantity: 0,
      unit: '',
      unitPrice: 0,
      amount: 0,
      totalPrice: 0
    };
  }

  if (itemType === 'amount') {
    const amount = parseNumber(line.amount ?? line.unit_price ?? 0, 0);
    return {
      itemType,
      quantity: 1,
      unit: line.unit ?? 'Unité',
      unitPrice: amount,
      amount,
      totalPrice: amount
    };
  }

  const quantity = parseNumber(line.quantity, 0);
  const unitPrice = parseNumber(line.unit_price ?? (line as any).unitPrice, 0);
  const calculatedTotalPrice = quantity * unitPrice;
  const amount = itemType === 'text_with_quantity' 
    ? calculatedTotalPrice 
    : (parseOptionalNumber(line.amount) ?? parseOptionalNumber((line as any).totalPrice) ?? parseOptionalNumber((line as any).total) ?? calculatedTotalPrice);

  return {
    itemType,
    quantity,
    unit: line.unit ?? 'Unité',
    unitPrice,
    amount,
    totalPrice: amount
  };
};

export const getAllInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = db.prepare(`
      SELECT i.*,
        c.name as client_name,
        c.code as client_code,
        COALESCE(
          (SELECT SUM(
            CASE
              WHEN il.total_price IS NOT NULL AND il.total_price != 0 THEN il.total_price
              WHEN il.amount IS NOT NULL AND il.amount != 0 THEN il.amount
              ELSE COALESCE(il.quantity, 0) * COALESCE(il.unit_price, 0)
            END
          ) FROM invoice_lines il WHERE il.invoice_id = i.id),
          0
        ) as subtotal
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      ORDER BY i.created_at DESC
    `).all();

    res.json(rows);
  } catch (error) {
    console.error('Get all invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get invoice with client info
    const invoiceRow = db.prepare(`
      SELECT i.*, c.name as client_name, c.code as client_code
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.id = ?
    `).get(id) as Invoice | undefined;

    // Get invoice lines
    const linesRows = db.prepare(
      'SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id'
    ).all(id) as InvoiceLine[];

    if (!invoiceRow) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const invoice = {
      id: invoiceRow.id,
      number: invoiceRow.number,
      date: formatDateToLocal(invoiceRow.date),
      type: invoiceRow.type,
      client_id: invoiceRow.client_id,
      amount: invoiceRow.amount,
      advance_amount: invoiceRow.advance_amount,
      timbre_amount: invoiceRow.timbre_amount,
      status: invoiceRow.status,
      payment_method: invoiceRow.payment_method,
      project_name: invoiceRow.project_name,
      affair_number: invoiceRow.affair_number,
      service_prestation: invoiceRow.service_prestation,
      billing_period: invoiceRow.billing_period,
      contract_ref: invoiceRow.contract_ref,
      order_ref: invoiceRow.order_ref,
      observations: invoiceRow.observations,
      tva_rate: invoiceRow.tva_rate,
      ref_convention: invoiceRow.ref_convention,
      tx_remise_percent: invoiceRow.tx_remise_percent,
      tx_retenue_garantie: invoiceRow.tx_retenue_garantie,
      montant_remise: invoiceRow.montant_remise,
      advance_percentage: invoiceRow.advance_percentage,
      company_entity: (invoiceRow as any).company_entity || 'principal',
      client_name: (invoiceRow as any).client_name,
      client_code: (invoiceRow as any).client_code,
      created_at: invoiceRow.created_at,
      updated_at: invoiceRow.updated_at,
      lines: linesRows
    };

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceData: CreateInvoiceRequest = req.body;

    // Ensure the referenced client exists before inserting to avoid FK errors
    const clientRow = db.prepare('SELECT id FROM clients WHERE id = ? LIMIT 1').get(invoiceData.client_id);

    if (!clientRow) {
      res.status(400).json({ error: 'Client introuvable pour cette facture.' });
      return;
    }

    // Generate invoice number if not provided (do not consume counter yet)
    let invoiceNumber = invoiceData.number;
    if (!invoiceNumber) {
      invoiceNumber = getNextInvoiceNumber(invoiceData.type || 'definitive', false);
    }

    const tvaRate = typeof invoiceData.tva_rate === 'number' ? invoiceData.tva_rate : parseNumber(invoiceData.tva_rate, 19);
    const clientId = parseNumber(invoiceData.client_id, 0);
    const amountValue = parseNumber(invoiceData.amount, 0);
    const advanceAmount = parseOptionalNumber((invoiceData as any).advance_amount ?? (invoiceData as any).advance_payment);
    const timbreAmount = parseOptionalNumber((invoiceData as any).timbre_amount);
    const allowedStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
    const requestedStatus =
      typeof invoiceData.status === 'string' ? invoiceData.status : 'pending';
    const statusValue = allowedStatuses.includes(requestedStatus) ? requestedStatus : 'pending';

    // Begin transaction
    db.prepare('BEGIN').run();

    try {
      // Insert invoice
      const insertInvoice = db.prepare(`
        INSERT INTO invoices (
          number, date, type, client_id, amount, subtotal, advance_amount, timbre_amount, status, payment_method,
          project_name, affair_number, service_prestation, billing_period, contract_ref, order_ref,
          observations, tva_rate, ref_contract_n, ref_convention,
          tx_retenue_garantie, tx_remise_percent, montant_remise, advance_percentage, company_entity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // We need to calculate HT *before* we insert the invoice to put it in the column
      let calculatedHT = 0;
      if (invoiceData.lines && invoiceData.lines.length > 0) {
        for (const line of invoiceData.lines) {
          const normalized = normalizeInvoiceLineInput(line);
          calculatedHT += normalized.totalPrice;
        }
      }

      const result = insertInvoice.run(
        invoiceNumber,
        toNullable(invoiceData.date),
        invoiceData.type || 'definitive',
        clientId,
        amountValue,
        calculatedHT,
        advanceAmount,
        timbreAmount,
        statusValue,
        toNullable(invoiceData.payment_method),
        toNullable(invoiceData.project_name),
        toNullable(invoiceData.affair_number),
        toNullable(invoiceData.service_prestation),
        toNullable(invoiceData.billing_period),
        toNullable(invoiceData.contract_ref),
        toNullable(invoiceData.order_ref),
        toNullable(invoiceData.observations),
        tvaRate,
        toNullable(invoiceData.ref_contract_n),
        toNullable(invoiceData.ref_convention),
        parseOptionalNumber(invoiceData.tx_retenue_garantie),
        parseOptionalNumber(invoiceData.tx_remise_percent),
        parseOptionalNumber(invoiceData.montant_remise),
        parseOptionalNumber(invoiceData.advance_percentage),
        invoiceData.company_entity || 'principal'
      );

      const invoiceId = result.lastInsertRowid;


      // Insert invoice lines with item types
      if (invoiceData.lines && invoiceData.lines.length > 0) {
        const insertLine = db.prepare(`
          INSERT INTO invoice_lines (
            invoice_id, item_type, description, quantity, unit, unit_price, amount, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const line of invoiceData.lines) {
          const normalized = normalizeInvoiceLineInput(line);

          insertLine.run(
            invoiceId,
            normalized.itemType,
            line.description?.trim() || '',
            normalized.quantity,
            normalized.unit,
            normalized.unitPrice,
            normalized.amount,
            normalized.totalPrice
          );
        }
      }

      // --- RE-CALCULATE TOTAL TO ENSURE CONSISTENCY ---
      // This ensures that even if frontend sends wrong total, DB is correct.

      const txRemisePercent = parseOptionalNumber(invoiceData.tx_remise_percent);
      const montantRemise = parseOptionalNumber(invoiceData.montant_remise);
      const txRetenueGarantie = parseOptionalNumber(invoiceData.tx_retenue_garantie);
      const advancePercentage = parseOptionalNumber(invoiceData.advance_percentage);
      const advanceAmountParam = parseOptionalNumber((invoiceData as any).advance_amount ?? (invoiceData as any).advance_payment);

      const n = (v?: number | null) => (typeof v === 'number' && !isNaN(v) ? v : 0);

      // 1. Remise
      const remise = n(montantRemise) > 0
        ? n(montantRemise)
        : n(txRemisePercent) > 0
          ? roundTo2(calculatedHT * (n(txRemisePercent) / 100))
          : 0;

      const htAfterRemise = calculatedHT - remise;

      // 2. Retenue (on HT after remise)
      const retenue = n(txRetenueGarantie) > 0
        ? roundTo2(htAfterRemise * (n(txRetenueGarantie) / 100))
        : 0;

      const htAfterRetenue = htAfterRemise - retenue;

      // 3. TVA (Base TVA = HT - RETENUE)
      const baseTva = htAfterRetenue;
      const tva = roundTo2(baseTva * (n(tvaRate) / 100));

      // 4. HT with TVA (Net TTC)
      const htWithTva = baseTva + tva;

      // 5. STANDARD TTC (Before Retention) - Used for Advance calculation
      const tvaStandard = roundTo2(htAfterRemise * (n(tvaRate) / 100));
      const htStandardTTC = htAfterRemise + tvaStandard;

      // 6. Advance (Calculated on HT for Hyundai style)
      const calculatedAdvance = n(advancePercentage) > 0
        ? roundTo2(calculatedHT * (n(advancePercentage) / 100))
        : n(advanceAmountParam);

      // 7. TTC + TIMBRE
      const totalTTCWithTimbre = htWithTva + n(timbreAmount);

      // 8. FINAL NET TO PAY
      const calculatedTTC = totalTTCWithTimbre - calculatedAdvance;

      db.prepare('UPDATE invoices SET amount = ?, subtotal = ?, advance_amount = ? WHERE id = ?').run(
        calculatedTTC,
        calculatedHT,
        calculatedAdvance,
        invoiceId
      );

      // Commit transaction
      db.prepare('COMMIT').run();

      // Consume the invoice number to update the counter
      consumeInvoiceNumber(invoiceData.type || 'definitive', invoiceNumber);

      // Get the created invoice with client info
      const createdInvoice = db.prepare(`
        SELECT i.*, c.name as client_name 
        FROM invoices i 
        JOIN clients c ON i.client_id = c.id 
        WHERE i.id = ?
      `).get(invoiceId) as any;

      // Get invoice lines
      const lines = db.prepare(
        'SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id'
      ).all(invoiceId);

      res.status(201).json({
        ...createdInvoice,
        lines
      });

    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    if (isSQLiteError(error) && error.message.includes('UNIQUE constraint failed')) {
      console.error('Create invoice duplicate number error:', error);
      res.status(409).json({ error: 'Ce numéro de facture est déjà utilisé pour ce type.' });
      return;
    }

    if (isSQLiteError(error) && error.message.includes('FOREIGN KEY constraint failed')) {
      console.error('Create invoice client reference error:', error);
      res.status(400).json({ error: 'Le client sélectionné est introuvable.' });
      return;
    }

    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateInvoice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: Partial<CreateInvoiceRequest> = req.body;
    const allowedStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
    const requestedStatus = (updateData as any).status;

    if (requestedStatus !== undefined) {
      if (typeof requestedStatus !== 'string' || !allowedStatuses.includes(requestedStatus)) {
        res.status(400).json({ error: 'Invalid invoice status' });
        return;
      }
    }

    // Check if invoice exists
    const existingInvoice = db.prepare(
      'SELECT id, number, date, type FROM invoices WHERE id = ?'
    ).get(id) as { id: number; number?: string; date?: any; type?: string } | undefined;

    if (!existingInvoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const isAdmin = req.user?.role === 'admin';

    const existingNumber = existingInvoice.number;
    const existingDate = typeof existingInvoice.date === 'string'
      ? existingInvoice.date.split('T')[0].split(' ')[0]
      : existingInvoice.date;

    const isTypeChanged = updateData.type !== undefined && updateData.type !== existingInvoice.type;

    if (!isAdmin && updateData.number !== undefined && updateData.number !== existingNumber && !isTypeChanged) {
      res.status(403).json({ error: 'Le numéro de facture ne peut plus être modifié après enregistrement.' });
      return;
    }

    if (!isAdmin && updateData.date !== undefined && updateData.date !== existingDate && !isTypeChanged) {
      res.status(403).json({ error: 'La date de facture ne peut plus être modifiée après enregistrement.' });
      return;
    }

    if (
      updateData.number !== undefined &&
      updateData.number !== existingNumber
    ) {
      const targetType = (updateData.type !== undefined ? updateData.type : existingInvoice.type) || 'definitive';
      const duplicateRow = db.prepare(
        'SELECT id FROM invoices WHERE number = ? AND type = ? AND id <> ?'
      ).get(updateData.number, targetType, id);

      if (duplicateRow) {
        res.status(409).json({ error: 'Ce numéro de facture est déjà utilisé par une autre facture de ce type.' });
        return;
      }
      
      // Consume the number so it doesn't get reused in the future
      consumeInvoiceNumber(targetType, updateData.number as string);
    }

    // Begin transaction
    db.prepare('BEGIN').run();

    try {
      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updateData.date !== undefined) {
        updateFields.push('date = ?');
        updateValues.push(updateData.date);
      }
      if (updateData.number !== undefined) {
        updateFields.push('number = ?');
        updateValues.push(updateData.number);
      }
      if (updateData.type !== undefined) {
        updateFields.push('type = ?');
        updateValues.push(updateData.type);
      }
      if (updateData.client_id !== undefined) {
        updateFields.push('client_id = ?');
        updateValues.push(parseNumber(updateData.client_id, 0));
      }
      if (updateData.amount !== undefined) {
        updateFields.push('amount = ?');
        updateValues.push(parseNumber(updateData.amount, 0));
      }
      if ((updateData as any).advance_amount !== undefined || (updateData as any).advance_payment !== undefined) {
        updateFields.push('advance_amount = ?');
        updateValues.push(parseOptionalNumber((updateData as any).advance_amount ?? (updateData as any).advance_payment));
      }
      if ((updateData as any).timbre_amount !== undefined) {
        updateFields.push('timbre_amount = ?');
        updateValues.push(parseOptionalNumber((updateData as any).timbre_amount));
      }
      if (requestedStatus !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(requestedStatus);
      }
      if (updateData.payment_method !== undefined) {
        updateFields.push('payment_method = ?');
        updateValues.push(updateData.payment_method);
      }
      if (updateData.project_name !== undefined) {
        updateFields.push('project_name = ?');
        updateValues.push(updateData.project_name);
      }
      if (updateData.affair_number !== undefined) {
        updateFields.push('affair_number = ?');
        updateValues.push(updateData.affair_number);
      }
      if (updateData.service_prestation !== undefined) {
        updateFields.push('service_prestation = ?');
        updateValues.push(updateData.service_prestation);
      }
      if (updateData.billing_period !== undefined) {
        updateFields.push('billing_period = ?');
        updateValues.push(updateData.billing_period);
      }
      if (updateData.contract_ref !== undefined) {
        updateFields.push('contract_ref = ?');
        updateValues.push(updateData.contract_ref);
      }
      if (updateData.order_ref !== undefined) {
        updateFields.push('order_ref = ?');
        updateValues.push(updateData.order_ref);
      }
      if (updateData.observations !== undefined) {
        updateFields.push('observations = ?');
        updateValues.push(updateData.observations);
      }
      if (updateData.tva_rate !== undefined) {
        updateFields.push('tva_rate = ?');
        updateValues.push(parseNumber(updateData.tva_rate, 0));
      }
      if (updateData.ref_contract_n !== undefined) {
        updateFields.push('ref_contract_n = ?');
        updateValues.push(updateData.ref_contract_n);
      }
      if (updateData.ref_convention !== undefined) {
        updateFields.push('ref_convention = ?');
        updateValues.push(updateData.ref_convention);
      }
      if (updateData.tx_retenue_garantie !== undefined) {
        updateFields.push('tx_retenue_garantie = ?');
        updateValues.push(parseNumber(updateData.tx_retenue_garantie, 0));
      }
      if (updateData.tx_remise_percent !== undefined) {
        updateFields.push('tx_remise_percent = ?');
        updateValues.push(parseNumber(updateData.tx_remise_percent, 0));
      }
      if (updateData.montant_remise !== undefined) {
        updateFields.push('montant_remise = ?');
        updateValues.push(parseNumber(updateData.montant_remise, 0));
      }
      if (updateData.advance_percentage !== undefined) {
        updateFields.push('advance_percentage = ?');
        updateValues.push(parseOptionalNumber(updateData.advance_percentage));
      }
      if (updateData.company_entity !== undefined) {
        updateFields.push('company_entity = ?');
        updateValues.push(updateData.company_entity === 'secondary' ? 'secondary' : 'principal');
      }

      if (updateFields.length === 0 && !updateData.lines) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      // Update invoice fields if any
      if (updateFields.length > 0) {
        updateValues.push(id);
        db.prepare(
          `UPDATE invoices SET ${updateFields.join(', ')} WHERE id = ?`
        ).run(...updateValues);
      }


      // Update invoice lines if provided
      if (updateData.lines) {
        // Delete existing lines
        db.prepare('DELETE FROM invoice_lines WHERE invoice_id = ?').run(id);

        // Insert new lines and calculate total
        const insertLine = db.prepare(`
          INSERT INTO invoice_lines (
            invoice_id, item_type, description, quantity, unit, unit_price, amount, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Calculate subtotal from new lines
        let calculatedHT = 0;
        for (const line of updateData.lines) {
          const normalized = normalizeInvoiceLineInput(line);

          insertLine.run(
            id,
            normalized.itemType,
            line.description?.trim() || '',
            normalized.quantity,
            normalized.unit,
            normalized.unitPrice,
            normalized.amount,
            normalized.totalPrice
          );

          calculatedHT += normalized.totalPrice;
        }

        // Fetch current invoice parameters for calculation
        // We prioritize values from updateData if they exist, otherwise fetch from DB
        const currentInvoice = db.prepare(`
          SELECT 
            tva_rate, 
            tx_remise_percent, 
            montant_remise, 
            tx_retenue_garantie 
          FROM invoices WHERE id = ?
        `).get(id) as any;

        const tvaRate = updateData.tva_rate !== undefined
          ? parseNumber(updateData.tva_rate, 0)
          : (currentInvoice?.tva_rate || 0);

        const txRemisePercent = updateData.tx_remise_percent !== undefined
          ? parseOptionalNumber(updateData.tx_remise_percent)
          : currentInvoice?.tx_remise_percent;

        const montantRemise = updateData.montant_remise !== undefined
          ? parseOptionalNumber(updateData.montant_remise)
          : currentInvoice?.montant_remise;

        const txRetenueGarantie = updateData.tx_retenue_garantie !== undefined
          ? parseOptionalNumber(updateData.tx_retenue_garantie)
          : currentInvoice?.tx_retenue_garantie;

        // --- CALCULATE TOTALS (Mirroring frontend logic) ---
        const n = (v?: number | null) => (typeof v === 'number' && !isNaN(v) ? v : 0);

        // 1. Remise
        const remise = n(montantRemise) > 0
          ? n(montantRemise)
          : n(txRemisePercent) > 0
            ? roundTo2(calculatedHT * (n(txRemisePercent) / 100))
            : 0;

        const htAfterRemise = calculatedHT - remise;

        // 2. Retenue (on HT after remise)
        const retenue = n(txRetenueGarantie) > 0
          ? roundTo2(htAfterRemise * (n(txRetenueGarantie) / 100))
          : 0;

        const htAfterRetenue = htAfterRemise - retenue;

        // 3. TVA (on HT after retenue)
        const tvaAmount = roundTo2(htAfterRetenue * (n(tvaRate) / 100));

        // 4. Total TTC (Base)
        const calculatedTTC = htAfterRetenue + tvaAmount;

        // Update the invoice amount with Correct TTC
        // db.prepare('UPDATE invoices SET amount = ? WHERE id = ?').run(calculatedTTC, id);
      }

      // --- ALWAYS RE-CALCULATE TOTAL TO ENSURE CONSISTENCY ---
      // Even if lines didn't change, other params (tva, remise) might have.

      // 1. Get lines (either from updateData or DB)
      let linesForCalc: any[] = [];
      if (updateData.lines) {
        linesForCalc = updateData.lines.map(l => normalizeInvoiceLineInput(l));
      } else {
        const dbLines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(id) as any[];
        linesForCalc = dbLines.map(l => ({
          totalPrice: l.total_price
        }));
      }

      const calculatedHT = linesForCalc.reduce((sum, line) => sum + line.totalPrice, 0);

      // 2. Get params (prioritize updateData, fallback to DB)
      // We need to fetch current values if not in updateData
      const currentInvoiceState = db.prepare(`
        SELECT 
          tva_rate, 
          tx_remise_percent, 
          montant_remise, 
          tx_retenue_garantie 
        FROM invoices WHERE id = ?
      `).get(id) as any;

      const tvaRate = updateData.tva_rate !== undefined
        ? parseNumber(updateData.tva_rate, 0)
        : (currentInvoiceState?.tva_rate || 0);

      const txRemisePercent = updateData.tx_remise_percent !== undefined
        ? parseOptionalNumber(updateData.tx_remise_percent)
        : currentInvoiceState?.tx_remise_percent;

      const montantRemise = updateData.montant_remise !== undefined
        ? parseOptionalNumber(updateData.montant_remise)
        : currentInvoiceState?.montant_remise;

      const txRetenueGarantie = updateData.tx_retenue_garantie !== undefined
        ? parseOptionalNumber(updateData.tx_retenue_garantie)
        : currentInvoiceState?.tx_retenue_garantie;

      // 3. Calc Total TTC
      const n = (v?: number | null) => (typeof v === 'number' && !isNaN(v) ? v : 0);

      const remise = n(montantRemise) > 0
        ? n(montantRemise)
        : n(txRemisePercent) > 0
          ? roundTo2(calculatedHT * (n(txRemisePercent) / 100))
          : 0;

      const htAfterRemise = calculatedHT - remise;

      const retenue = n(txRetenueGarantie) > 0
        ? roundTo2(htAfterRemise * (n(txRetenueGarantie) / 100))
        : 0;

      const htAfterRetenue = htAfterRemise - retenue;

      const baseTva = htAfterRetenue;
      const tva = roundTo2(baseTva * (n(tvaRate) / 100));
      const htWithTva = baseTva + tva;

      const tvaStandard = roundTo2(htAfterRemise * (n(tvaRate) / 100));
      const htStandardTTC = htAfterRemise + tvaStandard;

      const advancePercentage = updateData.advance_percentage !== undefined
        ? parseOptionalNumber(updateData.advance_percentage)
        : currentInvoiceState?.advance_percentage;

      const advanceAmountParam = (updateData as any).advance_amount !== undefined
        ? parseOptionalNumber((updateData as any).advance_amount)
        : (updateData as any).advance_payment !== undefined
          ? parseOptionalNumber((updateData as any).advance_payment)
          : currentInvoiceState?.advance_amount;

      const calculatedAdvance = n(advancePercentage) > 0
        ? roundTo2(calculatedHT * (n(advancePercentage) / 100))
        : n(advanceAmountParam);

      const timbreAmountFixed = (updateData as any).timbre_amount !== undefined
        ? parseOptionalNumber((updateData as any).timbre_amount)
        : currentInvoiceState?.timbre_amount;

      const totalTTCWithTimbre = htWithTva + n(timbreAmountFixed);
      const calculatedTTC = totalTTCWithTimbre - calculatedAdvance;

      // Update amount, subtotal and advance_amount
      db.prepare('UPDATE invoices SET amount = ?, subtotal = ?, advance_amount = ? WHERE id = ?').run(
        calculatedTTC,
        calculatedHT,
        calculatedAdvance,
        id
      );

      // Commit transaction
      db.prepare('COMMIT').run();

      // Get updated invoice with client info
      const updatedInvoice = db.prepare(`
        SELECT i.*, c.name as client_name, c.code as client_code
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        WHERE i.id = ?
      `).get(id) as any;

      // Get invoice lines
      const lines = db.prepare(
        'SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id'
      ).all(id);

      res.json({
        ...updatedInvoice,
        lines
      });

    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if invoice exists
    const existingRow = db.prepare('SELECT id FROM invoices WHERE id = ?').get(id);

    if (!existingRow) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Delete invoice (lines will be deleted automatically due to CASCADE)
    db.prepare('DELETE FROM invoices WHERE id = ?').run(id);

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const convertInvoiceType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newType } = req.body;

    if (!['proforma', 'definitive', 'credit_note'].includes(newType)) {
      res.status(400).json({ error: 'Invalid invoice type' });
      return;
    }

    // Get current invoice
    const existingRow = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);

    if (!existingRow) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Generate new invoice number for the new type (do not consume yet)
    const newNumber = getNextInvoiceNumber(newType, false);
    const today = new Date().toISOString().split('T')[0];

    // Update invoice type, number and date (as requested: "day that it was switched at")
    db.prepare(
      'UPDATE invoices SET type = ?, number = ?, date = ? WHERE id = ?'
    ).run(newType, newNumber, today, id);

    // Explicitly consume the new invoice number
    consumeInvoiceNumber(newType, newNumber);

    // Get updated invoice with client info
    const updatedInvoice = db.prepare(`
      SELECT i.*, c.name as client_name 
      FROM invoices i 
      JOIN clients c ON i.client_id = c.id 
      WHERE i.id = ?
    `).get(id) as any;

    // Get invoice lines
    const lines = db.prepare(
      'SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id'
    ).all(id);

    res.json({
      ...updatedInvoice,
      lines
    });
  } catch (error) {
    console.error('Convert invoice type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNextInvoiceNumberEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;

    if (!['proforma', 'definitive', 'credit_note'].includes(type)) {
      res.status(400).json({ error: 'Invalid invoice type' });
      return;
    }

    const nextNumber = getNextInvoiceNumber(type);
    res.json({ nextNumber });
  } catch (error) {
    console.error('Get next invoice number error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
