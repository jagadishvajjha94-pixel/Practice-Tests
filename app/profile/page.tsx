'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { UserProfile } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';
import { formatSupabaseError } from '@/lib/utils';
import { ensureUserProfile, RESUME_MAX_CHARS } from '@/lib/user-profile';

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
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setEnvMissing(true);
        return;
      }
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/auth/login?redirect=/profile');
        return;
      }

      const { profile, error, tableMissing: missing } = await ensureUserProfile(supabase, authUser);
      if (missing) {
        setUser({
          id: authUser.id,
          email: authUser.email ?? '',
          full_name: (authUser.user_metadata?.full_name as string) || '',
          phone: null,
          subscription_status: 'free',
          subscription_end_date: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setFormData({
          full_name: (authUser.user_metadata?.full_name as string) || '',
          phone: '',
          college: '',
          branch: '',
          resume_text: '',
        });
        return;
      }
      if (error || !profile) {
        setFetchError(error ?? 'Could not load profile');
        return;
      }

      setUser({ ...profile, email: profile.email || authUser.email || '' });
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        college: profile.college || '',
        branch: profile.branch || '',
        resume_text: profile.resume_text || '',
      });
    } catch (error) {
      setFetchError(formatSupabaseError(error));
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
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setMessage({ type: 'error', text: SUPABASE_PUBLIC_ENV_MESSAGE });
        return;
      }
      const resume_text = formData.resume_text.trim().slice(0, RESUME_MAX_CHARS) || null;
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          college: formData.college.trim() || null,
          branch: formData.branch.trim() || null,
          resume_text,
          updated_at: new Date().toISOString(),
          resume_updated_at: resume_text ? new Date().toISOString() : user.resume_updated_at,
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile saved. Your resume is ready for AI Mock Interview.' });
      setUser({
        ...user,
        ...formData,
        resume_text,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: formatSupabaseError(error),
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
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setMessage({ type: 'error', text: SUPABASE_PUBLIC_ENV_MESSAGE });
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'dat';
      let resumeText = formData.resume_text;

      if (ext === 'txt' || ext === 'md' || file.type.startsWith('text/')) {
        resumeText = (await file.text()).slice(0, RESUME_MAX_CHARS);
      }

      const storagePath = `${user.id}/resume-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('student-resumes')
        .upload(storagePath, file, { upsert: true, contentType: file.type || undefined });

      if (uploadError && !/bucket/i.test(uploadError.message)) {
        throw uploadError;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          resume_file_name: file.name,
          resume_storage_path: uploadError ? null : storagePath,
          resume_text: resumeText.trim() || formData.resume_text.trim() || null,
          resume_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setFormData((prev) => ({
        ...prev,
        resume_text: resumeText || prev.resume_text,
      }));
      setUser((prev) =>
        prev
          ? {
              ...prev,
              resume_file_name: file.name,
              resume_storage_path: uploadError ? null : storagePath,
              resume_text: resumeText || prev.resume_text,
            }
          : prev,
      );

      if (ext !== 'txt' && ext !== 'md' && !file.type.startsWith('text/')) {
        setMessage({
          type: 'success',
          text: 'File uploaded. Add or edit resume text below for best AI interview questions (PDF text is not auto-extracted yet).',
        });
      } else {
        setMessage({ type: 'success', text: 'Resume file loaded into your profile.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: formatSupabaseError(error) });
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
        <p className="text-muted-foreground text-center max-w-md">{SUPABASE_PUBLIC_ENV_MESSAGE}</p>
      </div>
    );
  }

  const authEmail = user?.email ?? '';

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8 lux-surface border-white/15 shadow-xl">
          <h1 className="text-3xl font-bold mb-2 lux-heading">My Profile</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Update your details and resume here. AI Mock Interview uses your saved resume when you start.
          </p>

          {fetchError ? (
            <p className="mb-4 text-sm text-red-300">{fetchError}</p>
          ) : null}

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg border text-sm ${
                message.type === 'success'
                  ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                  : 'border-red-400/50 bg-red-500/15 text-red-100'
              }`}
            >
              {message.text}
            </div>
          )}

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

            <div className="rounded-xl border border-primary/35 bg-primary/10 p-4 space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">Resume (for AI interview)</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a .txt/.md file or paste text. Used when you start AI Mock Interview.
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
