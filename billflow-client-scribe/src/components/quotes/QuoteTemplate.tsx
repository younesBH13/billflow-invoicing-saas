import React from 'react';
import { useApp } from '@/contexts/AppContext';

interface QuoteTemplateProps {
    quote: any;
}

// Items that fit per page (conservative — accounts for multi-line designations)
const FIRST_PAGE_ITEM_MAX = 8;   // Less space due to the large header on page 1
const OTHER_PAGES_ITEM_MAX = 18; // Continuation pages (no header, more room)

const QuoteTemplate: React.FC<QuoteTemplateProps> = ({ quote }) => {
    const { clients } = useApp();

    // ── Resolve client data: manual entry or from DB ──
    const clientFromDb = clients.find(c => c.id === quote.client_id?.toString());
    const isManual = !!quote.manual_client_mode;

    const clientData = {
        name: isManual
            ? (quote.manual_client_name || '')
            : (clientFromDb?.name || quote.client_name || ''),
        email: isManual
            ? (quote.manual_client_email || '')
            : (clientFromDb?.email || ''),
        contact: isManual
            ? (quote.manual_client_contact || '')
            : (clientFromDb?.nomContact || ''),
        phone: isManual
            ? (quote.manual_client_phone || '')
            : (clientFromDb?.telMobile || clientFromDb?.phone || ''),
    };

    // ── Pagination logic ──
    const allItems: any[] = quote.items || [];

    const pages: any[][] = [];
    if (allItems.length === 0) {
        pages.push([]);
    } else if (allItems.length <= FIRST_PAGE_ITEM_MAX) {
        pages.push(allItems);
    } else {
        pages.push(allItems.slice(0, FIRST_PAGE_ITEM_MAX));
        let i = FIRST_PAGE_ITEM_MAX;
        while (i < allItems.length) {
            pages.push(allItems.slice(i, i + OTHER_PAGES_ITEM_MAX));
            i += OTHER_PAGES_ITEM_MAX;
        }
    }

    const totalPages = pages.length;

    const formatPrice = (price: number | undefined | null) => {
        if (price === undefined || price === null) return '-';
        return new Intl.NumberFormat('fr-DZ', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price);
    };

    return (
        <div className="id-quote-wrapper">
            <style type="text/css" media="print">
                {`
                    @page { size: A4; margin: 0mm; }
                    body { margin: 0; padding: 0; }
                    .quote-print-page { page-break-after: always; }
                    .quote-print-page:last-child { page-break-after: avoid; }
                    .ql-size-small { font-size: 0.75em; }
                    .ql-size-large { font-size: 1.5em; }
                    .ql-size-huge { font-size: 2.5em; }
                    h1 { font-size: 2em; font-weight: bold; }
                    h2 { font-size: 1.5em; font-weight: bold; }
                    h3 { font-size: 1.17em; font-weight: bold; }
                `}
            </style>

            {pages.map((pageItems, pageIndex) => {
                const isFirstPage = pageIndex === 0;
                const isLastPage = pageIndex === totalPages - 1;

                return (
                    <div
                        key={`quote-page-${pageIndex}`}
                        className="quote-print-page bg-white font-sans mx-auto"
                        style={{
                            width: '210mm',
                            height: '297mm',
                            padding: '8mm 15mm',
                            boxSizing: 'border-box',
                            position: 'relative',
                        }}
                    >
                        {/* ═══════════════════════════════════════════════
                            HEADER — only on the first page
                        ════════════════════════════════════════════════ */}
                        {isFirstPage && (
                            <>
                                {/* Logo */}
                                <div className="text-center mb-3">
                                    <img
                                        src="/entete.jpg"
                                        alt="Inspection Power"
                                        className="w-full object-contain"
                                        style={{ height: 'auto', maxHeight: '150px' }}
                                    />
                                </div>

                                {/* Reference and Date */}
                                <div className="flex justify-between mb-4 font-bold text-sm">
                                    <div>Réf: {quote.reference}</div>
                                    <div>Alger le {new Date(quote.date).toLocaleDateString('fr-FR')}</div>
                                </div>

                                {/* Company and Client Info */}
                                <div className="flex mb-4 text-sm">
                                    {/* Company Info */}
                                    <div className="flex-1 pr-4">
                                        <div className="font-bold underline mb-2">Nos coordonnées :</div>
                                        <div className="font-bold text-base">Inspection Power</div>
                                        <div className="mt-1">
                                            <span className="font-bold">E-mail.</span>{' '}
                                            <a href="mailto:m.belhadj-ezzine@inspectionpower.dz" className="text-blue-600 underline">
                                                m.belhadj-ezzine@inspectionpower.dz
                                            </a>
                                        </div>
                                        <div>
                                            <span className="font-bold">Contact.</span> M. Belhadj-Ezzine (Dir. Technico-Commercial)
                                        </div>
                                        <div>
                                            <span className="font-bold">Mob.</span> + 213 (0)5 50 58 69 90
                                        </div>
                                    </div>

                                    {/* Vertical Separator */}
                                    <div className="border-l-2 border-gray-400 mx-4" />

                                    {/* Client Info */}
                                    <div className="flex-1 pl-4">
                                        <div className="font-bold underline mb-2">Vos coordonnées :</div>
                                        <div className="font-bold text-base">{clientData.name || '—'}</div>
                                        <div className="mt-1">
                                            <span className="font-bold">E-mail:</span>{' '}
                                            {clientData.email ? (
                                                <a href={`mailto:${clientData.email}`} className="text-blue-600 underline">
                                                    {clientData.email}
                                                </a>
                                            ) : '/'}
                                        </div>
                                        <div>
                                            <span className="font-bold">Contact:</span> {clientData.contact || '/'}
                                        </div>
                                        <div>
                                            <span className="font-bold">Mob.</span> {clientData.phone ? `+ ${clientData.phone}` : '/'}
                                        </div>
                                    </div>
                                </div>

                                {/* Title */}
                                <div className="text-center text-xl font-bold mb-4">
                                    Objet: <span className="ml-2">OFFRE COMMERCIALE</span>
                                </div>
                            </>
                        )}

                        {/* ═══════════════════════════════════════════════
                            ITEMS TABLE — on every page
                        ════════════════════════════════════════════════ */}
                        <table className="w-full border-collapse border border-black mb-3 text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-2 text-center w-16">Item</th>
                                    <th className="border border-black p-2 text-center">Désignation</th>
                                    <th className="border border-black p-2 text-center w-32">Unité</th>
                                    <th className="border border-black p-2 text-center w-32">Prix Unitaire</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.length > 0 ? (
                                    pageItems.map((item: any, index: number) => (
                                        <tr key={index}>
                                            {item.display_type === 'text' ? (
                                                <>
                                                    <td className="border border-black p-2 text-center font-semibold">{item.item_number}</td>
                                                    <td colSpan={3} className="border border-black p-2">
                                                        <span className="font-semibold">{item.designation}</span>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="border border-black p-2 text-center font-semibold">{item.item_number}</td>
                                                    <td className="border border-black p-2">
                                                        {item.item_type === 'main' ? (
                                                            <span className="font-semibold">{item.designation}</span>
                                                        ) : (
                                                            <div className="ml-4">● {item.designation}</div>
                                                        )}
                                                    </td>
                                                    <td className="border border-black p-2 text-center break-words">{item.unit || '-'}</td>
                                                    <td className="border border-black p-2 text-right">
                                                        {item.unit_price !== undefined && item.unit_price !== null
                                                            ? formatPrice(item.unit_price)
                                                            : '-'}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="border border-black p-4 text-center text-gray-500">
                                            Aucun article
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* ═══════════════════════════════════════════════
                            TERMS + SIGNATURE — only on the last page
                        ════════════════════════════════════════════════ */}
                        {isLastPage && (
                            <>
                                {/* Terms and Conditions */}
                                {quote.terms && (
                                    <div className="mb-4 text-sm">
                                        <div
                                            className="prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: quote.terms }}
                                        />
                                    </div>
                                )}

                                {/* Signature Area */}
                                <div className="mt-6 flex justify-end" style={{ marginBottom: '28mm' }}>
                                    <div className="text-center">
                                        <div className="font-bold text-lg mb-2">Inspection Power</div>
                                        <div className="text-xs italic">Signature &amp; Cachet</div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ═══════════════════════════════════════════════
                            PAGE NUMBER — fixed, just above the footer
                        ════════════════════════════════════════════════ */}
                        <div
                            className="text-center text-xs text-gray-500"
                            style={{
                                position: 'absolute',
                                bottom: '17mm',
                                left: '15mm',
                                right: '15mm',
                            }}
                        >
                            Page {pageIndex + 1} / {totalPages}
                        </div>

                        {/* ═══════════════════════════════════════════════
                            FOOTER — fixed at the bottom of every page
                        ════════════════════════════════════════════════ */}
                        <div
                            className="text-center text-[10px] text-gray-600 border-t pt-2"
                            style={{
                                position: 'absolute',
                                bottom: '5mm',
                                left: '15mm',
                                right: '15mm',
                            }}
                        >
                            <div>RC N°: 06B0974736-NIF: 0006 16097473628 N° ART: 16115706067</div>
                            <div>Villa N° 56, Rue N° 03 Fekhar Zoubir, Bouzareah, Alger. e-mail: contact@inspectionpower.dz</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default QuoteTemplate;
