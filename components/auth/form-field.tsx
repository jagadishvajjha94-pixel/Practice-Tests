import { cn } from '@/lib/utils';

type Props = {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

/** Consistent label + control + error alignment for portal auth forms. */
export function FormField({ id, label, hint, error, children, className }: Props) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-slate-950 leading-snug">
        {label}
      </label>
      {hint ? <p className="text-xs text-slate-600 leading-relaxed -mt-1">{hint}</p> : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const portalInputClass = cn(
  'h-11 w-full rounded-lg border border-slate-200 bg-slate-50/80',
  'text-slate-950 text-[15px] font-medium placeholder:text-slate-500 placeholder:font-normal',
  'shadow-inner shadow-slate-100/50',
  'focus-visible:bg-white focus-visible:border-[#1e4a7a] focus-visible:ring-4 focus-visible:ring-[#1e3a5f]/15',
  'dark:bg-slate-50 dark:text-slate-950',
);

export const portalSelectTriggerClass = cn(
  'h-11 w-full rounded-lg border border-slate-200 bg-slate-50/80',
  'text-slate-950 text-[15px] font-medium',
  'shadow-inner shadow-slate-100/50',
  'data-[placeholder]:text-slate-500 data-[placeholder]:font-normal',
  'focus-visible:bg-white focus-visible:border-[#1e4a7a] focus-visible:ring-4 focus-visible:ring-[#1e3a5f]/15',
  'dark:bg-slate-50 dark:text-slate-950',
);

export const portalSelectContentClass =
  'bg-white text-slate-950 border-slate-200 shadow-lg';

export const portalSelectItemClass =
  'text-slate-950 font-medium focus:bg-[#1e3a5f]/10 focus:text-slate-950';
