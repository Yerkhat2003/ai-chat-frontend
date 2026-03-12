type Props = {
  text: string;
  className?: string;
  streaming?: boolean;
};

export function ChatResponse({ text, className = '', streaming = false }: Props) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-4 text-slate-700 whitespace-pre-wrap ${className}`}
    >
      <p className="text-sm font-medium text-slate-500 mb-2">Ответ:</p>
      <p className="text-slate-800">
        {text}
        {streaming && (
          <span className="inline-block w-2 h-4 ml-0.5 bg-slate-400 animate-pulse align-middle" aria-hidden />
        )}
      </p>
    </div>
  );
}
