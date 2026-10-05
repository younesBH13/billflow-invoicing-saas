import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, LogOut, User, Shield, Users, FileText, Building2, Save } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { BackupRestore } from "./BackupRestore";
import { PaymentReminders } from "./PaymentReminders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { getCompanyProfiles, saveCompanyProfiles, type CompanyProfile } from "@/utils/companyProfiles";

export const Settings = () => {
  const { currentUser, logout, clients, invoices, getTotalRevenue } = useApp();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté",
    });
  };

  if (!currentUser) return null;

  const totalRevenue = getTotalRevenue();
  const totalClients = clients.length;
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === "paid").length;

  // Registres state
  const [profiles, setProfiles] = useState(getCompanyProfiles());
  const [isSavingProfiles, setIsSavingProfiles] = useState(false);

  useEffect(() => {
    const handler = () => setProfiles(getCompanyProfiles());
    window.addEventListener('company_profiles_updated', handler);
    return () => window.removeEventListener('company_profiles_updated', handler);
  }, []);

  const updateProfile = (entity: 'principal' | 'secondary', field: keyof CompanyProfile, value: string) => {
    setProfiles(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [field]: value },
    }));
  };

  const handleSaveProfiles = () => {
    setIsSavingProfiles(true);
    try {
      saveCompanyProfiles(profiles);
      toast({
        title: "Registres sauvegardés",
        description: "Les informations des registres de commerce ont été mises à jour.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les registres.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfiles(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="registres">Registres</TabsTrigger>
          <TabsTrigger value="reminders">Rappels</TabsTrigger>
          <TabsTrigger value="backup">Sauvegarde</TabsTrigger>
          <TabsTrigger value="system">Système</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations Utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nom</p>
                  <p className="font-medium">{currentUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nom d'utilisateur</p>
                  <p className="font-medium">{currentUser.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rôle</p>
                  <Badge className={currentUser.role === "admin" ? "bg-red-600" : "bg-blue-600"}>
                    {currentUser.role === "admin" ? "Administrateur" : "Commercial"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics - Admin Only */}
          {currentUser.role === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  Statistiques Système
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold text-blue-600">{totalClients}</p>
                    <p className="text-sm text-gray-600">Clients</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">{totalInvoices}</p>
                    <p className="text-sm text-gray-600">Factures</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold text-purple-600">{paidInvoices}</p>
                    <p className="text-sm text-gray-600">Payées</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Badge className="w-8 h-8 mx-auto mb-2 bg-yellow-600" />
                    <p className="text-xl font-bold text-yellow-600">{(totalRevenue / 1000000).toFixed(1)}M</p>
                    <p className="text-sm text-gray-600">CA (DA)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="registres" className="space-y-6">
          {(['principal', 'secondary'] as const).map((entity) => {
            const profile = profiles[entity];
            const isPrincipal = entity === 'principal';
            const borderColor = isPrincipal ? 'border-slate-300' : 'border-purple-300';
            const headerBg = isPrincipal ? 'bg-slate-50' : 'bg-purple-50';
            const iconColor = isPrincipal ? 'text-slate-600' : 'text-purple-600';
            return (
              <Card key={entity} className={borderColor}>
                <CardHeader className={headerBg}>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className={`w-5 h-5 ${iconColor}`} />
                    {profile.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nom de l'entreprise</Label>
                      <Input value={profile.name} onChange={(e) => updateProfile(entity, 'name', e.target.value)} />
                    </div>
                    <div>
                      <Label>Adresse</Label>
                      <Input value={profile.address} onChange={(e) => updateProfile(entity, 'address', e.target.value)} />
                    </div>
                    <div>
                      <Label>N° RC</Label>
                      <Input value={profile.rc} onChange={(e) => updateProfile(entity, 'rc', e.target.value)} />
                    </div>
                    <div>
                      <Label>NIF</Label>
                      <Input value={profile.nif} onChange={(e) => updateProfile(entity, 'nif', e.target.value)} />
                    </div>
                    <div>
                      <Label>NIS</Label>
                      <Input value={profile.nis} onChange={(e) => updateProfile(entity, 'nis', e.target.value)} />
                    </div>
                    <div>
                      <Label>N° Article d'Imposition</Label>
                      <Input value={profile.art} onChange={(e) => updateProfile(entity, 'art', e.target.value)} />
                    </div>
                    <div>
                      <Label>RIB</Label>
                      <Input value={profile.rib} onChange={(e) => updateProfile(entity, 'rib', e.target.value)} />
                    </div>
                    <div>
                      <Label>Capital Social</Label>
                      <Input value={profile.capital} onChange={(e) => updateProfile(entity, 'capital', e.target.value)} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={profile.email} onChange={(e) => updateProfile(entity, 'email', e.target.value)} />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input value={profile.phone || ''} onChange={(e) => updateProfile(entity, 'phone', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <div className="flex justify-end">
            <Button onClick={handleSaveProfiles} disabled={isSavingProfiles} className="bg-red-600 hover:bg-red-700">
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder les registres
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="reminders">
          <PaymentReminders />
        </TabsContent>

        <TabsContent value="backup">
          <BackupRestore />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {/* Access Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Gestion des clients</span>
                  <Badge className="bg-green-500">Autorisé</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Création de factures</span>
                  <Badge className="bg-green-500">Autorisé</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Modification de factures</span>
                  <Badge className="bg-green-500">Autorisé</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Suppression de données</span>
                  <Badge className={currentUser.role === "admin" ? "bg-green-500" : "bg-red-500"}>
                    {currentUser.role === "admin" ? "Autorisé" : "Interdit"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Statistiques système</span>
                  <Badge className={currentUser.role === "admin" ? "bg-green-500" : "bg-red-500"}>
                    {currentUser.role === "admin" ? "Autorisé" : "Interdit"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Système</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Devise:</strong> Dinar Algérien (DA)</p>
                <p><strong>Taux de TVA:</strong> 20%</p>
                <p><strong>Version:</strong> 1.0.0</p>
                <p><strong>Dernière mise à jour:</strong> {new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
