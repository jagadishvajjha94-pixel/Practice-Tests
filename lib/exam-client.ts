/**
 * Browser-side client for the **official exam engine** (Nest exam-service via this app's
 * `/api/exam/*` proxy). Practice tests continue to use Supabase; this is for proctored flows only.
 */
const examApi = '/api/exam';

export type StartOfficialSessionResponse = {
  id: string;
  examId: string;
  userId: string;
  status: string;
  startedAt: string;
  endsAt: string;
  resumeToken: string | null;
  submittedAt: string | null;
};

export async function startOfficialExamSession(examId: string): Promise<StartOfficialSessionResponse> {
  const res = await fetch(`${examApi}/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examId }),
    credentials: 'include',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `start session failed (${res.status})`);
  }
  return JSON.parse(text) as StartOfficialSessionResponse;
}

export async function autosaveOfficialSession(sessionId: string, answers: Record<string, string>): Promise<void> {
  const res = await fetch(`${examApi}/sessions/${sessionId}/autosave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error((await res.text()) || `autosave failed (${res.status})`);
  }
}

export async function submitOfficialSession(sessionId: string): Promise<void> {
  const res = await fetch(`${examApi}/sessions/${sessionId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error((await res.text()) || `submit failed (${res.status})`);
  }
}
