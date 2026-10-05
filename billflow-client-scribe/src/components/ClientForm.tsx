
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Hash } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

interface ClientFormProps {
  onBack: () => void;
  client?: any; // For editing existing clients
}

export const ClientForm = ({ onBack, client }: ClientFormProps) => {
  const { addClient, updateClient, currentUser, getNextClientCode } = useApp();
  const { toast } = useToast();

  const isAdmin = currentUser?.role === 'admin';

  const [formData, setFormData] = useState({
    code: client?.code || (isAdmin ? getNextClientCode() : ''),
    name: client?.name || "",
    type: client?.type || "local" as "local" | "foreign",
    classification: client?.classification || "new" as "new" | "recurring" | "good" | "very_good",
    email: client?.email || "",
    phone: client?.phone || "",
    address: client?.address || "",
    revenue: client?.revenue || 0,
    hasTva: client?.hasTva ?? true,
    tvaRate: client?.tvaRate || 19,
    articleImposition: client?.articleImposition || client?.taxArticle || "",
    matriculeFiscale: client?.matriculeFiscale || client?.fiscalId || "",
    registreCommerce: client?.registreCommerce || client?.commerceRegistry || "",
    nomContact: client?.nomContact || "",
    telFixe: client?.telFixe || "",
    telMobile: client?.telMobile || "",
    fax: client?.fax || "",
    nis: client?.nis || ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (client) {
        await updateClient(client.id, formData);
        toast({
          title: "Client modifié",
          description: `Le client ${formData.name} a été modifié`,
        });
      } else {
        await addClient(formData);
        toast({
          title: "Client créé",
          description: `Le client ${formData.name} a été créé`,
        });
      }
      onBack();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Une erreur est survenue lors de l'enregistrement du client",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold">{client ? "Modifier Client" : "Nouveau Client"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations Générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Code client — admin only */}
              {isAdmin && (
                <div>
                  <Label htmlFor="code" className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    Code client
                    <span className="text-xs text-muted-foreground ml-1">(auto-généré, modifiable)</span>
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="ex: 101"
                    className="font-mono"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="name">Nom du client *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom de l'entreprise ou du client"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Type de client</Label>
                <Select value={formData.type} onValueChange={(value: "local" | "foreign") =>
                  setFormData(prev => ({ ...prev, type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="foreign">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="classification">Classification</Label>
                <Select value={formData.classification} onValueChange={(value: "new" | "recurring" | "good" | "very_good") =>
                  setFormData(prev => ({ ...prev, classification: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="recurring">Récurrent</SelectItem>
                    <SelectItem value="good">Bon</SelectItem>
                    <SelectItem value="very_good">Très bon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact &amp; Fiscalité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="021 23 45 67"
                />
              </div>
              <div>
                <Label htmlFor="nom_contact">Nom du contact</Label>
                <Input
                  id="nom_contact"
                  value={formData.nomContact}
                  onChange={(e) => setFormData(prev => ({ ...prev, nomContact: e.target.value }))}
                  placeholder="Nom de la personne de contact"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tel_fixe">N° tél fixe</Label>
                  <Input
                    id="tel_fixe"
                    value={formData.telFixe}
                    onChange={(e) => setFormData(prev => ({ ...prev, telFixe: e.target.value }))}
                    placeholder="021 23 45 67"
                  />
                </div>
                <div>
                  <Label htmlFor="tel_mobile">N° tél mobile</Label>
                  <Input
                    id="tel_mobile"
                    value={formData.telMobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, telMobile: e.target.value }))}
                    placeholder="0555 12 34 56"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="fax">N° fax</Label>
                <Input
                  id="fax"
                  value={formData.fax}
                  onChange={(e) => setFormData(prev => ({ ...prev, fax: e.target.value }))}
                  placeholder="021 23 45 68"
                />
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  placeholder="Adresse complète du client"
                />
              </div>
              <div>
                <Label htmlFor="article_imposition">Article d'imposition</Label>
                <Input
                  id="article_imposition"
                  value={formData.articleImposition}
                  onChange={(e) => setFormData(prev => ({ ...prev, articleImposition: e.target.value }))}
                  placeholder="Article d'imposition"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="matricule_fiscale">Matricule fiscale</Label>
                  <Input
                    id="matricule_fiscale"
                    value={formData.matriculeFiscale}
                    onChange={(e) => setFormData(prev => ({ ...prev, matriculeFiscale: e.target.value }))}
                    placeholder="Matricule fiscale"
                  />
                </div>
                <div>
                  <Label htmlFor="registre_commerce">N° registre commerce</Label>
                  <Input
                    id="registre_commerce"
                    value={formData.registreCommerce}
                    onChange={(e) => setFormData(prev => ({ ...prev, registreCommerce: e.target.value }))}
                    placeholder="N° registre commerce"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="nis">NIS (N° Identification Statistique)</Label>
                <Input
                  id="nis"
                  value={formData.nis}
                  onChange={(e) => setFormData(prev => ({ ...prev, nis: e.target.value }))}
                  placeholder="ex: 0006 161105986 39"
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="revenue">CA Prévisionnel (DZD)</Label>
                <Input
                  id="revenue"
                  type="number"
                  value={formData.revenue}
                  onChange={(e) => setFormData(prev => ({ ...prev, revenue: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasTva"
                    checked={formData.hasTva}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      hasTva: e.target.checked,
                      tvaRate: e.target.checked ? 19 : 0
                    }))}
                  />
                  <Label htmlFor="hasTva">Client assujetti à la TVA</Label>
                </div>
                {formData.hasTva && (
                  <div>
                    <Label htmlFor="tvaRate">Taux TVA (%)</Label>
                    <Input
                      id="tvaRate"
                      type="number"
                      value={formData.tvaRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, tvaRate: Number(e.target.value) }))}
                      placeholder="19"
                      min="0"
                      max="100"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onBack}>
            Annuler
          </Button>
          <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Enregistrement..." : (client ? "Modifier" : "Enregistrer") + " le Client"}
          </Button>
        </div>
      </form>
    </div>
  );
};
