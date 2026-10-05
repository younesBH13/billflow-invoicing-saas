import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, Copy, FileText } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

type TemplateType = "invoice" | "quote" | "delivery_note";
type FontSize = "small" | "medium" | "large";
type Layout = "classic" | "modern" | "minimal";
type CustomField = string;

interface DocumentTemplateConfig {
  header: {
    showLogo: boolean;
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyEmail: string;
  };
  body: {
    showClientDetails: boolean;
    showProjectInfo: boolean;
    showPaymentTerms: boolean;
    customFields: CustomField[];
  };
  footer: {
    showSignature: boolean;
    showTerms: boolean;
    customText: string;
  };
  styling: {
    primaryColor: string;
    secondaryColor: string;
    fontSize: FontSize;
    layout: Layout;
  };
}

interface DocumentTemplateState {
  id?: string;
  name: string;
  type: TemplateType;
  isDefault?: boolean;
  template: DocumentTemplateConfig;
}

export const DocumentTemplates = () => {
  const { 
    documentTemplates, 
    addDocumentTemplate, 
    updateDocumentTemplate, 
    deleteDocumentTemplate, 
    setDocumentTemplate 
  } = useApp();
  const { toast } = useToast();
  
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplateState | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplateState | null>(null);
  
  const [newTemplate, setNewTemplate] = useState<DocumentTemplateState>({
    name: "",
    type: "invoice",
    template: {
      header: {
        showLogo: true,
        companyName: "INSPECTION POWER",
        companyAddress: "123 Rue de l'Industrie, Alger",
        companyPhone: "021 12 34 56",
        companyEmail: "contact@inspectionpower.dz"
      },
      body: {
        showClientDetails: true,
        showProjectInfo: true,
        showPaymentTerms: true,
        customFields: []
      },
      footer: {
        showSignature: true,
        showTerms: true,
        customText: ""
      },
      styling: {
        primaryColor: "#dc2626",
        secondaryColor: "#374151",
        fontSize: "medium",
        layout: "classic"
      }
    }
  });
  const updateEditingTemplate = (updater: (prev: DocumentTemplateState) => DocumentTemplateState) => {
    setEditingTemplate((prev) => (prev ? updater(prev) : prev));
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du modèle est requis",
        variant: "destructive"
      });
      return;
    }

    addDocumentTemplate({
      ...newTemplate,
      isDefault: documentTemplates.length === 0
    });

    resetNewTemplate();
    setShowCreateTemplate(false);
    toast({
      title: "Modèle créé",
      description: "Le modèle de document a été créé avec succès"
    });
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate?.id) return;

    updateDocumentTemplate(editingTemplate.id, editingTemplate);
    setEditingTemplate(null);
    toast({
      title: "Modèle mis à jour",
      description: "Le modèle de document a été mis à jour avec succès"
    });
  };

  const resetNewTemplate = () => {
    setNewTemplate({
      name: "",
      type: "invoice",
      template: {
        header: {
          showLogo: true,
          companyName: "INSPECTION POWER",
          companyAddress: "123 Rue de l'Industrie, Alger",
          companyPhone: "021 12 34 56",
          companyEmail: "contact@inspectionpower.dz"
        },
        body: {
          showClientDetails: true,
          showProjectInfo: true,
          showPaymentTerms: true,
          customFields: []
        },
        footer: {
          showSignature: true,
          showTerms: true,
          customText: ""
        },
        styling: {
          primaryColor: "#dc2626",
          secondaryColor: "#374151",
          fontSize: "medium",
          layout: "classic"
        }
      }
    });
  };

  const handleSetDefault = (templateId: string) => {
    setDocumentTemplate(templateId, true);
    toast({
      title: "Modèle par défaut",
      description: "Le modèle par défaut a été modifié"
    });
  };

  const handleDeleteTemplate = (templateId: string, templateName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le modèle "${templateName}" ?`)) {
      deleteDocumentTemplate(templateId);
      toast({
        title: "Modèle supprimé",
        description: `Le modèle ${templateName} a été supprimé`
      });
    }
  };

  const duplicateTemplate = (template: DocumentTemplateState) => {
    addDocumentTemplate({
      ...template,
      name: `${template.name} (Copie)`,
      isDefault: false
    });
    toast({
      title: "Modèle dupliqué",
      description: "Le modèle a été dupliqué avec succès"
    });
  };

  const getTypeLabel = (type: TemplateType) => {
    switch (type) {
      case "invoice": return "Facture";
      case "quote": return "Devis";
      case "delivery_note": return "Bordereau";
      default: return type;
    }
  };

  const TemplatePreview = ({ template }: { template: DocumentTemplateState }) => (
    <div 
      className="border rounded-lg p-6 bg-white"
      style={{ 
        fontFamily: 'Arial, sans-serif',
        fontSize: template.template.styling.fontSize === 'small' ? '12px' : 
                   template.template.styling.fontSize === 'large' ? '16px' : '14px'
      }}
    >
      {/* Header */}
      <div className="mb-6" style={{ borderBottom: `2px solid ${template.template.styling.primaryColor}` }}>
        <div className="flex justify-between items-start pb-4">
          <div>
            {template.template.header.showLogo && (
              <div 
                className="w-16 h-16 rounded mb-2"
                style={{ backgroundColor: template.template.styling.primaryColor }}
              ></div>
            )}
            <h1 
              className="text-2xl font-bold"
              style={{ color: template.template.styling.primaryColor }}
            >
              {template.template.header.companyName}
            </h1>
            <div className="text-sm" style={{ color: template.template.styling.secondaryColor }}>
              <p>{template.template.header.companyAddress}</p>
              <p>{template.template.header.companyPhone}</p>
              <p>{template.template.header.companyEmail}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold mb-2">{getTypeLabel(template.type).toUpperCase()}</h2>
            <p>N° XXXX</p>
            <p>Date: {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>

      {/* Client Details */}
      {template.template.body.showClientDetails && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2" style={{ color: template.template.styling.primaryColor }}>
            Facturer à:
          </h3>
          <div className="bg-gray-50 p-3 rounded">
            <p className="font-medium">EXEMPLE CLIENT</p>
            <p>123 Rue Example</p>
            <p>Alger, Algérie</p>
            <p>contact@exemple.dz</p>
          </div>
        </div>
      )}

      {/* Project Info */}
      {template.template.body.showProjectInfo && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2" style={{ color: template.template.styling.primaryColor }}>
            Informations du Projet:
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Projet:</strong> Exemple de projet
            </div>
            <div>
              <strong>Période:</strong> Janvier 2024
            </div>
          </div>
        </div>
      )}

      {/* Custom Fields */}
      {template.template.body.customFields.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2" style={{ color: template.template.styling.primaryColor }}>
            Informations Complémentaires:
          </h3>
          <div className="space-y-1 text-sm">
            {template.template.body.customFields.map((field: string, index: number) => (
              <div key={index}>
                <strong>{field}:</strong> Exemple de valeur
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border">
          <thead>
            <tr style={{ backgroundColor: template.template.styling.primaryColor, color: 'white' }}>
              <th className="border p-2 text-left">Description</th>
              <th className="border p-2 text-right">Quantité</th>
              <th className="border p-2 text-right">Prix Unit.</th>
              <th className="border p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2">Service exemple</td>
              <td className="border p-2 text-right">1</td>
              <td className="border p-2 text-right">1 000,00 DZD</td>
              <td className="border p-2 text-right">1 000,00 DZD</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <td colSpan={3} className="border p-2 font-semibold text-right">Total:</td>
              <td className="border p-2 text-right font-bold">1 000,00 DZD</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment Terms */}
      {template.template.body.showPaymentTerms && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2" style={{ color: template.template.styling.primaryColor }}>
            Conditions de Paiement:
          </h3>
          <p className="text-sm">Paiement à 30 jours. Pénalités de retard applicables.</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4" style={{ borderTop: `1px solid ${template.template.styling.secondaryColor}` }}>
        {template.template.footer.showSignature && (
          <div className="mb-4">
            <p className="font-semibold">Signature:</p>
            <div className="h-16 border-dashed border-2 border-gray-300 mt-2"></div>
          </div>
        )}
        
        {template.template.footer.showTerms && (
          <div className="text-xs text-gray-600 mb-2">
            <p>Conditions générales de vente disponibles sur demande.</p>
          </div>
        )}
        
        {template.template.footer.customText && (
          <div className="text-sm text-center" style={{ color: template.template.styling.primaryColor }}>
            <p>{template.template.footer.customText}</p>
          </div>
        )}
      </div>
    </div>
  );

  const TemplateForm = ({
    template,
    onSave,
    onCancel,
    title,
  }: {
    template: DocumentTemplateState;
    onSave: () => void;
    onCancel: () => void;
    title: string;
  }) => {
    const updateTemplateState = (updater: (prev: DocumentTemplateState) => DocumentTemplateState) => {
      if (editingTemplate) {
        updateEditingTemplate(updater);
      } else {
        setNewTemplate(updater);
      }
    };

    return (
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="header">En-tête</TabsTrigger>
          <TabsTrigger value="body">Corps</TabsTrigger>
          <TabsTrigger value="styling">Style</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div>
            <Label htmlFor="name">Nom du modèle *</Label>
            <Input
              id="name"
              value={template.name}
              onChange={(e) => {
                updateTemplateState(prev => ({ ...prev, name: e.target.value }));
              }}
              placeholder="Mon modèle personnalisé"
            />
          </div>
          
          <div>
            <Label htmlFor="type">Type de document</Label>
            <Select 
              value={template.type} 
              onValueChange={(value: TemplateType) => {
                updateTemplateState(prev => ({ ...prev, type: value }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">Facture</SelectItem>
                <SelectItem value="quote">Devis</SelectItem>
                <SelectItem value="delivery_note">Bordereau de livraison</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="header" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={template.template.header.showLogo}
              onCheckedChange={(checked) => {
                updateTemplateState(prev => ({
                  ...prev,
                  template: {
                    ...prev.template,
                    header: { ...prev.template.header, showLogo: checked }
                  }
                }));
              }}
            />
            <Label>Afficher le logo</Label>
          </div>

          <div>
            <Label htmlFor="companyName">Nom de l'entreprise</Label>
            <Input
              id="companyName"
              value={template.template.header.companyName}
              onChange={(e) => {
                updateTemplateState(prev => ({
                  ...prev,
                  template: {
                    ...prev.template,
                    header: { ...prev.template.header, companyName: e.target.value }
                  }
                }));
              }}
            />
          </div>

          <div>
            <Label htmlFor="companyAddress">Adresse</Label>
            <Textarea
              id="companyAddress"
              value={template.template.header.companyAddress}
              onChange={(e) => {
                updateTemplateState(prev => ({
                  ...prev,
                  template: {
                    ...prev.template,
                    header: { ...prev.template.header, companyAddress: e.target.value }
                  }
                }));
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyPhone">Téléphone</Label>
              <Input
                id="companyPhone"
                value={template.template.header.companyPhone}
                onChange={(e) => {
                  updateTemplateState(prev => ({
                    ...prev,
                    template: {
                      ...prev.template,
                      header: { ...prev.template.header, companyPhone: e.target.value }
                    }
                  }));
                }}
              />
            </div>
            
            <div>
              <Label htmlFor="companyEmail">Email</Label>
              <Input
                id="companyEmail"
                value={template.template.header.companyEmail}
                onChange={(e) => {
                  updateTemplateState(prev => ({
                    ...prev,
                    template: {
                      ...prev.template,
                      header: { ...prev.template.header, companyEmail: e.target.value }
                    }
                  }));
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="body" className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                checked={template.template.body.showClientDetails}
                onCheckedChange={(checked) => {
                  updateTemplateState(prev => ({
                    ...prev,
                    template: {
                      ...prev.template,
                      body: { ...prev.template.body, showClientDetails: checked }
                    }
                  }));
                }}
              />
              <Label>Afficher les détails du client</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={template.template.body.showProjectInfo}
                onCheckedChange={(checked) => {
                  updateTemplateState(prev => ({
                    ...prev,
                    template: {
                      ...prev.template,
                      body: { ...prev.template.body, showProjectInfo: checked }
                    }
                  }));
                }}
              />
              <Label>Afficher les informations du projet</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={template.template.body.showPaymentTerms}
                onCheckedChange={(checked) => {
                  updateTemplateState(prev => ({
                    ...prev,
                    template: {
                      ...prev.template,
                      body: { ...prev.template.body, showPaymentTerms: checked }
                    }
                  }));
                }}
              />
              <Label>Afficher les conditions de paiement</Label>
            </div>
          </div>

          <div>
            <Label>Champs personnalisés</Label>
            <div className="space-y-2 mt-2">
              {template.template.body.customFields.map((field: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={field}
                    onChange={(e) => {
                      const newFields = [...template.template.body.customFields];
                      newFields[index] = e.target.value;
                      updateTemplateState(prev => ({
                        ...prev,
                        template: {
                          ...prev.template,
                          body: { ...prev.template.body, customFields: newFields }
                        }
                      }));
                    }}
                    placeholder="Nom du champ"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newFields = template.template.body.customFields.filter((_, i) => i !== index);
                      updateTemplateState(prev => ({
                        ...prev,
                        template: {
                          ...prev.template,
                          body: { ...prev.template.body, customFields: newFields }
                        }
                      }));
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  updateTemplateState(prev => ({
                    ...prev,
                    template: {
                      ...prev.template,
                      body: {
                        ...prev.template.body,
                        customFields: [...prev.template.body.customFields, ""]
                      }
                    }
                  }));
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un champ
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="footerText">Texte de pied de page</Label>
            <Textarea
              id="footerText"
              value={template.template.footer.customText}
              onChange={(e) => {
                updateTemplateState(prev => ({
                  ...prev,
                  template: {
                    ...prev.template,
                    footer: { ...prev.template.footer, customText: e.target.value }
                  }
                }));
              }}
              placeholder="Merci de votre confiance"
            />
          </div>
        </TabsContent>

        <TabsContent value="styling" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryColor">Couleur principale</Label>
              <Input
                id="primaryColor"
                type="color"
                value={template.template.styling.primaryColor}
                onChange={(e) => {
                  updateTemplateState(prev => ({
                    ...prev,
                    template: {
                      ...prev.template,
                      styling: { ...prev.template.styling, primaryColor: e.target.value }
                    }
                  }));
                }}
              />
            </div>
            
            <div>
              <Label htmlFor="secondaryColor">Couleur secondaire</Label>
              <Input
                id="secondaryColor"
                type="color"
                value={template.template.styling.secondaryColor}
                onChange={(e) => {
                  updateTemplateState(prev => ({
                    ...prev,
                    template: {
                      ...prev.template,
                      styling: { ...prev.template.styling, secondaryColor: e.target.value }
                    }
                  }));
                }}
              />
            </div>
          </div>

          <div>
            <Label>Taille de police</Label>
            <Select 
              value={template.template.styling.fontSize} 
              onValueChange={(value: FontSize) => {
                updateTemplateState(prev => ({
                  ...prev,
                  template: {
                    ...prev.template,
                    styling: { ...prev.template.styling, fontSize: value }
                  }
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Petite</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mise en page</Label>
            <Select 
              value={template.template.styling.layout} 
              onValueChange={(value: Layout) => {
                updateTemplateState(prev => ({
                  ...prev,
                  template: {
                    ...prev.template,
                    styling: { ...prev.template.styling, layout: value }
                  }
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classique</SelectItem>
                <SelectItem value="modern">Moderne</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-4">
        <Button onClick={onSave} className="flex-1">
          {editingTemplate ? 'Mettre à jour' : 'Créer le Modèle'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </DialogContent>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Modèles de Documents</h1>
        <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Modèle
            </Button>
          </DialogTrigger>
          <TemplateForm
            template={newTemplate}
            onSave={handleCreateTemplate}
            onCancel={() => {
              setShowCreateTemplate(false);
              resetNewTemplate();
            }}
            title="Créer un Modèle de Document"
          />
        </Dialog>
      </div>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Modèles Disponibles ({documentTemplates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">{template.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getTypeLabel(template.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {template.isDefault ? (
                      <Badge className="bg-red-600">Par défaut</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(template.id)}
                      >
                        Définir par défaut
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewTemplate(template)}
                        title="Aperçu"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateTemplate(template)}
                        title="Dupliquer"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!template.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          className="text-red-600 hover:text-red-700"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Aperçu - {previewTemplate.name}</DialogTitle>
            </DialogHeader>
            <TemplatePreview template={previewTemplate} />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <TemplateForm
            template={editingTemplate}
            onSave={handleUpdateTemplate}
            onCancel={() => setEditingTemplate(null)}
            title="Modifier le Modèle de Document"
          />
        </Dialog>
      )}
    </div>
  );
};
