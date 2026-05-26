import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

export async function exportToExcel(
  data: unknown[],
  columns: ExportColumn[],
  filename: string
): Promise<void> {
  const rows = data as Record<string, unknown>[];
  const worksheetData = [
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => row[c.key] ?? '')),
  ];

  const worksheet = utils.aoa_to_sheet(worksheetData);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Data');

  // Set column widths
  worksheet['!cols'] = columns.map((c) => ({ wch: c.width || 15 }));

  writeFile(workbook, `${filename}.xlsx`);
}

export async function exportToCSV(
  data: unknown[],
  columns: ExportColumn[],
  filename: string
): Promise<void> {
  const rows = data as Record<string, unknown>[];
  const headers = columns.map((c) => c.header).join(',');
  const csvRows = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = row[c.key] ?? '';
          // Escape commas and quotes
          if (typeof val === 'string' && (val.includes(',') || val.includes('"')))
            return `"${val.replace(/"/g, '""')}"`;
          return val;
        })
        .join(',')
    )
    .join('\n');

  const csvContent = '\uFEFF' + headers + '\n' + csvRows; // BOM for Arabic
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

export async function exportToPDF(
  data: unknown[],
  columns: ExportColumn[],
  filename: string,
  options?: {
    title?: string;
    subtitle?: string;
    companyName?: string;
    logo?: string;
    rtl?: boolean;
  }
): Promise<void> {
  const rows = data as Record<string, unknown>[];
  const doc = new jsPDF(options?.rtl ? { orientation: 'portrait', unit: 'mm', format: 'a4' } : {});
  
  // RTL support
  if (options?.rtl) {
    doc.setR2L(true);
  }

  // Title
  if (options?.title) {
    doc.setFontSize(18);
    doc.text(options.title, options?.rtl ? doc.internal.pageSize.width - 14 : 14, 20, { align: options?.rtl ? 'right' : 'left' });
  }

  if (options?.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(options.subtitle, options?.rtl ? doc.internal.pageSize.width - 14 : 14, 28, { align: options?.rtl ? 'right' : 'left' });
  }

  // Table
  autoTable(doc, {
    startY: options?.title ? 35 : 20,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ''))),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    styles: { font: options?.rtl ? 'Cairo' : 'helvetica', fontSize: 9, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    direction: options?.rtl ? 'rtl' : 'ltr',
  } as unknown as Parameters<typeof autoTable>[1]);

  doc.save(`${filename}.pdf`);
}


