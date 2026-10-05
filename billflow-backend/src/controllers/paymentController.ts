import { Request, Response } from 'express';
import { db } from '../config/database';
import { Payment, CreatePaymentRequest } from '../types';

export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = db.prepare(`
      SELECT p.*, i.number as invoice_number, c.name as client_name 
      FROM payments p 
      JOIN invoices i ON p.invoice_id = i.id 
      JOIN clients c ON i.client_id = c.id 
      ORDER BY p.created_at DESC
    `).all();

    res.json(rows);
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPaymentsByInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    const rows = db.prepare(
      'SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC'
    ).all(invoiceId);

    res.json(rows);
  } catch (error) {
    console.error('Get payments by invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentData: CreatePaymentRequest = req.body;

    // Check if invoice exists
    const invoice = db.prepare(
      'SELECT id, amount, status FROM invoices WHERE id = ?'
    ).get(paymentData.invoice_id) as { id: number; amount: number; status: string } | undefined;

    if (!invoice) {
      res.status(400).json({ error: 'Invoice not found' });
      return;
    }

    // Start transaction
    db.prepare('BEGIN').run();

    try {
      // Insert payment
      const insertPayment = db.prepare(`
        INSERT INTO payments (invoice_id, amount, date, method, reference, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = insertPayment.run(
        paymentData.invoice_id,
        paymentData.amount,
        paymentData.date,
        paymentData.method,
        paymentData.reference || null,
        paymentData.notes || null
      );

      const newPaymentId = result.lastInsertRowid;

      // Calculate total payments for this invoice
      const totalPaidRow = db.prepare(
        'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE invoice_id = ?'
      ).get(paymentData.invoice_id) as { total_paid: number };

      const totalPaid = totalPaidRow.total_paid;

      // Update invoice status if fully paid
      if (totalPaid >= invoice.amount) {
        db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run('paid', paymentData.invoice_id);
      }

      // Commit transaction
      db.prepare('COMMIT').run();

      // Get the created payment with related info
      const newPayment = db.prepare(`
        SELECT p.*, i.number as invoice_number, c.name as client_name 
        FROM payments p 
        JOIN invoices i ON p.invoice_id = i.id 
        JOIN clients c ON i.client_id = c.id 
        WHERE p.id = ?
      `).get(newPaymentId);

      res.status(201).json(newPayment);
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if payment exists
    const existingPayment = db.prepare(
      'SELECT id, invoice_id FROM payments WHERE id = ?'
    ).get(id) as { id: number; invoice_id: number } | undefined;

    if (!existingPayment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    const allowedFields = ['amount', 'date', 'method', 'reference', 'notes'];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    updateValues.push(id);

    // Start transaction
    db.prepare('BEGIN').run();

    try {
      // Update payment
      db.prepare(`UPDATE payments SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

      // Recalculate invoice status if amount was updated
      if (updates.amount !== undefined) {
        const invoice = db.prepare(
          'SELECT amount FROM invoices WHERE id = ?'
        ).get(existingPayment.invoice_id) as { amount: number };

        const totalPaidRow = db.prepare(
          'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE invoice_id = ?'
        ).get(existingPayment.invoice_id) as { total_paid: number };

        const totalPaid = totalPaidRow.total_paid;
        const newStatus = totalPaid >= invoice.amount ? 'paid' : 'pending';

        db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(newStatus, existingPayment.invoice_id);
      }

      // Commit transaction
      db.prepare('COMMIT').run();

      // Get updated payment with related info
      const updatedPayment = db.prepare(`
        SELECT p.*, i.number as invoice_number, c.name as client_name 
        FROM payments p 
        JOIN invoices i ON p.invoice_id = i.id 
        JOIN clients c ON i.client_id = c.id 
        WHERE p.id = ?
      `).get(id);

      res.json(updatedPayment);
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if payment exists and get invoice_id
    const existingPayment = db.prepare(
      'SELECT id, invoice_id FROM payments WHERE id = ?'
    ).get(id) as { id: number; invoice_id: number } | undefined;

    if (!existingPayment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    // Start transaction
    db.prepare('BEGIN').run();

    try {
      // Delete payment
      db.prepare('DELETE FROM payments WHERE id = ?').run(id);

      // Recalculate invoice status
      const invoice = db.prepare(
        'SELECT amount FROM invoices WHERE id = ?'
      ).get(existingPayment.invoice_id) as { amount: number };

      const totalPaidRow = db.prepare(
        'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE invoice_id = ?'
      ).get(existingPayment.invoice_id) as { total_paid: number };

      const totalPaid = totalPaidRow.total_paid;
      const newStatus = totalPaid >= invoice.amount ? 'paid' : 'pending';

      db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(newStatus, existingPayment.invoice_id);

      // Commit transaction
      db.prepare('COMMIT').run();

      res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
