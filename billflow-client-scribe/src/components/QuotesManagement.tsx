import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Trash2, Copy, Download, Printer, Pencil } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

import QuoteForm from './quotes/QuoteForm';
import QuoteTemplate from './quotes/QuoteTemplate';
import { apiService } from '@/services/api';

export const QuotesManagement = () => {
    const { quotes, addQuote, deleteQuote, currentUser } = useApp();
    const { toast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false); // Track if we are editing
    const [printQuote, setPrintQuote] = useState<any>(null); // State for native print
    const printRef = useRef<HTMLDivElement>(null);

    // Handle native print side effects
    useEffect(() => {
        if (printQuote) {
            // Document title for the PDF filename
            const originalTitle = document.title;
            document.title = `Offre_${printQuote.reference.replace(/\//g, '-')}`;

            // Allow time for render then print
            const timer = setTimeout(() => {
                window.print();
                // We rely on the user to interact with the print dialog. 
                // In many browsers, window.print() is blocking, so this runs after close.
                // In others, we might need a cleanup button, but for now we auto-close.
                setPrintQuote(null);
                document.title = originalTitle;
            }, 500);

            return () => {
                clearTimeout(timer);
                document.title = originalTitle;
            };
        }
    }, [printQuote]);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            draft: 'bg-gray-500',
            sent: 'bg-blue-500',
            accepted: 'bg-green-500',
            rejected: 'bg-red-500',
            expired: 'bg-orange-500',
        };
        return variants[status] || 'bg-gray-500';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            draft: 'Brouillon',
            sent: 'Envoyée',
            accepted: 'Acceptée',
            rejected: 'Rejetée',
            expired: 'Expirée',
        };
        return labels[status] || status;
    };

    const handleDelete = async (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) {
            await deleteQuote(id);
        }
    };

    const handlePreview = async (quote: any) => {
        try {
            const response = await apiService.getQuoteById(quote.id);
            if (response.data) {
                setSelectedQuote(response.data);
                setShowPreview(true);
            }
        } catch (error) {
            console.error('Fetch quote error:', error);
            toast({ title: 'Erreur', description: 'Impossible de charger les détails du devis', variant: 'destructive' });
        }
    };

    const handleEdit = async (quote: any) => {
        try {
            const response = await apiService.getQuoteById(quote.id);
            if (response.data) {
                setSelectedQuote(response.data);
                setIsEditing(true);
                setShowForm(true);
            }
        } catch (error) {
            console.error('Fetch quote error:', error);
            toast({ title: 'Erreur', description: 'Impossible de charger le devis pour modification', variant: 'destructive' });
        }
    };

    const handleNewQuote = () => {
        setSelectedQuote(null);
        setIsEditing(false);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setSelectedQuote(null);
        setIsEditing(false);
    };

    const handleDuplicate = async (quote: any) => {
        try {
            const duplicatedQuote: any = {
                reference: quote.reference,
                date: new Date().toISOString().split('T')[0],
                validity_days: quote.validity_days || 30,
                terms: quote.terms || '',
                manual_client_mode: quote.manual_client_mode || 0,
                items: quote.items?.map((item: any) => ({
                    item_type: item.item_type,
                    display_type: item.display_type || 'quantity',
                    item_number: item.item_number,
                    designation: item.designation,
                    unit: item.unit,
                    unit_price: item.unit_price,
                })) || [],
            };

            if (quote.manual_client_mode) {
                // Preserve manual client fields
                duplicatedQuote.manual_client_name = quote.manual_client_name || '';
                duplicatedQuote.manual_client_email = quote.manual_client_email || '';
                duplicatedQuote.manual_client_contact = quote.manual_client_contact || '';
                duplicatedQuote.manual_client_phone = quote.manual_client_phone || '';
            } else {
                // Preserve DB client reference
                duplicatedQuote.client_id = quote.client_id?.toString() || '';
            }

            await addQuote(duplicatedQuote);
            toast({ title: 'Succès', description: 'Offre dupliquée avec succès' });
        } catch (error) {
            console.error('Duplicate error:', error);
            toast({ title: 'Erreur', description: 'Échec de duplication de l\'offre', variant: 'destructive' });
        }
    };

    const handleDownload = (quote: any) => {
        // We use the same native print method for download because it produces 
        // superior quality PDFs compared to html2canvas.
        // User just needs to select "Save as PDF" in the print dialog.
        setPrintQuote(quote);
    };

    const handlePrint = (quote: any) => {
        setPrintQuote(quote);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Offres Commerciales</h1>
                <Button onClick={handleNewQuote} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle Offre
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des Offres</CardTitle>
                </CardHeader>
                <CardContent>
                    {quotes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Aucune offre commerciale. Créez votre première offre pour commencer.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Référence</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotes.map((quote: any) => (
                                    <TableRow key={quote.id}>
                                        <TableCell className="font-mono">{quote.reference}</TableCell>
                                        <TableCell>{quote.client_name || quote.manual_client_name}</TableCell>
                                        <TableCell>{new Date(quote.date).toLocaleDateString('fr-FR')}</TableCell>
                                        <TableCell>
                                            <Badge className={getStatusBadge(quote.status)}>
                                                {getStatusLabel(quote.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="outline" onClick={() => handlePreview(quote)} title="Aperçu">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handleEdit(quote)} title="Modifier">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handleDuplicate(quote)} title="Dupliquer">
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handleDownload(quote)} title="Télécharger PDF">
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handlePrint(quote)} title="Imprimer">
                                                    <Printer className="w-4 h-4" />
                                                </Button>
                                                {currentUser?.role === 'admin' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDelete(quote.id)}
                                                        className="text-red-600"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Quote Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <QuoteForm onClose={handleFormClose} initialData={isEditing ? selectedQuote : undefined} />
                </DialogContent>
            </Dialog>

            {/* Quote Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
                    <div ref={printRef}>
                        {selectedQuote && <QuoteTemplate quote={selectedQuote} />}
                    </div>
                </DialogContent>
            </Dialog>


            {/* Native Print Portal */}
            {
                printQuote && createPortal(
                    <div id="printable-quote-container">
                        <QuoteTemplate quote={printQuote} />
                    </div>,
                    document.body
                )
            }
        </div >
    );
};
