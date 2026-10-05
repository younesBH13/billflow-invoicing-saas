import { Request, Response } from 'express';
import { db } from '../config/database';
import { DeliveryNote, CreateDeliveryNoteRequest } from '../types';

export const getAllDeliveryNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = db.prepare(`
      SELECT d.*, c.name as client_name 
      FROM delivery_notes d 
      JOIN clients c ON d.client_id = c.id 
      ORDER BY d.created_at DESC
    `).all();

    res.json(rows);
  } catch (error) {
    console.error('Get all delivery notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDeliveryNoteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deliveryNote = db.prepare(`
      SELECT d.*, c.name as client_name 
      FROM delivery_notes d 
      JOIN clients c ON d.client_id = c.id 
      WHERE d.id = ?
    `).get(id);

    if (!deliveryNote) {
      res.status(404).json({ error: 'Delivery note not found' });
      return;
    }

    res.json(deliveryNote);
  } catch (error) {
    console.error('Get delivery note by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createDeliveryNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const deliveryNoteData: CreateDeliveryNoteRequest = req.body;

    // Check if client exists
    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(deliveryNoteData.client_id);

    if (!client) {
      res.status(400).json({ error: 'Client not found' });
      return;
    }

    // Generate next delivery note number
    const now = new Date();
    const year = now.getFullYear();

    const maxNumberRow = db.prepare(
      "SELECT MAX(CAST(substr(number, 7) AS INTEGER)) as max_number FROM delivery_notes WHERE number LIKE ?"
    ).get(`BL${year}%`) as { max_number: number | null } | undefined;

    const maxNumber = maxNumberRow?.max_number || 0;
    const nextNumber = `BL${year}${(maxNumber + 1).toString().padStart(3, '0')}`;

    const insertDeliveryNote = db.prepare(`
      INSERT INTO delivery_notes (number, date, client_id, designation, observations)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insertDeliveryNote.run(
      nextNumber,
      deliveryNoteData.date,
      deliveryNoteData.client_id,
      deliveryNoteData.designation,
      deliveryNoteData.observations || null
    );

    const newDeliveryNoteId = result.lastInsertRowid;

    // Get the created delivery note with client info
    const newDeliveryNote = db.prepare(`
      SELECT d.*, c.name as client_name 
      FROM delivery_notes d 
      JOIN clients c ON d.client_id = c.id 
      WHERE d.id = ?
    `).get(newDeliveryNoteId);

    res.status(201).json(newDeliveryNote);
  } catch (error) {
    console.error('Create delivery note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDeliveryNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if delivery note exists
    const existingDeliveryNote = db.prepare('SELECT id FROM delivery_notes WHERE id = ?').get(id);

    if (!existingDeliveryNote) {
      res.status(404).json({ error: 'Delivery note not found' });
      return;
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    const allowedFields = ['date', 'client_id', 'designation', 'observations'];

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

    db.prepare(`UPDATE delivery_notes SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

    // Get updated delivery note with client info
    const updatedDeliveryNote = db.prepare(`
      SELECT d.*, c.name as client_name 
      FROM delivery_notes d 
      JOIN clients c ON d.client_id = c.id 
      WHERE d.id = ?
    `).get(id);

    res.json(updatedDeliveryNote);
  } catch (error) {
    console.error('Update delivery note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDeliveryNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if delivery note exists
    const existingDeliveryNote = db.prepare('SELECT id FROM delivery_notes WHERE id = ?').get(id);

    if (!existingDeliveryNote) {
      res.status(404).json({ error: 'Delivery note not found' });
      return;
    }

    // Delete delivery note
    db.prepare('DELETE FROM delivery_notes WHERE id = ?').run(id);

    res.json({ message: 'Delivery note deleted successfully' });
  } catch (error) {
    console.error('Delete delivery note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
