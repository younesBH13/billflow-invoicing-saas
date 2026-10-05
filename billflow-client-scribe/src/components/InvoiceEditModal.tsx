
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Save, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  number: string;
  date: string;
  type: "proforma" | "definitive" | "credit_note";
  client: string;
  clientId: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  paymentMethod?: string;
  company_entity?: "principal" | "secondary";
  companyEntity?: "principal" | "secondary";
  lines: any[];
  projectName?: string;
  billingPeriod?: string;
  contractRef?: string;
  orderRef?: string;
  ref_convention?: string;
  observations?: string;
  tx_remise_percent?: number;
  montant_remise?: number;
  tx_retenue_garantie?: number;
  txRemisePercent?: number;
  montantRemise?: number;
  txRetenueGarantie?: number;
}

interface InvoiceEditModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoiceEditModal = ({ invoice, onClose }: InvoiceEditModalProps) => {
  const { updateInvoice, convertInvoiceType, formatCurrency } = useApp();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    status: invoice.status,
    company_entity: (invoice.company_entity || invoice.companyEntity || 'principal') as "principal" | "secondary",
    paymentMethod: invoice.paymentMethod || "",
    projectName: invoice.projectName || "",
    billingPeriod: invoice.billingPeriod || "",
    contractRef: invoice.contractRef || "",
    orderRef: invoice.orderRef || "",
    ref_convention: invoice.ref_convention || "",
    observations: invoice.observations || "",
    tx_remise_percent: invoice.tx_remise_percent ?? invoice.txRemisePercent ?? 0,
    montant_remise: invoice.montant_remise ?? invoice.montantRemise ?? 0,
    tx_retenue_garantie: invoice.tx_retenue_garantie ?? invoice.txRetenueGarantie ?? 0,
  });

  const handleSave = async () => {
    try {
      await updateInvoice(invoice.id, formData);
      toast({
        title: "Facture mise à jour",
        description: "Les modifications ont été enregistrées",
      });
      onClose();
    } catch (error) {
      const description = error instanceof Error ? error.message : "Impossible d'enregistrer les modifications";
      toast({
        title: "Erreur",
        description,
        variant: "destructive",
      });
    }
  };

  const handleConvertType = (newType: "proforma" | "definitive" | "credit_note") => {
    if (newType === invoice.type) return;

    convertInvoiceType(invoice.id, newType);
    toast({
      title: "Facture convertie",
      description: `Une nouvelle facture ${newType === 'credit_note' ? 'avoir' : newType} a été créée`,
    });
    onClose();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid": return "Payée";
      case "pending": return "En attente";
      case "overdue": return "En retard";
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "proforma": return "Proforma";
      case "definitive": return "Définitive";
      case "credit_note": return "Avoir";
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Modifier la Facture</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{invoice.number}</Badge>
              <Badge className={
                invoice.type === "proforma" ? "bg-yellow-500" :
                  invoice.type === "definitive" ? "bg-green-500" : "bg-red-500"
              }>
                {getTypeLabel(invoice.type)}
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label>Client</Label>
              <p className="font-medium">{invoice.client}</p>
            </div>
            <div>
              <Label>Montant</Label>
              <p className="font-medium">{formatCurrency(invoice.amount)}</p>
            </div>
            <div>
              <Label>Date</Label>
              <p>{new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <Label>Statut actuel</Label>
              <Badge className={
                invoice.status === "paid" ? "bg-green-500" :
                  invoice.status === "pending" ? "bg-yellow-500" : "bg-red-500"
              }>
                {getStatusLabel(invoice.status)}
              </Badge>
            </div>
          </div>

          {/* Status Update */}
          <div>
            <Label htmlFor="status">Nouveau Statut</Label>
            <Select
              value={formData.status}
              onValueChange={(value: Invoice["status"]) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Company Entity / Registre de Commerce */}
          <div>
            <Label htmlFor="company_entity">Registre de Commerce</Label>
            <Select
              value={formData.company_entity}
              onValueChange={(value: "principal" | "secondary") => setFormData(prev => ({ ...prev, company_entity: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principal">RC Principal (00/16)</SelectItem>
                <SelectItem value="secondary">RC Secondaire (01/16)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div>
            <Label htmlFor="paymentMethod">Mode de paiement</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
                <SelectItem value="cash">Espèces</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectName">Nom du projet</Label>
              <Input
                id="projectName"
                value={formData.projectName}
                onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                placeholder="Nom du projet"
              />
            </div>
            <div>
              <Label htmlFor="billingPeriod">Période</Label>
              <Input
                id="billingPeriod"
                value={formData.billingPeriod}
                onChange={(e) => setFormData(prev => ({ ...prev, billingPeriod: e.target.value }))}
                placeholder="Période de facturation"
              />
            </div>
          </div>

          {/* References */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contractRef">Réf. contrat</Label>
              <Input
                id="contractRef"
                value={formData.contractRef}
                onChange={(e) => setFormData(prev => ({ ...prev, contractRef: e.target.value }))}
                placeholder="Numéro de contrat"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="orderRef">Réf. commande</Label>
            <Input
              id="orderRef"
              value={formData.orderRef}
              onChange={(e) => setFormData(prev => ({ ...prev, orderRef: e.target.value }))}
              placeholder="Bon de commande"
            />
          </div>
          <div>
            <Label htmlFor="ref_convention">Réf. Convention</Label>
            <Input
              id="ref_convention"
              value={formData.ref_convention}
              onChange={(e) => setFormData(prev => ({ ...prev, ref_convention: e.target.value }))}
              placeholder="Réf. Convention"
            />
          </div>

          {/* Remise & Retenue */}
          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 space-y-3">
            <h4 className="text-sm font-semibold text-amber-900">Remise & Ajustements</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tx_remise_percent">Taux Remise (%)</Label>
                <Input
                  id="tx_remise_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tx_remise_percent || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tx_remise_percent: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="montant_remise">Montant Remise (DZD)</Label>
                <Input
                  id="montant_remise"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.montant_remise || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, montant_remise: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tx_retenue_garantie">Retenue de garantie (%)</Label>
              <Input
                id="tx_retenue_garantie"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tx_retenue_garantie || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tx_retenue_garantie: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Observations */}
          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              rows={3}
              placeholder="Remarques particulières..."
              value={formData.observations}
              onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
            />
          </div>

          {/* Convert Type Actions */}
          <div>
            <Label>Convertir en</Label>
            <div className="flex gap-2 mt-2">
              {invoice.type !== "proforma" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConvertType("proforma")}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Proforma
                </Button>
              )}
              {invoice.type !== "definitive" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConvertType("definitive")}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Définitive
                </Button>
              )}
              {invoice.type !== "credit_note" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConvertType("credit_note")}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Avoir
                </Button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div >
  );
};
