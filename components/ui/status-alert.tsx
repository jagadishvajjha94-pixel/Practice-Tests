import { cn } from '@/lib/utils';

type StatusAlertProps = {
  variant: 'success' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
};

const variants = {
  success: 'app-alert-success',
  error: 'app-alert-error',
  info: 'app-alert-info',
} as const;

export function StatusAlert({ variant, children, className }: StatusAlertProps) {
  return (
    <div role="status" className={cn(variants[variant], className)}>
      {children}
    </div>
  );
}
