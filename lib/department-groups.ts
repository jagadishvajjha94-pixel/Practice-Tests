import type { DbServiceClient } from '@/lib/db/get-db-service';

export type DepartmentGroup = {
  id: string;
  name: string;
  description: string | null;
  departments: string[];
};

export async function listDepartmentGroups(
  admin: DbServiceClient,
): Promise<DepartmentGroup[]> {
  const { data: groups } = await admin
    .from('department_groups')
    .select('id, name, description')
    .order('name');

  if (!groups?.length) return [];

  const { data: members } = await admin
    .from('department_group_members')
    .select('group_id, department');

  const byGroup = new Map<string, string[]>();
  for (const row of members ?? []) {
    const gid = row.group_id as string;
    const list = byGroup.get(gid) ?? [];
    list.push(row.department as string);
    byGroup.set(gid, list);
  }

  return groups.map((g) => ({
    id: g.id as string,
    name: g.name as string,
    description: (g.description as string | null) ?? null,
    departments: byGroup.get(g.id as string) ?? [],
  }));
}

export async function getGroupDepartments(
  admin: DbServiceClient,
  groupId: string | null | undefined,
): Promise<string[]> {
  if (!groupId) return [];

  const { data } = await admin
    .from('department_group_members')
    .select('department')
    .eq('group_id', groupId);

  return (data ?? []).map((r) => r.department as string);
}

/** Expand group + manual branches into primary department and target_branches. */
export function resolveExamBranchTargeting(input: {
  primaryDepartment: string;
  departmentGroupId?: string | null;
  groupDepartments?: string[];
  extraBranches?: string[];
}): { department: string; target_branches: string[] } {
  const primary = input.primaryDepartment.trim();
  const groupDepts = input.groupDepartments ?? [];
  const extra = (input.extraBranches ?? []).map((b) => b.trim()).filter(Boolean);

  const allFromGroup = groupDepts.length > 0 ? groupDepts : [];
  const pool = Array.from(new Set([...allFromGroup, ...extra]));

  const department = primary || pool[0] || '';
  const target_branches = pool.filter((d) => d !== department);

  return { department, target_branches };
}

export function departmentsForPerformanceView(
  facultyDepartment: string,
  publishedExams: Array<{ department: string; target_branches: string[] }>,
): string[] {
  const set = new Set<string>([facultyDepartment]);
  for (const exam of publishedExams) {
    if (exam.department) set.add(exam.department);
    for (const b of exam.target_branches ?? []) {
      if (b) set.add(b);
    }
  }
  return Array.from(set);
}
