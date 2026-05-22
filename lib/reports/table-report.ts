import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type TableReportColumn = {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
};

export type TableReportPayload = {
  title: string;
  subtitle?: string;
  generatedAt: string;
  summaryLines?: string[];
  columns: TableReportColumn[];
  rows: Array<Record<string, string | number>>;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function downloadTableReportPdf(payload: TableReportPayload, fileBase?: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  const base = fileBase ?? slugify(payload.title);
  const dateStamp = new Date().toISOString().slice(0, 10);

  doc.setFillColor(12, 35, 64);
  doc.rect(0, 0, 297, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(payload.title, 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated ${payload.generatedAt}`, 14, 21);
  if (payload.subtitle) {
    doc.text(payload.subtitle, 14, 26);
  }

  let y = 34;
  doc.setTextColor(30, 41, 59);
  if (payload.summaryLines?.length) {
    doc.setFontSize(10);
    for (const line of payload.summaryLines) {
      doc.text(line, 14, y);
      y += 5;
    }
    y += 4;
  }

  const head = [payload.columns.map((c) => c.header)];
  const body = payload.rows.map((row) =>
    payload.columns.map((c) => String(row[c.key] ?? '')),
  );

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(
      payload.columns.map((c, i) => [
        i,
        { halign: c.align ?? 'left' },
      ]),
    ),
    margin: { left: 14, right: 14 },
  });

  doc.save(`${base}-${dateStamp}.pdf`);
}

/** Excel-compatible workbook (HTML table) — opens in Excel and Google Sheets. */
export function downloadTableReportExcel(payload: TableReportPayload, fileBase?: string): void {
  const base = fileBase ?? slugify(payload.title);
  const dateStamp = new Date().toISOString().slice(0, 10);

  const summaryRows =
    payload.summaryLines
      ?.map(
        (line) =>
          `<tr><td colspan="${payload.columns.length}" style="font-size:11px;color:#334155;padding:4px 8px;">${escapeHtml(line)}</td></tr>`,
      )
      .join('') ?? '';

  const headerCells = payload.columns
    .map(
      (c) =>
        `<th style="background:#1e3a5f;color:#fff;font-weight:bold;padding:8px 10px;text-align:left;border:1px solid #cbd5e1;">${escapeHtml(c.header)}</th>`,
    )
    .join('');

  const bodyRows = payload.rows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = payload.columns
        .map((c) => {
          const align = c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left';
          return `<td style="padding:6px 10px;border:1px solid #e2e8f0;background:${bg};text-align:${align};">${escapeHtml(row[c.key])}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"/>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Report</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  .title { font-size: 16pt; font-weight: bold; color: #0c2340; padding: 8px; }
  .meta { font-size: 10pt; color: #475569; padding: 4px 8px 12px; }
</style></head>
<body>
<table>
<tr><td colspan="${payload.columns.length}" class="title">${escapeHtml(payload.title)}</td></tr>
<tr><td colspan="${payload.columns.length}" class="meta">${escapeHtml(payload.subtitle ?? '')} · Generated ${escapeHtml(payload.generatedAt)}</td></tr>
${summaryRows}
<tr>${headerCells}</tr>
${bodyRows}
</table>
</body></html>`;

  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${base}-${dateStamp}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
