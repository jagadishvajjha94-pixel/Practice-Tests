import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
};

/** White panel matching landing page — used on role selection and login wrappers */
export function AuthFlowPanel({ children, title, subtitle, className }: Props) {
  return (
    <div className={cn('lux-hero-card rounded-3xl border border-slate-200/85 bg-white overflow-hidden flex flex-col', className)}>
      {title ? (
        <div className="app-brand-bar auth-card-header relative px-6 py-6 sm:px-8 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-[family-name:var(--font-display),ui-serif,Georgia,serif]">
            {title}
          </h2>
          {subtitle ? <p className="mt-1.5 text-sm">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className="p-6 sm:p-8">{children}</div>
    </div>
  );
}
