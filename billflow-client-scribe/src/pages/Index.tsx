
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { ClientsManagement } from "@/components/ClientsManagement";
import { InvoicesManagement } from "@/components/InvoicesManagement";
import { DeliveryNotes } from "@/components/DeliveryNotes";
import { Settings } from "@/components/Settings";
import { PaymentTracking } from "@/components/PaymentTracking";
import { ClientStatistics } from "@/components/ClientStatistics";
import { AdvancedReporting } from "@/components/AdvancedReporting";
import { DocumentTemplates } from "@/components/DocumentTemplates";
import { QuotesManagement } from "@/components/QuotesManagement";
import { InvoiceForm } from "@/components/InvoiceForm";
import { ClientForm } from "@/components/ClientForm";
import { Login } from "@/components/Login";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppContent = () => {
  const { currentUser } = useApp();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If not logged in, show login
  if (!currentUser) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveSection} />;
      case "clients":
        return <ClientsManagement onNavigate={setActiveSection} />;
      case "invoices":
        return <InvoicesManagement onNavigate={setActiveSection} />;
      case "delivery":
        return <DeliveryNotes />;
      case "payments":
        return currentUser.role === 'admin' ? <PaymentTracking /> : <Dashboard onNavigate={setActiveSection} />;
      case "client-stats":
        return <ClientStatistics />;
      case "reports":
        return <AdvancedReporting />;
      case "quotes":
        return <QuotesManagement />;
      case "templates":
        return <DocumentTemplates />;
      case "settings":
        return <Settings />;
      case "new-invoice":
        return <InvoiceForm onBack={() => setActiveSection("invoices")} />;
      case "new-client":
        return <ClientForm onBack={() => setActiveSection("clients")} />;
      default:
        return <Dashboard onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main content area — offset on desktop (lg+), full-width on mobile */}
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Mobile header bar — visible only below lg */}
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="p-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-semibold text-gray-900">Inspection Power</span>
        </div>

        {renderContent()}
      </main>
    </div>
  );
};

const Index = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default Index;
