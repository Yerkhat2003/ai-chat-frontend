import { cn } from '@/lib/cn';

type Props = {
  className?: string;
};

export function SkeletonLine({ className }: Props) {
  return (
    <div
      className={cn(
        'h-3 rounded-full bg-white/15 animate-pulse',
        className,
      )}
      aria-hidden
    />
  );
}
