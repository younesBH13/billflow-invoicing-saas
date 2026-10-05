import { Router } from 'express';
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate
} from '../controllers/templateController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateDocumentTemplate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/templates - Get all document templates
router.get('/', getAllTemplates);

// GET /api/templates/:id - Get specific template
router.get('/:id', getTemplateById);

// POST /api/templates - Create new template
router.post('/', validateDocumentTemplate, createTemplate);

// PUT /api/templates/:id - Update template
router.put('/:id', updateTemplate);

// PUT /api/templates/:id/set-default - Set template as default
router.put('/:id/set-default', setDefaultTemplate);

// DELETE /api/templates/:id - Delete template (admin only)
router.delete('/:id', requireRole(['admin']), deleteTemplate);

export default router;

