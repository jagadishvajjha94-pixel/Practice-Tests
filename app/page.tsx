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
        <div
          className="rounded-3xl border border-slate-200/80 bg-white px-8 py-10 sm:px-12 sm:py-14 text-center"
          style={{
            boxShadow:
              '0 1px 1px rgba(15, 23, 42, 0.04), 0 24px 60px -16px rgba(15, 23, 42, 0.18)',
          }}
        >
          <div className="mx-auto mb-6 flex h-[108px] w-[108px] items-center justify-center rounded-full bg-gradient-to-br from-white to-[#1e3a5f]/[0.06] ring-1 ring-[#1e3a5f]/15 shadow-inner">
            <CollegeLogo size={88} />
          </div>

          <span className="app-eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {COLLEGE.rce} · Training & Placement
          </span>

          <h1 className="mt-5 text-2xl sm:text-3xl md:text-[2.5rem] font-extrabold uppercase tracking-tight text-[#0c2340] leading-[1.1]">
            {COLLEGE.name}
          </h1>

          <div className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-[#1e3a5f]/40 to-transparent" aria-hidden />

          <p className="mt-5 text-lg sm:text-xl font-bold text-[#1e3a5f]">
            {COLLEGE.departmentTitle}
          </p>

          <p className="mt-4 text-base sm:text-[1.05rem] text-slate-600 max-w-md mx-auto leading-relaxed">
            {COLLEGE.portalSubtitle}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="min-w-[180px] h-12 px-10 text-base font-semibold rounded-xl bg-[#1e3a5f] hover:bg-[#16304f] text-white shadow-lg shadow-[#1e3a5f]/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              <Link href="/auth/role">Sign in to portal</Link>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          {COLLEGE.rce} · {COLLEGE.shortName}
        </p>
      </div>
    </main>
  );
}
