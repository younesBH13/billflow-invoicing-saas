import React from 'react';

import { amountToFrenchWords, formatAmount } from '@/utils/frenchNumberToWords';
import { calculateInvoiceTotals } from '@/utils/invoiceTotals';
import { getCompanyProfileById } from '@/utils/companyProfiles';

interface InvoiceItem {
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
  type?: 'text' | 'text_with_quantity' | 'amount';
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  client: {
    code?: string;
    name: string;
    fiscalId: string;
    commerceRegistry: string;
    taxArticle: string;
    address: string;
    nis?: string;
  };
  service: {
    prestation: string;
    period: string;
    project: string;
    affairNumber?: string;
    conventionRef: string;
    contractRef: string;
    bcRef: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tvaRate: number;
  tvaAmount: number;
  total: number;
  totalInWords: string;
  paymentMethod: string;
  observations?: string;
  timbreAmount?: number;
  advanceAmount?: number;
  advancePercentage?: number;
  amountDue?: number;
  txRemisePercent?: number;
  txRetenueGarantie?: number;
  montantRemise?: number;
  type?: 'proforma' | 'definitive' | 'credit_note';
  company_entity?: 'principal' | 'secondary';
  companyEntity?: 'principal' | 'secondary';
}

export type InvoiceTemplateItem = InvoiceItem;
export type InvoiceTemplateData = InvoiceData;

interface InvoiceTemplateProps {
  data: InvoiceData;
  companyInfo?: {
    name: string;
    logo?: string;
    address: string;
    email: string;
    rc: string;
    nif: string;
    nis?: string;
    art: string;
    rib: string;
    capital: string;
    phone?: string;
    website?: string;
  };
}

interface LabelProps {
  fr: string;
  en: string;
  className?: string;
}

/**
 * ✅ Make titles (FR/EN) smaller to gain space
 * ✅ Keep ":" perfectly aligned with the value (vertical center)
 */
const Label: React.FC<LabelProps> = ({ fr, en, className }) => (
  <div className={`leading-[11px] ${className ?? ''}`}>
    <div className="text-[11px] font-semibold">{fr}</div>
    <div className="text-[8px] text-gray-500">{en}</div>
  </div>
);

const TableHeaderLabel: React.FC<{ fr: string; en: string; align?: 'left' | 'center' | 'right' }> = ({
  fr,
  en,
  align = 'left',
}) => (
  <div className={`leading-tight ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}`}>
    <div className="font-medium">{fr}</div>
    <div className="text-[9px] text-gray-600">{en}</div>
  </div>
);

/**
 * ✅ 1) Narrower label column => more space for values
 * ✅ 2) items-center => value baseline aligns with ":" (not above)
 * ✅ 3) values slightly smaller than labels (looks like old invoice)
 */
const InfoRow: React.FC<{
  fr: string;
  en: string;
  value?: React.ReactNode;
  valueClassName?: string;
}> = ({ fr, en, value, valueClassName }) => (
  <div className="grid grid-cols-[44mm_5mm_1fr] items-start gap-0">
    <div className="min-w-0 pr-2">
      <Label fr={fr} en={en} />
    </div>

    {/* ✅ ":" aligned with FIRST line */}
    <div className="text-center text-[11px] font-semibold leading-none pt-[2px]">:</div>

    {/* ✅ value starts exactly on same first-line level */}
    <div className={`min-w-0 break-words text-[11px] leading-[14px] pt-[2px] ${valueClassName ?? ''}`}>
      {value ?? ''}
    </div>
  </div>
);

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  data,
  companyInfo,
}) => {
  const effectiveCompanyInfo = companyInfo || getCompanyProfileById(data.company_entity || (data as any).companyEntity);
  const timbreAmount = data.timbreAmount ?? 0;
  const advanceAmount = data.advanceAmount ?? 0;
  const items = data.items ?? [];
  const totals = calculateInvoiceTotals({
    subtotal: data.subtotal ?? 0,
    tvaRate: data.tvaRate ?? 0,
    txRemisePercent: data.txRemisePercent,
    montantRemise: data.montantRemise,
    txRetenueGarantie: data.txRetenueGarantie,
    advanceAmount,
    advancePercentage: data.advancePercentage,
    timbreAmount,
  });
  const subtotalValue = data.subtotal ?? 0;
  // FORCE the display percentage to match the math:
  // Prioritize non-zero data.advancePercentage, otherwise calculate from (apAmount / subtotal)
  const displayPercent = (data.advancePercentage && data.advancePercentage > 0)
    ? data.advancePercentage
    : (subtotalValue > 0 && totals.apAmount > 0)
      ? Number(((totals.apAmount / subtotalValue) * 100).toFixed(2))
      : 0;
  const netTotal = totals.advanceAmount > 0 ? totals.totalFinal : totals.netToPay;
  const totalInWords = data.totalInWords || amountToFrenchWords(netTotal);
  const showTimbre = timbreAmount > 0;
  const showRemise = totals.remiseAmount !== 0 || (data.txRemisePercent ?? 0) !== 0;
  const showRetenue = totals.retenueAmount !== 0 || (data.txRetenueGarantie ?? 0) !== 0;
  const tvaRateValue = Number(data.tvaRate ?? 0);
  const isTvaExempt = tvaRateValue === 0;

  // Logic for dynamic "Montant HT X" numbering
  // Start with HT 1 only if there's a modification (Remise)
  // Or if there's Retenue, the intermediate might be HT 1 then HT 2.
  // Standard (no remise, no retenue): "Montant HT" (Subtotal) -> TVA -> TTC
  // With Remise: "Montant HT" (Subtotal) -> Remise -> "Montant HT 1" -> ...
  // With Retenue: ... -> Retenue -> "Montant HT 2" (or 1 if no remise)

  // Logic defined in plan:
  // "Subtotal" is "Montant HT"
  // "After Remise" is "Montant HT 1"
  // "After Retenue" is "Montant HT 2" (if Remise was shown) OR "Montant HT 1" (if no Remise)

  const labelHtAfterRemise = "Montant HT 1";
  const labelHtAfterRetenue = showRemise ? "Montant HT 2" : "Montant HT 1";


  const referenceEntries = [
    { label: 'Réf. Convention', value: data.service.conventionRef, en: 'Agreement Ref.' },
    { label: 'Réf. Contrat', value: data.service.contractRef ?? '', en: 'Contract Ref.' },
    { label: 'Réf. BC', value: data.service.bcRef ?? '', en: 'PO Ref.' },
  ].filter((e) => e.label === 'Réf. Convention' || String(e.value).trim() !== '');


  const renderQuantity = (value?: number) =>
    value !== undefined && value !== null && value !== 0
      ? value.toLocaleString('fr-FR', { maximumFractionDigits: 3 })
      : '';

  const renderCurrency = (value?: number) =>
    value !== undefined && value !== null && value !== 0 ? formatAmount(value) : value === 0 ? formatAmount(0) : '';

  const renderPercent = (value?: number) =>
    value !== undefined && value !== null && !Number.isNaN(value)
      ? value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
      : '0';

  const resolveItemType = (item: InvoiceItem): InvoiceItem['type'] => {
    if (item.type) return item.type;
    const quantity = item.quantity ?? 0;
    const total = item.total ?? 0;
    if ((quantity === 0 || Number.isNaN(quantity)) && (!item.unitPrice || item.unitPrice === 0) && total === 0) {
      return 'text';
    }
    return 'text_with_quantity';
  };

  const paginateItems = (all: InvoiceItem[]) => {
    type Page = { items: InvoiceItem[]; showTable: boolean };
    if (!all || all.length === 0) return [{ items: [] as InvoiceItem[], showTable: false }] as Page[];

    // First page: max 14 items — the totals/text block must fit below the table
    const FIRST_PAGE_MAX = 14;
    // Last page shares space with totals section, so keep it reasonable
    const LAST_PAGE_MAX = 14;
    // Middle pages (no header, no totals) can hold more rows
    const MAX_OTHER_PAGE_ROWS = 18;

    // All items fit on one page (totals will follow on the same page)
    if (all.length <= FIRST_PAGE_MAX) return [{ items: all, showTable: true }] as Page[];

    // Two pages case: first page = FIRST_PAGE_MAX, rest on last page
    if (all.length <= FIRST_PAGE_MAX + LAST_PAGE_MAX) {
      return [
        { items: all.slice(0, FIRST_PAGE_MAX), showTable: true },
        { items: all.slice(FIRST_PAGE_MAX), showTable: true },
      ] as Page[];
    }

    // Three or more pages
    const pages: Page[] = [];
    pages.push({ items: all.slice(0, FIRST_PAGE_MAX), showTable: true });

    let i = FIRST_PAGE_MAX;
    const lastStart = Math.max(i, all.length - LAST_PAGE_MAX);

    while (i < lastStart) {
      const chunk = Math.min(MAX_OTHER_PAGE_ROWS, lastStart - i);
      pages.push({ items: all.slice(i, i + chunk), showTable: true });
      i += chunk;
    }

    const remaining = all.slice(i);
    pages.push({ items: remaining, showTable: remaining.length > 0 });
    return pages;
  };


  const pages = paginateItems(items);
  const pageCount = pages.length;

  return (
    <div className="id-invoice-wrapper">
      <style type="text/css" media="print">
        {`
          @page { size: auto; margin: 0mm; }
          body { margin: 0; padding: 0; }
        `}
      </style>
      {pages.map((page, pageIndex) => {
        const pageItems = page.items;
        const isLastPage = pageIndex === pageCount - 1;
        const isFirstPage = pageIndex === 0;

        return (
          <div
            key={`invoice-page-${pageIndex}`}
            className="
              invoice-print-page
              relative
              bg-white
              font-sans
              mx-auto
              text-sm
            "
            style={{
              width: '210mm',
              height: '297mm',
              padding: '8mm 10mm',
              boxSizing: 'border-box'
            }}
          >

            {/* ========= HEADER (only on first page) ========= */}
            {isFirstPage && (
              <div className="flex items-start gap-4 mt-0">
                <div className="w-[50mm] flex flex-col items-start leading-tight">
                  <img src="/logo.png" alt="Logo" className="h-[20mm] object-contain" />
                  <div className="mt-[1px] text-[10px] font-bold">
                    INSPECTION <span className="text-red-600">POWER</span>
                  </div>
                  <div className="text-[8px] font-semibold uppercase">NDT & THIRD PARTY INSPECTION</div>
                  <div className="text-[8px] italic text-gray-600">Inspection & Contrôle Non-destructif</div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="border border-gray-400 rounded-[10px] px-4 py-3 text-center min-h-[26mm] flex flex-col justify-center">
                    <div className="text-[10px] font-semibold leading-[14px] text-center break-words">
                      {effectiveCompanyInfo.address}
                    </div>
                    <div className="text-[10px] font-semibold leading-snug">Email {effectiveCompanyInfo.email}</div>
                    <div className="mt-2 text-[10px] font-semibold leading-snug whitespace-nowrap">
                      RC : {effectiveCompanyInfo.rc} — NIF : {effectiveCompanyInfo.nif} — N° Art : {effectiveCompanyInfo.art}
                    </div>
                    <div className="text-[10px] font-semibold leading-snug whitespace-nowrap">
                      NIS : {effectiveCompanyInfo.nis || '0006 161105986 39'} — RIB : {effectiveCompanyInfo.rib} — CAPITAL SOCIAL : {effectiveCompanyInfo.capital}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========= INVOICE STRIP ========= */}
            <div className={isFirstPage ? 'mt-3' : 'mt-2'}>
              <div className="border-t-2 border-b-2 border-red-600 py-1.5 px-0.5">
                <div className="flex items-center font-semibold tracking-wide whitespace-nowrap text-black text-[12px] leading-[14px]">
                  <span className="w-1/3 text-left">CLIENT</span>
                  <span className="w-1/3 text-[13px] font-bold text-center uppercase">
                    {data.type === 'proforma' ? 'FACTURE PROFORMA' : data.type === 'credit_note' ? "FACTURE D'AVOIR" : 'FACTURE'} N° : {data.invoiceNumber}
                  </span>
                  <span className="w-1/3 text-right">Date : {data.date}</span>
                </div>
              </div>

              {isFirstPage && (
                <div className="grid grid-cols-2 gap-8 pt-2">
                  {/* Client */}
                  <div className="space-y-2">
                    <InfoRow
                      fr="Nom ou Raison Sociale"
                      en="Name / Company Name"
                      value={<span className="font-bold text-black">{data.client.name}</span>}
                      valueClassName="leading-[14px]"
                    />


                    {data.client.code && <InfoRow fr="Code Client" en="Client Code" value={data.client.code} />}

                    <InfoRow
                      fr="Numéro d'Identification Fiscal"
                      en="Tax Identification Number"
                      value={data.client.fiscalId}
                    />

                    {data.client.nis && (
                      <InfoRow
                        fr="NIS"
                        en="Statistical ID Number"
                        value={data.client.nis}
                      />
                    )}

                    <InfoRow fr="Registre de Commerce" en="Commercial Registry" value={data.client.commerceRegistry} />

                    <InfoRow fr="Article d'Imposition" en="Tax Article" value={data.client.taxArticle} />

                    <InfoRow fr="Adresse" en="Address" value={data.client.address} valueClassName="leading-[14px]" />
                  </div>

                  {/* Service */}
                  <div className="space-y-2">
                    <InfoRow
                      fr="Prestation"
                      en="Service"
                      value={data.service.prestation}
                      valueClassName="leading-[14px]"
                    />
                    <InfoRow fr="Période" en="Period" value={data.service.period} />
                    <InfoRow fr="Projet" en="Project" value={data.service.project} valueClassName="leading-[14px]" />

                    {data.service.affairNumber && (
                      <InfoRow fr="N° d'affaire" en="Case No." value={data.service.affairNumber} />
                    )}

                    {referenceEntries.map((entry) => (
                      <InfoRow key={entry.label} fr={entry.label} en={entry.en} value={entry.value} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ========= TABLE ========= */}
            {page.showTable && (
              <div className="mt-3">
                <table className="w-full border-collapse text-[12px] table-auto">

                  <thead className="table-header-group">
                    <tr className="bg-gray-300 text-gray-900">
                      <th className="border-2 border-gray-400 pl-3 pr-3 py-[5px] align-middle text-left">
                        <div className="w-full text-left">
                          <TableHeaderLabel fr="Désignation" en="Description" align="left" />
                        </div>
                      </th>

                      {/* ✅ Quantité header shifted left, but centered within a smaller inner box */}
                      <th className="border-2 border-gray-400 px-0 py-[5px] align-middle whitespace-nowrap" align="center" style={{ textAlign: 'center' }}>
                        <div className="w-[12mm] mx-auto text-center" style={{ textAlign: 'center' }}>
                          <TableHeaderLabel fr="Quantité" en="Quantity" align="center" />
                        </div>
                      </th>

                      <th className="border-2 border-gray-400 px-2 py-[5px] align-middle" align="center" style={{ textAlign: 'center' }}>
                        <div className="text-center" style={{ textAlign: 'center' }}>
                          <TableHeaderLabel fr="Unité de Mesure" en="Unit" align="center" />
                        </div>
                      </th>

                      <th className="border-2 border-gray-400 px-2 py-[5px] align-middle whitespace-nowrap" align="center" style={{ textAlign: 'center' }}>
                        <div className="text-center" style={{ textAlign: 'center' }}>
                          <TableHeaderLabel fr="Prix unitaire" en="Unit Price" align="center" />
                        </div>
                      </th>

                      <th className="border-2 border-gray-400 pl-2 pr-3 py-[5px] align-middle whitespace-nowrap" align="right" style={{ textAlign: 'right' }}>
                        <div className="text-right whitespace-nowrap" style={{ textAlign: 'right' }}>
                          <div className="font-medium">TOTAL HT</div>
                          <div className="text-[9px] text-gray-600 whitespace-nowrap">Total (Excl. VAT)</div>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageItems.map((item, index) => {
                      const itemType = resolveItemType(item);
                      const isTextLine = itemType === 'text';

                      const TD_COMMON = 'border border-gray-300 py-[8px] align-middle leading-[13px] text-[12px]';

                      return (
                        <tr key={`${item.description}-${pageIndex}-${index}`} className="break-inside-avoid h-[22px]">
                          {isTextLine ? (
                            <>
                              <td className={`${TD_COMMON} pl-3 pr-3 text-left font-medium whitespace-pre-line break-words`}>
                                {item.description}
                              </td>

                              <td className={`${TD_COMMON} px-2 text-center`} align="center" style={{ textAlign: 'center' }}>&nbsp;</td>
                              <td className={`${TD_COMMON} px-2 text-center`} align="center" style={{ textAlign: 'center' }}>&nbsp;</td>
                              <td className={`${TD_COMMON} px-2 text-right`} align="right" style={{ textAlign: 'right' }}>&nbsp;</td>
                              <td className={`${TD_COMMON} pl-2 pr-3 text-right`} align="right" style={{ textAlign: 'right' }}>&nbsp;</td>
                            </>
                          ) : (
                            <>
                              <td className={`${TD_COMMON} pl-3 pr-3 text-left whitespace-pre-line break-words`}>
                                {item.description}
                              </td>

                              {/* ✅ Quantité value shifted left, but centered inside a smaller inner box */}
                              <td className={`${TD_COMMON} px-0 whitespace-nowrap`} align="center" style={{ textAlign: 'center' }}>
                                <div className="w-[12mm] mx-auto text-center" style={{ textAlign: 'center' }}>
                                  {renderQuantity(item.quantity) || '\u00A0'}
                                </div>
                              </td>

                              <td className={`${TD_COMMON} px-2 text-center whitespace-nowrap`} align="center" style={{ textAlign: 'center' }}>
                                {item.unit && item.unit.trim() ? item.unit : '\u00A0'}
                              </td>

                              <td className={`${TD_COMMON} px-2 text-center whitespace-nowrap`} align="center" style={{ textAlign: 'center' }}>
                                {renderCurrency(item.unitPrice) || '\u00A0'}
                              </td>

                              <td className={`${TD_COMMON} pl-2 pr-3 text-right whitespace-nowrap font-semibold`} align="right" style={{ textAlign: 'right' }}>
                                {renderCurrency(item.total) || '\u00A0'}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ========= TOTALS + SIGNATURE ========= */}
            {isLastPage && (
              <div className="mt-1 space-y-1">
                <div className="grid grid-cols-2 gap-6 items-start">
                  {/* ✅ Left box: do NOT stretch with the right column */}
                  <div className="border-2 border-gray-400 rounded-lg px-3 py-2 min-h-[28mm] h-fit self-start">
                    <div className="text-[12px] mb-1">
                      <span className="font-medium">La présente facture est arrêtée à la somme de :</span>
                    </div>
                    <div className="font-bold text-[14px] leading-5 uppercase">
                      {totalInWords}
                    </div>
                  </div>

                  {totals.advanceAmount > 0 ? (
                    /* ======= AP-FIRST SEQUENCE (Hyundai-style) ======= */
                    /* Invoice Price → AP → Retention → Net → VAT → Total */
                    <div className="space-y-0.5 text-[10px]">

                      {/* 1. Invoice Price */}
                      <div className="flex justify-between bg-gray-200 px-2 py-[7px] border border-gray-300">
                        <span className="font-semibold uppercase leading-none">
                          <span className="block text-[10px]">Montant HT</span>
                          <span className="block text-[7px] text-gray-500 normal-case">Subtotal</span>
                        </span>
                        <span className="font-semibold text-[12px]">
                          {formatAmount(data.subtotal ?? 0)}
                        </span>
                      </div>

                      {/* 2. AP (Avance sur Approvisionnement) */}
                      <div className="flex justify-between bg-gray-50 px-2 py-[7px] border border-gray-300 text-gray-800">
                        <span className="font-medium uppercase leading-none">
                          <span className="block text-[10px]">Retenue Avance sur Appro ({renderPercent(displayPercent)} %)</span>
                          <span className="block text-[7px] text-gray-500 normal-case">Advance Payment</span>
                        </span>
                        <span className="font-semibold text-[12px]">
                          - {formatAmount(totals.apAmount)}
                        </span>
                      </div>

                      {/* 3. Retenue de garantie */}
                      {(totals.retenueHyundai > 0 || (data.txRetenueGarantie ?? 0) > 0) && (
                        <div className="flex justify-between bg-gray-50 px-2 py-[7px] border border-gray-300 text-gray-800">
                          <span className="font-medium uppercase leading-none">
                            <span className="block text-[10px]">Retenue de garantie ({renderPercent(data.txRetenueGarantie)} %)</span>
                            <span className="block text-[7px] text-gray-500 normal-case">Retention</span>
                          </span>
                          <span className="font-semibold text-[12px]">- {formatAmount(totals.retenueHyundai)}</span>
                        </div>
                      )}

                      {/* 4. Net (Invoice Price − AP − Retention) */}
                      <div className="flex justify-between bg-gray-200 px-2 py-[7px] border border-gray-300">
                        <span className="font-semibold uppercase leading-none">
                          <span className="block text-[10px]">Montant HT 1</span>
                          <span className="block text-[7px] text-gray-500 normal-case">Net (before VAT)</span>
                        </span>
                        <span className="font-semibold text-[12px]">{formatAmount(totals.netBeforeVAT)}</span>
                      </div>

                      {/* 5. TVA */}
                      <div className="flex justify-between bg-gray-50 px-2 py-[7px] border border-gray-300">
                        <span className="font-semibold uppercase leading-none">
                          {isTvaExempt ? (
                            <>
                              <span className="block text-[10px]">Exonéré TVA</span>
                              <span className="block text-[7px] text-gray-500 normal-case">VAT Exempt</span>
                            </>
                          ) : (
                            <>
                              <span className="block text-[10px]">TVA ({data.tvaRate} %)</span>
                              <span className="block text-[7px] text-gray-500 normal-case">VAT</span>
                            </>
                          )}
                        </span>
                        <span className="font-semibold text-[12px]">
                          {isTvaExempt ? '—' : `+ ${formatAmount(totals.tvaOnNet)}`}
                        </span>
                      </div>

                      {/* 6. Timbre (Conditional) */}
                      {showTimbre && (
                        <div className="flex justify-between bg-gray-50 px-2 py-[7px] border border-gray-300">
                          <span className="font-semibold uppercase leading-none">
                            <span className="block text-[10px]">Timbre</span>
                            <span className="block text-[7px] text-gray-500 normal-case">Stamp</span>
                          </span>
                          <span className="font-semibold text-[12px]">{formatAmount(timbreAmount)}</span>
                        </div>
                      )}

                      {/* 7. Total */}
                      <div className="flex justify-between bg-gray-300 px-2 py-[7px] border border-gray-300 font-bold">
                        <span className="font-bold uppercase leading-none">
                          <span className="block text-[11px]">Total TTC</span>
                          <span className="block text-[7px] text-gray-500 normal-case">Total</span>
                        </span>
                        <span className="font-bold text-[14px]">{formatAmount(totals.totalFinal)}</span>
                      </div>

                    </div>
                  ) : (
                    /* ======= CLASSIC SEQUENCE ======= */
                    /* Montant HT → Remise → Retenue → TVA → TTC */
                    <div className="space-y-0 text-[10px]">
                      {/* 1. Montant HT (Gross) */}
                      <div className="flex justify-between bg-gray-200 px-2 py-[4px] border border-gray-300">
                        <span className="font-semibold uppercase leading-none">
                          <span className="block text-[10px]">Montant HT</span>
                          <span className="block text-[7px] text-gray-500 normal-case">Subtotal</span>
                        </span>
                        <span className="font-semibold text-[12px]">
                          {formatAmount(data.subtotal ?? 0)}
                        </span>
                      </div>

                      {/* 2. Remise (Conditional) -> HT1 */}
                      {showRemise && (
                        <>
                          <div className="flex justify-between bg-gray-50 px-2 py-[4px] border border-gray-300 text-gray-800">
                            <span className="font-medium uppercase leading-none">
                              <span className="block text-[10px]">Remise (-) ({renderPercent(data.txRemisePercent)} %)</span>
                              <span className="block text-[7px] text-gray-500 normal-case">Discount</span>
                            </span>
                            <span className="font-semibold text-[12px]">- {formatAmount(totals.remiseAmount)}</span>
                          </div>
                          <div className="flex justify-between bg-gray-200 px-2 py-[4px] border border-gray-300">
                            <span className="font-semibold uppercase leading-none">
                              <span className="block text-[10px]">{labelHtAfterRemise}</span>
                              <span className="block text-[7px] text-gray-500 normal-case">Net Commercial</span>
                            </span>
                            <span className="font-semibold text-[12px]">{formatAmount(totals.subtotalAfterRemise)}</span>
                          </div>
                        </>
                      )}

                      {/* 3. Retenue (Conditional) -> HT2 */}
                      {showRetenue && (
                        <>
                          <div className="flex justify-between bg-gray-50 px-2 py-[4px] border border-gray-300 text-gray-800">
                            <span className="font-medium uppercase leading-none">
                              <span className="block text-[10px]">Retenue de garantie ({renderPercent(data.txRetenueGarantie)} %)</span>
                              <span className="block text-[7px] text-gray-500 normal-case">Retention</span>
                            </span>
                            <span className="font-semibold text-[12px]">- {formatAmount(totals.retenueAmount)}</span>
                          </div>
                          <div className="flex justify-between bg-gray-200 px-2 py-[4px] border border-gray-300">
                            <span className="font-semibold uppercase leading-none">
                              <span className="block text-[10px]">{labelHtAfterRetenue}</span>
                              <span className="block text-[7px] text-gray-500 normal-case">Net Financial</span>
                            </span>
                            <span className="font-semibold text-[12px]">{formatAmount(totals.subtotalAfterRetenue)}</span>
                          </div>
                        </>
                      )}

                      {/* 4. TVA */}
                      <div className="flex justify-between bg-gray-50 px-2 py-[4px] border border-gray-300">
                        <span className="font-semibold uppercase">
                          {isTvaExempt ? (
                            <span className="leading-none">
                              <span className="block text-[10px]">Exonéré TVA</span>
                              <span className="block text-[7px] text-gray-500 normal-case">VAT Exempt</span>
                            </span>
                          ) : (
                            <span className="leading-none">
                              <span className="block text-[10px]">TVA : {data.tvaRate} %</span>
                              <span className="block text-[7px] text-gray-500 normal-case">VAT</span>
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-[12px]">
                          {isTvaExempt ? '—' : `+ ${formatAmount(totals.tvaAmount)}`}
                        </span>
                      </div>

                      {/* 5. Timbre (Conditional) */}
                      {showTimbre && (
                        <div className="flex justify-between bg-gray-50 px-2 py-[4px] border border-gray-300">
                          <span className="font-semibold uppercase leading-none">
                            <span className="block text-[10px]">Timbre</span>
                            <span className="block text-[7px] text-gray-500 normal-case">Stamp</span>
                          </span>
                          <span className="font-semibold text-[12px]">{formatAmount(timbreAmount)}</span>
                        </div>
                      )}

                      {/* 6. TTC / Total General */}
                      <div className="flex justify-between bg-gray-300 font-bold px-2 py-[4px] border border-gray-300">
                        <span className="font-semibold uppercase leading-none">
                          <span className="block text-[10px]">Montant TTC</span>
                          <span className="block text-[7px] text-gray-500 normal-case">Total TTC</span>
                        </span>
                        <span className="font-semibold text-[14px]">
                          {formatAmount(totals.totalTTCWithTimbre)}
                        </span>
                      </div>
                    </div>
                  )}


                </div>

                <div className="grid grid-cols-2 gap-6 mt-1">
                  <div>
                    <div className="font-medium text-[12px] leading-none">Mode de Paiement</div>
                    <div className="text-[8px] text-gray-500 leading-none mt-[1px]">Payment Method</div>
                    <div className="text-[12px] mt-[2px]">{data.paymentMethod}</div>

                    {data.observations && (
                      <div className="mt-1.5">
                        <div className="font-medium text-[12px] leading-none">Observations</div>
                        <div className="text-[8px] text-gray-500 leading-none mt-[1px]">Notes</div>
                        <div className="text-[12px] mt-[2px] whitespace-pre-wrap">{data.observations}</div>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-[16px]">P/{effectiveCompanyInfo.name}</div>
                    <div className="text-[12px] text-gray-600">Cachet et Signature</div>
                    <div className="h-[27mm]" />
                  </div>
                </div>
              </div>
            )}

            <div className="absolute text-center text-gray-600 text-sm" style={{
              bottom: '5mm',
              left: '10mm',
              right: '10mm'
            }}>
              PAGE : {pageIndex + 1}/{pageCount}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InvoiceTemplate;
