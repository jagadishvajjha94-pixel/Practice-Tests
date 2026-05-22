import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatScorePercentLabel } from '@/lib/format-score';
import type { SectionScoreResult } from '@/lib/exam-v2/scoring';

export type StudentReportData = {
  studentName: string;
  email: string;
  generatedAt: string;
  overallPercent: number;
  totalAttempts: number;
  avgScore: number;
  weakTopics: string[];
  sectionScores?: SectionScoreResult[];
  recentTests: Array<{ name: string; score: number; date: string }>;
};

export function downloadStudentReportPdf(data: StudentReportData): void {
  const doc = new jsPDF();
  const margin = 14;

  doc.setFontSize(18);
  doc.text('PrepIndia — Student Performance Report', margin, 20);

  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Generated: ${data.generatedAt}`, margin, 28);
  doc.setTextColor(0);

  doc.setFontSize(13);
  doc.text(data.studentName, margin, 40);
  doc.setFontSize(10);
  doc.text(data.email, margin, 46);

  doc.setFontSize(12);
  doc.text(`Overall score: ${formatScorePercentLabel(data.overallPercent)}`, margin, 58);
  doc.text(
    `Attempts: ${data.totalAttempts} · Average: ${formatScorePercentLabel(data.avgScore)}`,
    margin,
    65,
  );

  if (data.weakTopics.length) {
    doc.text(`Weak topics: ${data.weakTopics.join(', ')}`, margin, 72);
  }

  let y = 82;

  if (data.sectionScores?.length) {
    autoTable(doc, {
      startY: y,
      head: [['Section', 'Score', 'Cutoff', 'Status']],
      body: data.sectionScores.map((s) => [
        s.name,
        formatScorePercentLabel(s.percent),
        s.cutoffScore !== null ? formatScorePercentLabel(s.cutoffScore) : '—',
        s.passedCutoff ? 'Pass' : 'Below cutoff',
      ]),
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  if (data.recentTests.length) {
    autoTable(doc, {
      startY: y,
      head: [['Test', 'Score', 'Date']],
      body: data.recentTests.map((t) => [t.name, formatScorePercentLabel(t.score), t.date]),
    });
  }

  doc.save(`prepindia-report-${data.studentName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
