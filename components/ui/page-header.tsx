import { cn } from '@/lib/utils';

type PageHeaderProps = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  containerClassName?: string;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
  containerClassName,
}: PageHeaderProps) {
  return (
    <header className={cn('app-page-header', className)}>
      <div
        className={cn(
          'mx-auto max-w-6xl px-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
          containerClassName,
        )}
      >
        <div className="min-w-0 space-y-2">
          {eyebrow ? <span className="app-eyebrow">{eyebrow}</span> : null}
          <h1 className="app-title-xl">{title}</h1>
          {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
