import { motion } from 'framer-motion';
import { TypingCaret } from '@/components/ui/TypingCaret';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

type Props = {
  text: string;
  className?: string;
  streaming?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onEditPrompt?: () => void;
};

export function ChatResponse({
  text,
  className = '',
  streaming = false,
  onCopy,
  onRegenerate,
  onEditPrompt,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
          className={`relative overflow-hidden rounded-2xl glass-panel px-3 py-3 sm:px-4 sm:py-4 text-main whitespace-pre-wrap shadow-[0_18px_40px_rgba(0,0,0,0.2)] ${className}`}
    >
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] text-main">
            AI
          </span>
          <span className="uppercase tracking-wide font-semibold">Assistant response</span>
        </span>
        {streaming && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted">
            <span className="relative flex h-4 w-4">
              <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
              <span className="relative inline-block h-4 w-4 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
            </span>
            Typing…
          </span>
        )}
      </div>
          <p className="text-sm leading-relaxed text-main">
        {text || (
              <span className="text-muted">
            The answer will appear here as soon as the assistant finishes processing your request.
          </span>
        )}
        {streaming && <TypingCaret className="ml-1" />}
      </p>

      {(onCopy || onRegenerate || onEditPrompt) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onCopy && (
            <AnimatedButton onClick={onCopy} className="text-xs bg-white/10 border border-white/15">
              Copy
            </AnimatedButton>
          )}
          {onRegenerate && (
            <AnimatedButton onClick={onRegenerate} className="text-xs bg-white/10 border border-white/15">
              Regenerate
            </AnimatedButton>
          )}
          {onEditPrompt && (
            <AnimatedButton onClick={onEditPrompt} className="text-xs bg-white/10 border border-white/15">
              Edit prompt
            </AnimatedButton>
          )}
        </div>
      )}
    </motion.div>
  );
}
