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
        'flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5',
        'shadow-sm transition-all hover:border-[#1e3a5f]/35 hover:shadow-md hover:bg-[#f8fafc]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]',
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f]/10 text-[#1e3a5f]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-left min-w-0">
        <span className="block text-base font-bold text-[#0c2340]">{title}</span>
        <span className="mt-1 block text-sm font-medium text-slate-700">{description}</span>
      </span>
    </Link>
  );
}
