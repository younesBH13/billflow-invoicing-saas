import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  MoreHorizontal,
  FileText,
  Filter,
  ArrowUpDown,
  Building2
} from 'lucide-react';

interface Invoice {
  id: string;
  number: string;
  date: string;
  clientName: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  type: 'proforma' | 'definitive' | 'credit_note';
  project?: string;
  company_entity?: 'principal' | 'secondary';
  companyEntity?: 'principal' | 'secondary';
}

interface InvoiceListProps {
  invoices: Invoice[];
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
  onCreate: () => void;
  isLoading?: boolean;
}

const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onView,
  onEdit,
  onDelete,
  onDownload,
  onCreate,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const getStatusBadge = (status: Invoice['status']) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const labels = {
      pending: 'En attente',
      paid: 'Payée',
      overdue: 'En retard',
      cancelled: 'Annulée',
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getTypeBadge = (type: Invoice['type']) => {
    const variants = {
      proforma: 'bg-blue-100 text-blue-800 border-blue-200',
      definitive: 'bg-purple-100 text-purple-800 border-purple-200',
      credit_note: 'bg-orange-100 text-orange-800 border-orange-200',
    };

    const labels = {
      proforma: 'Proforma',
      definitive: 'Définitive',
      credit_note: 'Avoir',
    };

    return (
      <Badge className={variants[type]}>
        {labels[type]}
      </Badge>
    );
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.project && invoice.project.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesType = typeFilter === 'all' || invoice.type === typeFilter;
    const matchesClient = clientFilter === 'all' || invoice.clientName === clientFilter;
    const entity = invoice.company_entity || invoice.companyEntity || 'principal';
    const matchesEntity = entityFilter === 'all' || entity === entityFilter;

    return matchesSearch && matchesStatus && matchesType && matchesClient && matchesEntity;
  });

  const [sortConfig, setSortConfig] = useState<{
    key: 'date' | 'number' | null;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' }); // Default sort by date descending

  const handleSort = (key: 'date' | 'number') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const { key, direction } = sortConfig;
    let comparison = 0;

    if (key === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      // Handle invalid dates by treating them as 0 (epoch)
      const valA = isNaN(dateA) ? 0 : dateA;
      const valB = isNaN(dateB) ? 0 : dateB;
      comparison = valA - valB;
    } else if (key === 'number') {
      // Use numeric sort for strings like "1/25", "2/25", "10/25"
      comparison = a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  // Get unique client names for filter
  const uniqueClients = Array.from(new Set(invoices.map(inv => inv.clientName))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-red-600">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Gestion des Factures
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 mr-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Trier par
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
              <Button onClick={onCreate} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle Facture
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par numéro, client ou projet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Statut
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    Tous les statuts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                    En attente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('paid')}>
                    Payées
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('overdue')}>
                    En retard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                    Annulées
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Type
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                    Tous les types
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('proforma')}>
                    Proforma
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('definitive')}>
                    Définitive
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('credit_note')}>
                    Avoir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Client
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setClientFilter('all')}>
                    Tous les clients
                  </DropdownMenuItem>
                  {uniqueClients.map((clientName) => (
                    <DropdownMenuItem
                      key={clientName}
                      onClick={() => setClientFilter(clientName)}
                    >
                      {clientName}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Registre
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setEntityFilter('all')}>
                    Tous les registres
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEntityFilter('principal')}>
                    RC Principal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEntityFilter('secondary')}>
                    RC Secondaire
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {invoices.length}
              </div>
              <div className="text-sm text-blue-600">Total Factures</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {invoices.filter(i => i.status === 'paid').length}
              </div>
              <div className="text-sm text-green-600">Payées</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {invoices.filter(i => i.status === 'pending').length}
              </div>
              <div className="text-sm text-yellow-600">En attente</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {invoices.filter(i => i.status === 'overdue').length}
              </div>
              <div className="text-sm text-red-600">En retard</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead
                  className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => handleSort('number')}
                >
                  <div className="flex items-center gap-1">
                    N° Facture
                    {sortConfig.key === 'number' && (
                      <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortConfig.key === 'date' && (
                      <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="font-medium">Client</TableHead>
                <TableHead className="font-medium">Projet</TableHead>
                <TableHead className="font-medium">Type</TableHead>
                <TableHead className="font-medium">Registre</TableHead>
                <TableHead className="font-medium">Statut</TableHead>
                <TableHead className="font-medium text-right">Montant</TableHead>
                <TableHead className="font-medium text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Chargement des factures...
                  </TableCell>
                </TableRow>
              ) : sortedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || clientFilter !== 'all'
                      ? 'Aucune facture ne correspond aux critères de recherche'
                      : 'Aucune facture trouvée'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                sortedInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-600" />
                        {invoice.number}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.date).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.clientName}
                    </TableCell>
                    <TableCell>
                      {invoice.project || '-'}
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(invoice.type)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const entity = invoice.company_entity || invoice.companyEntity || 'principal';
                        return entity === 'secondary'
                          ? <Badge className="text-purple-700 border-purple-300 bg-purple-50 text-xs"><Building2 className="w-3 h-3 mr-1" />Secondaire</Badge>
                          : <Badge className="text-slate-700 border-slate-300 bg-slate-50 text-xs"><Building2 className="w-3 h-3 mr-1" />Principal</Badge>;
                      })()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {invoice.amount.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        style: 'currency',
                        currency: 'DZD'
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(invoice)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(invoice)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(invoice)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDownload(invoice)}>
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDelete(invoice)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div >
  );
};

export default InvoiceList;

