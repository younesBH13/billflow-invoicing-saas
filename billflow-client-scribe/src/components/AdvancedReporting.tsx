import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import { getLastHT } from '@/utils/invoiceTotals';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#16a34a',
  overdue: '#dc2626',
  cancelled: '#6b7280',
};

const SERVICE_COLORS = ['#dc2626', '#2563eb', '#10b981', '#f59e0b', '#7c3aed', '#0ea5e9'];

export const AdvancedReporting: React.FC = () => {
  const { invoices, clients, payments, formatCurrency } = useApp();

  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce((sum, invoice) => {
      if (invoice.type === 'credit_note') {
        return sum - getLastHT(invoice);
      }
      return sum + getLastHT(invoice);
    }, 0);

    // Calculate total paid from actual payments table
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    const outstanding = Math.max(totalRevenue - totalPaid, 0);

    const statusCounts = invoices.reduce<Record<string, number>>((acc, invoice) => {
      acc[invoice.status] = (acc[invoice.status] ?? 0) + 1;
      return acc;
    }, {});

    const monthlyMap = new Map<string, number>();
    invoices.forEach(invoice => {
      if (!invoice.date) {
        return;
      }
      const date = new Date(invoice.date);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = invoice.type === 'credit_note' ? -getLastHT(invoice) : getLastHT(invoice);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + amount);
    });

    const monthlyRevenue = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, revenue]) => ({ month, revenue }));

    const clientNames = new Map<string, string>();
    clients.forEach(client => {
      clientNames.set(client.id, client.name);
    });

    const topClientsMap = new Map<string, { name: string; revenue: number }>();
    invoices.forEach(invoice => {
      const key = invoice.clientId || invoice.client;
      if (!key) {
        return;
      }
      const entry = topClientsMap.get(key) ?? {
        name: clientNames.get(key) ?? invoice.client ?? 'Client inconnu',
        revenue: 0,
      };
      const amount = invoice.type === 'credit_note' ? -getLastHT(invoice) : getLastHT(invoice);
      entry.revenue += amount;
      topClientsMap.set(key, entry);
    });

    const topClients = Array.from(topClientsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const serviceMap = new Map<string, number>();
    invoices.forEach(invoice => {
      const key = invoice.servicePrestation || 'Autres prestations';
      const amount = invoice.type === 'credit_note' ? -getLastHT(invoice) : getLastHT(invoice);
      serviceMap.set(key, (serviceMap.get(key) ?? 0) + amount);
    });

    const serviceBreakdown = Array.from(serviceMap.entries()).map(([service, revenue]) => ({
      service,
      revenue,
    }));

    return {
      totalInvoices,
      totalRevenue,
      totalPaid,
      outstanding,
      statusCounts,
      monthlyRevenue,
      topClients,
      serviceBreakdown,
    };
  }, [invoices, clients, payments]);

  if (invoices.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p>Aucune donnée disponible pour le moment. Créez des factures pour alimenter les rapports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusData = Object.entries(stats.statusCounts).map(([status, count]) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    count,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Rapports Avancés</h1>
        <p className="text-muted-foreground">Analyse globale de la performance commerciale</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-gray-500">Montant global facturé</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant encaissé</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-xs text-gray-500">{formatCurrency(stats.totalRevenue - stats.totalPaid)} restant à encaisser</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures en cours</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-gray-500">Factures enregistrées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant en souffrance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.outstanding)}</div>
            <p className="text-xs text-gray-500">Différence entre factures et règlements</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Évolution mensuelle du chiffre d'affaires</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={stats.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(label) => `Mois ${label}`} />
                <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value: number, _name, entry) => [`${value}`, entry?.payload?.label ?? '']} />
                <Bar dataKey="count">
                  {statusData.map((entry, index) => (
                    <Cell key={`status-${index}`} fill={STATUS_COLORS[entry.status] ?? '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Prestations les plus facturées</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={stats.serviceBreakdown}
                  dataKey="revenue"
                  nameKey="service"
                  cx="50%"
                  cy="45%"
                  outerRadius={100}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={true}
                >
                  {stats.serviceBreakdown.map((_entry, index) => (
                    <Cell key={`service-${index}`} fill={SERVICE_COLORS[index % SERVICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={80}
                  formatter={(value: string) => {
                    // Truncate long service names for legend
                    return value.length > 30 ? value.substring(0, 27) + '...' : value;
                  }}
                  wrapperStyle={{ paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topClients.map((client, index) => (
                <div key={client.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg text-red-600">{index + 1}.</span>
                    <span className="font-medium">{client.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(client.revenue)}</div>
                  </div>
                </div>
              ))}
              {stats.topClients.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun client n'a encore généré de chiffre d'affaires.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedReporting;
