import { Request, Response } from 'express';
import { getPDFService } from '../services/pdfService';

export const generateInvoicePDF = async (req: Request, res: Response): Promise<void> => {
    try {
        const { html } = req.body;

        if (!html || typeof html !== 'string') {
            res.status(400).json({ error: 'Invalid request: HTML content required' });
            return;
        }

        // Generate PDF
        const pdfService = getPDFService();
        const pdfBuffer = await pdfService.generatePDFFromHTML(html);

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="invoice.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF
        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF generation error:', error);

        res.status(500).json({
            error: 'Failed to generate PDF',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
