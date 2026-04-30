'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, TestAttempt } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { adaptQuestionRow, answersMatchMcq } from '@/lib/practice-mappers';
import { formatSupabaseError } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type AttemptRow = TestAttempt & {
  test?: {
    id?: string | number;
    title?: string;
    name?: string;
  } | null;
};

type AttemptQuestionRow = {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

type AttemptReport = {
  id: string;
  testName: string;
  score: number;
  status: string;
  date: string;
  timeTakenSec: number;
  answeredCount: number;
  correctCount: number;
  totalQuestions: number;
  questions: AttemptQuestionRow[];
};

type StudentReport = {
  student: User;
  totalAttempts: number;
  completedAttempts: number;
  avgScore: number;
  bestScore: number;
  attempts: AttemptReport[];
};

export default function UsersManagementPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportLoadingUserId, setReportLoadingUserId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<StudentReport | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/auth/login');
          return;
        }

        // Check admin
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (!adminUser) {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);

        // Fetch users
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        setUsers(usersData || []);
      } catch (error) {
        console.error('Error:', formatSupabaseError(error), error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const filteredUsers = users.filter(user => {
    return user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const activeUsers = users.length;

  const getAttemptQuestions = async (
    supabase: ReturnType<typeof getSupabaseBrowserClient>,
    attempt: AttemptRow
  ) => {
    const testId = String(attempt.test_id ?? '');

    const { data: linked, error: linkedErr } = await supabase
      .from('test_questions')
      .select('question:questions(*)')
      .eq('test_id', testId)
      .order('order', { ascending: true });

    let normalized = (linked ?? [])
      .map((row) => (row as { question?: Record<string, unknown> }).question)
      .filter((q): q is Record<string, unknown> => q != null)
      .map(adaptQuestionRow);

    if (linkedErr || normalized.length === 0) {
      const { data: direct, error: directErr } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('id', { ascending: true });
      if (!directErr && direct?.length) {
        normalized = direct.map((q) => adaptQuestionRow(q as Record<string, unknown>));
      }
    }

    return normalized;
  };

  const buildStudentReport = async (student: User): Promise<StudentReport> => {
    const supabase = getSupabaseBrowserClient();
    const { data: attemptsData, error: attemptsError } = await supabase
      .from('test_attempts')
      .select('*, test:tests(*)')
      .eq('user_id', student.id)
      .order('created_at', { ascending: false });

    if (attemptsError) {
      throw new Error(formatSupabaseError(attemptsError));
    }

    const rawAttempts = (attemptsData ?? []) as AttemptRow[];
    const detailedAttempts: AttemptReport[] = await Promise.all(
      rawAttempts.map(async (attempt) => {
        const answers = (attempt.answers ?? {}) as Record<string, { userAnswer?: unknown }>;
        const normalizedQuestions = await getAttemptQuestions(supabase, attempt);
        const questions: AttemptQuestionRow[] = normalizedQuestions.map((q) => {
          const userAnswer = String(answers[q.id]?.userAnswer ?? '');
          return {
            questionText: q.question_text,
            userAnswer,
            correctAnswer: String(q.correct_answer ?? ''),
            isCorrect: answersMatchMcq(userAnswer, q.correct_answer),
          };
        });

        const answeredCount = questions.filter((q) => q.userAnswer.trim().length > 0).length;
        const correctCount = questions.filter((q) => q.isCorrect).length;
        const score = Number(attempt.score ?? 0);
        const testName =
          attempt.test?.name ??
          attempt.test?.title ??
          `Test ${String(attempt.test_id ?? '')}`;

        return {
          id: String(attempt.id),
          testName,
          score,
          status: String(attempt.status ?? 'completed'),
          date: String(attempt.created_at ?? new Date().toISOString()),
          timeTakenSec: Number(attempt.time_taken ?? 0),
          answeredCount,
          correctCount,
          totalQuestions: questions.length,
          questions,
        };
      })
    );

    const scores = detailedAttempts.map((a) => a.score);
    const completedAttempts = detailedAttempts.filter((a) => a.status === 'completed').length;
    const avgScore =
      scores.length > 0 ? Number((scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1)) : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

    return {
      student,
      totalAttempts: detailedAttempts.length,
      completedAttempts,
      avgScore,
      bestScore,
      attempts: detailedAttempts,
    };
  };

  const handleOpenReport = async (student: User) => {
    setReportLoadingUserId(student.id);
    try {
      const report = await buildStudentReport(student);
      setSelectedReport(report);
      setSelectedAttemptId(report.attempts[0]?.id ?? null);
    } catch (error) {
      alert(`Failed to build report: ${formatSupabaseError(error)}`);
    } finally {
      setReportLoadingUserId(null);
    }
  };

  const downloadExcelCsv = (report: StudentReport) => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [];

    lines.push('Student Summary');
    lines.push(`Name,${escape(report.student.full_name || '-')}`);
    lines.push(`Email,${escape(report.student.email)}`);
    lines.push(`Phone,${escape(report.student.phone || '-')}`);
    lines.push(`Joined,${escape(new Date(report.student.created_at).toLocaleDateString())}`);
    lines.push(`Total Attempts,${report.totalAttempts}`);
    lines.push(`Completed Attempts,${report.completedAttempts}`);
    lines.push(`Average Score,${report.avgScore}%`);
    lines.push(`Best Score,${report.bestScore}%`);
    lines.push('');

    lines.push('Attempts');
    lines.push('Attempt ID,Test Name,Score %,Status,Date,Time Taken (min),Answered,Correct,Total Questions');
    for (const attempt of report.attempts) {
      lines.push(
        [
          escape(attempt.id),
          escape(attempt.testName),
          attempt.score,
          escape(attempt.status),
          escape(new Date(attempt.date).toLocaleString()),
          Math.round(attempt.timeTakenSec / 60),
          attempt.answeredCount,
          attempt.correctCount,
          attempt.totalQuestions,
        ].join(',')
      );
    }
    lines.push('');

    lines.push('Question Level Details');
    lines.push('Attempt ID,Test Name,Question,Student Answer,Correct Answer,Is Correct');
    for (const attempt of report.attempts) {
      for (const q of attempt.questions) {
        lines.push(
          [
            escape(attempt.id),
            escape(attempt.testName),
            escape(q.questionText),
            escape(q.userAnswer || 'Not answered'),
            escape(q.correctAnswer),
            q.isCorrect ? 'Yes' : 'No',
          ].join(',')
        );
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-report-${report.student.email.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = (report: StudentReport) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Student Report', 14, 16);
    doc.setFontSize(10);
    doc.text(`Name: ${report.student.full_name || '-'}`, 14, 24);
    doc.text(`Email: ${report.student.email}`, 14, 30);
    doc.text(`Phone: ${report.student.phone || '-'}`, 14, 36);
    doc.text(
      `Attempts: ${report.totalAttempts} | Avg: ${report.avgScore}% | Best: ${report.bestScore}%`,
      14,
      42
    );

    autoTable(doc, {
      startY: 48,
      head: [['Attempt ID', 'Test', 'Score', 'Status', 'Date', 'Answered/Correct']],
      body: report.attempts.map((a) => [
        a.id,
        a.testName,
        `${Math.round(a.score)}%`,
        a.status,
        new Date(a.date).toLocaleDateString(),
        `${a.answeredCount}/${a.correctCount}`,
      ]),
      styles: { fontSize: 8 },
    });

    for (const attempt of report.attempts) {
      doc.addPage();
      doc.setFontSize(12);
      doc.text(`Attempt: ${attempt.testName}`, 14, 16);
      doc.setFontSize(10);
      doc.text(
        `Score ${Math.round(attempt.score)}% | ${attempt.correctCount}/${attempt.totalQuestions} correct`,
        14,
        22
      );
      autoTable(doc, {
        startY: 28,
        head: [['Question', 'Student Answer', 'Correct Answer', 'Correct?']],
        body: attempt.questions.map((q) => [
          q.questionText,
          q.userAnswer || 'Not answered',
          q.correctAnswer,
          q.isCorrect ? 'Yes' : 'No',
        ]),
        styles: { fontSize: 8, cellWidth: 'wrap' },
        columnStyles: { 0: { cellWidth: 90 } },
      });
    }

    doc.save(`student-report-${report.student.email.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const selectedAttempt =
    selectedReport?.attempts.find((a) => a.id === selectedAttemptId) ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <Link href="/admin">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Total Users</p>
            <p className="text-4xl font-bold text-blue-600">{users.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Active Users</p>
            <p className="text-4xl font-bold text-purple-600">{activeUsers}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Registered This Month</p>
            <p className="text-4xl font-bold text-green-600">
              {users.filter((u) => {
                const d = new Date(u.created_at);
                const n = new Date();
                return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
              }).length}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">With Phone Number</p>
            <p className="text-4xl font-bold text-orange-600">{users.filter((u) => !!u.phone).length}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <Input
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>

        {/* Users Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Account</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Joined</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Report</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{user.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{user.full_name || '-'}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {user.phone || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenReport(user)}
                          disabled={reportLoadingUserId === user.id}
                        >
                          {reportLoadingUserId === user.id ? 'Loading...' : 'View Report'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-sm text-gray-600 mt-4">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-black/40 z-50 p-4 overflow-auto">
          <div className="max-w-6xl mx-auto bg-white rounded-lg p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Student Report: {selectedReport.student.full_name || selectedReport.student.email}
                </h2>
                <p className="text-gray-600">{selectedReport.student.email}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => downloadExcelCsv(selectedReport)}>
                  Download Excel (CSV)
                </Button>
                <Button onClick={() => downloadPdf(selectedReport)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4"><p className="text-sm text-gray-600">Total Attempts</p><p className="text-2xl font-bold text-blue-600">{selectedReport.totalAttempts}</p></Card>
              <Card className="p-4"><p className="text-sm text-gray-600">Completed</p><p className="text-2xl font-bold text-green-600">{selectedReport.completedAttempts}</p></Card>
              <Card className="p-4"><p className="text-sm text-gray-600">Average Score</p><p className="text-2xl font-bold text-purple-600">{selectedReport.avgScore}%</p></Card>
              <Card className="p-4"><p className="text-sm text-gray-600">Best Score</p><p className="text-2xl font-bold text-orange-600">{selectedReport.bestScore}%</p></Card>
            </div>

            <Card className="p-4 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select attempted test</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={selectedAttemptId ?? ''}
                onChange={(e) => setSelectedAttemptId(e.target.value)}
              >
                {selectedReport.attempts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.testName} - {new Date(a.date).toLocaleString()} - {Math.round(a.score)}%
                  </option>
                ))}
              </select>
            </Card>

            {selectedAttempt ? (
              <Card className="p-4">
                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                  <p><strong>Test:</strong> {selectedAttempt.testName}</p>
                  <p><strong>Status:</strong> {selectedAttempt.status}</p>
                  <p><strong>Score:</strong> {Math.round(selectedAttempt.score)}%</p>
                  <p><strong>Answered:</strong> {selectedAttempt.answeredCount}/{selectedAttempt.totalQuestions}</p>
                  <p><strong>Correct:</strong> {selectedAttempt.correctCount}/{selectedAttempt.totalQuestions}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-2 px-3">Question</th>
                        <th className="text-left py-2 px-3">Student Answer</th>
                        <th className="text-left py-2 px-3">Correct Answer</th>
                        <th className="text-left py-2 px-3">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAttempt.questions.map((q, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-900">{q.questionText}</td>
                          <td className="py-2 px-3 text-gray-700">{q.userAnswer || 'Not answered'}</td>
                          <td className="py-2 px-3 text-gray-700">{q.correctAnswer}</td>
                          <td className={`py-2 px-3 font-medium ${q.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {q.isCorrect ? 'Correct' : 'Incorrect'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card className="p-6 text-center text-gray-600">No attempts found for this student.</Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
