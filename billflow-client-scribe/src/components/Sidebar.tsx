
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  FileText,
  Truck,
  Settings,
  LogOut,
  CreditCard,
  BarChart3,
  TrendingUp,
  X
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ activeSection, setActiveSection, isOpen, onToggle }: SidebarProps) => {
  const { logout, currentUser } = useApp();

  const menuItems = [
    {
      id: "dashboard",
      label: "Tableau de Bord",
      icon: LayoutDashboard,
    },
    {
      id: "clients",
      label: "Clients",
      icon: Users,
    },
    {
      id: "invoices",
      label: "Factures",
      icon: FileText,
    },
    {
      id: "payments",
      label: "Paiements",
      icon: CreditCard,
    },
    {
      id: "delivery",
      label: "Bordereaux",
      icon: Truck,
    },
    {
      id: "client-stats",
      label: "Statistiques Clients",
      icon: BarChart3,
    },
    {
      id: "reports",
      label: "Rapports Avancés",
      icon: TrendingUp,
    },
    {
      id: "quotes",
      label: "Offres Commerciales",
      icon: FileText,
    },
    {
      id: "templates",
      label: "Modèles Documents",
      icon: FileText,
    },
    {
      id: "settings",
      label: "Paramètres",
      icon: Settings,
    },
  ];

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    // Close sidebar on mobile when a menu item is clicked
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  return (
    <>
      {/* Backdrop overlay on mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <div
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-sm z-50 transition-transform duration-200 ease-in-out",
          // On mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full",
          // On desktop: always visible
          "lg:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Inspection Power" className="w-10 h-10 object-contain" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Inspection Power</h2>
            </div>
          </div>
          {/* Close button visible only on mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-1"
            onClick={onToggle}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="px-4 space-y-1">
          {menuItems.map((item) => {
            // Hide these sections from commercial users
            if (currentUser?.role === "commercial") {
              if (["client-stats", "reports", "payments"].includes(item.id)) {
                return null;
              }
            }

            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start space-x-2 h-11",
                  activeSection === item.id && "bg-red-50 text-red-600 hover:bg-red-50"
                )}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="mb-3 text-sm text-gray-600">
            <p className="font-medium">{currentUser?.name}</p>
            <p className="text-xs">{currentUser?.role === "admin" ? "Administrateur" : "Commercial"}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start space-x-2 text-red-600 hover:bg-red-50"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </Button>
        </div>
      </div>
    </>
  );
};
