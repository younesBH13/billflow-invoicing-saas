
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, DollarSign, FileText, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { uniquePaymentLabels } from "@/utils/paymentMethods";
import { getLastHT } from "@/utils/invoiceTotals";

export const ClientStatistics = () => {
  const { clients, invoices, payments, formatCurrency } = useApp();
  const [selectedClient, setSelectedClient] = useState<string>("all");

  if (clients.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p>Aucun client enregistré pour le moment. Ajoutez des clients pour afficher les statistiques.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "new": return "#6b7280";
      case "recurring": return "#3b82f6";
      case "good": return "#10b981";
      case "very_good": return "#dc2626";
      default: return "#6b7280";
    }
  };

  const getClassificationLabel = (classification: string) => {
    switch (classification) {
      case "new": return "Nouveau";
      case "recurring": return "Récurrent";
      case "good": return "Bon";
      case "very_good": return "Très bon";
      default: return classification;
    }
  };

  const allClientsStats = useMemo(() => {
    return clients.map(client => {
      const clientInvoices = invoices.filter(invoice => invoice.clientId === client.id);
      const totalInvoices = clientInvoices.length;
      const totalRevenue = clientInvoices.reduce((sum, invoice) => {
        if (invoice.type === 'credit_note') {
          return sum - getLastHT(invoice);
        }
        return sum + getLastHT(invoice);
      }, 0);

      // Calculate total paid from actual payments table
      const totalPaid = clientInvoices.reduce((sum, invoice) => {
        const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);
        const invoicePaidAmount = invoicePayments.reduce((pSum, p) => pSum + p.amount, 0);
        return sum + invoicePaidAmount;
      }, 0);

      const outstanding = Math.max(totalRevenue - totalPaid, 0);
      const overdueCount = clientInvoices.filter(invoice => invoice.status === "overdue").length;
      const averageInvoiceAmount = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
      const paymentMethods = uniquePaymentLabels(clientInvoices.map(invoice => invoice.paymentMethod));
      const lastInvoiceDate = clientInvoices
        .map(invoice => invoice.date)
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

      return {
        ...client,
        totalInvoices,
        totalRevenue,
        totalPaid,
        outstanding,
        overdueCount,
        averageInvoiceAmount,
        paymentMethods,
        lastInvoiceDate,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [clients, invoices, payments]);

  const selectedClientData = selectedClient === "all"
    ? null
    : allClientsStats.find(c => c.id === selectedClient);

  const totalClients = allClientsStats.length;
  const totalRevenue = allClientsStats.reduce((sum, client) => sum + client.totalRevenue, 0);
  const totalPaid = allClientsStats.reduce((sum, client) => sum + client.totalPaid, 0);
  const averageClientValue = totalClients > 0 ? totalRevenue / totalClients : 0;

  // Classification distribution
  const classificationData = [
    { name: "Nouveau", value: clients.filter(c => c.classification === "new").length, color: "#6b7280" },
    { name: "Récurrent", value: clients.filter(c => c.classification === "recurring").length, color: "#3b82f6" },
    { name: "Bon", value: clients.filter(c => c.classification === "good").length, color: "#10b981" },
    { name: "Très bon", value: clients.filter(c => c.classification === "very_good").length, color: "#dc2626" },
  ].filter(item => item.value > 0);

  // Revenue by client (top 10)
  const topClientsRevenue = allClientsStats.slice(0, 10).map(client => ({
    name: client.name.length > 15 ? client.name.substring(0, 15) + "..." : client.name,
    revenue: client.totalRevenue,
    paid: client.totalPaid
  }));

  // Debug: Log the data to see what we're working with
  console.log("Top Clients Revenue Data:", topClientsRevenue);

  // Type distribution
  const typeData = [
    { name: "Local", value: clients.filter(c => c.type === "local").length, color: "#dc2626" },
    { name: "International", value: clients.filter(c => c.type === "foreign").length, color: "#3b82f6" },
  ].filter(item => item.value > 0);

  if (invoices.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p>Les statistiques seront disponibles dès que des factures auront été créées.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Statistiques Clients</h1>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sélectionner un client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vue d'ensemble</SelectItem>
            {allClientsStats.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClient === "all" ? (
        <>
          {/* Overall Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClients}</div>
                <p className="text-xs text-gray-500">clients actifs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CA Total</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-gray-500">chiffre d'affaires</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Montant Collecté</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
                <p className="text-xs text-gray-500">
                  {totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0}% du CA
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valeur Moyenne</CardTitle>
                <FileText className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(averageClientValue)}</div>
                <p className="text-xs text-gray-500">par client</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clients Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Clients par CA</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topClientsRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }}
                    />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "CA"]} />
                    <Bar dataKey="revenue" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Classification Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition par Classification</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={classificationData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {classificationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition par Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Methods Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Clients par Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allClientsStats.slice(0, 8).map((client) => (
                    <div key={client.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={`text-white`} style={{ backgroundColor: getClassificationColor(client.classification) }}>
                          {getClassificationLabel(client.classification)}
                        </Badge>
                        <span className="font-medium">{client.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(client.totalRevenue)}</div>
                        <div className="text-sm text-gray-500">{client.totalInvoices} factures</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : selectedClientData && (
        <>
          {/* Individual Client Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span>{selectedClientData.name}</span>
                <Badge className={`text-white`} style={{ backgroundColor: getClassificationColor(selectedClientData.classification) }}>
                  {getClassificationLabel(selectedClientData.classification)}
                </Badge>
                <Badge variant={selectedClientData.type === "local" ? "default" : "secondary"}>
                  {selectedClientData.type === "local" ? "Local" : "International"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold text-blue-600">{selectedClientData.totalInvoices}</p>
                  <p className="text-sm text-gray-600">Factures</p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedClientData.totalRevenue)}</p>
                  <p className="text-sm text-gray-600">CA Total</p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(selectedClientData.totalPaid)}</p>
                  <p className="text-sm text-gray-600">Montant Payé</p>
                </div>

                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                  <p className="text-xl font-bold text-yellow-600">{formatCurrency(selectedClientData.outstanding)}</p>
                  <p className="text-sm text-gray-600">{selectedClientData.overdueCount} facture(s) en retard</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Informations Contact</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Email:</strong> {selectedClientData.email}</p>
                    <p><strong>Téléphone:</strong> {selectedClientData.phone}</p>
                    <p><strong>Adresse:</strong> {selectedClientData.address}</p>
                    {selectedClientData.lastInvoiceDate && (
                      <p><strong>Dernière facture:</strong> {new Date(selectedClientData.lastInvoiceDate).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Informations Fiscales</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>TVA:</strong> {selectedClientData.hasTva ? `${selectedClientData.tvaRate}%` : "Exonéré"}</p>
                    <p><strong>CA Annuel:</strong> {formatCurrency(selectedClientData.revenue ?? selectedClientData.totalRevenue)}</p>
                    <p><strong>Facture Moyenne:</strong> {formatCurrency(selectedClientData.averageInvoiceAmount)}</p>
                    {selectedClientData.paymentMethods.length > 0 && (
                      <p><strong>Modes de paiement:</strong> {selectedClientData.paymentMethods.join(", ")}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
