'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ElevateXLiveInfo } from '@/components/elevatex/elevatex-live-info';
import {
  PLACEMENT_DEPARTMENTS,
  PLACEMENT_EXAM_NAME,
  PLACEMENT_EXAM_TAGLINE,
  PLACEMENT_SECTIONS,
  PLACEMENT_TOTAL_MARKS,
  PLACEMENT_TOTAL_SEC,
} from '@/lib/placement/config';
import {
  buildPlacementSession,
  loadSessionByHallTicket,
  saveCandidateDraft,
  saveSession,
} from '@/lib/placement/session';
import { buildCandidate } from '@/lib/placement/scoring';

export default function PlacementAssessmentStartPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [hallTicket, setHallTicket] = useState('');
  const [departmentId, setDepartmentId] = useState('cse');
  const [collegeName, setCollegeName] = useState('');
  const [resumeAvailable, setResumeAvailable] = useState(false);

  useEffect(() => {
    // Show "Resume previous attempt" CTA only if a session exists for this device.
    if (typeof window === 'undefined') return;
    const draft = window.sessionStorage.getItem('placement:session');
    setResumeAvailable(Boolean(draft));
  }, []);

  const totalMinutes = Math.round(PLACEMENT_TOTAL_SEC / 60);

  const canStart = fullName.trim().length > 1 && hallTicket.trim().length > 0;

  const handleStart = () => {
    const finalDept = departmentId;

    // If a saved session matches this hall ticket, ask to resume; otherwise build fresh.
    const existing = loadSessionByHallTicket(hallTicket.trim());
    if (existing && !existing.submitted) {
      const proceed = window.confirm(
        'A previous in-progress attempt was found for this hall ticket on this device. Resume it?',
      );
      if (proceed) {
        saveCandidateDraft(existing.candidate);
        // Re-mirror to sessionStorage so /placement/take loads it.
        saveSession(existing);
        router.push('/placement/take');
        return;
      }
    }

    const candidate = buildCandidate({
      fullName,
      hallTicket,
      departmentId: finalDept,
      collegeName: collegeName.trim() || null,
      examName: PLACEMENT_EXAM_NAME,
    });
    const session = buildPlacementSession(candidate);
    saveCandidateDraft(candidate);
    saveSession(session);
    router.push('/placement/take');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 text-white">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-pink-400/40 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-4 py-8">
          <Link href="/placement" className="text-sm text-white/80 hover:text-white mb-4 inline-block">
            ← Back to ElevateX hub
          </Link>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30 flex items-center justify-center text-3xl shadow-lg shrink-0">
              🚀
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">
                {collegeName.trim() || 'Your College'}
              </p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-fuchsia-100 to-cyan-200 bg-clip-text text-transparent">
                {PLACEMENT_EXAM_NAME} · Full assessment
              </h1>
              <p className="text-sm text-white/85 mt-1">
                {PLACEMENT_EXAM_TAGLINE} · {PLACEMENT_SECTIONS.length} sections · {PLACEMENT_TOTAL_MARKS} marks ·{' '}
                {totalMinutes} minutes total
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-5 gap-8">
        <Card className="md:col-span-3 p-6 sm:p-8 shadow-sm border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Candidate details</h2>
          <p className="text-sm text-slate-600 mb-6">
            Enter your hall ticket and department to begin. The exam runs on a single 60-minute timer across all
            sections.
          </p>

          <ElevateXLiveInfo className="mb-6" />

          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramachandra K"
                  className="mt-1"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="hallTicket">Hall ticket / Student ID</Label>
                <Input
                  id="hallTicket"
                  value={hallTicket}
                  onChange={(e) => setHallTicket(e.target.value.toUpperCase())}
                  placeholder="e.g. 22ABC1234"
                  className="mt-1 font-mono"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="college">College name (optional)</Label>
              <Input
                id="college"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="e.g. RCE Institute of Technology"
                className="mt-1"
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <select
                id="department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                {PLACEMENT_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                size="lg"
                disabled={!canStart}
                onClick={handleStart}
                className="bg-[#1e3a5f] hover:bg-[#16304f]"
              >
                Begin assessment
              </Button>
              {resumeAvailable ? (
                <Button variant="outline" asChild>
                  <Link href="/placement/take">Resume saved session</Link>
                </Button>
              ) : null}
              <Button variant="ghost" asChild>
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2 p-6 sm:p-8 shadow-sm border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Section breakdown</h2>
          <ul className="space-y-3 text-sm">
            {PLACEMENT_SECTIONS.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-md bg-white border border-slate-200 p-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0" aria-hidden>
                    {s.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {s.marks} marks
                      {s.questionCount ? ` · ${s.questionCount} Q` : ''}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-4">
            One 60-minute timer for the full exam. You may switch sections at any time until time runs out or you
            submit.
          </p>
        </Card>
      </div>
    </div>
  );
}
