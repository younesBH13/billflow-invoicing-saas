
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Database, AlertTriangle } from "lucide-react";
import { useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { createBackup, restoreBackup } from "@/utils/backupUtils";

export const BackupRestore = () => {
  const { clients, invoices, deliveryNotes, setClients, setInvoices, setDeliveryNotes } = useApp();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateBackup = () => {
    const backupData = {
      clients,
      invoices,
      deliveryNotes
    };
    
    createBackup(backupData);
    toast({
      title: "Sauvegarde créée",
      description: "La sauvegarde a été téléchargée avec succès",
    });
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backupData = await restoreBackup(file);
      
      if (backupData.clients) setClients(backupData.clients);
      if (backupData.invoices) setInvoices(backupData.invoices);
      if (backupData.deliveryNotes) setDeliveryNotes(backupData.deliveryNotes);

      toast({
        title: "Restauration réussie",
        description: "Les données ont été restaurées avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur de restauration",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Sauvegarde et Restauration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Créer une sauvegarde</h3>
              <p className="text-sm text-gray-600">
                Téléchargez une sauvegarde complète de vos données (clients, factures, bons de livraison).
              </p>
              <Button onClick={handleCreateBackup} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Créer une sauvegarde
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Restaurer une sauvegarde</h3>
              <p className="text-sm text-gray-600">
                Restaurez vos données à partir d'un fichier de sauvegarde.
              </p>
              <div className="space-y-2">
                <Label htmlFor="backup-file">Fichier de sauvegarde</Label>
                <Input
                  id="backup-file"
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleRestoreBackup}
                />
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-yellow-800">Attention</h4>
                <p className="text-sm text-yellow-700">
                  La restauration remplacera toutes vos données actuelles. Assurez-vous de créer 
                  une sauvegarde avant de restaurer des données.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques des données</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{clients.length}</div>
              <p className="text-sm text-gray-600">Clients</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{invoices.length}</div>
              <p className="text-sm text-gray-600">Factures</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{deliveryNotes.length}</div>
              <p className="text-sm text-gray-600">Bons de livraison</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
