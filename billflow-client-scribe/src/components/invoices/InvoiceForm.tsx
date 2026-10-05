import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Trash2, Calculator, Lock, Unlock } from 'lucide-react';
import { apiClient } from '../../services/api';
import { amountToFrenchWords } from '@/utils/frenchNumberToWords';
import { calculateTimbreAmount } from '@/utils/invoicePreview';
import { normalizePaymentMethod } from '@/utils/paymentMethods';
import { calculateInvoiceTotals } from '@/utils/invoiceTotals';
import { getCompanyProfileById } from '@/utils/companyProfiles';
import { Building2 } from 'lucide-react';

// Helper function to get current date in local timezone (not UTC)
const getCurrentLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Item types
export const ItemType = {
  TEXT: 'text',
  TEXT_WITH_QUANTITY: 'text_with_quantity',
  AMOUNT: 'amount',
} as const;

export type ItemType = typeof ItemType[keyof typeof ItemType];

const ITEM_TYPE_VALUES = [
  ItemType.TEXT,
  ItemType.TEXT_WITH_QUANTITY,
  ItemType.AMOUNT,
] as const;

// Validation schema
const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Numéro de facture requis'),
  date: z.string().min(1, 'Date requise'),
  clientId: z.string().min(1, 'Client requis'),
  client: z.object({
    code: z.string().optional(),
    name: z.string().min(1, 'Nom du client requis'),
    fiscalId: z.string().optional(),
    commerceRegistry: z.string().optional(),
    taxArticle: z.string().optional(),
    address: z.string().optional(),
    nis: z.string().optional(),
  }),
  service: z.object({
    prestation: z.string().min(1, 'Prestation requise'),
    period: z.string().min(1, 'Période requise'),
    project: z.string().min(1, 'Projet requis'),
    affairNumber: z.string().optional(),
    conventionRef: z.string().optional(),
    contractRef: z.string().optional(),
    bcRef: z.string().optional(),
  }),
  items: z.array(z.object({
    type: z.enum(ITEM_TYPE_VALUES),
    description: z.string().min(1, 'Description requise'),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    unitPrice: z.number().optional(),
    amount: z.number().optional(),
    total: z.number(),
  })).min(1, 'Au moins un article requis'),
  tvaRate: z.number().min(0).max(100),
  paymentMethod: z.string().min(1, 'Mode de paiement requis'),
  observations: z.string().optional(),
  tx_remise_percent: z.coerce.number().min(0).max(100).optional(),
  montant_remise: z.coerce.number().min(0).optional(),
  tx_retenue_garantie: z.coerce.number().min(0).max(100).optional(),
  advanceAmount: z.coerce.number().min(0).optional(),
  advancePercentage: z.coerce.number().min(0).max(100).optional(),
  company_entity: z.enum(['principal', 'secondary']).optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Client {
  id: string;
  code?: string;
  name: string;
  fiscalId?: string;
  commerceRegistry?: string;
  taxArticle?: string;
  address?: string;
  email?: string;
  phone?: string;
  tvaRate: number;
  hasTva?: boolean;
  nis?: string;
}

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => void;
  onPreview?: (data: InvoiceFormData) => void;
  clients?: Client[];
  isLoading?: boolean;
  isAdmin?: boolean;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData,
  onSubmit,
  onPreview,
  clients = [],
  isLoading = false,
  isAdmin = false
}) => {
  const isEditing = Boolean(initialData?.invoiceNumber);
  const [subtotal, setSubtotal] = useState(0);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');
  const [isInvoiceNumberLocked, setIsInvoiceNumberLocked] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const computeDefaultValues = useCallback((): InvoiceFormData => ({
    invoiceNumber: '',
    date: getCurrentLocalDate(), // Use local timezone instead of UTC
    clientId: '',
    client: {
      code: '',
      name: '',
      fiscalId: '',
      commerceRegistry: '',
      taxArticle: '',
      address: '',
      nis: '',
    },
    service: {
      prestation: '',
      period: '',
      project: '',
      affairNumber: '',
      conventionRef: '',
      contractRef: '',
      bcRef: '',
    },
    items: [
      {
        type: ItemType.TEXT_WITH_QUANTITY,
        description: '',
        quantity: 1,
        unit: 'Unité',
        unitPrice: 0,
        total: 0,
      }
    ],
    tvaRate: 19,
    paymentMethod: 'Par chèque bancaire',
    observations: '',
    tx_remise_percent: 0,
    montant_remise: 0,
    tx_retenue_garantie: 0,
    advanceAmount: 0,
    advancePercentage: 0,
    company_entity: 'principal',
  }), []);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: computeDefaultValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items') ?? [];
  const watchedTvaRate = form.watch('tvaRate');
  const watchedClientId = form.watch('clientId');
  const watchedPaymentMethod = form.watch('paymentMethod');
  const watchedTxRemisePercent = form.watch('tx_remise_percent');
  const watchedMontantRemise = form.watch('montant_remise');
  const watchedTxRetenueGarantie = form.watch('tx_retenue_garantie');
  const watchedAdvanceAmount = form.watch('advanceAmount');
  const watchedAdvancePercentage = form.watch('advancePercentage');
  const watchedCompanyEntity = (form.watch('company_entity') || 'principal') as 'principal' | 'secondary';
  const selectedCompanyProfile = getCompanyProfileById(watchedCompanyEntity);

  const loadNextInvoiceNumber = useCallback(async () => {
    try {
      const response = await apiClient.getNextInvoiceNumber('definitive');
      const nextNumber = response.nextNumber;
      setNextInvoiceNumber(nextNumber);
      if (!form.getValues('invoiceNumber')) {
        form.setValue('invoiceNumber', nextNumber);
      }
    } catch (error) {
      console.error('Error fetching next invoice number:', error);
    }
  }, [form]);

  useEffect(() => {
    if (initialData) {
      const defaults = computeDefaultValues();
      const mergedValues: InvoiceFormData = {
        ...defaults,
        ...initialData,
        items: initialData.items && initialData.items.length > 0 ? initialData.items : defaults.items,
      } as InvoiceFormData;
      form.reset(mergedValues);
      if (initialData.clientId) {
        const client = clients.find(c => c.id === initialData.clientId);
        setSelectedClient(client ?? null);
      }
      setIsInvoiceNumberLocked(true);
    } else {
      const defaults = computeDefaultValues();
      form.reset(defaults);
      setSelectedClient(null);
      setIsInvoiceNumberLocked(true);
      void loadNextInvoiceNumber();
    }
  }, [initialData, form, computeDefaultValues, clients, loadNextInvoiceNumber]);

  useEffect(() => {
    if (!isEditing) {
      void loadNextInvoiceNumber();
    }
  }, [isEditing, loadNextInvoiceNumber]);

  // Handle client selection
  useEffect(() => {
    if (watchedClientId && clients.length > 0) {
      const client = clients.find(c => c.id === watchedClientId);
      if (client) {
        setSelectedClient(client);
        // Auto-fill client information
        form.setValue('client.code', client.code || '');
        form.setValue('client.name', client.name);
        form.setValue('client.fiscalId', client.fiscalId || '');
        form.setValue('client.commerceRegistry', client.commerceRegistry || '');
        form.setValue('client.taxArticle', client.taxArticle || '');
        form.setValue('client.address', client.address || '');
        form.setValue('client.nis', client.nis || '');
        // Set TVA rate from client - automatically apply exemption if client is VAT-exempt
        const tvaRate = client.hasTva === false ? 0 : client.tvaRate;
        form.setValue('tvaRate', tvaRate);
      }
    } else if (!watchedClientId) {
      setSelectedClient(null);
    }
  }, [watchedClientId, clients, form]);

  // Calculate subtotal and update line totals
  useEffect(() => {
    const newSubtotal = watchedItems.reduce((sum, item) => {
      let itemTotal = 0;

      switch (item.type) {
        case ItemType.TEXT:
          itemTotal = 0; // Text items don't contribute to total
          break;
        case ItemType.TEXT_WITH_QUANTITY:
          itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
          break;
        case ItemType.AMOUNT:
          itemTotal = item.amount || 0;
          break;
      }

      return sum + itemTotal;
    }, 0);

    setSubtotal(newSubtotal);

    // Update item totals
    watchedItems.forEach((item, index) => {
      let itemTotal = 0;

      switch (item.type) {
        case ItemType.TEXT:
          itemTotal = 0;
          break;
        case ItemType.TEXT_WITH_QUANTITY:
          itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
          break;
        case ItemType.AMOUNT:
          itemTotal = item.amount || 0;
          break;
      }

      form.setValue(`items.${index}.total`, itemTotal);
    });
  }, [watchedItems, form]);

  const parsedTxRemise = Number(watchedTxRemisePercent) || 0;
  const parsedMontantRemise = Number(watchedMontantRemise) || 0;
  const parsedTxRetenue = Number(watchedTxRetenueGarantie) || 0;
  const parsedTvaRate = Number(watchedTvaRate) || 0;
  const parsedAdvancePercentage = Number(watchedAdvancePercentage) || 0;
  const parsedAdvanceAmount = Number(watchedAdvanceAmount) || 0;

  const normalizedPaymentMethod = normalizePaymentMethod(watchedPaymentMethod);

  // Preliminary totals for timbre calculation
  const preliminaryTotals = calculateInvoiceTotals({
    subtotal,
    tvaRate: parsedTvaRate,
    txRemisePercent: parsedTxRemise,
    montantRemise: parsedMontantRemise,
    txRetenueGarantie: parsedTxRetenue,
    advanceAmount: parsedAdvanceAmount,
    advancePercentage: parsedAdvancePercentage,
    timbreAmount: 0,
  });

  const calculatedTimbre = calculateTimbreAmount(normalizedPaymentMethod, preliminaryTotals.totalTTC);

  const calculatedTotals = calculateInvoiceTotals({
    subtotal,
    tvaRate: parsedTvaRate,
    txRemisePercent: parsedTxRemise,
    montantRemise: parsedMontantRemise,
    txRetenueGarantie: parsedTxRetenue,
    advanceAmount: parsedAdvanceAmount,
    advancePercentage: parsedAdvancePercentage,
    timbreAmount: calculatedTimbre,
  });

  const hasAdvance = parsedAdvancePercentage > 0 || parsedAdvanceAmount > 0;
  const netTotal = hasAdvance ? calculatedTotals.totalFinal : calculatedTotals.netToPay;

  const addItem = (type: ItemType = ItemType.TEXT_WITH_QUANTITY) => {
    const newItem = {
      type,
      description: '',
      quantity: type === ItemType.TEXT_WITH_QUANTITY ? 1 : undefined,
      unit: type === ItemType.TEXT_WITH_QUANTITY ? 'Unité' : undefined,
      unitPrice: type === ItemType.TEXT_WITH_QUANTITY ? 0 : undefined,
      amount: type === ItemType.AMOUNT ? 0 : undefined,
      total: 0,
    };
    append(newItem);
  };

  const handleSubmit = (data: InvoiceFormData) => {
    const finalData = {
      ...data,
      subtotal,
      tvaAmount: calculatedTotals.tvaAmount,
      total: calculatedTotals.totalTTC,
      timbreAmount: calculatedTimbre,
      advanceAmount: calculatedTotals.advanceAmount,
      amountDue: netTotal,
      totalInWords: amountToFrenchWords(netTotal),
      tx_remise_percent: parsedTxRemise,
      montant_remise: parsedMontantRemise,
      tx_retenue_garantie: parsedTxRetenue,
      txRemisePercent: parsedTxRemise,
      montantRemise: parsedMontantRemise,
      txRetenueGarantie: parsedTxRetenue,
      company_entity: watchedCompanyEntity,
    };
    onSubmit(finalData);
  };

  const handlePreview = () => {
    const data = form.getValues();
    const finalData = {
      ...data,
      subtotal,
      tvaAmount: calculatedTotals.tvaAmount,
      total: calculatedTotals.totalTTC,
      timbreAmount: calculatedTimbre,
      advanceAmount: calculatedTotals.advanceAmount,
      amountDue: netTotal,
      totalInWords: amountToFrenchWords(netTotal),
      tx_remise_percent: parsedTxRemise,
      montant_remise: parsedMontantRemise,
      tx_retenue_garantie: parsedTxRetenue,
      txRemisePercent: parsedTxRemise,
      montantRemise: parsedMontantRemise,
      txRetenueGarantie: parsedTxRetenue,
      company_entity: watchedCompanyEntity,
    };
    onPreview?.(finalData);
  };

  const toggleInvoiceNumberLock = () => {
    if (!isAdmin) {
      return;
    }

    setIsInvoiceNumberLocked((locked) => {
      const nextLockedState = !locked;
      if (nextLockedState) {
        if (!isEditing) {
          form.setValue('invoiceNumber', nextInvoiceNumber);
        }
      }
      return nextLockedState;
    });
  };

  const renderItemFields = (index: number, item: any) => {
    switch (item.type) {
      case ItemType.TEXT:
        return (
          <div className="col-span-5">
            <FormField
              control={form.control}
              name={`items.${index}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Description du texte..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case ItemType.TEXT_WITH_QUANTITY:
        return (
          <>
            <div className="col-span-2">
              <FormField
                control={form.control}
                name={`items.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Désignation</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Mobilisation/Démobilisation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <FormField
                control={form.control}
                name={`items.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <FormField
                control={form.control}
                name={`items.${index}.unit`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unité</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        list={`unit-suggestions-${index}`}
                        placeholder="Unité"
                      />
                    </FormControl>
                    <datalist id={`unit-suggestions-${index}`}>
                      <option value="Unité" />
                      <option value="Jours" />
                      <option value="Heures" />
                      <option value="m²" />
                      <option value="kg" />
                      <option value="Forfait" />
                      <option value="Mois" />
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <FormField
                control={form.control}
                name={`items.${index}.unitPrice`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix unitaire</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        );

      case ItemType.AMOUNT:
        return (
          <>
            <div className="col-span-3">
              <FormField
                control={form.control}
                name={`items.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Description du montant..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <FormField
                control={form.control}
                name={`items.${index}.amount`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Invoice Header & Register Selector */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-red-600">Informations de la Facture</CardTitle>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-700">Registre Émetteur :</span>
                <div className="inline-flex rounded-md shadow-sm">
                  <Button
                    type="button"
                    size="sm"
                    variant={watchedCompanyEntity === 'principal' ? 'default' : 'outline'}
                    className={`text-xs h-7 px-2.5 rounded-r-none ${
                      watchedCompanyEntity === 'principal' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-700'
                    }`}
                    onClick={() => form.setValue('company_entity', 'principal')}
                  >
                    RC Principal (00/16)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={watchedCompanyEntity === 'secondary' ? 'default' : 'outline'}
                    className={`text-xs h-7 px-2.5 rounded-l-none ${
                      watchedCompanyEntity === 'secondary' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-gray-700'
                    }`}
                    onClick={() => form.setValue('company_entity', 'secondary')}
                  >
                    RC Secondaire (01/16)
                  </Button>
                </div>
              </div>
            </div>
            {/* Active Company Details Preview Bar */}
            <div className={`mt-2 p-2 rounded text-xs border flex flex-wrap items-center justify-between gap-x-4 gap-y-1 ${
              watchedCompanyEntity === 'secondary'
                ? 'bg-purple-50 border-purple-200 text-purple-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <div className="font-semibold flex items-center gap-1.5">
                <span>{selectedCompanyProfile.name}</span>
                <span className="text-gray-400">•</span>
                <span>RC: {selectedCompanyProfile.rc}</span>
              </div>
              <div className="text-gray-600 flex flex-wrap gap-x-3 text-[11px]">
                <span>NIF: {selectedCompanyProfile.nif}</span>
                <span>NIS: {selectedCompanyProfile.nis}</span>
                <span>Art: {selectedCompanyProfile.art}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de Facture</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="061/25"
                          readOnly={isInvoiceNumberLocked && !(isAdmin && !isInvoiceNumberLocked)}
                          className={isInvoiceNumberLocked && !(isAdmin && !isInvoiceNumberLocked) ? 'bg-gray-100 pointer-events-none' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleInvoiceNumberLock}
                  className="mb-2"
                >
                  {isInvoiceNumberLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      readOnly={isEditing && !isAdmin}
                      className={isEditing && !isAdmin ? 'bg-gray-100 pointer-events-none' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Informations Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sélectionner un client</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="client.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom ou Raison Sociale</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100 pointer-events-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client.fiscalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro d'Identification Fiscal</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100 pointer-events-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client.commerceRegistry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° du Registre de Commerce</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100 pointer-events-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client.taxArticle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° d'Article d'Imposition</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100 pointer-events-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client.nis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIS (N° Identification Statistique)</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100 pointer-events-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="client.address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Textarea {...field} readOnly className="bg-gray-100 pointer-events-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Service Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Informations du Service</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="service.prestation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prestation</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="CONTRÔLE CND (PMI)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service.period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Période</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="25 JUIL 2025" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service.project"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Projet</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="GNL SKIKDA" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service.affairNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° d'affaire</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="NA-2024-001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service.bcRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Réf. BC</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="37/Ach/25" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service.conventionRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Réf. Convention</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="/" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service.contractRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Réf. Contrat</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="/" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-red-600">
              Articles de la Facture
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => addItem(ItemType.TEXT)}
                  size="sm"
                  variant="outline"
                >
                  + Texte
                </Button>
                <Button
                  type="button"
                  onClick={() => addItem(ItemType.TEXT_WITH_QUANTITY)}
                  size="sm"
                  variant="outline"
                >
                  + Texte avec Quantité
                </Button>
                <Button
                  type="button"
                  onClick={() => addItem(ItemType.AMOUNT)}
                  size="sm"
                  variant="outline"
                >
                  + Montant
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-6 gap-4 items-end p-4 border rounded-lg">
                  <div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={ItemType.TEXT}>Texte</SelectItem>
                                <SelectItem value={ItemType.TEXT_WITH_QUANTITY}>Texte avec Quantité</SelectItem>
                                <SelectItem value={ItemType.AMOUNT}>Montant</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {renderItemFields(index, watchedItems[index])}

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label>Total</Label>
                      <div className="text-lg font-medium">
                        {watchedItems[index]?.total?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) || '0,00'}
                      </div>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Calculator className="h-5 w-5" />
              Totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tvaRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taux TVA (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            disabled={!!selectedClient}
                            className={selectedClient ? 'bg-gray-100' : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tx_retenue_garantie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retenue Garantie (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                            value={field.value ?? ''}
                            min={0}
                            max={100}
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Remise Fields */}
                <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                  <FormField
                    control={form.control}
                    name="tx_remise_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-900 font-medium">Taux Remise (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                            value={field.value ?? ''}
                            min={0}
                            max={100}
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="montant_remise"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-900 font-medium">Montant Remise (DZD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                            value={field.value ?? ''}
                            min={0}
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="advancePercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avancement (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                            value={field.value ?? ''}
                            min={0}
                            max={100}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="advanceAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avance (Montant)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                            value={field.value ?? ''}
                            min={0}
                            disabled={(Number(watchedAdvancePercentage) || 0) > 0}
                            className={(Number(watchedAdvancePercentage) || 0) > 0 ? 'bg-gray-100' : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between bg-gray-100 px-4 py-2 rounded">
                  <span className="font-medium">Montant HT</span>
                  <span className="font-medium">{subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                </div>
                {calculatedTotals.remiseAmount > 0 && (
                  <>
                    <div className="flex justify-between bg-amber-50 px-4 py-2 rounded text-amber-800">
                      <span className="font-medium">
                        Remise {parsedTxRemise > 0 ? `(${parsedTxRemise}%)` : ''}
                      </span>
                      <span className="font-medium">-{calculatedTotals.remiseAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between bg-gray-100 px-4 py-2 rounded">
                      <span className="font-medium">Montant HT 1</span>
                      <span className="font-medium">{calculatedTotals.subtotalAfterRemise.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
                {calculatedTotals.retenueAmount > 0 && (
                  <>
                    <div className="flex justify-between bg-purple-50 px-4 py-2 rounded text-purple-800">
                      <span className="font-medium">Retenue de garantie ({parsedTxRetenue}%)</span>
                      <span className="font-medium">-{calculatedTotals.retenueAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between bg-gray-100 px-4 py-2 rounded">
                      <span className="font-medium">{calculatedTotals.remiseAmount > 0 ? 'Montant HT 2' : 'Montant HT 1'}</span>
                      <span className="font-medium">{calculatedTotals.subtotalAfterRetenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between bg-gray-100 px-4 py-2 rounded">
                  <span className="font-medium">TVA ({parsedTvaRate}%)</span>
                  <span className="font-medium">{calculatedTotals.tvaAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between bg-red-100 px-4 py-2 rounded">
                  <span className="font-bold">Montant TTC</span>
                  <span className="font-bold">{calculatedTotals.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                </div>
                {calculatedTimbre > 0 && (
                  <div className="flex justify-between bg-red-50 px-4 py-2 rounded">
                    <span className="font-medium">Timbre (Espèces)</span>
                    <span className="font-medium">{calculatedTimbre.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {calculatedTotals.advanceAmount > 0 && (
                  <div className="flex justify-between bg-gray-100 px-4 py-2 rounded">
                    <span className="font-medium">Avance</span>
                    <span className="font-medium">-{calculatedTotals.advanceAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between bg-green-100 px-4 py-2 rounded">
                  <span className="font-bold">Net à payer</span>
                  <span className="font-bold">{netTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment and Observations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Informations Complémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de Paiement</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Par chèque bancaire">Par chèque bancaire</SelectItem>
                        <SelectItem value="Virement bancaire">Virement bancaire</SelectItem>
                        <SelectItem value="Espèces">Espèces</SelectItem>
                        <SelectItem value="Carte bancaire">Carte bancaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observations</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Observations particulières..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={isLoading}
          >
            Aperçu
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer la Facture'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default InvoiceForm;
