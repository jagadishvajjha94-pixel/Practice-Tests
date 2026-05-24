import type { SupabaseClient } from '@supabase/supabase-js';
import { departmentsMatch } from '@/lib/department-match';
import type { EvaloraModuleScheduleRow } from '@/lib/evalora/module-schedule';

function isRmsetScheduleLive(
  row: Pick<EvaloraModuleScheduleRow, 'status' | 'starts_at' | 'ends_at'>,
  now = Date.now(),
): boolean {
  if (row.status !== 'live') return false;
  const start = new Date(row.starts_at).getTime();
  if (Number.isNaN(start) || now < start) return false;
  if (!row.ends_at) return true;
  return now <= new Date(row.ends_at).getTime();
}

function scheduleMatchesStudent(
  row: Pick<EvaloraModuleScheduleRow, 'target_departments' | 'target_years'>,
  department: string,
  year: string,
): boolean {
  const years = row.target_years ?? [];
  if (years.length > 0 && !years.includes(year)) return false;
  const depts = row.target_departments ?? [];
  if (depts.length === 0) return true;
  return depts.some((d) => departmentsMatch(d, department));
}

export async function getLiveRmsetSchedule(
  admin: SupabaseClient,
  department: string,
  year: string,
): Promise<EvaloraModuleScheduleRow | null> {
  const { data: rows } = await admin
    .from('evalora_module_schedules')
    .select('*')
    .eq('module_key', 'rmset')
    .neq('status', 'ended')
    .order('starts_at', { ascending: false });

  const now = Date.now();
  for (const row of (rows ?? []) as EvaloraModuleScheduleRow[]) {
    if (!scheduleMatchesStudent(row, department, year)) continue;
    if (isRmsetScheduleLive(row, now)) return row;
  }
  return null;
}
