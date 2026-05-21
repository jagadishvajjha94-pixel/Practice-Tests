import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function RoleCard({ href, title, description, icon: Icon }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-4 rounded-2xl border border-slate-200/85 bg-white p-4 sm:p-5',
        'transition-all duration-300 hover:border-[#1e3a5f]/30 hover:-translate-y-1 hover:shadow-[var(--shadow-lux-lg)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/40 focus-visible:ring-offset-2',
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e3a5f]/12 to-[#c4a052]/10 text-[#1e3a5f] ring-1 ring-[#1e3a5f]/12 shadow-sm">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-left min-w-0 flex-1">
        <span className="block text-base font-bold text-[#0c2340] tracking-tight">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-600">{description}</span>
      </span>
      <span
        className="text-slate-400 transition-all group-hover:text-[#1e3a5f] group-hover:translate-x-1"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}
