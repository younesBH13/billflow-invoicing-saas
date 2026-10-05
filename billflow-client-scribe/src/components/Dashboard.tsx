
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, Users, FileText, Truck, DollarSign } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { getLastHT } from "@/utils/invoiceTotals";

interface DashboardProps {
  onNavigate: (section: string) => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { clients, invoices, payments, currentUser } = useApp();
  const isCommercial = currentUser?.role === "commercial";


  // Calculate real statistics from actual data
  const validInvoices = invoices.filter(inv => inv.type !== 'proforma' && inv.status !== 'cancelled');

  const totalRevenue = validInvoices.reduce((sum, inv) => {
    if (inv.type === 'credit_note') {
      return sum - getLastHT(inv);
    }
    return sum + getLastHT(inv);
  }, 0);
  const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const activeClients = clients.length;
  const monthlyInvoices = validInvoices.filter(inv => {
    const invoiceDate = new Date(inv.date);
    const currentMonth = new Date().getMonth();
    return invoiceDate.getMonth() === currentMonth;
  }).length;


  // Calculate monthly revenue from actual invoices
  const currentYear = new Date().getFullYear();
  const monthlyRevenueMap = new Map<number, number>();

  // Initialize all months with 0
  for (let i = 1; i <= 12; i++) {
    monthlyRevenueMap.set(i, 0);
  }

  // Sum up invoices by month using last Montant HT
  validInvoices.forEach(invoice => {
    const invoiceDate = new Date(invoice.date);
    if (invoiceDate.getFullYear() === currentYear) {
      const month = invoiceDate.getMonth() + 1; // 1-12
      const amount = invoice.type === 'credit_note' ? -getLastHT(invoice) : getLastHT(invoice);
      monthlyRevenueMap.set(month, (monthlyRevenueMap.get(month) || 0) + amount);
    }
  });

  const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const monthlyRevenue = Array.from(monthlyRevenueMap.entries()).map(([month, revenue]) => ({
    month: monthNames[month - 1],
    revenue
  }));

  const invoiceStatusData = [
    {
      name: "Payées",
      value: validInvoices.filter(inv => inv.status === "paid").length,
      color: "#dc2626"
    },
    {
      name: "En attente",
      value: validInvoices.filter(inv => inv.status === "pending").length,
      color: "#fbbf24"
    },
    {
      name: "En retard",
      value: validInvoices.filter(inv => inv.status === "overdue").length,
      color: "#6b7280"
    },
  ];

  const clientTypes = [
    {
      name: "Locaux",
      value: clients.filter(client => client.type === "local").length
    },
    {
      name: "Internationaux",
      value: clients.filter(client => client.type === "foreign").length
    },
  ];

  const allStats = [
    {
      title: "Chiffre d'Affaires",
      value: `${totalRevenue.toLocaleString('fr-FR')} DZD`,
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      adminOnly: true,
    },
    {
      title: "Clients Actifs",
      value: activeClients.toString(),
      change: "+3",
      trend: "up",
      icon: Users,
      adminOnly: false,
    },
    {
      title: "Factures du Mois",
      value: monthlyInvoices.toString(),
      change: "+8",
      trend: "up",
      icon: FileText,
      adminOnly: false,
    },
    {
      title: "Montant Collecté",
      value: `${totalCollected.toLocaleString('fr-FR')} DZD`,
      change: `${payments.length} paiements`,
      trend: "up",
      icon: TrendingUp,
      adminOnly: true,
    },
  ];

  const stats = isCommercial ? allStats.filter(s => !s.adminOnly) : allStats;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Tableau de Bord</h1>
        <div className="text-sm text-gray-500">
          Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center space-x-1 text-xs">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
                    {stat.change}
                  </span>
                  <span className="text-gray-500">ce mois</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart - Admin only */}
        {!isCommercial && (
          <Card>
            <CardHeader>
              <CardTitle>Chiffre d'Affaires Mensuel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    width={80}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                      return value;
                    }}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toLocaleString('fr-FR')} DZD`,
                      "CA"
                    ]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#dc2626"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Invoice Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Statut des Factures</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={invoiceStatusData.filter(d => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {invoiceStatusData.filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Types Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientTypes} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="value" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.slice(0, 4).map((invoice) => (
                <div key={invoice.id} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${invoice.status === 'paid' ? 'bg-green-500' :
                    invoice.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Facture {invoice.number} {invoice.status === 'paid' ? 'payée' :
                        invoice.status === 'pending' ? 'en attente' : 'en retard'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(invoice.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="p-4 border border-gray-200 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
              onClick={() => onNavigate("new-invoice")}
            >
              <FileText className="w-8 h-8 text-red-600 mb-2" />
              <h3 className="font-medium">Nouvelle Facture</h3>
              <p className="text-sm text-gray-500">Créer une nouvelle facture</p>
            </div>
            <div
              className="p-4 border border-gray-200 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
              onClick={() => onNavigate("new-client")}
            >
              <Users className="w-8 h-8 text-red-600 mb-2" />
              <h3 className="font-medium">Nouveau Client</h3>
              <p className="text-sm text-gray-500">Ajouter un nouveau client</p>
            </div>
            <div
              className="p-4 border border-gray-200 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
              onClick={() => onNavigate("delivery")}
            >
              <Truck className="w-8 h-8 text-red-600 mb-2" />
              <h3 className="font-medium">Nouveau Bordereau</h3>
              <p className="text-sm text-gray-500">Créer un bordereau de livraison</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { Dashboard };
