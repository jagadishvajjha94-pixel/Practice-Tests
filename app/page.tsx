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
    <main className="landing-page relative min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-4 py-10 sm:py-14">
      <div className="relative w-full max-w-2xl">
        <div className="lux-hero-card rounded-3xl border border-slate-200/85 bg-white px-8 py-10 sm:px-12 sm:py-14 text-center">
          <div className="mx-auto mb-6 flex h-[108px] w-[108px] items-center justify-center rounded-full bg-gradient-to-br from-white via-slate-50 to-[#1e3a5f]/[0.08] ring-1 ring-[#c4a052]/20 shadow-[inset_0_2px_12px_rgba(12,35,64,0.06)]">
            <CollegeLogo size={88} />
          </div>

          <span className="app-eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {COLLEGE.rce} · Training & Placement
          </span>

          <h1 className="mt-5 text-2xl sm:text-3xl md:text-[2.5rem] font-extrabold uppercase tracking-tight text-[#0c2340] leading-[1.1] font-[family-name:var(--font-display),ui-serif,Georgia,serif]">
            {COLLEGE.name}
          </h1>

          <div className="mx-auto mt-5 h-px w-20 bg-gradient-to-r from-transparent via-[#c4a052]/70 to-transparent" aria-hidden />

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
              className="min-w-[200px] h-12 px-10 text-base font-semibold rounded-xl"
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
