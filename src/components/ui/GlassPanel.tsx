import { PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';

type Props = PropsWithChildren<{
  className?: string;
  strong?: boolean;
}>;

export function GlassPanel({ children, className, strong = false }: Props) {
  return (
    <div
      className={cn(
        strong ? 'glass-panel-strong' : 'glass-panel',
        'rounded-2xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
