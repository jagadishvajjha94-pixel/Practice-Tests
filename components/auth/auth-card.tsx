import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Branded header strip for login forms */
  title?: string;
  description?: string;
};

export function AuthCard({ children, className, title, description }: Props) {
  return (
    <Card
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200/90 p-0 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)]',
        className,
      )}
    >
      {title ? (
        <div className="border-b border-[#1e4a7a]/20 bg-gradient-to-br from-[#1e3a5f] to-[#254d73] px-6 py-5 sm:px-8 sm:py-6">
          <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-1.5 text-sm text-blue-50/95 leading-relaxed">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="bg-white px-6 py-6 sm:px-8 sm:py-7 text-slate-950">{children}</div>
    </Card>
  );
}
