import { useMemo, useState } from "react";
import { Plus, Printer, Search, Edit, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { generateDeliveryNotePDF } from "@/utils/pdfGenerator";

const toDateInputValue = (value: string): string => {
  if (!value) {
    return new Date().toISOString().split("T")[0];
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().split("T")[0];
  }

  return parsed.toISOString().split("T")[0];
};

const createInitialFormState = () => ({
  clientId: "",
  date: new Date().toISOString().split("T")[0],
  designation: "",
  observations: "",
});

export const DeliveryNotes = () => {
  const { deliveryNotes, addDeliveryNote, updateDeliveryNote, deleteDeliveryNote, clients } = useApp();
  type DeliveryNoteEntry = (typeof deliveryNotes)[number];

  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState(createInitialFormState());
  const [editFormData, setEditFormData] = useState(createInitialFormState());
  const [editingNote, setEditingNote] = useState<DeliveryNoteEntry | null>(null);

  const filteredNotes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return deliveryNotes;
    }

    return deliveryNotes.filter(note =>
      note.number.toLowerCase().includes(term) ||
      note.client.toLowerCase().includes(term) ||
      note.designation.toLowerCase().includes(term) ||
      note.observations.toLowerCase().includes(term)
    );
  }, [deliveryNotes, searchTerm]);

  const getClientName = (id: string): string => clients.find(client => client.id === id)?.name ?? "";

  const resetCreateForm = () => {
    setCreateFormData(createInitialFormState());
  };

  const resetEditState = () => {
    setEditingNote(null);
    setEditFormData(createInitialFormState());
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createFormData.clientId || !createFormData.designation.trim()) {
      toast({
        title: "Champs manquants",
        description: "Sélectionnez un client et renseignez la désignation du bordereau.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addDeliveryNote({
        clientId: createFormData.clientId,
        client: getClientName(createFormData.clientId),
        date: createFormData.date,
        designation: createFormData.designation.trim(),
        observations: createFormData.observations.trim(),
      });

      toast({
        title: "Bordereau créé",
        description: "Le bordereau a été ajouté avec succès.",
      });

      resetCreateForm();
      setIsCreateOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de créer le bordereau.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (note: DeliveryNoteEntry) => {
    setEditingNote(note);
    setEditFormData({
      clientId: note.clientId,
      date: toDateInputValue(note.date),
      designation: note.designation,
      observations: note.observations,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingNote) {
      return;
    }

    if (!editFormData.clientId || !editFormData.designation.trim()) {
      toast({
        title: "Champs manquants",
        description: "Sélectionnez un client et renseignez la désignation du bordereau.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDeliveryNote(editingNote.id, {
        clientId: editFormData.clientId,
        client: getClientName(editFormData.clientId),
        date: editFormData.date,
        designation: editFormData.designation.trim(),
        observations: editFormData.observations.trim(),
      });

      toast({
        title: "Bordereau mis à jour",
        description: "Les modifications ont été enregistrées.",
      });

      setIsEditOpen(false);
      resetEditState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de mettre à jour le bordereau.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (note: DeliveryNoteEntry) => {
    const confirmed = window.confirm(`Supprimer le bordereau ${note.number} ?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteDeliveryNote(note.id);
      toast({
        title: "Bordereau supprimé",
        description: "Le bordereau a été supprimé avec succès.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de supprimer le bordereau.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handlePrint = (note: DeliveryNoteEntry) => {
    generateDeliveryNotePDF({
      number: note.number,
      date: note.date,
      client: note.client,
      designation: note.designation,
      observations: note.observations,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bordereaux d'Envoi</h1>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              resetCreateForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700" disabled={clients.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Bordereau
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau bordereau</DialogTitle>
            </DialogHeader>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ajoutez un client avant de créer un bordereau de livraison.
              </p>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Client *</label>
                  <Select
                    value={createFormData.clientId}
                    onValueChange={(value) => setCreateFormData((prev) => ({ ...prev, clientId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Date *</label>
                  <Input
                    type="date"
                    value={createFormData.date}
                    onChange={(event) => setCreateFormData((prev) => ({ ...prev, date: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Désignation *</label>
                  <Input
                    placeholder="Description des éléments livrés"
                    value={createFormData.designation}
                    onChange={(event) => setCreateFormData((prev) => ({ ...prev, designation: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Observations</label>
                  <Textarea
                    rows={3}
                    placeholder="Notes particulières..."
                    value={createFormData.observations}
                    onChange={(event) => setCreateFormData((prev) => ({ ...prev, observations: event.target.value }))}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-red-600 hover:bg-red-700">
                    Créer le bordereau
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par numéro, client ou désignation..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Bordereaux ({filteredNotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Observations</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-gray-500">
                    Aucun bordereau trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-mono">{note.number}</TableCell>
                    <TableCell>{new Date(note.date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-medium">{note.client}</TableCell>
                    <TableCell>{note.designation}</TableCell>
                    <TableCell className="max-w-xs truncate text-gray-600">{note.observations}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(note)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrint(note)} title="Imprimer">
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(note)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            resetEditState();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le bordereau</DialogTitle>
          </DialogHeader>
          {editingNote ? (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Client *</label>
                <Select
                  value={editFormData.clientId}
                  onValueChange={(value) => setEditFormData((prev) => ({ ...prev, clientId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Date *</label>
                <Input
                  type="date"
                  value={editFormData.date}
                  onChange={(event) => setEditFormData((prev) => ({ ...prev, date: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Désignation *</label>
                <Input
                  value={editFormData.designation}
                  onChange={(event) => setEditFormData((prev) => ({ ...prev, designation: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Observations</label>
                <Textarea
                  rows={3}
                  value={editFormData.observations}
                  onChange={(event) => setEditFormData((prev) => ({ ...prev, observations: event.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Sélectionnez un bordereau à modifier.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

