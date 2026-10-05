export type InvoiceTotalsInput = {
  subtotal: number;
  tvaRate: number;
  txRemisePercent?: number;
  montantRemise?: number;
  txRetenueGarantie?: number;
  advanceAmount?: number;
  advancePercentage?: number;
  timbreAmount?: number;
};

const n = (v?: number) => (typeof v === 'number' && !isNaN(v) ? v : 0);
const roundTo2 = (num: number) => Math.round(num * 100) / 100;

export const calculateInvoiceTotals = ({
  subtotal,
  tvaRate,
  txRemisePercent,
  montantRemise,
  txRetenueGarantie,
  advanceAmount,
  advancePercentage,
  timbreAmount,
}: InvoiceTotalsInput) => {

  /* ========= REMISE (classic) ========= */
  const remise =
    n(montantRemise) > 0
      ? n(montantRemise)
      : n(txRemisePercent) > 0
        ? roundTo2(n(subtotal) * (n(txRemisePercent) / 100))
        : 0;

  const htAfterRemise = n(subtotal) - remise;

  /* ========= RETENUE (classic) ========= */
  const retenue =
    n(txRetenueGarantie) > 0
      ? roundTo2(htAfterRemise * (n(txRetenueGarantie) / 100))
      : 0;

  const htAfterRetenue = htAfterRemise - retenue;

  /* ========= STANDARD TTC (classic, before retention) ========= */
  const tvaStandard = roundTo2(htAfterRemise * (n(tvaRate) / 100));
  const htStandardTTC = htAfterRemise + tvaStandard;

  /* ========= ADVANCE (classic path — % of HT subtotal, consistent with AP-first) ========= */
  const advanceClassic = n(advancePercentage) > 0
    ? roundTo2(n(subtotal) * (n(advancePercentage) / 100))
    : n(advanceAmount);

  /* ========= TVA (classic, base = HT − Retenue) ========= */
  const baseTva = htAfterRetenue;
  const tva = roundTo2(baseTva * (n(tvaRate) / 100));
  const htWithTva = baseTva + tva;
  const totalTTCWithTimbre = htWithTva + n(timbreAmount);
  const netToPay = totalTTCWithTimbre - advanceClassic;

  /* =================================================================
   * AP-FIRST SEQUENCE (Hyundai-style)
   * Invoice Price → AP(%) → Retention(%) → Net → VAT(%) → Total
   *
   * RULE (verified against image numbers):
   *   AP        = advancePercentage% × Invoice Price (HT subtotal)
   *   Retention = txRetenueGarantie% × Invoice Price (HT subtotal)
   *   Net       = Invoice Price − AP − Retention
   *   VAT       = tvaRate% × Net
   *   Total     = Net + VAT + Timbre
   * ================================================================= */
  const apAmount = n(advancePercentage) > 0
    ? roundTo2(n(subtotal) * (n(advancePercentage) / 100))   // % of Invoice Price
    : n(advanceAmount);                             // fallback: fixed amount

  const retenueHyundai = n(txRetenueGarantie) > 0
    ? roundTo2(n(subtotal) * (n(txRetenueGarantie) / 100))   // % of Invoice Price
    : 0;

  const netBeforeVAT = n(subtotal) - apAmount - retenueHyundai;
  const tvaOnNet = roundTo2(netBeforeVAT * (n(tvaRate) / 100));
  const totalFinal = netBeforeVAT + tvaOnNet + n(timbreAmount);

  return {
    /* ---- classic fields ---- */
    remiseAmount: remise,
    retenueAmount: retenue,
    subtotalAfterRemise: htAfterRemise,
    subtotalAfterRetenue: htAfterRetenue,
    tvaAmount: tva,
    htWithTva,
    totalTTC: htWithTva,       // without timbre
    baseTTC: htStandardTTC,   // Standard TTC for reference
    totalTTCWithTimbre,                    // WITH timbre (classic)
    netToPay,
    advanceAmount: advanceClassic,
    /* ---- AP-first (Hyundai) fields ---- */
    apAmount,            // AP  = advancePercentage% of Invoice Price
    retenueHyundai,      // Ret = txRetenueGarantie% of Invoice Price
    netBeforeVAT,        // Net = Invoice Price − AP − Retention
    tvaOnNet,            // VAT = tvaRate% of Net
    totalFinal,          // Total = Net + VAT + Timbre
  };
};

export const getLastHT = (inv: any) => {
  const totals = calculateInvoiceTotals({
    subtotal: inv.subtotal,
    tvaRate: inv.tvaRate ?? 0,
    txRemisePercent: inv.txRemisePercent,
    montantRemise: inv.montantRemise,
    txRetenueGarantie: inv.txRetenueGarantie,
    advanceAmount: inv.advanceAmount ?? inv.advance_amount ?? inv.advance_payment,
    advancePercentage: inv.advancePercentage ?? inv.advance_percentage,
  });
  return totals.advanceAmount > 0 ? totals.netBeforeVAT : totals.subtotalAfterRetenue;
};
