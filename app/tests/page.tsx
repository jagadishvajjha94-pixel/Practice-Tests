import Link from 'next/link';
import { PRACTICE_HUB_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Practice Tests — RCE',
  description: 'Practice psychometric, SWARX, AI interview, and competitive exam modules',
};

type Theme = {
  gradient: string;
  orb1: string;
  orb2: string;
  titleGradient: string;
  dot: string;
  eyebrow: string;
  features: string[];
  ctaLabel: string;
  decoration?: 'orbs' | 'grid' | 'waveform' | 'code' | 'rings';
};

/**
 * Per-module visual theme. Each module gets a unique gradient, glow pattern,
 * eyebrow tag and feature list so cards read like distinct brand banners.
 */
const themes: Record<string, Theme> = {
  placement: {
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-600',
    orb1: 'bg-pink-400/40',
    orb2: 'bg-cyan-300/30',
    titleGradient: 'from-white via-fuchsia-100 to-cyan-200',
    dot: 'bg-emerald-300',
    eyebrow: 'Featured · AI scored',
    features: [
      'Technical · 35 marks',
      'Speaking · 10 marks',
      'Psychometric · 10 marks',
      'Aptitude · 20 marks',
      'Logic · 15 marks',
      'Intelligence · 10 marks',
    ],
    ctaLabel: 'Launch Evalora',
    decoration: 'orbs',
  },
  psychometric: {
    gradient: 'from-cyan-500 via-sky-600 to-indigo-700',
    orb1: 'bg-cyan-300/40',
    orb2: 'bg-blue-400/30',
    titleGradient: 'from-white via-cyan-100 to-sky-200',
    dot: 'bg-cyan-300',
    eyebrow: 'Cognitive · Adaptive',
    features: [
      '200 questions · 30 min',
      'Visual perception',
      'Pattern matching',
      'Spatial reasoning',
      'Speed & accuracy',
      'Adaptive difficulty',
    ],
    ctaLabel: 'Start psychometric',
    decoration: 'rings',
  },
  swarx: {
    gradient: 'from-rose-500 via-orange-500 to-amber-500',
    orb1: 'bg-amber-300/40',
    orb2: 'bg-rose-300/30',
    titleGradient: 'from-white via-amber-100 to-rose-100',
    dot: 'bg-amber-200',
    eyebrow: 'Communication · Voice',
    features: [
      'Grammar drills',
      'Vocabulary builder',
      'Pronunciation',
      'Roleplay scenarios',
      'Live speaking',
      'AI feedback',
    ],
    ctaLabel: 'Open SWARX',
    decoration: 'waveform',
  },
  'ai-interview': {
    gradient: 'from-teal-500 via-cyan-600 to-sky-700',
    orb1: 'bg-teal-300/40',
    orb2: 'bg-sky-300/30',
    titleGradient: 'from-white via-cyan-100 to-teal-100',
    dot: 'bg-emerald-300',
    eyebrow: 'AI Voice · Resume',
    features: [
      'Resume analysis',
      'Voice interview',
      'Live AI feedback',
      'HR + technical',
      'Confidence scoring',
      'Domain-aware',
    ],
    ctaLabel: 'Open AI Interview',
    decoration: 'orbs',
  },
  'competitive-exam': {
    gradient: 'from-emerald-500 via-green-600 to-teal-700',
    orb1: 'bg-emerald-300/40',
    orb2: 'bg-lime-300/30',
    titleGradient: 'from-white via-emerald-100 to-lime-100',
    dot: 'bg-emerald-200',
    eyebrow: 'Pan-India · MCQ',
    features: [
      '60 Q · 90 min',
      'Maths & Aptitude',
      'Science · Chemistry',
      'Reasoning · Logic',
      'English · Computer',
      'India-wide ranking',
    ],
    ctaLabel: 'Enter exam hall',
    decoration: 'grid',
  },
  'department-exams': {
    gradient: 'from-blue-700 via-sky-700 to-indigo-800',
    orb1: 'bg-blue-300/40',
    orb2: 'bg-indigo-300/30',
    titleGradient: 'from-white via-sky-100 to-indigo-100',
    dot: 'bg-sky-300',
    eyebrow: '🔒 Locked · Faculty + Admin gated',
    features: [
      'Faculty-curated',
      'Branch + year matched',
      'Admin-approved before release',
      'Topic-aligned',
      'Semester-tied',
      'Auto-unlocks when assigned',
    ],
    ctaLabel: 'See your assigned exams',
    decoration: 'grid',
  },
  programming: {
    gradient: 'from-slate-900 via-blue-900 to-violet-900',
    orb1: 'bg-violet-400/30',
    orb2: 'bg-blue-400/30',
    titleGradient: 'from-white via-violet-100 to-cyan-200',
    dot: 'bg-violet-300',
    eyebrow: 'Code · Monaco',
    features: [
      '7 languages',
      '60 min timed',
      'Monaco editor',
      'Hidden test cases',
      'Auto-grading',
      'Run & submit',
    ],
    ctaLabel: 'Open programming lab',
    decoration: 'code',
  },
};

