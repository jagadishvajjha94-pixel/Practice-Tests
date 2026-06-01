'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { UserProfile } from '@/lib/types';
import { getClientUser } from '@/lib/client-auth';
import { formatDbError } from '@/lib/utils';
import { StatusAlert } from '@/components/ui/status-alert';
import {
  fetchProfileViaApi,
  RESUME_MAX_CHARS,
  saveProfileViaApi,
  uploadResumeViaApi,
} from '@/lib/user-profile';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    college: '',
    branch: '',
    resume_text: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [envMissing, setEnvMissing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const authUser = await getClientUser();

      if (!authUser) {
        router.push('/auth/login?redirect=/profile');
        return;
      }

      const { profile, error } = await fetchProfileViaApi();

      if (error && !profile) {
        setFetchError(error);
        return;
      }

      const resolved = profile ?? {
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: (authUser.user_metadata?.full_name as string) || '',
        phone: null,
        subscription_status: 'free' as const,
        subscription_end_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setUser({ ...resolved, email: resolved.email || authUser.email || '' });
      setFormData({
        full_name: resolved.full_name || '',
        phone: resolved.phone || '',
        college: resolved.college || '',
        branch: resolved.branch || '',
        resume_text: resolved.resume_text || '',
      });
    } catch (error) {
      setFetchError(formatDbError(error));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: 'error', text: 'Sign in to save your profile.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const resume_text = formData.resume_text.trim().slice(0, RESUME_MAX_CHARS) || null;
      const { ok, error } = await saveProfileViaApi({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        college: formData.college.trim() || null,
        branch: formData.branch.trim() || null,
        resume_text,
        resume_updated_at: resume_text
          ? new Date().toISOString()
          : (user.resume_updated_at ?? null),
      });

      if (!ok) {
        throw new Error(error ?? 'Could not save profile');
      }

      setMessage({ type: 'success', text: 'Profile saved' });
      setUser({
        ...user,
        ...formData,
        resume_text,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: formatDbError(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingResume(true);
    setMessage(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'dat';
      let resumeText = formData.resume_text;
      if (ext === 'txt' || ext === 'md' || file.type.startsWith('text/')) {
        resumeText = (await file.text()).slice(0, RESUME_MAX_CHARS);
      }

      const upload = await uploadResumeViaApi( file);

      const nextResumeText = resumeText.trim() || formData.resume_text.trim() || null;
      const nowIso = new Date().toISOString();

      const save = await saveProfileViaApi( {
        resume_file_name: upload.fileName ?? file.name,
        resume_storage_path: upload.storagePath,
        resume_text: nextResumeText,
        resume_updated_at: nowIso,
      });

      if (!save.ok) {
        throw new Error(save.error ?? 'Could not save resume to your profile');
      }

      setFormData((prev) => ({
        ...prev,
        resume_text: resumeText || prev.resume_text,
      }));
      setUser((prev) =>
        prev
          ? {
              ...prev,
              resume_file_name: upload.fileName ?? file.name,
              resume_storage_path: upload.storagePath,
              resume_text: resumeText || prev.resume_text,
              resume_updated_at: nowIso,
            }
          : prev,
      );

      let successText: string;
      if (!upload.ok) {
        successText =
          'Resume text saved. File could not be uploaded to storage, but your interview questions will still use the pasted text.';
      } else if (ext !== 'txt' && ext !== 'md' && !file.type.startsWith('text/')) {
        successText =
          'File uploaded. Add or edit resume text below for best AI interview questions (PDF text is not auto-extracted yet).';
      } else {
        successText = 'Resume file loaded into your profile.';
      }
      setMessage({ type: 'success', text: successText });
    } catch (error) {
      setMessage({ type: 'error', text: formatDbError(error) });
    } finally {
      setUploadingResume(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (envMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground text-center max-w-md">{'Configure AUTH_SECRET and DATABASE_URL'}</p>
      </div>
    );
  }

  const authEmail = user?.email ?? '';

  return (
    <div className="app-page">
      <header className="app-page-header">
        <div className="max-w-3xl mx-auto px-4 space-y-2">
          <span className="app-eyebrow">Account</span>
          <h1 className="app-title-lg">My profile</h1>
          <p className="app-subtitle">
            Keep your details and resume up to date for placement tests and the AI interview module.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card className="p-6 sm:p-8">
          <h2 className="app-section-title mb-1">Personal details</h2>
          <p className="app-muted mb-6">Email is locked to your portal sign-in.</p>

          {fetchError ? (
            <StatusAlert variant="error" className="mb-4">
              {fetchError}
            </StatusAlert>
          ) : null}

          {message ? (
            <StatusAlert variant={message.type === 'success' ? 'success' : 'error'} className="mb-6">
              {message.text}
            </StatusAlert>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={authEmail}
                disabled
                className="border-border bg-muted/50 text-muted-foreground"
              />
            </div>

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="border-border bg-background/70 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                  Phone
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="border-border bg-background/70 text-foreground"
                />
              </div>
              <div>
                <label htmlFor="college" className="block text-sm font-medium text-foreground mb-2">
                  College
                </label>
                <Input
                  id="college"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  className="border-border bg-background/70 text-foreground"
                />
              </div>
            </div>

            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-foreground mb-2">
                Branch / Degree
              </label>
              <Input
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="border-border bg-background/70 text-foreground"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-[#0c2340]">Resume</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a .txt/.md file or paste text. Used when you start the AI interview.
                </p>
              </div>
              {user?.resume_file_name ? (
                <p className="text-sm text-foreground">
                  On file: <strong className="text-primary">{user.resume_file_name}</strong>
                  {user.resume_updated_at
                    ? ` · updated ${new Date(user.resume_updated_at).toLocaleDateString()}`
                    : null}
                </p>
              ) : null}
              <Input
                type="file"
                accept=".txt,.md,.pdf,.doc,.docx,text/plain"
                disabled={uploadingResume}
                onChange={(e) => void handleResumeFile(e)}
                className="border-border bg-background/70 text-foreground file:text-foreground"
              />
              <Textarea
                id="resume_text"
                name="resume_text"
                rows={8}
                value={formData.resume_text}
                onChange={handleChange}
                placeholder="Paste resume text here (skills, education, projects, internships)…"
                className="border-border bg-background/70 text-foreground placeholder:text-muted-foreground min-h-[10rem]"
                maxLength={RESUME_MAX_CHARS}
              />
              <p className="text-xs text-muted-foreground">
                {formData.resume_text.length} / {RESUME_MAX_CHARS} characters
              </p>
            </div>

            <div className="pt-4 border-t border-border/80">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
