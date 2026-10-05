
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, DollarSign, Calendar, FileText, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const PaymentTracking = () => {
  const { payments, invoices, clients, addPayment, deletePayment, formatCurrency, currentUser } = useApp();
  const { toast } = useToast();
  const [showAddPayment, setShowAddPayment] = useState(false);

  type PaymentMethod = "bank_transfer" | "check" | "cash" | "card" | "other";
  interface NewPaymentState {
    invoiceId: string;
    amount: string;
    date: string;
    method: PaymentMethod;
    reference: string;
    notes: string;
  }

  const [newPayment, setNewPayment] = useState<NewPaymentState>({
    invoiceId: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    method: "bank_transfer" as const,
    reference: "",
    notes: ""
  });

  const getInvoiceDetails = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return null;

    const client = clients.find(c => c.id === invoice.clientId);
    const invoicePayments = payments.filter(p => p.invoiceId === invoiceId);
    const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
    const advance = Number((invoice as any).advance_amount ?? invoice.advanceAmount ?? invoice.advance_payment ?? 0) || 0;
    const timbre = Number(invoice.timbreAmount ?? (invoice as any).timbre_amount ?? 0) || 0;
    const netTotal = Math.max((invoice.amount || 0) + timbre - advance, 0);
    const remaining = netTotal - totalPaid;

    return {
      ...invoice,
      clientName: client?.name || "Client inconnu",
      netTotal,
      totalPaid,
      remaining,
      isFullyPaid: remaining <= 0
    };
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: "Espèces",
      bank_transfer: "Virement",
      check: "Chèque",
      card: "Carte",
      other: "Autre"
    };
    return methods[method as keyof typeof methods] || method;
  };

  const handleAddPayment = () => {
    if (!newPayment.invoiceId || !newPayment.amount) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    addPayment({
      invoiceId: newPayment.invoiceId,
      amount: parseFloat(newPayment.amount),
      date: newPayment.date,
      method: newPayment.method,
      reference: newPayment.reference,
      notes: newPayment.notes
    });

    setNewPayment({
      invoiceId: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      method: "bank_transfer",
      reference: "",
      notes: ""
    });
    setShowAddPayment(false);

    toast({
      title: "Paiement ajouté",
      description: "Le paiement a été enregistré avec succès"
    });
  };

  const handleDeletePayment = (paymentId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce paiement ?")) {
      deletePayment(paymentId);
      toast({
        title: "Paiement supprimé",
        description: "Le paiement a été supprimé"
      });
    }
  };

  const exportStatsCSV = () => {
    const headers = ['Facture', 'Client', 'Montant Total', 'Payé', 'Restant', 'Statut'];
    const rows = invoices.map(invoice => {
      const details = getInvoiceDetails(invoice.id);
      return [
        invoice.number,
        `"${details?.clientName || ''}"`,
        (details?.netTotal ?? invoice.amount).toFixed(2),
        (details?.totalPaid || 0).toFixed(2),
        Math.max(details?.remaining || 0, 0).toFixed(2),
        invoice.status === "paid" ? "Payée" : (invoice.status === "pending" ? "En attente" : "En retard")
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `statistiques_paiements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const unpaidInvoices = invoices.filter(invoice => {
    const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);
    const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
    const advance = Number((invoice as any).advance_amount ?? invoice.advanceAmount ?? invoice.advance_payment ?? 0) || 0;
    const timbre = Number(invoice.timbreAmount ?? (invoice as any).timbre_amount ?? 0) || 0;
    const netTotal = Math.max((invoice.amount || 0) + timbre - advance, 0);
    return totalPaid < netTotal - 0.01;
  }).reduce((acc, current) => {
    const x = acc.find(item => item.number === current.number);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, [] as typeof invoices);

  const totalOutstanding = unpaidInvoices.reduce((sum, invoice) => {
    const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);
    const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
    const advance = Number((invoice as any).advance_amount ?? invoice.advanceAmount ?? invoice.advance_payment ?? 0) || 0;
    const timbre = Number(invoice.timbreAmount ?? (invoice as any).timbre_amount ?? 0) || 0;
    const netTotal = Math.max((invoice.amount || 0) + timbre - advance, 0);
    return sum + Math.max(netTotal - totalPaid, 0);
  }, 0);

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  const [sortConfig, setSortConfig] = useState<{
    key: 'date' | 'number' | null;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => {
      if (!sortConfig.key) return 0;

      const { key, direction } = sortConfig;
      let comparison = 0;

      if (key === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        comparison = dateA - dateB;
      } else if (key === 'number') {
        const invoiceA = invoices.find(inv => inv.id === a.invoiceId);
        const invoiceB = invoices.find(inv => inv.id === b.invoiceId);
        const numA = invoiceA?.number || '';
        const numB = invoiceB?.number || '';
        comparison = numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [payments, invoices, sortConfig]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Suivi des Paiements</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Trier par
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortConfig({ key: 'date', direction: 'desc' })}>
                Date (Plus anciens)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortConfig({ key: 'date', direction: 'asc' })}>
                Date (Plus récents)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortConfig({ key: 'number', direction: 'desc' })}>
                N° Facture (Décroissant)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortConfig({ key: 'number', direction: 'asc' })}>
                N° Facture (Croissant)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={exportStatsCSV} className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Exporter Stats
          </Button>

          {currentUser?.role === "admin" && (
            <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau Paiement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Ajouter un Paiement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invoice">Facture *</Label>
                    <Select value={newPayment.invoiceId} onValueChange={(value) => {
                      const details = getInvoiceDetails(value);
                      const remaining = details?.remaining ?? 0;
                      setNewPayment(prev => ({
                        ...prev,
                        invoiceId: value,
                        amount: remaining > 0 ? remaining.toFixed(2) : ""
                      }));
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une facture" />
                      </SelectTrigger>
                      <SelectContent>
                        {unpaidInvoices.map(invoice => {
                          const details = getInvoiceDetails(invoice.id);
                          return (
                            <SelectItem key={invoice.id} value={invoice.id}>
                              {invoice.number} - {details?.clientName} ({formatCurrency(details?.remaining || 0)} restant)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Montant *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newPayment.date}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="method">Mode de paiement</Label>
                    <Select
                      value={newPayment.method}
                      onValueChange={(value: "bank_transfer" | "check" | "cash" | "card" | "other") =>
                        setNewPayment(prev => ({ ...prev, method: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                        <SelectItem value="check">Chèque</SelectItem>
                        <SelectItem value="cash">Espèces</SelectItem>
                        <SelectItem value="card">Carte bancaire</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reference">Référence</Label>
                    <Input
                      id="reference"
                      value={newPayment.reference}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                      placeholder="Numéro de référence"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notes complémentaires"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleAddPayment} className="flex-1">
                      Ajouter
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddPayment(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collecté</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</div>
            <p className="text-xs text-gray-500">{payments.length} paiements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-gray-500">{unpaidInvoices.length} factures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Recouvrement</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalCollected + totalOutstanding > 0
                ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-gray-500">des montants facturés</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Paiements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:text-blue-600 transition-colors"
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
                <TableHead
                  className="cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => setSortConfig(prev => ({
                    key: 'number',
                    direction: prev.key === 'number' && prev.direction === 'asc' ? 'desc' : 'asc'
                  }))}
                >
                  <div className="flex items-center gap-1">
                    Facture
                    {sortConfig.key === 'number' && (
                      <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPayments.map((payment) => {
                const invoice = invoices.find(inv => inv.id === payment.invoiceId);
                const client = clients.find(c => c.id === invoice?.clientId);

                return (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="font-mono">{invoice?.number}</TableCell>
                    <TableCell>{client?.name}</TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPaymentMethodLabel(payment.method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{payment.reference}</TableCell>
                    <TableCell>
                      {currentUser?.role === "admin" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Supprimer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Outstanding Invoices */}
      {
        unpaidInvoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Factures en Attente de Paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Montant Total</TableHead>
                    <TableHead>Payé</TableHead>
                    <TableHead>Restant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaidInvoices.map((invoice) => {
                    const details = getInvoiceDetails(invoice.id);

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.number}</TableCell>
                        <TableCell>{details?.clientName}</TableCell>
                        <TableCell>{formatCurrency(details?.netTotal ?? invoice.amount)}</TableCell>
                        <TableCell className="text-green-600">
                          {formatCurrency(details?.totalPaid || 0)}
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          {formatCurrency(Math.max(details?.remaining || 0, 0))}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            invoice.status === "paid" ? "bg-green-500" :
                              invoice.status === "pending" ? "bg-yellow-500" : "bg-red-500"
                          }>
                            {invoice.status === "paid" ? "Payée" :
                              invoice.status === "pending" ? "En attente" : "En retard"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      }
    </div>
  );
};
