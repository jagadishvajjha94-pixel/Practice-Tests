import { cn } from '@/lib/utils';

type BadgeProps = React.ComponentProps<'span'> & {
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'brand';
};

const toneClass = {
  success: 'app-pill-success',
  warning: 'app-pill-warning',
  danger: 'app-pill-danger',
  neutral: 'app-pill-neutral',
  brand: 'app-pill-brand',
} as const;

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span className={cn('app-pill', toneClass[tone], className)} {...props} />;
}
