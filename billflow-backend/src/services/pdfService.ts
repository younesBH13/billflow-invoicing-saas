import { chromium, Browser, Page } from 'playwright-core';
import path from 'path';

export class PDFService {
    private browser: Browser | null = null;

    /**
     * Initialize browser instance
     */
    private async initBrowser(): Promise<Browser> {
        if (!this.browser) {
            console.log('Launching Playwright Chromium...');
            try {
                this.browser = await chromium.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                });
                console.log('Playwright Chromium launched successfully.');
            } catch (error) {
                console.error('Failed to launch Playwright Chromium:', error);
                throw error;
            }
        }
        return this.browser;
    }

    /**
     * Generate PDF from HTML content
     */
    async generatePDFFromHTML(html: string): Promise<Buffer> {
        const browser = await this.initBrowser();
        const page = await browser.newPage();

        try {
            // Set viewport to A4 dimensions
            await page.setViewportSize({ width: 794, height: 1123 }); // A4 at 96 DPI

            // Load HTML content
            await page.setContent(html, {
                waitUntil: 'networkidle',
            });

            // Wait a bit for any fonts/images to load
            await page.waitForTimeout(500);

            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await page.close();
        }
    }

    /**
     * Close browser instance
     */
    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

// Singleton instance
let pdfServiceInstance: PDFService | null = null;

export const getPDFService = (): PDFService => {
    if (!pdfServiceInstance) {
        pdfServiceInstance = new PDFService();
    }
    return pdfServiceInstance;
};

// Cleanup on process exit
process.on('beforeExit', async () => {
    if (pdfServiceInstance) {
        await pdfServiceInstance.close();
    }
});
