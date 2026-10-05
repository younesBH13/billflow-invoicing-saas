import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download, Eye } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import type { InvoiceTemplateData } from './InvoiceTemplate';

interface InvoicePreviewProps {
  invoiceData: InvoiceTemplateData;
  onPrint?: () => void;
  onDownload?: () => void;
  onEdit?: () => void;
  autoDownload?: boolean;
  onDownloadComplete?: () => void;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoiceData,
  onPrint,
  onDownload,
  onEdit,
  autoDownload = false,
  onDownloadComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Facture ${invoiceData?.invoiceNumber || ''}`;
    window.print();
    document.title = originalTitle;
    onPrint?.();
  };

  const handleDownloadPDF = async (): Promise<boolean> => {
    if (!containerRef.current || isDownloading) return false;

    setIsDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();   // 210
      const pageElements = Array.from(
        containerRef.current.querySelectorAll('.invoice-print-page')
      ) as HTMLElement[];

      if (pageElements.length === 0) {
        alert("Erreur: impossible de trouver l'élément .invoice-print-page");
        return false;
      }

      for (const [index, pageEl] of pageElements.entries()) {
        // ✅ Critical fix: compensate scroll instead of forcing scrollY=0
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          width: pageEl.offsetWidth,
          height: pageEl.offsetHeight,
          windowWidth: document.documentElement.clientWidth,
          windowHeight: document.documentElement.clientHeight,
          onclone: (clonedDoc) => {
            // Avoid transforms / zoom breaking layout in the PDF capture
            const el = clonedDoc.querySelector('.invoice-print-page') as HTMLElement | null;
            if (el) {
              el.style.transform = 'none';
              el.style.zoom = '1';
            }
          },
        });

        const imgData = canvas.toDataURL('image/png');

        // ✅ Keep aspect ratio (prevents content being pushed)
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (index > 0) pdf.addPage();

        // ✅ Top-align in PDF
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      const filename = `Facture-${invoiceData?.invoiceNumber || 'document'}.pdf`;
      pdf.save(filename);

      onDownload?.();
      return true;
    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
      alert('La génération du PDF a échoué. Veuillez réessayer.');
      return false;
    } finally {
      setIsDownloading(false);
    }
  };


  useEffect(() => {
    if (!autoDownload) {
      setHasAutoDownloaded(false);
      return;
    }

    if (autoDownload && !hasAutoDownloaded) {
      void (async () => {
        const success = await handleDownloadPDF();
        setHasAutoDownloaded(true);
        if (success) onDownloadComplete?.();
      })();
    }
  }, [autoDownload, hasAutoDownloaded]);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Aperçu de la Facture
            </span>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Modifier
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isDownloading ? 'Génération…' : 'PDF'}
              </Button>

              <Button size="sm" onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            Facture N° {invoiceData?.invoiceNumber} - {invoiceData?.client?.name}
          </div>
        </CardContent>
      </Card>

      {/* IMPORTANT: do NOT wrap an extra A4 here */}
      <div ref={containerRef}>
        <InvoiceTemplate data={invoiceData} />
      </div>

      {/* Print styles */}
      <style>{`
        @page { size: auto; margin: 0mm; }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide everything in body */
          body * { visibility: hidden; }

          /* Show only the print container and its children */
          #printable-invoice-container, 
          #printable-invoice-container * { 
            visibility: visible; 
          }

          /* Position the print container */
          #printable-invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            overflow: hidden; /* Force single page */
          }

          .invoice-print-page {
            box-sizing: border-box !important;
            page-break-after: always;
          }

          .invoice-print-page:last-child {
            page-break-after: auto !important;
          }

          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default InvoicePreview;
