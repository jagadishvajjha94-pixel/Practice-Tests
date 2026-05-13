/**
 * Bulk / exam-period mode: hide public signup and reject POST /api/auth/signup.
 * Students already in Supabase Auth can sign in only (supports many concurrent logins).
 *
 * Set in `.env.local`:
 * NEXT_PUBLIC_SIGNUP_DISABLED=true
 *
 * Redeploy or restart `pnpm dev` after changing.
 */
export function isSignupDisabled(): boolean {
  return process.env.NEXT_PUBLIC_SIGNUP_DISABLED === 'true';
}
