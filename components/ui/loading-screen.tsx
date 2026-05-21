import { cn } from '@/lib/utils';

type LoadingScreenProps = {
  message?: string;
  className?: string;
};

export function LoadingScreen({ message = 'Loading…', className }: LoadingScreenProps) {
  return (
    <div className={cn('lux-loading-screen', className)} role="status" aria-live="polite">
      <div className="lux-loading-spinner" aria-hidden />
      <p className="lux-loading-message">{message}</p>
    </div>
  );
}
