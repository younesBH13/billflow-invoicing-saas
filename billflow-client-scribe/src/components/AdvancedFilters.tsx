
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, X } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AdvancedFiltersProps {
  onFiltersChange: (filters: any) => void;
  filterType: "invoices" | "clients";
}

export const AdvancedFilters = ({ onFiltersChange, filterType }: AdvancedFiltersProps) => {
  const [filters, setFilters] = useState({
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    amountMin: "",
    amountMax: "",
    status: "all",
    type: "all",
    classification: "all",
    clientType: "all"
  });

  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);

  const applyFilters = () => {
    onFiltersChange(filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      dateFrom: undefined,
      dateTo: undefined,
      amountMin: "",
      amountMax: "",
      status: "all",
      type: "all",
      classification: "all",
      clientType: "all"
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtres Avancés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date de début</Label>
            <Popover open={showDateFrom} onOpenChange={setShowDateFrom}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => {
                    updateFilter("dateFrom", date);
                    setShowDateFrom(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Date de fin</Label>
            <Popover open={showDateTo} onOpenChange={setShowDateTo}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => {
                    updateFilter("dateTo", date);
                    setShowDateTo(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <Label>Montant min (DA)</Label>
            <Input
              type="number"
              value={filters.amountMin}
              onChange={(e) => updateFilter("amountMin", e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Montant max (DA)</Label>
            <Input
              type="number"
              value={filters.amountMax}
              onChange={(e) => updateFilter("amountMax", e.target.value)}
              placeholder="999999999"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filterType === "invoices" && (
            <>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="paid">Payée</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="overdue">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={filters.type} onValueChange={(value) => updateFilter("type", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="proforma">Proforma</SelectItem>
                    <SelectItem value="definitive">Définitive</SelectItem>
                    <SelectItem value="credit_note">Avoir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {filterType === "clients" && (
            <>
              <div className="space-y-2">
                <Label>Type de client</Label>
                <Select value={filters.clientType} onValueChange={(value) => updateFilter("clientType", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="foreign">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Classification</Label>
                <Select value={filters.classification} onValueChange={(value) => updateFilter("classification", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classifications</SelectItem>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="recurring">Récurrent</SelectItem>
                    <SelectItem value="good">Bon</SelectItem>
                    <SelectItem value="very_good">Très bon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={applyFilters} className="bg-red-600 hover:bg-red-700">
            <Filter className="w-4 h-4 mr-2" />
            Appliquer les filtres
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            Effacer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
