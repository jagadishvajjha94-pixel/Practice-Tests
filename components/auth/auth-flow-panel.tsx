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
    <div
      className={cn(
        'rounded-3xl border border-slate-200/80 bg-white overflow-hidden',
        className,
      )}
      style={{
        boxShadow:
          '0 1px 1px rgba(15, 23, 42, 0.04), 0 24px 60px -16px rgba(15, 23, 42, 0.18)',
      }}
    >
      {title ? (
        <div className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white px-6 py-6 sm:px-8 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-[#0c2340] tracking-tight">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className="p-6 sm:p-8">{children}</div>
    </div>
  );
}
