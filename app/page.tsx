import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CollegeLogo } from '@/components/auth/college-logo';
import { COLLEGE } from '@/lib/college-brand';

export const metadata = {
  title: `${COLLEGE.shortName} — ${COLLEGE.departmentTitle}`,
  description: COLLEGE.portalSubtitle,
};

export default function Home() {
  return (
    <main className="landing-page relative min-h-dvh flex flex-col items-center justify-center px-4 py-12 sm:py-16">
      <div className="relative w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200/90 bg-white px-8 py-10 sm:px-12 sm:py-12 text-center shadow-[0_20px_50px_-12px_rgba(15,23,42,0.15)]">
          <div className="mx-auto mb-6 flex h-[104px] w-[104px] items-center justify-center rounded-full bg-[#1e3a5f]/[0.06] ring-1 ring-[#1e3a5f]/15">
            <CollegeLogo size={88} />
          </div>

          <p className="inline-flex items-center justify-center rounded-full border border-[#1e3a5f]/25 bg-[#1e3a5f]/[0.08] px-4 py-1 text-sm font-bold tracking-[0.2em] text-[#1e3a5f]">
            {COLLEGE.rce}
          </p>

          <h1 className="mt-5 text-2xl sm:text-3xl md:text-[2.35rem] font-extrabold uppercase tracking-wide text-[#0c2340] leading-[1.15]">
            {COLLEGE.name}
          </h1>

          <div className="mx-auto mt-5 h-px w-16 bg-[#1e3a5f]/30" aria-hidden />

          <p className="mt-5 text-lg sm:text-xl font-bold text-[#1e3a5f]">
            {COLLEGE.departmentTitle}
          </p>

          <p className="mt-4 text-base sm:text-[1.05rem] text-slate-700 max-w-md mx-auto leading-relaxed font-medium">
            {COLLEGE.portalSubtitle}
          </p>

          <div className="mt-10">
            <Button
              asChild
              size="lg"
              className="min-w-[180px] h-12 px-10 text-base font-semibold rounded-lg bg-[#1e3a5f] hover:bg-[#16304f] text-white shadow-md shadow-[#1e3a5f]/20 transition-colors"
            >
              <Link href="/auth/role">Login</Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-slate-600 font-medium">
            Authorized access only · Internal examination system
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          {COLLEGE.rce} · {COLLEGE.shortName}
        </p>
      </div>
    </main>
  );
}
