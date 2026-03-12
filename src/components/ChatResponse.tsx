type Props = {
  text: string;
  className?: string;
  streaming?: boolean;
};

export function ChatResponse({ text, className = '', streaming = false }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90 px-3 py-3 sm:px-4 sm:py-4 text-slate-100 whitespace-pre-wrap shadow-[0_18px_60px_rgba(15,23,42,0.9)] ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[10px]">
            AI
          </span>
          <span className="uppercase tracking-wide font-semibold">Ответ ассистента</span>
        </span>
        {streaming && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
            <span className="relative flex h-4 w-4">
              <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
              <span className="relative inline-block h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            </span>
            Печатает ответ…
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-slate-100/90">
        {text || (
          <span className="text-slate-500">
            Ответ появится здесь сразу после того, как ассистент обработает ваш запрос.
          </span>
        )}
      </p>
    </div>
  );
}
