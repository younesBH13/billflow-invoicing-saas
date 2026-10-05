import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, FileText, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { calculateTimbreAmount } from "@/utils/invoicePreview";
import { normalizePaymentMethod } from "@/utils/paymentMethods";

// Helper function to get current date in local timezone (not UTC)
const getCurrentLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface InvoiceLine {
  id: string;
  type: "text" | "quantity" | "amount";
  designation: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  total: number;
}

interface InvoiceFormProps {
  onBack: () => void;
}

export const InvoiceForm = ({ onBack }: InvoiceFormProps) => {
  const { clients, addInvoice, getNextInvoiceNumber } = useApp();
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("");
  const [isLoadingNumber, setIsLoadingNumber] = useState(false);

  const [formData, setFormData] = useState({
    type: "definitive" as "proforma" | "definitive" | "credit_note",
    clientId: "",
    date: getCurrentLocalDate(), // Use local timezone instead of UTC
    projectName: "",
    billingPeriod: "",
    paymentMethod: "",
    contractRef: "",
    affairNumber: "",
    orderRef: "",
    prestation: "",
    observations: "",
    status: "pending" as "paid" | "pending" | "overdue",
    ref_convention: "",
    tx_retenue_garantie: 0,
    tx_remise_percent: 0,
    montant_remise: 0,
    advance_amount: 0,
    advance_percentage: "0",
    company_entity: "principal" as "principal" | "secondary"
  });


  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: "1", type: "quantity", designation: "Inspection électrique", unit: "h", quantity: 8, unitPrice: 75, total: 600 }
  ]);

  const addLine = (type: "text" | "quantity" | "amount") => {
    const newLine: InvoiceLine = {
      id: Date.now().toString(),
      type,
      designation: "",
      unit: type !== "text" ? "unité" : undefined,
      quantity: type === "quantity" ? 1 : undefined,
      unitPrice: type === "quantity" ? 0 : undefined,
      total: 0
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(line => line.id !== id));
  };

  const updateLine = (id: string, updates: Partial<InvoiceLine>) => {
    setLines(prev => prev.map(line => {
      if (line.id === id) {
        const updated = { ...line, ...updates };
        if (updated.type === "quantity" && updated.quantity && updated.unitPrice) {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return line;
    }));
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
  const tvaRate = selectedClient?.hasTva ? selectedClient.tvaRate : 0;
  const tvaAmount = subtotal * (tvaRate / 100);
  const totalAmount = subtotal + tvaAmount;
  const normalizedPayment = normalizePaymentMethod(formData.paymentMethod);
  const timbreAmount = calculateTimbreAmount(normalizedPayment, totalAmount);
  const uiAdvanceAmount = Number(formData.advance_percentage) > 0
    ? Math.round(subtotal * (Number(formData.advance_percentage) / 100) * 100) / 100
    : (formData.advance_amount || 0);
  const netToPay = Math.max(totalAmount + timbreAmount - uiAdvanceAmount, 0);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingNumber(true);

    getNextInvoiceNumber(formData.type)
      .then(number => {
        if (isMounted) {
          setNextInvoiceNumber(number);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNextInvoiceNumber("-");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingNumber(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [formData.type, getNextInvoiceNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client",
        variant: "destructive",
      });
      return;
    }

    const invoiceNumber = nextInvoiceNumber || await getNextInvoiceNumber(formData.type);

    const effectiveAdvanceAmount = Number(formData.advance_percentage) > 0
      ? Math.round(subtotal * (Number(formData.advance_percentage) / 100) * 100) / 100
      : formData.advance_amount;

    const invoiceData = {
      ...formData,
      number: invoiceNumber,
      client: selectedClient?.name,
      amount: totalAmount,
      tva_rate: tvaRate, // Include VAT rate (will be 0 if client is VAT-exempt)
      advance_amount: effectiveAdvanceAmount, // Use the calculated effective advance amount
      advance_percentage: Number(formData.advance_percentage),
      timbre_amount: timbreAmount,
      lines: lines,
      prestation: formData.prestation,
      company_entity: formData.company_entity,
      companyEntity: formData.company_entity,
    };

    setIsSubmitting(true);

    try {
      await addInvoice(invoiceData);

      toast({
        title: "Facture créée",
        description: `La facture ${invoiceNumber} a été créée`,
      });

      onBack();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Impossible de créer la facture';
      toast({
        title: "Erreur",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentInvoiceData = () => {
    const selectedClient = clients.find(c => c.id === formData.clientId);
    const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
    const tvaRate = selectedClient?.hasTva ? selectedClient.tvaRate : 0;
    const tvaAmount = subtotal * (tvaRate / 100);
    const totalAmount = subtotal + tvaAmount;

    const effectiveAdvanceAmountForPreview = Number(formData.advance_percentage) > 0
      ? Math.round(subtotal * (Number(formData.advance_percentage) / 100) * 100) / 100
      : formData.advance_amount;

    return {
      id: "preview",
      number: isLoadingNumber ? "..." : nextInvoiceNumber,
      date: formData.date,
      type: formData.type,
      client: selectedClient?.name || "Client non sélectionné",
      amount: totalAmount,
      status: formData.status,
      paymentMethod: formData.paymentMethod,
      projectName: formData.projectName,
      prestation: formData.prestation,
      affairNumber: formData.affairNumber,
      billingPeriod: formData.billingPeriod,
      contractRef: formData.contractRef,
      orderRef: formData.orderRef,
      observations: formData.observations,
      advance_payment: effectiveAdvanceAmountForPreview,
      timbre_amount: timbreAmount,
      lines: lines,
      tvaRate: tvaRate,
      advance_percentage: Number(formData.advance_percentage),
      company_entity: formData.company_entity,
      companyEntity: formData.company_entity,
    };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold">Nouvelle Facture</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={!formData.clientId}
          >
            <FileText className="w-4 h-4 mr-2" />
            Aperçu
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Facture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice-number">Numéro</Label>
                  <Input
                    id="invoice-number"
                    value={isLoadingNumber ? "..." : nextInvoiceNumber}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-date">Date</Label>
                  <Input
                    id="invoice-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice-type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "proforma" | "definitive" | "credit_note") =>
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proforma">Proforma</SelectItem>
                      <SelectItem value="definitive">Définitive</SelectItem>
                      <SelectItem value="credit_note">Avoir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="company-entity">Registre de Commerce</Label>
                  <Select
                    value={formData.company_entity}
                    onValueChange={(value: "principal" | "secondary") =>
                      setFormData(prev => ({ ...prev, company_entity: value }))
                    }
                  >
                    <SelectTrigger id="company-entity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principal">🏢 RC Principal (00/16)</SelectItem>
                      <SelectItem value="secondary">🏬 RC Secondaire (01/16)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="project-name">Nom du projet</Label>
                <Input
                  id="project-name"
                  placeholder="Nom du projet ou mission"
                  value={formData.projectName}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="prestation">Prestation</Label>
                <Input
                  id="prestation"
                  placeholder="Description de la prestation"
                  value={formData.prestation}
                  onChange={(e) => setFormData(prev => ({ ...prev, prestation: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="affair-number">N° d'affaire</Label>
                <Input
                  id="affair-number"
                  placeholder="NA-2024-001"
                  value={formData.affairNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, affairNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="billing-period">Période de facturation</Label>
                <Input
                  id="billing-period"
                  placeholder="ex: Janvier 2024"
                  value={formData.billingPeriod}
                  onChange={(e) => setFormData(prev => ({ ...prev, billingPeriod: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="client">Sélectionner un client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.code} - {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment-method">Mode de paiement</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mode de paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                    <SelectItem value="card">Carte bancaire</SelectItem>
                    <SelectItem value="cash">Espèces</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contract-ref">Réf. contrat</Label>
                  <Input
                    id="contract-ref"
                    placeholder="Numéro de contrat"
                    value={formData.contractRef}
                    onChange={(e) => setFormData(prev => ({ ...prev, contractRef: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="order-ref">Réf. commande</Label>
                  <Input
                    id="order-ref"
                    placeholder="Bon de commande"
                    value={formData.orderRef}
                    onChange={(e) => setFormData(prev => ({ ...prev, orderRef: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ref-convention">Ref convention</Label>
                  <Input
                    id="ref-convention"
                    placeholder="Référence convention"
                    value={formData.ref_convention}
                    onChange={(e) => setFormData(prev => ({ ...prev, ref_convention: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="advance-percentage">Acompte (%)</Label>
                  <Input
                    id="advance-percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01" // Allow decimals
                    placeholder="0"
                    value={formData.advance_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, advance_percentage: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="advance-amount">Montant acompte</Label>
                  <Input
                    id="advance-amount"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.advance_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, advance_amount: Number(e.target.value) }))}
                    disabled={Number(formData.advance_percentage) > 0}
                    className={Number(formData.advance_percentage) > 0 ? "bg-slate-50 opacity-50" : ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tx-retenue-garantie">Tx retenue garantie (%)</Label>
                  <Input
                    id="tx-retenue-garantie"
                    type="number"
                    placeholder="0"
                    value={formData.tx_retenue_garantie}
                    onChange={(e) => setFormData(prev => ({ ...prev, tx_retenue_garantie: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="tx-remise-percent">Tx remise (%)</Label>
                  <Input
                    id="tx-remise-percent"
                    type="number"
                    placeholder="0"
                    value={formData.tx_remise_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, tx_remise_percent: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="montant-remise">Montant remise</Label>
                  <Input
                    id="montant-remise"
                    type="number"
                    placeholder="0"
                    value={formData.montant_remise}
                    onChange={(e) => setFormData(prev => ({ ...prev, montant_remise: Number(e.target.value) }))}
                  />
                </div>
              </div>
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
            </CardContent>
          </Card>
        </div>

        {/* Invoice Lines */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lignes de Facturation</CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addLine("text")}>
                  <Plus className="w-4 h-4 mr-1" />
                  Texte
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addLine("quantity")}>
                  <Plus className="w-4 h-4 mr-1" />
                  Quantité
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addLine("amount")}>
                  <Plus className="w-4 h-4 mr-1" />
                  Montant
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Qté</TableHead>
                  <TableHead>P.U.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Badge variant={line.type === "text" ? "secondary" : line.type === "quantity" ? "default" : "outline"}>
                        {line.type === "text" ? "Texte" : line.type === "quantity" ? "Qté" : "Montant"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.designation}
                        placeholder="Description..."
                        onChange={(e) => updateLine(line.id, { designation: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      {line.type !== "text" && (
                        <Input
                          value={line.unit}
                          className="w-20"
                          onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {line.type === "quantity" && (
                        <Input
                          type="number"
                          value={line.quantity}
                          className="w-20"
                          onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {line.type === "quantity" && (
                        <Input
                          type="number"
                          value={line.unitPrice}
                          className="w-24"
                          onChange={(e) => updateLine(line.id, { unitPrice: Number(e.target.value) })}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.total}
                        className="w-24"
                        onChange={(e) => updateLine(line.id, { total: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="outline" size="sm" onClick={() => removeLine(line.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total HT:</span>
                  <span className="font-medium">{subtotal.toFixed(2)} DZD</span>
                </div>
                {selectedClient?.hasTva ? (
                  <div className="flex justify-between">
                    <span>TVA ({tvaRate}%):</span>
                    <span className="font-medium">{tvaAmount.toFixed(2)} DZD</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>TVA:</span>
                    <span>Exonéré</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total {selectedClient?.hasTva ? 'TTC' : 'HT'}:</span>
                  <span>{totalAmount.toFixed(2)} DZD</span>
                </div>
                {timbreAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Timbre (espèces) :</span>
                    <span className="font-medium">{timbreAmount.toFixed(2)} DZD</span>
                  </div>
                )}
                {uiAdvanceAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-700">
                    <span>Avancement :</span>
                    <span className="font-medium">-{uiAdvanceAmount.toFixed(2)} DZD</span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Net à payer :</span>
                  <span>{netToPay.toFixed(2)} DZD</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onBack}>
            Annuler
          </Button>
          <Button
            type="submit"
            className="bg-red-600 hover:bg-red-700"
            disabled={isSubmitting}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Enregistrement..." : "Enregistrer la Facture"}
          </Button>
        </div>
      </form>

      {showPreview && (
        <InvoiceTemplate
          invoice={getCurrentInvoiceData()}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};
