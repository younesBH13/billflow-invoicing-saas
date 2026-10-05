import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const normalizeNumericString = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/\s+/g, '').replace(/,/g, '.');
};

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  next();
};

export const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

export const validateClient = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name is required and must be less than 255 characters'),
  body('type')
    .isIn(['local', 'foreign'])
    .withMessage('Type must be either local or foreign'),
  body('classification')
    .isIn(['new', 'recurring', 'good', 'very_good'])
    .withMessage('Classification must be one of: new, recurring, good, very_good'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('phone')
    .optional({ checkFalsy: true })
    .isLength({ max: 50 })
    .withMessage('Phone must be less than 50 characters'),
  body('revenue')
    .optional({ checkFalsy: true })
    .customSanitizer(normalizeNumericString)
    .isNumeric()
    .withMessage('Revenue must be a number'),
  body('tva_rate')
    .optional({ checkFalsy: true })
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0, max: 100 })
    .withMessage('TVA rate must be between 0 and 100'),
  body('has_tva')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('has_tva must be a boolean'),
  body('article_imposition')
    .optional({ checkFalsy: true })
    .isLength({ max: 255 })
    .withMessage('Article d\'imposition must be less than 255 characters'),
  body('matricule_fiscale')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('Matricule fiscale must be less than 100 characters'),
  body('registre_commerce')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('Registre commerce must be less than 100 characters'),
  body('nom_contact')
    .optional({ checkFalsy: true })
    .isLength({ max: 255 })
    .withMessage('Nom du contact must be less than 255 characters'),
  body('tel_fixe')
    .optional({ checkFalsy: true })
    .isLength({ max: 50 })
    .withMessage('Téléphone fixe must be less than 50 characters'),
  body('tel_mobile')
    .optional({ checkFalsy: true })
    .isLength({ max: 50 })
    .withMessage('Téléphone mobile must be less than 50 characters'),
  body('fax')
    .optional({ checkFalsy: true })
    .isLength({ max: 50 })
    .withMessage('Fax must be less than 50 characters'),
  handleValidationErrors
];

export const validateInvoice = [
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('type')
    .isIn(['proforma', 'definitive', 'credit_note'])
    .withMessage('Type must be one of: proforma, definitive, credit_note'),
  body('client_id')
    .isInt({ min: 1 })
    .withMessage('Client ID must be a positive integer'),
  body('amount')
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('lines')
    .optional()
    .isArray()
    .withMessage('Lines must be an array'),
  body('lines.*.description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Line description is required'),
  body('lines.*.quantity')
    .optional()
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0 })
    .withMessage('Line quantity must be a positive number'),
  body('lines.*.unit_price')
    .optional()
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0 })
    .withMessage('Line unit price must be a positive number'),
  body('lines.*.item_type')
    .optional()
    .isIn(['text', 'text_with_quantity', 'amount'])
    .withMessage('Line item type must be one of: text, text_with_quantity, amount'),
  body('lines.*.amount')
    .optional()
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0 })
    .withMessage('Line amount must be a positive number'),
  body('service_prestation')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Service prestation must be less than 255 characters'),
  body('ref_contract_n')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Ref contract N must be less than 100 characters'),
  body('ref_convention')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Ref convention must be less than 100 characters'),
  body('tx_retenue_garantie')
    .optional()
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tx retenue garantie must be between 0 and 100'),
  body('tx_remise_percent')
    .optional()
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tx remise percent must be between 0 and 100'),
  body('montant_remise')
    .optional()
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0 })
    .withMessage('Montant remise must be a positive number'),
  body('tva_rate')
    .optional()
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0, max: 100 })
    .withMessage('TVA rate must be between 0 and 100'),
  body('advance_amount')
    .optional()
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0 })
    .withMessage('Advance amount must be a positive number'),
  body('timbre_amount')
    .optional()
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0 })
    .withMessage('Timbre amount must be a positive number'),
  handleValidationErrors
];

export const validatePayment = [
  body('invoice_id')
    .isInt({ min: 1 })
    .withMessage('Invoice ID must be a positive integer'),
  body('amount')
    .customSanitizer(normalizeNumericString)
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('method')
    .isIn(['cash', 'bank_transfer', 'check', 'card', 'other'])
    .withMessage('Method must be one of: cash, bank_transfer, check, card, other'),
  handleValidationErrors
];

export const validateDeliveryNote = [
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('client_id')
    .isInt({ min: 1 })
    .withMessage('Client ID must be a positive integer'),
  body('designation')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Designation is required'),
  handleValidationErrors
];

export const validateDocumentTemplate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name is required and must be less than 255 characters'),
  body('type')
    .isIn(['invoice', 'quote', 'delivery_note'])
    .withMessage('Type must be one of: invoice, quote, delivery_note'),
  body('template_config')
    .isObject()
    .withMessage('Template config must be an object'),
  handleValidationErrors
];

