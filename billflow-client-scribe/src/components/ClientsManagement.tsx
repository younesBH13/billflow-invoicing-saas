import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { exportClientsToExcel } from "@/utils/exportUtils";
import { AdvancedFilters } from "./AdvancedFilters";
import { Download } from "lucide-react";
import { ClientForm } from "./ClientForm";
import { useToast } from "@/hooks/use-toast";

interface ClientsManagementProps {
  onNavigate: (section: string) => void;
}

export const ClientsManagement = ({ onNavigate }: ClientsManagementProps) => {
  const { clients, deleteClient } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "local" | "foreign">("all");
  const [sortBy, setSortBy] = useState<"code" | "name">("code");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [editingClient, setEditingClient] = useState<any>(null);
  const { toast } = useToast();

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "new": return "bg-gray-500";
      case "recurring": return "bg-blue-500";
      case "good": return "bg-green-500";
      case "very_good": return "bg-red-500";
      default: return "bg-gray-500";
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

  const applyAdvancedFilters = (client: any) => {
    if (advancedFilters.amountMin && client.revenue < parseFloat(advancedFilters.amountMin)) return false;
    if (advancedFilters.amountMax && client.revenue > parseFloat(advancedFilters.amountMax)) return false;
    if (advancedFilters.clientType !== "all" && client.type !== advancedFilters.clientType) return false;
    if (advancedFilters.classification !== "all" && client.classification !== advancedFilters.classification) return false;
    return true;
  };

  const filteredClients = clients
    .filter(client => {
      if (filterType !== "all" && client.type !== filterType) return false;
      if (searchTerm && !client.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !client.code.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (showAdvancedFilters && !applyAdvancedFilters(client)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "code") return a.code.localeCompare(b.code);
      return a.name.localeCompare(b.name);
    });

  const handleDeleteClient = (clientId: string, clientName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}" ? Cette action est irréversible.`)) {
      deleteClient(clientId);
      toast({
        title: "Client supprimé",
        description: `Le client ${clientName} a été supprimé`,
      });
    }
  };

  if (editingClient) {
    return <ClientForm client={editingClient} onBack={() => setEditingClient(null)} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestion des Clients</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => exportClientsToExcel(filteredClients)}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700"
            onClick={() => onNavigate("new-client")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Client
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
            <Button 
              variant="outline" 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              Filtres avancés
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par nom ou code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(value: "all" | "local" | "foreign") => setFilterType(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type de client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="foreign">International</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: "code" | "name") => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code">Code client</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {showAdvancedFilters && (
        <AdvancedFilters 
          filterType="clients" 
          onFiltersChange={setAdvancedFilters} 
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Liste des Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>TVA</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>CA Annuel</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-mono">{client.code}</TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <Badge variant={client.type === "local" ? "default" : "secondary"}>
                      {client.type === "local" ? "Local" : "International"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getClassificationColor(client.classification)}>
                      {getClassificationLabel(client.classification)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.hasTva ? "default" : "secondary"}>
                      {client.hasTva ? `${client.tvaRate}%` : "Exonéré"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{client.email}</div>
                      <div className="text-gray-500">{client.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {client.revenue.toLocaleString('fr-FR')} DZD
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingClient(client)}
                      >
                        Modifier
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
