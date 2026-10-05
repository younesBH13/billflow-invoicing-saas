import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import InvoiceList from '../components/invoices/InvoiceList';
import InvoiceForm from '../components/invoices/InvoiceForm';
import InvoicePreview from '../components/invoices/InvoicePreview';
import { useInvoices, useClients, useCreateInvoice, useUpdateInvoice, useDeleteInvoice } from '../hooks/useInvoices';
import { transformInvoiceForForm, transformFormToInvoice, apiClient } from '../services/api';
import { buildInvoicePreview, buildPreviewFromForm } from '@/utils/invoicePreview';
import { calculateInvoiceTotals } from '@/utils/invoiceTotals';
import { useApp } from '@/contexts/AppContext';

const InvoicePage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('list');
  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null);
  const [previewData, setPreviewData] = React.useState<any>(null);
  const [isFetchingInvoice, setIsFetchingInvoice] = React.useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);

  // API hooks
  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useInvoices();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();
  const { currentUser } = useApp();

  const isLoading = invoicesLoading || clientsLoading;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isAdmin = currentUser?.role === 'admin';

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setPreviewData(null);
    setActiveTab('form');
  };

  const fetchInvoiceById = React.useCallback(async (invoiceId: string) => {
    setIsFetchingInvoice(true);
    try {
      const fullInvoice = await apiClient.getInvoiceById(invoiceId);
      setSelectedInvoice(fullInvoice);
      return fullInvoice;
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert("Impossible de charger la facture. Veuillez réessayer.");
      return null;
    } finally {
      setIsFetchingInvoice(false);
    }
  }, []);

  const handleEditInvoice = async (invoice: any) => {
    const loadedInvoice = await fetchInvoiceById(invoice.id);
    if (loadedInvoice) {
      setPreviewData(null);
      setActiveTab('form');
    }
  };

  const handleViewInvoice = async (invoice: any) => {
    setIsPreviewLoading(true);
    const loadedInvoice = await fetchInvoiceById(invoice.id);
    if (loadedInvoice) {
      const data = buildInvoicePreview(loadedInvoice, { clients });
      setPreviewData(data);
      setActiveTab('preview');
    } else {
      setPreviewData(null);
      setActiveTab('list');
    }
    setIsPreviewLoading(false);
  };

  const handleDeleteInvoice = async (invoice: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la facture ${invoice.number} ?`)) {
      try {
        await deleteMutation.mutateAsync(invoice.id);
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Erreur lors de la suppression de la facture');
      }
    }
  };

  const handleSubmitInvoice = async (formData: any) => {
    try {
      const apiData = transformFormToInvoice(formData);

      if (selectedInvoice) {
        // Update existing invoice
        await updateMutation.mutateAsync({
          id: selectedInvoice.id,
          data: apiData
        });
      } else {
        // Create new invoice
        await createMutation.mutateAsync(apiData);
      }

      // Go back to list after successful submission
      setActiveTab('list');
      setSelectedInvoice(null);
      setPreviewData(null);
    } catch (error) {
      console.error('Error submitting invoice:', error);
      alert('Erreur lors de l\'enregistrement de la facture');
    }
  };

  const handlePreviewFromForm = (formData: any) => {
    const previewData = buildPreviewFromForm(formData);
    setPreviewData(previewData);
    setActiveTab('preview');
  };

  const handleDownloadInvoice = async (invoice: any) => {
    await handleViewInvoice(invoice);
  };

  const goBackToList = () => {
    setActiveTab('list');
    setSelectedInvoice(null);
    setPreviewData(null);
  };

  const goBackToForm = () => {
    setActiveTab('form');
  };

  if (invoicesError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Erreur lors du chargement des données: {invoicesError.message}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-black text-white px-3 py-1 font-bold text-xl">I</div>
            <div className="bg-red-600 text-white px-3 py-1 font-bold text-xl">P</div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BillFlow - Gestion de Facturation</h1>
            <p className="text-gray-600">Système de gestion des factures et clients</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Liste des Factures
          </TabsTrigger>
          <TabsTrigger value="form" className="flex items-center gap-2">
            Formulaire
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            Aperçu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6" forceMount>
          <InvoiceList
            invoices={invoices.map(invoice => {
              // Compute the last Montant HT: after remise and retenue de garantie
              const totals = calculateInvoiceTotals({
                subtotal: invoice.amount,
                tvaRate: invoice.tva_rate ?? 0,
                txRemisePercent: invoice.tx_remise_percent,
                montantRemise: invoice.montant_remise,
                txRetenueGarantie: invoice.tx_retenue_garantie,
              });
              return {
                id: invoice.id,
                number: invoice.number,
                date: invoice.date,
                clientName: invoice.client_name || 'Client inconnu',
                amount: totals.subtotalAfterRetenue,
                status: invoice.status,
                type: invoice.type,
                project: invoice.project_name,
              };
            })}
            onView={handleViewInvoice}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onDownload={handleDownloadInvoice}
            onCreate={handleCreateInvoice}
            isLoading={isLoading || deleteMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="form" className="mt-6" forceMount>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBackToList}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {selectedInvoice ? 'Modifier la Facture' : 'Nouvelle Facture'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isFetchingInvoice ? (
                <div className="py-10 text-center text-muted-foreground">Chargement de la facture…</div>
              ) : (
                <InvoiceForm
                  initialData={selectedInvoice ? transformInvoiceForForm(selectedInvoice) : undefined}
                  clients={clients}
                  onSubmit={handleSubmitInvoice}
                  onPreview={handlePreviewFromForm}
                  isLoading={isSubmitting || isFetchingInvoice}
                  isAdmin={isAdmin}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-6" forceMount>
          {isPreviewLoading && (
            <div className="py-10 text-center text-muted-foreground">Préparation de l'aperçu…</div>
          )}
          {!isPreviewLoading && previewData && (
            <div>
              <div className="mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectedInvoice ? goBackToList : goBackToForm}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              </div>
              <InvoicePreview
                invoiceData={previewData}
                onEdit={goBackToForm}
                onPrint={() => console.log('Print invoice')}
                onDownload={() => console.log('Download PDF')}
              />
            </div>
          )}
          {!isPreviewLoading && !previewData && (
            <div className="py-10 text-center text-muted-foreground">
              Aucun document à afficher.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoicePage;

