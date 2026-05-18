import { redirect } from 'next/navigation';

/** Legacy admin login path → institutional admin login. */
export default function LegacyAdminLoginRedirect() {
  redirect('/auth/login/admin');
}
