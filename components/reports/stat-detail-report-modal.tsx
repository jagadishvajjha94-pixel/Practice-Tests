'use client';

import { Button } from '@/components/ui/button';
import {
  downloadTableReportExcel,
  downloadTableReportPdf,
  type TableReportPayload,
} from '@/lib/reports/table-report';

type StatDetailReportModalProps = {
  open: boolean;
  onClose: () => void;
  report: TableReportPayload | null;
  fileBase?: string;
};

export function StatDetailReportModal({
  open,
  onClose,
  report,
  fileBase,
}: StatDetailReportModalProps) {
  if (!open || !report) return null;

  const base = fileBase ?? 'dashboard-report';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stat-report-title"
    >
      <div className="flex w-full max-w-6xl max-h-[min(100dvh-1.5rem,900px)] flex-col rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="shrink-0 border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-[#0c2340] to-[#1e3a5f] text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">
              Detail report
            </p>
            <h2 id="stat-report-title" className="text-lg sm:text-xl font-semibold mt-0.5 truncate">
              {report.title}
            </h2>
            {report.subtitle ? (
              <p className="text-sm text-white/85 mt-1">{report.subtitle}</p>
            ) : null}
            <p className="text-xs text-white/70 mt-1">{report.generatedAt}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => downloadTableReportExcel(report, base)}
              disabled={report.rows.length === 0}
            >
              Download Excel
            </Button>
            <Button
              size="sm"
              className="bg-white text-[#0c2340] hover:bg-slate-100"
              onClick={() => downloadTableReportPdf(report, base)}
              disabled={report.rows.length === 0}
            >
              Download PDF
            </Button>
            <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {report.summaryLines?.length ? (
          <div className="shrink-0 px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-100 text-sm text-slate-700 space-y-0.5">
            {report.summaryLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}

        <div className="flex-1 overflow-auto min-h-0 px-4 sm:px-6 py-4">
          {report.rows.length === 0 ? (
            <p className="text-center text-slate-600 py-12">No records for this overview.</p>
          ) : (
            <table className="app-table w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  {report.columns.map((col) => (
                    <th
                      key={col.key}
                      className={
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                      }
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, idx) => (
                  <tr key={idx}>
                    {report.columns.map((col) => (
                      <td
                        key={col.key}
                        className={
                          col.align === 'right'
                            ? 'text-right tabular-nums'
                            : col.align === 'center'
                              ? 'text-center'
                              : ''
                        }
                      >
                        {String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-slate-500 mt-4">
            Showing {report.rows.length} row{report.rows.length === 1 ? '' : 's'}. Export as PDF or
            Excel for the full formatted report.
          </p>
        </div>
      </div>
    </div>
  );
}
