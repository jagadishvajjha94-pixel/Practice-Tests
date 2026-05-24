import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatAttemptStatus, isCompletedAttemptStatus, isInProgressStatus } from '@/lib/attempt-status';
import {
  averageScorePercent,
  formatScorePercentLabel,
  roundRatePercent,
  roundScorePercent,
} from '@/lib/format-score';
import type { TestReportRow, TestReportsPayload } from '@/lib/admin/test-reports-data';
import { sortTestReportRows } from '@/lib/admin/schedule-report-filter';

export type TestReportPdfOptions = {
  examLabel: string;
  testName?: string;
  scheduleLabel?: string;
  rows: TestReportRow[];
  summary?: TestReportsPayload['summary'];
};

function computeSummary(rows: TestReportRow[]): TestReportsPayload['summary'] {
  const completedRows = rows.filter((r) => isCompletedAttemptStatus(r.status, r.completed_at));
  const inProgressCount = rows.filter(
    (r) => isInProgressStatus(r.status) && !r.completed_at,
  ).length;
  const scores = completedRows.map((r) => r.score);
  const uniqueStudents = new Set(rows.map((r) => r.user_id)).size;
  const passed = scores.filter((s) => s >= 40).length;

  return {
    total_attempts: rows.length,
    in_progress_count: inProgressCount,
    completed_count: completedRows.length,
    unique_students: uniqueStudents,
    avg_score: scores.length > 0 ? averageScorePercent(scores) : 0,
    pass_rate: scores.length > 0 ? roundRatePercent((passed / scores.length) * 100) : 0,
    highest_score: scores.length > 0 ? roundScorePercent(Math.max(...scores)) : 0,
  };
}

function branchBreakdown(rows: TestReportRow[]): Array<{ branch: string; students: number; avg: number }> {
  const byBranch = new Map<string, { users: Set<string>; scores: number[] }>();

  for (const row of rows) {
    const branch = row.branch?.trim() || 'Not specified';
    const bucket = byBranch.get(branch) ?? { users: new Set<string>(), scores: [] };
    bucket.users.add(row.user_id);
    if (isCompletedAttemptStatus(row.status, row.completed_at)) {
      bucket.scores.push(row.score);
    }
    byBranch.set(branch, bucket);
  }

  return Array.from(byBranch.entries())
    .map(([branch, data]) => ({
      branch,
      students: data.users.size,
      avg: data.scores.length > 0 ? averageScorePercent(data.scores) : 0,
    }))
    .sort((a, b) => b.students - a.students);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function downloadTestReportPdf(options: TestReportPdfOptions): void {
  const { examLabel, testName, scheduleLabel, rows: rawRows } = options;
  const rows = sortTestReportRows(rawRows);
  const summary = options.summary ?? computeSummary(rows);
  const generatedAt = new Date().toLocaleString();
  const doc = new jsPDF({ orientation: rows.length > 25 ? 'landscape' : 'portrait' });
  const margin = 14;
  let y = 18;

  doc.setFontSize(18);
  doc.setTextColor(12, 35, 64);
  doc.text('Exam Conduct Report', margin, y);

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  y += 8;
  doc.text(examLabel, margin, y);
  y += 6;
  if (testName) {
    doc.text(`Exam: ${testName}`, margin, y);
    y += 6;
  }
  if (scheduleLabel) {
    doc.text(`Schedule: ${scheduleLabel}`, margin, y);
    y += 6;
  }
  doc.text(`Generated: ${generatedAt}`, margin, y);
  y += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text('Overall summary', margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Total attempts', String(summary.total_attempts)],
      ['Unique students', String(summary.unique_students)],
      ['Completed', String(summary.completed_count)],
      ['In progress', String(summary.in_progress_count)],
      ['Average score (completed)', formatScorePercentLabel(summary.avg_score)],
      ['Pass rate (≥40%)', formatScorePercentLabel(summary.pass_rate)],
      ['Highest score', formatScorePercentLabel(summary.highest_score)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [12, 35, 64] },
    theme: 'grid',
    margin: { left: margin, right: margin },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 8;

  const branches = branchBreakdown(rows);
  if (branches.length > 0) {
    doc.setFontSize(12);
    doc.text('Department / branch breakdown', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Department / branch', 'Students', 'Avg score (completed)']],
      body: branches.map((b) => [
        b.branch,
        String(b.students),
        b.avg > 0 ? formatScorePercentLabel(b.avg) : '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 95] },
      theme: 'striped',
      margin: { left: margin, right: margin },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
    y += 8;
  }

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.text('No student attempts recorded for this exam yet.', margin, y);
  } else {
    doc.setFontSize(12);
    doc.text(`Student attempts (${rows.length})`, margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Rank', 'Student', 'Roll', 'Branch', 'Year', 'Test', 'Score', 'Status', 'Started', 'Completed', 'Time (min)']],
      body: rows.map((row) => [
        row.rank != null ? String(row.rank) : '—',
        row.student_name,
        row.roll_number || '—',
        row.branch ?? '—',
        row.academic_year ?? '—',
        row.test_name,
        formatScorePercentLabel(row.score),
        formatAttemptStatus(row.status),
        new Date(row.created_at).toLocaleString(),
        row.completed_at ? new Date(row.completed_at).toLocaleString() : '—',
        row.time_taken_sec != null ? String(Math.max(1, Math.round(row.time_taken_sec / 60))) : '—',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [12, 35, 64], fontSize: 7 },
      theme: 'striped',
      margin: { left: margin, right: margin },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `PrepIndia · Exam Conduct Report · Page ${page} of ${pageCount}`,
      margin,
      doc.internal.pageSize.getHeight() - 8,
    );
  }

  const namePart = testName ? slugify(testName) : slugify(examLabel);
  const slotPart =
    rows[0]?.slot_number != null ? `-slot-${rows[0].slot_number}` : '';
  const datePart = new Date().toISOString().slice(0, 10);
  doc.save(`exam-report-${namePart}${slotPart}-${datePart}.pdf`);
}
