type Props = {
  text: string;
  className?: string;
  streaming?: boolean;
};

export function ChatResponse({ text, className = '', streaming = false }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#0A3A87] px-3 py-3 sm:px-4 sm:py-4 text-slate-100 whitespace-pre-wrap shadow-[0_18px_40px_rgba(0,0,0,0.4)] ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-slate-100/80">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
            AI
          </span>
          <span className="uppercase tracking-wide font-semibold">Assistant response</span>
        </span>
        {streaming && (
          <span className="inline-flex items-center gap-1 text-[10px] text-sky-100">
            <span className="relative flex h-4 w-4">
              <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
              <span className="relative inline-block h-4 w-4 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
            </span>
            Typing…
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-slate-50">
        {text || (
          <span className="text-slate-500">
            The answer will appear here as soon as the assistant finishes processing your request.
          </span>
        )}
      </p>
    </div>
  );
}