function Decoration({ variant }: { variant: Theme['decoration'] }) {
  if (variant === 'grid') {
    return (
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage:
            'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 70%)',
        }}
      />
    );
  }
  if (variant === 'waveform') {
    return (
      <svg
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-24 w-full opacity-30 pointer-events-none"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C150,20 300,100 450,60 C600,20 750,100 900,60 C1050,20 1200,100 1200,60 L1200,120 L0,120 Z"
          fill="rgba(255,255,255,0.18)"
        />
        <path
          d="M0,80 C200,40 400,110 600,70 C800,30 1000,110 1200,70 L1200,120 L0,120 Z"
          fill="rgba(255,255,255,0.10)"
        />
      </svg>
    );
  }
  if (variant === 'rings') {
    return (
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute right-10 top-10 h-40 w-40 rounded-full border border-white/20" />
        <div className="absolute right-16 top-16 h-28 w-28 rounded-full border border-white/15" />
        <div className="absolute right-24 top-24 h-16 w-16 rounded-full border border-white/10" />
      </div>
    );
  }
  if (variant === 'code') {
    return (
      <pre
        aria-hidden
        className="absolute top-4 right-6 hidden md:block text-[11px] leading-relaxed font-mono text-white/30 select-none pointer-events-none"
      >{`fn solve(n: int) -> int {
  // O(log n)
  let mut x = 1;
  while x < n { x <<= 1 }
  x
}`}</pre>
    );
  }
  return null;
}

function HubBanner({
  item,
  theme,
}: {
  item: (typeof PRACTICE_HUB_ITEMS)[number];
  theme: Theme;
}) {
  return (
    <Link href={item.href} className="block group">
      <div className="relative overflow-hidden rounded-3xl shadow-xl transition-transform duration-200 group-hover:-translate-y-1 ring-1 ring-black/5">
        <div className={cn('absolute inset-0 bg-gradient-to-br', theme.gradient)} />
        <div
          className={cn('absolute -top-20 -right-20 h-72 w-72 rounded-full blur-3xl', theme.orb1)}
          aria-hidden
        />
        <div
          className={cn(
            'absolute -bottom-24 -left-10 h-72 w-72 rounded-full blur-3xl',
            theme.orb2,
          )}
          aria-hidden
        />
        <Decoration variant={theme.decoration} />

        <div className="relative grid md:grid-cols-3 gap-8 p-7 sm:p-10 text-white">
          <div className="md:col-span-2 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
              <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', theme.dot)} />
              {theme.eyebrow}
            </span>

            <div className="flex items-center gap-3">
              <span className="text-4xl sm:text-5xl drop-shadow-sm" aria-hidden>
                {item.icon}
              </span>
              <h2
                className={cn(
                  'text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r bg-clip-text text-transparent',
                  theme.titleGradient,
                )}
              >
                {item.name}
              </h2>
            </div>

            <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl">
              {item.description}
            </p>

            {item.badge ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {item.badge.split('·').map((part) => (
                  <span
                    key={part}
                    className="inline-flex items-center rounded-full bg-white/15 backdrop-blur border border-white/25 px-3 py-1 text-xs font-semibold text-white"
                  >
                    {part.trim()}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="pt-2 inline-flex items-center gap-2 text-base font-bold text-white">
              {('cta' in item && item.cta) || theme.ctaLabel}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </div>

          <ul className="space-y-2 self-center text-sm">
            {theme.features.map((row) => (
              <li
                key={row}
                className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 backdrop-blur px-3 py-2 text-white"
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', theme.dot)} />
                <span className="text-[13px] font-medium">{row}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Link>
  );
}

export default function TestsPage() {
  return (
    <div className="app-page">
      <header className="app-page-header">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <span className="app-eyebrow">Assessment library</span>
          <h1 className="app-title-xl">Practice tests</h1>
          <p className="app-subtitle">
            Each module is a complete experience — placement, psychometric, communication, AI
            interview, competitive papers, faculty exams, and programming. Pick any to start.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        {PRACTICE_HUB_ITEMS.map((item) => {
          const theme = themes[item.id] ?? themes.placement;
          return <HubBanner key={item.id} item={item} theme={theme} />;
        })}
      </div>
    </div>
  );
}
