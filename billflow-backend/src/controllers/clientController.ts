import { Request, Response } from 'express';
import { db } from '../config/database';
import { Client, CreateClientRequest } from '../types';

export const getAllClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (error) {
    console.error('Get all clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined;

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    res.json(client);
  } catch (error) {
    console.error('Get client by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientData: CreateClientRequest = req.body;

    // Get max code for auto-increment (used as fallback if no code provided)
    const maxCodeRow = db.prepare(
      'SELECT MAX(CAST(code AS INTEGER)) as max_code FROM clients'
    ).get() as { max_code: number | null } | undefined;

    const maxCode = maxCodeRow?.max_code || 0;
    const autoCode = (maxCode + 1).toString().padStart(3, '0');
    // Use the manually provided code if present, otherwise auto-generate
    const nextCode = (clientData.code && clientData.code.toString().trim() !== '') ? clientData.code.toString().trim() : autoCode;

    const insert = db.prepare(`
      INSERT INTO clients (
        code,
        name,
        type,
        classification,
        email,
        phone,
        address,
        siret,
        revenue,
        tva_rate,
        has_tva,
        article_imposition,
        matricule_fiscale,
        registre_commerce,
        nom_contact,
        tel_fixe,
        tel_mobile,
        fax,
        fiscal_id,
        commerce_registry,
        tax_article,
        nis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      nextCode,
      clientData.name,
      clientData.type,
      clientData.classification,
      clientData.email || null,
      clientData.phone || null,
      clientData.address || null,
      clientData.siret || null,
      clientData.revenue || 0,
      clientData.tva_rate || 19.0,
      clientData.has_tva !== undefined ? (clientData.has_tva ? 1 : 0) : 1,
      clientData.article_imposition || null,
      clientData.matricule_fiscale || null,
      clientData.registre_commerce || null,
      clientData.nom_contact || null,
      clientData.tel_fixe || null,
      clientData.tel_mobile || null,
      clientData.fax || null,
      clientData.fiscal_id || null,
      clientData.commerce_registry || null,
      clientData.tax_article || null,
      clientData.nis || null
    );

    const newClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid) as Client;
    res.status(201).json(newClient);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingClient = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);

    if (!existingClient) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    const allowedFields = [
      'code',
      'name',
      'type',
      'classification',
      'email',
      'phone',
      'address',
      'siret',
      'revenue',
      'tva_rate',
      'has_tva',
      'article_imposition',
      'matricule_fiscale',
      'registre_commerce',
      'nom_contact',
      'tel_fixe',
      'tel_mobile',
      'fax',
      'fiscal_id',
      'commerce_registry',
      'tax_article',
      'nis'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        // Convert boolean to integer for has_tva
        updateValues.push(field === 'has_tva' ? (updates[field] ? 1 : 0) : updates[field]);
      }
    }

    if (updateFields.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    updateValues.push(id);

    db.prepare(`UPDATE clients SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

    const updatedClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client;
    res.json(updatedClient);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingClient = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);

    if (!existingClient) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    db.prepare('DELETE FROM clients WHERE id = ?').run(id);

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const invoiceStats = db.prepare(`
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(AVG(amount), 0) as average_invoice_amount,
        MAX(date) as last_invoice_date,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
      FROM invoices WHERE client_id = ?
    `).get(id) as any;

    const paymentStats = db.prepare(`
      SELECT
        COALESCE(SUM(p.amount), 0) as total_paid,
        GROUP_CONCAT(DISTINCT p.method) as payment_methods
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.client_id = ?
    `).get(id) as any;

    const statistics = {
      total_invoices: invoiceStats.total_invoices || 0,
      total_revenue: invoiceStats.total_revenue || 0,
      total_paid: paymentStats.total_paid || 0,
      average_invoice_amount: invoiceStats.average_invoice_amount || 0,
      last_invoice_date: invoiceStats.last_invoice_date,
      payment_methods: paymentStats.payment_methods ? paymentStats.payment_methods.split(',') : [],
      overdue: invoiceStats.overdue_count || 0
    };

    res.json(statistics);
  } catch (error) {
    console.error('Get client statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
