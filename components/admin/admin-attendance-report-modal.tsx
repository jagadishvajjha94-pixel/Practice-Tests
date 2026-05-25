'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatDetailReportModal } from '@/components/reports/stat-detail-report-modal';
import {
  buildAttendanceReportPayload,
  summarizeAttendanceDay,
} from '@/lib/admin/attendance-report';
import type {
  AdminDashboardAttempt,
  AdminDashboardStudent,
} from '@/lib/admin/dashboard-card-reports';
import {
  formatDateKeyLabel,
  getTodayDateKeyInIST,
} from '@/lib/admin/report-date-filter';
import { formatScorePercentLabel } from '@/lib/format-score';

type AdminAttendanceReportModalProps = {
  open: boolean;
  onClose: () => void;
  dateKey: string;
  onDateKeyChange: (dateKey: string) => void;
  students: AdminDashboardStudent[];
  attempts: AdminDashboardAttempt[];
};

export function AdminAttendanceReportModal({
  open,
  onClose,
  dateKey,
  onDateKeyChange,
  students,
  attempts,
}: AdminAttendanceReportModalProps) {
  const todayKey = getTodayDateKeyInIST();
  const summary = useMemo(
    () => summarizeAttendanceDay(dateKey, students, attempts),
    [dateKey, students, attempts],
  );
  const report = useMemo(
    () => buildAttendanceReportPayload(dateKey, students, attempts),
    [dateKey, students, attempts],
  );

  const shiftDate = (deltaDays: number) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    if (!y || !m || !d) return;
    const next = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
    onDateKeyChange(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(next),
    );
  };

  const toolbar = (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Attendance date (IST)
        </label>
        <Input
          type="date"
          value={dateKey}
          max={todayKey}
          onChange={(e) => {
            const v = e.target.value;
            if (v) onDateKeyChange(v);
          }}
          className="w-[11.5rem]"
        />
        <Button
          type="button"
          size="sm"
          variant={dateKey === todayKey ? 'default' : 'outline'}
          className={dateKey === todayKey ? 'bg-[#0c2340] hover:bg-[#16304f]' : ''}
          onClick={() => onDateKeyChange(todayKey)}
        >
          Today
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => shiftDate(-1)}>
          Previous day
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={dateKey >= todayKey}
          onClick={() => shiftDate(1)}
        >
          Next day
        </Button>
      </div>
      <p className="text-sm text-slate-600 sm:ml-auto">
        <span className="font-semibold text-[#0c2340]">{formatDateKeyLabel(dateKey)}</span>
        {' · '}
        <span className="font-semibold text-emerald-700">
          {formatScorePercentLabel(summary.attendanceRate)} present
        </span>
        {' '}
        ({summary.attendedCount}/{summary.totalStudents})
      </p>
    </div>
  );

  return (
    <StatDetailReportModal
      open={open}
      onClose={onClose}
      report={report}
      fileBase={`attendance-${dateKey}`}
      toolbar={toolbar}
    />
  );
}
