import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Filter, Download, Eye, Edit, Loader2, ArrowUpDown, Printer, FileCheck, Percent, Building2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import InvoicePreview from '@/components/invoices/InvoicePreview';
import InvoiceTemplate from '@/components/invoices/InvoiceTemplate';
import InvoiceWorkspaceForm from '@/components/invoices/InvoiceForm';
import { AdvancedFilters } from '@/components/AdvancedFilters';
import { exportInvoicesToExcel } from '@/utils/exportUtils';
import { buildInvoicePreview, buildPreviewFromForm } from '@/utils/invoicePreview';
import { calculateInvoiceTotals } from '@/utils/invoiceTotals';
import { normalizePaymentMethod } from '@/utils/paymentMethods';
import { apiClient, transformFormToInvoice, transformInvoiceForForm } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface InvoicesManagementProps {
  onNavigate: (section: string) => void;
}

type PreviewContext = 'list' | 'form' | 'download';
type InvoiceFilterType = 'all' | 'proforma' | 'definitive' | 'credit_note';
type InvoiceStatusFilter = 'all' | 'paid' | 'pending' | 'overdue';
type InvoiceEntityFilter = 'all' | 'principal' | 'secondary';

export const InvoicesManagement = ({ onNavigate }: InvoicesManagementProps) => {
  const { invoices, clients, updateInvoice, convertInvoiceType, formatCurrency, currentUser } = useApp();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<InvoiceFilterType>('all');
  const [filterStatus, setFilterStatus] = useState<InvoiceStatusFilter>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<InvoiceEntityFilter>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({});

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ReturnType<typeof buildInvoicePreview> | null>(null);
  const [previewContext, setPreviewContext] = useState<PreviewContext>('list');
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  const [autoDownload, setAutoDownload] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<ReturnType<typeof buildInvoicePreview> | null>(null); // State for native print

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [editInitialData, setEditInitialData] = useState<any | null>(null);

  // Quick Remise Dialog State
  const [isRemiseDialogOpen, setIsRemiseDialogOpen] = useState(false);
  const [remiseInvoice, setRemiseInvoice] = useState<any | null>(null);
  const [remisePercent, setRemisePercent] = useState<string>('');
  const [remiseAmountInput, setRemiseAmountInput] = useState<string>('');
  const [isRemiseSaving, setIsRemiseSaving] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const invoiceClients = useMemo(
    () =>
      clients.map(client => ({
        id: client.id,
        name: client.name,
        fiscalId: client.matriculeFiscale ?? client.fiscalId ?? '',
        commerceRegistry: client.registreCommerce ?? client.commerceRegistry ?? '',
        taxArticle: client.articleImposition ?? client.taxArticle ?? '',
        address: client.address ?? '',
        tvaRate: client.tvaRate ?? 0,
        hasTva: client.hasTva,
        nis: client.nis ?? '',
      })),
    [clients]

  );

  // Handle native print side effects
  useEffect(() => {
    if (printInvoiceData) {
      // Document title for the PDF filename
      const originalTitle = document.title;
      document.title = `Facture_${printInvoiceData.invoiceNumber.replace(/\//g, '-')}`;

      // Allow time for render then print
      const timer = setTimeout(() => {
        window.print();
        setPrintInvoiceData(null);
        document.title = originalTitle;
      }, 500);

      return () => {
        clearTimeout(timer);
        document.title = originalTitle;
      };
    }
  }, [printInvoiceData]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'proforma':
        return 'Proforma';
      case 'definitive':
        return 'Définitive';
      case 'credit_note':
        return 'Avoir';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'proforma':
        return 'bg-yellow-500';
      case 'definitive':
        return 'bg-green-500';
      case 'credit_note':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'pending':
        return 'En attente';
      case 'overdue':
        return 'En retard';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const applyAdvancedFilters = (invoice: any) => {
    if (advancedFilters.dateFrom && new Date(invoice.date) < advancedFilters.dateFrom) return false;
    if (advancedFilters.dateTo && new Date(invoice.date) > advancedFilters.dateTo) return false;
    if (advancedFilters.amountMin && invoice.amount < parseFloat(advancedFilters.amountMin)) return false;
    if (advancedFilters.amountMax && invoice.amount > parseFloat(advancedFilters.amountMax)) return false;
    if (advancedFilters.status !== 'all' && invoice.status !== advancedFilters.status) return false;
    if (advancedFilters.type !== 'all' && invoice.type !== advancedFilters.type) return false;
    return true;
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (filterType !== 'all' && invoice.type !== filterType) return false;
    if (filterStatus !== 'all' && invoice.status !== filterStatus) return false;
    if (filterClient !== 'all' && invoice.client !== filterClient) return false;
    if (filterEntity !== 'all') {
      const entity = (invoice as any).company_entity || (invoice as any).companyEntity || 'principal';
      if (entity !== filterEntity) return false;
    }
    if (
      searchTerm &&
      !invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !invoice.client.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    if (showAdvancedFilters && !applyAdvancedFilters(invoice)) return false;
    return true;
  });

  const [sortConfig, setSortConfig] = useState<{
    key: 'date' | 'number' | null;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      if (!sortConfig.key) return 0;

      const { key, direction } = sortConfig;
      let comparison = 0;

      if (key === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        const valA = isNaN(dateA) ? 0 : dateA;
        const valB = isNaN(dateB) ? 0 : dateB;
        comparison = valA - valB;
      } else if (key === 'number') {
        comparison = a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredInvoices, sortConfig]);

  // Get unique client names for filter
  const uniqueClients = Array.from(new Set(invoices.map(inv => inv.client))).sort();

  const openPreviewForInvoice = async (invoiceId: string, context: PreviewContext) => {
    try {
      setIsPreviewLoading(true);
      setPreviewContext(context);
      setPreviewInvoiceId(invoiceId);
      setAutoDownload(context === 'download');
      setPreviewData(null);

      const fullInvoice = await apiClient.getInvoiceById(invoiceId);
      const preview = buildInvoicePreview(fullInvoice, { clients: invoiceClients });
      setPreviewData(preview);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Erreur lors du chargement de la facture :', error);
      toast({
        title: 'Erreur',
        description: "Impossible de charger la facture. Veuillez réessayer.",
        variant: 'destructive',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleNativePrint = async (invoiceId: string) => {
    try {
      const fullInvoice = await apiClient.getInvoiceById(invoiceId);
      const preview = buildInvoicePreview(fullInvoice, { clients: invoiceClients });
      setPrintInvoiceData(preview);
    } catch (error) {
      console.error('Erreur lors de l\'impression :', error);
      toast({
        title: 'Erreur',
        description: "Impossible de préparer l'impression.",
        variant: 'destructive',
      });
    }
  };

  const openEditorById = async (invoiceId: string) => {
    try {
      setIsEditLoading(true);
      const fullInvoice = await apiClient.getInvoiceById(invoiceId);
      setEditInvoiceId(invoiceId);
      setEditInitialData(transformInvoiceForForm(fullInvoice));
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Erreur lors de la récupération de la facture :', error);
      toast({
        title: 'Erreur',
        description: "Impossible de charger la facture pour modification.",
        variant: 'destructive',
      });
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleConvertToDefinitive = async (invoiceId: string) => {
    if (!window.confirm('Voulez-vous vraiment convertir cette facture proforma en facture définitive ?')) {
      return;
    }

    try {
      setIsEditLoading(true);
      await convertInvoiceType(invoiceId, 'definitive');
      toast({
        title: 'Facture convertie',
        description: 'La facture proforma a été convertie en facture définitive avec succès.',
      });
    } catch (error) {
      console.error('Erreur lors de la conversion :', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'La conversion a échoué.',
        variant: 'destructive',
      });
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleOpenRemiseDialog = (invoice: any) => {
    setRemiseInvoice(invoice);
    const p = invoice.txRemisePercent ?? invoice.tx_remise_percent ?? '';
    const a = invoice.montantRemise ?? invoice.montant_remise ?? '';
    setRemisePercent(p !== '' && p !== 0 ? String(p) : '');
    setRemiseAmountInput(a !== '' && a !== 0 ? String(a) : '');
    setIsRemiseDialogOpen(true);
  };

  const handleSaveRemise = async () => {
    if (!remiseInvoice) return;
    try {
      setIsRemiseSaving(true);
      const p = parseFloat(remisePercent) || 0;
      const a = parseFloat(remiseAmountInput) || 0;
      await updateInvoice(remiseInvoice.id, {
        tx_remise_percent: p,
        montant_remise: a,
        txRemisePercent: p,
        montantRemise: a,
      });
      toast({
        title: 'Remise enregistrée',
        description: `La remise a été mise à jour avec succès pour la facture ${remiseInvoice.number}.`,
      });
      setIsRemiseDialogOpen(false);
      setRemiseInvoice(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la remise :', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'La mise à jour de la remise a échoué.',
        variant: 'destructive',
      });
    } finally {
      setIsRemiseSaving(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (!editInvoiceId) {
      return;
    }

    try {
      setIsEditLoading(true);
      const payload = transformFormToInvoice(formData);
      await updateInvoice(editInvoiceId, payload as any);
      toast({
        title: 'Facture mise à jour',
        description: 'Les modifications ont été enregistrées avec succès.',
      });
      setIsEditDialogOpen(false);
      setEditInvoiceId(null);
      setEditInitialData(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la facture :', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'La mise à jour a échoué.',
        variant: 'destructive',
      });
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleFormPreview = (formData: any) => {
    const preview = buildPreviewFromForm(formData);
    setPreviewContext('form');
    setPreviewInvoiceId(editInvoiceId);
    setPreviewData(preview);
    setAutoDownload(false);
    setIsPreviewOpen(true);
  };

  const handlePreviewEdit = () => {
    if (previewContext === 'list' && previewInvoiceId) {
      setIsPreviewOpen(false);
      void openEditorById(previewInvoiceId);
    }

    if (previewContext === 'form') {
      setIsPreviewOpen(false);
      setIsEditDialogOpen(true);
    }
  };

  const handleDownloadComplete = () => {
    setAutoDownload(false);
    setIsPreviewOpen(false);
  };

  const paymentLabel = (method?: string) => (method ? normalizePaymentMethod(method) : '-');

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Gestion des Factures</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportInvoicesToExcel(filteredInvoices)}>
            <Download className="w-4 h-4 mr-1" />
            Exporter
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <ArrowUpDown className="w-4 h-4" />
                <span className="hidden sm:inline">Trier par</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortConfig({ key: 'date', direction: 'desc' })}>
                Date (Plus récents)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortConfig({ key: 'date', direction: 'asc' })}>
                Date (Plus anciens)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortConfig({ key: 'number', direction: 'desc' })}>
                Numéro (Décroissant)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortConfig({ key: 'number', direction: 'asc' })}>
                Numéro (Croissant)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => onNavigate('new-invoice')}>
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Nouvelle </span>Facture
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres et Recherche
            </div>
            <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
              Filtres avancés
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(value: InvoiceFilterType) => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Type de facture" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="proforma">Proforma</SelectItem>
                <SelectItem value="definitive">Définitive</SelectItem>
                <SelectItem value="credit_note">Avoir</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(value: InvoiceStatusFilter) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterClient} onValueChange={(value: string) => setFilterClient(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {uniqueClients.map((clientName) => (
                  <SelectItem key={clientName} value={clientName}>
                    {clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEntity} onValueChange={(value: InvoiceEntityFilter) => setFilterEntity(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Registre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les registres</SelectItem>
                <SelectItem value="principal">RC Principal</SelectItem>
                <SelectItem value="secondary">RC Secondaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {showAdvancedFilters && (
        <AdvancedFilters filterType="invoices" onFiltersChange={setAdvancedFilters} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Liste des Factures ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:-mx-0">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead
                    className="cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
                    onClick={() => setSortConfig(prev => ({
                      key: 'number',
                      direction: prev.key === 'number' && prev.direction === 'asc' ? 'desc' : 'asc'
                    }))}
                  >
                    <div className="flex items-center gap-1">
                      Numéro
                      {sortConfig.key === 'number' && (
                        <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
                    onClick={() => setSortConfig(prev => ({
                      key: 'date',
                      direction: prev.key === 'date' && prev.direction === 'asc' ? 'desc' : 'asc'
                    }))}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortConfig.key === 'date' && (
                        <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Type</TableHead>
                  <TableHead className="whitespace-nowrap">Registre</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="whitespace-nowrap">Montant HT</TableHead>
                  <TableHead className="whitespace-nowrap">Statut</TableHead>
                  <TableHead className="whitespace-nowrap">Paiement</TableHead>
                  <TableHead className="sticky right-0 bg-gray-50 z-20 text-center shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map(invoice => (
                  <TableRow key={invoice.id} className="group hover:bg-gray-50">
                    <TableCell className="font-mono whitespace-nowrap">{invoice.number}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(invoice.date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge className={getTypeColor(invoice.type)}>{getTypeLabel(invoice.type)}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(() => {
                        const entity = (invoice as any).company_entity || (invoice as any).companyEntity || 'principal';
                        return entity === 'secondary'
                          ? <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs"><Building2 className="w-3 h-3 mr-1" />Secondaire</Badge>
                          : <Badge variant="outline" className="text-slate-700 border-slate-300 bg-slate-50 text-xs"><Building2 className="w-3 h-3 mr-1" />Principal</Badge>;
                      })()}
                    </TableCell>
                    <TableCell className="font-medium max-w-[240px] truncate" title={invoice.client}>{invoice.client}</TableCell>
                    <TableCell className={`font-medium whitespace-nowrap ${invoice.subtotal < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(
                        (() => {
                          const subtotal = invoice.subtotal || 0;
                          const advancePercentage = invoice.advancePercentage || invoice.advance_percentage || 0;
                          const advanceAmt = invoice.advanceAmount ?? invoice.advance_amount ?? 0;
                          const hasAdvance = advancePercentage > 0 || advanceAmt > 0;

                          const totals = calculateInvoiceTotals({
                            subtotal,
                            tvaRate: invoice.tvaRate ?? 0,
                            txRemisePercent: invoice.txRemisePercent,
                            montantRemise: invoice.montantRemise,
                            txRetenueGarantie: invoice.txRetenueGarantie,
                            advanceAmount: advanceAmt,
                            advancePercentage,
                          });

                          // Hyundai-style (with advance): HT 1 = subtotal - AP - RG
                          // Classic (SARPI, no advance): HT 2 = subtotal - remise - retenue
                          return hasAdvance ? totals.netBeforeVAT : totals.subtotalAfterRetenue;
                        })()
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge className={getStatusColor(invoice.status)}>{getStatusLabel(invoice.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                      {paymentLabel(invoice.paymentMethod)}
                    </TableCell>
                    <TableCell className="sticky right-0 bg-white group-hover:bg-gray-50 z-10 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.08)]">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        {invoice.type === 'proforma' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600 border-blue-600 hover:bg-blue-50"
                            onClick={() => handleConvertToDefinitive(invoice.id)}
                            title="Convertir en définitive"
                          >
                            <FileCheck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-8 w-8 p-0 ${
                            (invoice.txRemisePercent || invoice.montantRemise || (invoice as any).tx_remise_percent || (invoice as any).montant_remise)
                              ? 'text-amber-600 border-amber-500 bg-amber-50 hover:bg-amber-100'
                              : 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'
                          }`}
                          onClick={() => handleOpenRemiseDialog(invoice)}
                          title="Appliquer / Modifier une remise"
                        >
                          <Percent className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => void openEditorById(invoice.id)}
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => void openPreviewForInvoice(invoice.id, 'list')}
                          title="Aperçu et impression"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => void handleNativePrint(invoice.id)}
                          title="Imprimer"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => void openPreviewForInvoice(invoice.id, 'download')}
                          title="Télécharger en PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            setAutoDownload(false);
            setPreviewInvoiceId(null);
          }
        }}
      >
        <DialogContent className="max-w-[95vw] lg:max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Aperçu de la facture</DialogTitle>
          </DialogHeader>
          {isPreviewLoading ? (
            <div className="py-10 text-center text-muted-foreground">Chargement de l'aperçu…</div>
          ) : previewData ? (
            <ScrollArea className="h-[70vh] pr-4">
              <InvoicePreview
                invoiceData={previewData}
                onEdit={previewContext !== 'download' ? handlePreviewEdit : undefined}
                onDownload={() => toast({ title: 'PDF généré', description: 'Le document a été téléchargé.' })}
                autoDownload={autoDownload}
                onDownloadComplete={handleDownloadComplete}
              />
            </ScrollArea>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              Impossible d'afficher la facture sélectionnée.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditInvoiceId(null);
            setEditInitialData(null);
          }
        }}
      >
        <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Modifier la facture</DialogTitle>
          </DialogHeader>
          {isEditLoading && !editInitialData ? (
            <div className="py-10 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement des données…
            </div>
          ) : editInitialData ? (
            <ScrollArea className="h-[75vh] pr-4">
              <InvoiceWorkspaceForm
                initialData={editInitialData}
                clients={invoiceClients}
                onSubmit={handleFormSubmit}
                onPreview={handleFormPreview}
                isLoading={isEditLoading}
                isAdmin={isAdmin}
              />
            </ScrollArea>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              Impossible de charger les informations de la facture.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Remise Dialog */}
      <Dialog
        open={isRemiseDialogOpen}
        onOpenChange={(open) => {
          setIsRemiseDialogOpen(open);
          if (!open) {
            setRemiseInvoice(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-900">
              <Percent className="w-5 h-5 text-amber-600" />
              Remise — Facture {remiseInvoice?.number}
            </DialogTitle>
          </DialogHeader>
          {remiseInvoice && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1 border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Client :</span>
                  <span className="font-semibold text-gray-900">{remiseInvoice.client}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type :</span>
                  <Badge variant="outline" className="capitalize">
                    {remiseInvoice.type === 'definitive' ? 'Définitive' : remiseInvoice.type === 'proforma' ? 'Proforma' : 'Avoir'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date :</span>
                  <span>{new Date(remiseInvoice.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Montant HT brut :</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(remiseInvoice.subtotal || 0)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Taux Remise (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 5"
                    value={remisePercent}
                    onChange={(e) => setRemisePercent(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Montant Remise (DZD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 5000"
                    value={remiseAmountInput}
                    onChange={(e) => setRemiseAmountInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Real-time preview */}
              {(() => {
                const sub = remiseInvoice.subtotal || 0;
                const p = parseFloat(remisePercent) || 0;
                const a = parseFloat(remiseAmountInput) || 0;
                const calcTotals = calculateInvoiceTotals({
                  subtotal: sub,
                  tvaRate: remiseInvoice.tvaRate ?? 0,
                  txRemisePercent: p,
                  montantRemise: a,
                  txRetenueGarantie: remiseInvoice.txRetenueGarantie,
                  advanceAmount: remiseInvoice.advanceAmount ?? remiseInvoice.advance_amount ?? 0,
                  advancePercentage: remiseInvoice.advancePercentage ?? remiseInvoice.advance_percentage ?? 0,
                  timbreAmount: remiseInvoice.timbreAmount ?? remiseInvoice.timbre_amount ?? 0,
                });
                const hasAdvance = (remiseInvoice.advancePercentage || 0) > 0 || (remiseInvoice.advanceAmount || 0) > 0;
                const finalAmount = hasAdvance ? calcTotals.totalFinal : calcTotals.netToPay;

                return (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remise calculée :</span>
                      <span className="font-semibold text-amber-800">
                        {calcTotals.remiseAmount > 0 ? `-${formatCurrency(calcTotals.remiseAmount)}` : '0,00 DA'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant HT 1 (après remise) :</span>
                      <span className="font-semibold">{formatCurrency(calcTotals.subtotalAfterRemise)}</span>
                    </div>
                    {calcTotals.retenueAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Retenue de garantie :</span>
                        <span className="font-semibold text-purple-700">-{formatCurrency(calcTotals.retenueAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">TVA ({remiseInvoice.tvaRate || 0}%) :</span>
                      <span>{formatCurrency(calcTotals.tvaAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-amber-200 font-bold text-gray-900">
                      <span>Nouveau Net à payer :</span>
                      <span className="text-green-700">{formatCurrency(finalAmount)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-between items-center pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 text-xs"
                  onClick={() => {
                    setRemisePercent('0');
                    setRemiseAmountInput('0');
                  }}
                >
                  Supprimer la remise
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRemiseDialogOpen(false)}
                    disabled={isRemiseSaving}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleSaveRemise}
                    disabled={isRemiseSaving}
                  >
                    {isRemiseSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Enregistrer la remise
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Native Print Portal */}
      {
        printInvoiceData && createPortal(
          <div id="printable-invoice-container">
            <InvoiceTemplate
              data={printInvoiceData}
            />
          </div>,
          document.body
        )
      }
    </div >
  );
};
