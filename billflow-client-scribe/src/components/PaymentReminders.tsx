
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock, Send } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

export const PaymentReminders = () => {
  const { invoices, formatCurrency } = useApp();
  const { toast } = useToast();

  const getOverdueInvoices = () => {
    const today = new Date();
    return invoices.filter(invoice => {
      if (invoice.status === "paid") return false;
      const invoiceDate = new Date(invoice.date);
      const daysDiff = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 30; // Overdue after 30 days
    });
  };

  const getPendingInvoices = () => {
    return invoices.filter(invoice => invoice.status === "pending");
  };

  const sendReminder = () => {
    toast({
      title: "Rappel envoyé",
      description: "Le rappel de paiement a été simulé avec succès",
    });
  };

  const overdueInvoices = getOverdueInvoices();
  const pendingInvoices = getPendingInvoices();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Factures en retard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueInvoices.length}</div>
            <p className="text-sm text-gray-600">Plus de 30 jours</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Clock className="w-5 h-5" />
              Factures en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingInvoices.length}</div>
            <p className="text-sm text-gray-600">À relancer</p>
          </CardContent>
        </Card>
      </div>

      {overdueInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Factures en retard - Action requise</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Retard</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.map((invoice) => {
                  const daysDiff = Math.floor((new Date().getTime() - new Date(invoice.date).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.number}</TableCell>
                      <TableCell>{invoice.client}</TableCell>
                      <TableCell>{new Date(invoice.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>
                        <Badge className="bg-red-500">
                          {daysDiff} jours
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => sendReminder()}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Relancer
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
