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
        'rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] overflow-hidden',
        className,
      )}
    >
      {title ? (
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-8 text-center">
          <h2 className="text-lg font-bold text-[#0c2340]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm font-medium text-slate-700">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className="p-6 sm:p-8">{children}</div>
    </div>
  );
}
