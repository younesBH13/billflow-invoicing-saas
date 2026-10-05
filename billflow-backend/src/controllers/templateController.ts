import { Request, Response } from 'express';
import { db } from '../config/database';
import { DocumentTemplate, CreateDocumentTemplateRequest } from '../types';

export const getAllTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = db.prepare('SELECT * FROM document_templates ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (error) {
    console.error('Get all templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const template = db.prepare('SELECT * FROM document_templates WHERE id = ?').get(id) as DocumentTemplate | undefined;

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    console.error('Get template by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const templateData: CreateDocumentTemplateRequest = req.body;

    // Start transaction
    db.prepare('BEGIN').run();

    try {
      // If this template is set as default, unset other defaults of the same type
      if (templateData.is_default) {
        db.prepare('UPDATE document_templates SET is_default = 0 WHERE type = ?').run(templateData.type);
      }

      const insertTemplate = db.prepare(`
        INSERT INTO document_templates (name, type, is_default, template_config)
        VALUES (?, ?, ?, ?)
      `);

      const result = insertTemplate.run(
        templateData.name,
        templateData.type,
        templateData.is_default ? 1 : 0,
        JSON.stringify(templateData.template_config)
      );

      // Commit transaction
      db.prepare('COMMIT').run();

      const newTemplateId = result.lastInsertRowid;

      // Get the created template
      const newTemplate = db.prepare('SELECT * FROM document_templates WHERE id = ?').get(newTemplateId) as DocumentTemplate;

      res.status(201).json(newTemplate);
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if template exists
    const existingTemplate = db.prepare(
      'SELECT id, type FROM document_templates WHERE id = ?'
    ).get(id) as { id: number; type: string } | undefined;

    if (!existingTemplate) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    // Start transaction
    db.prepare('BEGIN').run();

    try {
      // If this template is being set as default, unset other defaults of the same type
      if (updates.is_default === true) {
        db.prepare(
          'UPDATE document_templates SET is_default = 0 WHERE type = ? AND id != ?'
        ).run(existingTemplate.type, id);
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];

      const allowedFields = ['name', 'is_default', 'template_config'];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          if (field === 'template_config') {
            updateFields.push(`${field} = ?`);
            updateValues.push(JSON.stringify(updates[field]));
          } else if (field === 'is_default') {
            updateFields.push(`${field} = ?`);
            updateValues.push(updates[field] ? 1 : 0);
          } else {
            updateFields.push(`${field} = ?`);
            updateValues.push(updates[field]);
          }
        }
      }

      if (updateFields.length === 0) {
        db.prepare('ROLLBACK').run();
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      updateValues.push(id);

      db.prepare(`UPDATE document_templates SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

      // Commit transaction
      db.prepare('COMMIT').run();

      // Get updated template
      const updatedTemplate = db.prepare('SELECT * FROM document_templates WHERE id = ?').get(id) as DocumentTemplate;

      res.json(updatedTemplate);
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if template exists
    const existingTemplate = db.prepare('SELECT id FROM document_templates WHERE id = ?').get(id);

    if (!existingTemplate) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    // Delete template
    db.prepare('DELETE FROM document_templates WHERE id = ?').run(id);

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const setDefaultTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isDefault } = req.body;

    // Check if template exists
    const existingTemplate = db.prepare(
      'SELECT id, type FROM document_templates WHERE id = ?'
    ).get(id) as { id: number; type: string } | undefined;

    if (!existingTemplate) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    // Start transaction
    db.prepare('BEGIN').run();

    try {
      if (isDefault) {
        // Unset other defaults of the same type
        db.prepare('UPDATE document_templates SET is_default = 0 WHERE type = ?').run(existingTemplate.type);
      }

      // Set this template's default status
      db.prepare('UPDATE document_templates SET is_default = ? WHERE id = ?').run(isDefault ? 1 : 0, id);

      // Commit transaction
      db.prepare('COMMIT').run();

      // Get updated template
      const updatedTemplate = db.prepare('SELECT * FROM document_templates WHERE id = ?').get(id) as DocumentTemplate;

      res.json(updatedTemplate);
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Set default template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
