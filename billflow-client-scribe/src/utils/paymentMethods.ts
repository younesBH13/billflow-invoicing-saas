const PAYMENT_LABELS: Record<string, string> = {
  'par cheque bancaire': 'Par chèque bancaire',
  'par chèque bancaire': 'Par chèque bancaire',
  cheque: 'Par chèque bancaire',
  check: 'Par chèque bancaire',
  'cheque bancaire': 'Par chèque bancaire',
  'chèque bancaire': 'Par chèque bancaire',
  cash: 'Espèces',
  'especes': 'Espèces',
  'espèces': 'Espèces',
  'virement bancaire': 'Virement bancaire',
  bank_transfer: 'Virement bancaire',
  virement: 'Virement bancaire',
  card: 'Carte bancaire',
  'carte bancaire': 'Carte bancaire',
  autre: 'Autre',
  other: 'Autre',
};

export const normalizePaymentMethod = (value?: string | null): string => {
  if (!value) {
    return 'Par chèque bancaire';
  }

  const trimmed = value.toString().trim();
  const normalizedKey = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return PAYMENT_LABELS[normalizedKey] ?? trimmed;
};

export const uniquePaymentLabels = (values: Array<string | undefined | null>): string[] => {
  const labels = new Set<string>();
  values.forEach((value) => {
    const label = normalizePaymentMethod(value ?? undefined);
    if (label) {
      labels.add(label);
    }
  });
  return Array.from(labels);
};
