import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Plus, Trash2, UserCheck, PenLine } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';


interface QuoteItem {
    item_type: 'main' | 'sub';
    display_type: 'text' | 'quantity'; // NEW: text = header only, quantity = with unit/price
    item_number: string;
    designation: string;
    unit?: string;
    unit_price?: number;
}

interface QuoteFormProps {
    onClose: () => void;
    initialData?: any;
}

const QuoteForm = ({ onClose, initialData }: QuoteFormProps) => {
    const { clients, addQuote, updateQuote, quotes } = useApp();
    const { toast } = useToast();

    // Compute next OC reference: OCxx/26/IP/DTC
    const getNextOcReference = (): string => {
        const year = new Date().getFullYear().toString().slice(-2); // e.g. "26"
        let maxNum = 0;
        quotes.forEach((q: any) => {
            const ref: string = q.reference || '';
            // Match OC followed by digits at start
            const match = ref.match(/^OC(\d+)\//i);
            if (match) {
                const n = parseInt(match[1], 10);
                if (n > maxNum) maxNum = n;
            }
        });
        const next = String(maxNum + 1).padStart(2, '0');
        return `OC${next}/${year}/IP/DTC`;
    };

    // Toggle between selecting a client from DB vs entering manually
    const [manualMode, setManualMode] = useState(false);

    const [formData, setFormData] = useState(() => ({
        reference: initialData ? initialData.reference : getNextOcReference(),
        client_id: '',
        date: new Date().toISOString().split('T')[0],
        validity_days: 30,
        terms: '',
        // Manual client fields
        manual_client_mode: false,
        manual_client_name: '',
        manual_client_email: '',
        manual_client_contact: '',
        manual_client_phone: '',
    }));

    const [items, setItems] = useState<QuoteItem[]>([]);

    useEffect(() => {
        if (initialData) {
            const isManual = !!initialData.manual_client_mode;
            setManualMode(isManual);
            setFormData({
                reference: initialData.reference,
                client_id: initialData.client_id?.toString() || '',
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                validity_days: initialData.validity_days || 30,
                terms: initialData.terms || '',
                manual_client_mode: isManual,
                manual_client_name: initialData.manual_client_name || '',
                manual_client_email: initialData.manual_client_email || '',
                manual_client_contact: initialData.manual_client_contact || '',
                manual_client_phone: initialData.manual_client_phone || '',
            });

            if (initialData.items) {
                setItems(initialData.items.map((item: any) => ({
                    item_type: item.item_type,
                    display_type: item.display_type || 'quantity',
                    item_number: item.item_number,
                    designation: item.designation,
                    unit: item.unit,
                    unit_price: item.unit_price,
                })));
            }
        }
    }, [initialData]);

    // Keep manual_client_mode in sync with the toggle
    const toggleManualMode = () => {
        const next = !manualMode;
        setManualMode(next);
        setFormData(prev => ({ ...prev, manual_client_mode: next }));
    };

    // Calculate item numbers automatically
    const calculateItemNumber = (itemType: 'main' | 'sub', currentItems: QuoteItem[]): string => {
        if (itemType === 'main') {
            const mainItems = currentItems.filter(i => i.item_type === 'main');
            return `${mainItems.length + 1}/`;
        } else {
            // Find the last main item
            let lastMainIndex = -1;
            for (let i = currentItems.length - 1; i >= 0; i--) {
                if (currentItems[i].item_type === 'main') {
                    lastMainIndex = i;
                    break;
                }
            }

            if (lastMainIndex === -1) {
                return '1.1'; // No main item yet, start with 1.1
            }

            const mainNumber = parseInt(currentItems[lastMainIndex].item_number);
            const subItems = currentItems.slice(lastMainIndex + 1).filter(i => i.item_type === 'sub');
            return `${mainNumber}.${subItems.length + 1}`;
        }
    };

    const addItem = (itemType: 'main' | 'sub', displayType: 'text' | 'quantity' = 'quantity') => {
        const itemNumber = calculateItemNumber(itemType, items);
        setItems([...items, {
            item_type: itemType,
            display_type: displayType,
            item_number: itemNumber,
            designation: '',
            unit: displayType === 'quantity' ? 'Jour' : undefined,
            unit_price: displayType === 'quantity' ? 0 : undefined,
        }]);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        // Recalculate all item numbers
        const recalculated: QuoteItem[] = [];
        let mainCounter = 1;
        let subCounter = 1;

        newItems.forEach(item => {
            if (item.item_type === 'main') {
                recalculated.push({ ...item, item_number: `${mainCounter}/` });
                mainCounter++;
                subCounter = 1;
            } else {
                recalculated.push({ ...item, item_number: `${mainCounter - 1}.${subCounter}` });
                subCounter++;
            }
        });

        setItems(recalculated);
    };

    const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async () => {
        // Validate client info depending on mode
        if (!manualMode && !formData.client_id) {
            toast({ title: 'Erreur', description: 'Veuillez sélectionner un client', variant: 'destructive' });
            return;
        }
        if (manualMode && !formData.manual_client_name.trim()) {
            toast({ title: 'Erreur', description: 'Veuillez saisir le nom du client', variant: 'destructive' });
            return;
        }

        if (items.length === 0) {
            toast({ title: 'Erreur', description: 'Veuillez ajouter au moins un article', variant: 'destructive' });
            return;
        }

        const quoteData = {
            ...formData,
            items: items.map(item => ({
                item_type: item.item_type,
                display_type: item.display_type,
                item_number: item.item_number,
                designation: item.designation,
                unit: item.unit,
                unit_price: item.unit_price ? parseFloat(item.unit_price.toString()) : undefined,
            })),
        };

        try {
            if (initialData) {
                await updateQuote(initialData.id, quoteData);
                toast({ title: 'Succès', description: 'Offre modifiée avec succès' });
            } else {
                await addQuote(quoteData);
                toast({ title: 'Succès', description: 'Offre créée avec succès' });
            }
            onClose();
        } catch (error) {
            console.error('Quote save error:', error);
            const errorMsg = error instanceof Error ? error.message : 'Échec de l\'enregistrement';
            toast({ title: 'Erreur', description: errorMsg, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6 p-4">
            <h2 className="text-2xl font-bold">{initialData ? "Modifier l'Offre" : "Nouvelle Offre Commerciale"}</h2>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Référence</Label>
                    <Input
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                </div>
                <div>
                    <Label>Date</Label>
                    <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>
            </div>

            {/* ──────────── Client Section ──────────── */}
            <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Coordonnées client *</Label>
                    {/* Toggle button */}
                    <button
                        type="button"
                        onClick={toggleManualMode}
                        className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition-colors ${manualMode
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
                            }`}
                    >
                        {manualMode ? (
                            <><PenLine className="w-3 h-3" /> Saisie manuelle</>
                        ) : (
                            <><UserCheck className="w-3 h-3" /> Depuis la base clients</>
                        )}
                    </button>
                </div>

                {!manualMode ? (
                    /* ── Select from client DB ── */
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un client" />
                        </SelectTrigger>
                        <SelectContent>
                            {clients.map((client: any) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    /* ── Manual entry ── */
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-gray-500">Nom / Raison Sociale *</Label>
                            <Input
                                placeholder="Ex: SONATRACH"
                                value={formData.manual_client_name}
                                onChange={(e) => setFormData({ ...formData, manual_client_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500">Email</Label>
                            <Input
                                type="email"
                                placeholder="contact@exemple.dz"
                                value={formData.manual_client_email}
                                onChange={(e) => setFormData({ ...formData, manual_client_email: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500">Contact (Nom du responsable)</Label>
                            <Input
                                placeholder="M. Dupont"
                                value={formData.manual_client_contact}
                                onChange={(e) => setFormData({ ...formData, manual_client_contact: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500">Téléphone / Mobile</Label>
                            <Input
                                placeholder="+213 5 XX XX XX XX"
                                value={formData.manual_client_phone}
                                onChange={(e) => setFormData({ ...formData, manual_client_phone: e.target.value })}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label>Articles</Label>
                    <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={() => addItem('main', 'text')} variant="outline" className="text-xs">
                            <Plus className="w-3 h-3 mr-1" /> Principal (Texte)
                        </Button>
                        <Button size="sm" onClick={() => addItem('main', 'quantity')} variant="outline" className="text-xs">
                            <Plus className="w-3 h-3 mr-1" /> Principal (Quantité)
                        </Button>
                        <Button size="sm" onClick={() => addItem('sub', 'quantity')} variant="outline" className="text-xs">
                            <Plus className="w-3 h-3 mr-1" /> Sous-Article
                        </Button>
                    </div>
                </div>


                <div className="border rounded-md p-4 space-y-2 max-h-96 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">Aucun article. Cliquez ci-dessus pour ajouter.</div>
                    ) : (
                        items.map((item, index) => (
                            <div key={index} className={`grid gap-2 items-center p-2 rounded ${item.item_type === 'sub' ? 'bg-gray-50 ml-4' : 'bg-white border'}`}>
                                {/* Text-only items (no unit/price) */}
                                {item.display_type === 'text' ? (
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-1 font-mono text-sm font-bold">{item.item_number}</div>
                                        <Input
                                            className="col-span-10"
                                            placeholder="Désignation (texte uniquement)"
                                            value={item.designation}
                                            onChange={(e) => updateItem(index, 'designation', e.target.value)}
                                        />
                                        <Button size="sm" variant="ghost" onClick={() => removeItem(index)} className="col-span-1">
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                    </div>
                                ) : (
                                    /* Quantity items (with unit and price) */
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-1 font-mono text-sm font-bold">{item.item_number}</div>
                                        <Input
                                            className="col-span-5"
                                            placeholder="Désignation"
                                            value={item.designation}
                                            onChange={(e) => updateItem(index, 'designation', e.target.value)}
                                        />
                                        <div className="col-span-2">
                                            <Input
                                                list={`unit-suggestions-${index}`}
                                                placeholder="Unité"
                                                value={item.unit || ''}
                                                onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                            />
                                            <datalist id={`unit-suggestions-${index}`}>
                                                <option value="Jour" />
                                                <option value="Mètre" />
                                                <option value="Point" />
                                                <option value="Unité" />
                                                <option value="Heure" />
                                                <option value="Kilomètre" />
                                                <option value="Pièce" />
                                            </datalist>
                                        </div>
                                        <Input
                                            className="col-span-3"
                                            type="number"
                                            placeholder="Prix unitaire"
                                            value={item.unit_price || 0}
                                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                        />
                                        <Button size="sm" variant="ghost" onClick={() => removeItem(index)} className="col-span-1">
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div>
                <Label>Conditions et Termes (optionnel)</Label>
                <div className="h-64 mb-12">
                    <ReactQuill
                        theme="snow"
                        value={formData.terms}
                        onChange={(value) => setFormData({ ...formData, terms: value })}
                        className="h-full"
                        modules={{
                            toolbar: [
                                [{ 'header': [1, 2, 3, false] }],
                                [{ 'size': ['small', false, 'large', 'huge'] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'color': [] }, { 'background': [] }],
                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                ['link', 'clean']
                            ]
                        }}
                        placeholder="Conditions de paiement, délais, etc..."
                    />
                </div>
            </div>

            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose}>Annuler</Button>
                <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700">
                    {initialData ? "Modifier l'offre" : "Créer l'offre"}
                </Button>
            </div>
        </div>
    );
};

export default QuoteForm;
