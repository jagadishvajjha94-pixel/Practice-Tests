import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBackToRoles?: boolean;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function PortalShell({
  children,
  title,
  subtitle,
  showBackToRoles = false,
  backHref = '/auth/role',
  backLabel = '← Change role',
  className,
}: Props) {
  return (
    <div
      className={cn(
        'portal-auth relative min-h-[calc(100dvh-4rem)] text-[#0c2340] flex flex-col items-center justify-center px-4 py-8 sm:py-10',
        className,
      )}
    >
      {title || subtitle ? (
        <div className="relative z-10 w-full max-w-lg text-center mb-5">
          {title ? <h1 className="text-xl sm:text-2xl font-bold text-[#0c2340]">{title}</h1> : null}
          {subtitle ? <p className="mt-1.5 text-sm font-medium text-slate-700">{subtitle}</p> : null}
        </div>
      ) : null}

      <div className="relative z-10 w-full max-w-lg">{children}</div>

      {showBackToRoles ? (
        <p className="relative z-10 mt-6 text-center text-sm">
          <Link href={backHref} className="text-[#1e3a5f] hover:underline font-semibold">
            {backLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
