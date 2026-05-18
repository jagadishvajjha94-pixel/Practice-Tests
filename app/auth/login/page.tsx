import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ redirect?: string; notice?: string }>;
};

/** Legacy student login URL → role selection (preserves redirect query). */
export default async function LoginRedirectPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = new URLSearchParams();
  if (params.redirect) q.set('redirect', params.redirect);
  if (params.notice) q.set('notice', params.notice);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  redirect(`/auth/role${suffix}`);
}
