'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type DepartmentGroupOption = {
  id: string;
  name: string;
  description: string | null;
  departments: string[];
};

type Props = {
  value: string;
  onChange: (groupId: string) => void;
  primaryDepartment?: string;
  compact?: boolean;
};

export function DepartmentGroupPicker({
  value,
  onChange,
  primaryDepartment,
  compact = false,
}: Props) {
  const [groups, setGroups] = useState<DepartmentGroupOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/department-groups')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { groups?: DepartmentGroupOption[] } | null) => {
        setGroups(json?.groups ?? []);
        setLoading(false);
      });
  }, []);

  const selected = groups.find((g) => g.id === value);

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Department group
        </label>
        {!compact ? (
          <p className="text-xs text-slate-500 mt-0.5">
            Students in this group receive the exam. Faculty in those branches see progress.
          </p>
        ) : null}
        <select
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
        >
          <option value="">No group — use branch selection only</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.departments.length} dept{g.departments.length === 1 ? '' : 's'})
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.departments.map((dept) => (
            <Badge
              key={dept}
              tone={primaryDepartment && dept === primaryDepartment ? 'brand' : 'neutral'}
              className={cn('text-[11px]')}
            >
              {dept}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
