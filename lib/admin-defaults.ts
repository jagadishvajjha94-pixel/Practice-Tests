/** Default institutional admin (overridable via .env.local). */
export const DEFAULT_ADMIN_EMAIL = 'admin@rce.ac.in';

export const DEFAULT_ADMIN_PASSWORD = 'RCE_T&P';

export function getConfiguredAdminEmail(): string {
  return (
    process.env.PREPINDIA_ADMIN_EMAIL?.trim().toLowerCase() || DEFAULT_ADMIN_EMAIL
  );
}

export function getConfiguredAdminPassword(): string {
  return process.env.PREPINDIA_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

export function getAllowlistedAdminEmails(): string[] {
  const configured = getConfiguredAdminEmail();
  return [...new Set([DEFAULT_ADMIN_EMAIL, configured])];
}

export function isAllowlistedAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return getAllowlistedAdminEmails().includes(email.trim().toLowerCase());
}
