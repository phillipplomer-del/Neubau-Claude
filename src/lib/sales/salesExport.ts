/**
 * Sales Export Utilities
 * Functions for exporting sales data to PDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SalesEntry } from '@/types/sales';
import type { SalesKPIs } from './kpiCalculator';
import { formatCurrency, formatNumber } from './kpiCalculator';

/**
 * Format date for PDF (German format)
 */
function formatDateForPDF(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('de-DE').format(d);
}

/**
 * Safe string conversion for PDF
 */
function safeStringForPDF(value: unknown): string {
  if (value === null || value === undefined) return '-';
  return String(value);
}

/**
 * Export sales data to PDF with KPIs
 */
export async function exportSalesToPDF(
  data: SalesEntry[],
  kpis: SalesKPIs,
  filterInfo?: {
    mode: string;
    hasFilters: boolean;
    searchQuery?: string;
    year?: string | null;
    month?: string | null;
  }
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Title
  doc.setFontSize(18);
  doc.text('Offene Lieferungen - Export', 14, 15);

  // Date
  doc.setFontSize(10);
  doc.text(`Erstellt am: ${formatDateForPDF(new Date())}`, 14, 22);

  // KPIs Box
  let yPos = 30;
  doc.setFontSize(12);
  doc.text('Kennzahlen:', 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  const kpiLines = [
    `Offene Lieferungen: ${formatNumber(kpis.totalDeliveries)}`,
    `Offener Umsatz: ${formatCurrency(kpis.totalOpenRevenue)}`,
    `Verzögerte Lieferungen: ${formatNumber(kpis.delayedDeliveries)}`,
    `Ø Verzögerung: ${kpis.averageDelay > 0 ? `${kpis.averageDelay.toFixed(1)} Tage` : 'Keine'}`,
  ];

  kpiLines.forEach((line) => {
    doc.text(line, 14, yPos);
    yPos += 5;
  });

  // Filter Info
  if (filterInfo?.hasFilters) {
    yPos += 3;
    doc.setFontSize(10);
    const filterLines: string[] = [];

    if (filterInfo.mode === 'projects') {
      filterLines.push('Filter: Nur Projekte');
    } else if (filterInfo.mode === 'articles') {
      filterLines.push('Filter: Nur Artikel');
    }

    if (filterInfo.searchQuery) {
      filterLines.push(`Suche: "${filterInfo.searchQuery}"`);
    }

    if (filterInfo.year) {
      if (filterInfo.month) {
        const monthNames = [
          'Januar',
          'Februar',
          'März',
          'April',
          'Mai',
          'Juni',
          'Juli',
          'August',
          'September',
          'Oktober',
          'November',
          'Dezember',
        ];
        const monthName = monthNames[parseInt(filterInfo.month) - 1];
        filterLines.push(`Zeitraum: ${monthName} ${filterInfo.year}`);
      } else {
        filterLines.push(`Jahr: ${filterInfo.year}`);
      }
    }

    filterLines.forEach((line) => {
      doc.text(line, 14, yPos);
      yPos += 5;
    });
  }

  yPos += 5;

  // Table data
  const tableData = data.map((entry) => [
    safeStringForPDF(entry.deliveryNumber),
    safeStringForPDF(entry.projektnummer),
    formatDateForPDF(entry.importedAt),
    safeStringForPDF(entry.customerNumber),
    safeStringForPDF(entry.customerName),
    safeStringForPDF(entry.country),
    safeStringForPDF(entry.productGroup),
    safeStringForPDF(entry.artikelnummer),
    safeStringForPDF(entry.productDescription),
    formatDateForPDF(entry.requestedDeliveryDate),
    formatDateForPDF(entry.confirmedDeliveryDate),
    formatDateForPDF(entry.deliveryDate),
    safeStringForPDF(entry.unit),
    entry.quantity !== null && entry.quantity !== undefined
      ? formatNumber(entry.quantity)
      : '-',
    safeStringForPDF(entry.projectManager),
    safeStringForPDF(entry.processor),
    entry.openTurnover !== null && entry.openTurnover !== undefined
      ? formatCurrency(entry.openTurnover)
      : '-',
    entry.delayDays !== null && entry.delayDays !== undefined
      ? entry.delayDays > 0
        ? `+${entry.delayDays}`
        : String(entry.delayDays)
      : '-',
  ]);

  // Generate table
  autoTable(doc, {
    head: [
      [
        'Bestellnummer',
        'PNR',
        'Buchungsdatum',
        'Kundennr.',
        'Kunde',
        'Land',
        'Produktgruppe',
        'Produktnr.',
        'Produktname',
        'Wunschtermin',
        'Best. Termin',
        'Lieferdatum',
        'Einheit',
        'Menge',
        'Projektverantw.',
        'Bearbeiter',
        'Offener Umsatz',
        'Verzug (Tage)',
      ],
    ],
    body: tableData,
    startY: yPos,
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [71, 85, 105], // gray-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // gray-50
    },
    columnStyles: {
      0: { cellWidth: 20 }, // Bestellnummer
      1: { cellWidth: 20 }, // PNR
      2: { cellWidth: 18 }, // Buchungsdatum
      3: { cellWidth: 15 }, // Kundennummer
      4: { cellWidth: 25 }, // Kunde
      5: { cellWidth: 12 }, // Land
      6: { cellWidth: 18 }, // Produktgruppe
      7: { cellWidth: 20 }, // Produktnummer
      8: { cellWidth: 30 }, // Produktname
      9: { cellWidth: 18 }, // Wunschtermin
      10: { cellWidth: 18 }, // Best. Termin
      11: { cellWidth: 18 }, // Lieferdatum
      12: { cellWidth: 12 }, // Einheit
      13: { cellWidth: 12 }, // Menge
      14: { cellWidth: 20 }, // Projektverantwortlich
      15: { cellWidth: 18 }, // Bearbeiter
      16: { cellWidth: 18 }, // Offener Umsatz
      17: { cellWidth: 14 }, // Verzug
    },
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.text(
        `Seite ${currentPage} von ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  // Save PDF
  const fileName = `offene-lieferungen-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
