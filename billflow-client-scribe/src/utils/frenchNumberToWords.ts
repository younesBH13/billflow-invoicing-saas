const UNITS: Record<number, string> = {
  0: 'zéro',
  1: 'un',
  2: 'deux',
  3: 'trois',
  4: 'quatre',
  5: 'cinq',
  6: 'six',
  7: 'sept',
  8: 'huit',
  9: 'neuf',
  10: 'dix',
  11: 'onze',
  12: 'douze',
  13: 'treize',
  14: 'quatorze',
  15: 'quinze',
  16: 'seize',
  17: 'dix-sept',
  18: 'dix-huit',
  19: 'dix-neuf',
};

const TENS: Record<number, string> = {
  2: 'vingt',
  3: 'trente',
  4: 'quarante',
  5: 'cinquante',
  6: 'soixante',
};

const joinParts = (parts: string[]): string =>
  parts.filter(Boolean).join(' ');

const convertLessThanHundred = (value: number): string => {
  if (value < 20) {
    return UNITS[value];
  }

  if (value < 70) {
    const tens = Math.floor(value / 10);
    const unit = value % 10;
    const tensWord = TENS[tens];

    if (unit === 0) {
      return tensWord;
    }

    if (unit === 1) {
      return `${tensWord} et un`;
    }

    return `${tensWord}-${UNITS[unit]}`;
  }

  if (value < 80) {
    const remainder = value - 60;
    if (remainder === 0) {
      return 'soixante';
    }
    if (remainder === 1) {
      return 'soixante et un';
    }
    if (remainder === 11) {
      return 'soixante et onze';
    }
    return `soixante-${convertLessThanHundred(remainder)}`;
  }

  if (value === 80) {
    return 'quatre-vingts';
  }

  const remainder = value - 80;
  const base = 'quatre-vingt';

  if (remainder === 0) {
    return 'quatre-vingts';
  }
  if (remainder === 1) {
    return `${base}-un`;
  }
  if (remainder < 20) {
    return `${base}-${UNITS[remainder]}`;
  }

  return `${base}-${convertLessThanHundred(remainder)}`;
};

const convertLessThanThousand = (value: number): string => {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const parts: string[] = [];

  if (hundreds > 0) {
    if (hundreds === 1) {
      parts.push('cent');
    } else {
      parts.push(`${UNITS[hundreds]} cent${remainder === 0 ? 's' : ''}`);
    }
  }

  if (remainder > 0) {
    parts.push(convertLessThanHundred(remainder));
  }

  return joinParts(parts);
};

const convertNumber = (value: number): string => {
  if (value === 0) {
    return UNITS[0];
  }

  let remaining = value;
  const parts: string[] = [];

  const billions = Math.floor(remaining / 1_000_000_000);
  if (billions > 0) {
    parts.push(
      `${convertNumber(billions)} milliard${billions > 1 ? 's' : ''}`
    );
    remaining %= 1_000_000_000;
  }

  const millions = Math.floor(remaining / 1_000_000);
  if (millions > 0) {
    parts.push(
      `${convertNumber(millions)} million${millions > 1 ? 's' : ''}`
    );
    remaining %= 1_000_000;
  }

  const thousands = Math.floor(remaining / 1000);
  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('mille');
    } else {
      parts.push(`${convertLessThanThousand(thousands)} mille`);
    }
    remaining %= 1000;
  }

  if (remaining > 0) {
    parts.push(convertLessThanThousand(remaining));
  }

  return joinParts(parts);
};

export const amountToFrenchWords = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return '';
  }

  const roundedAmount = Math.round(Math.abs(amount) * 100) / 100;
  const integerPart = Math.floor(roundedAmount);
  const centPart = Math.round((roundedAmount - integerPart) * 100);

  const integerWords = convertNumber(integerPart);
  const currencyWord = integerPart > 1 ? 'dinars' : 'dinar';

  let result = `${integerWords} ${currencyWord}`;

  if (centPart > 0) {
    const centWords = convertNumber(centPart);
    result += ` et ${centWords} centime${centPart > 1 ? 's' : ''}`;
  }

  return result.toUpperCase();
};

export const formatAmount = (value: number): string =>
  value
    .toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace(/\s/g, '\u00A0');

