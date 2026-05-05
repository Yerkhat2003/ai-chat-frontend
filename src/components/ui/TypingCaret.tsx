export function TypingCaret({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block w-[2px] h-[1em] bg-current align-[-0.15em] animate-pulse ${className}`}
    />
  );
}
