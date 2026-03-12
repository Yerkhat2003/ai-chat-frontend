type Props = {
  text: string;
  className?: string;
};

export function ChatResponse({ text, className = '' }: Props) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-4 text-slate-700 whitespace-pre-wrap ${className}`}
    >
      <p className="text-sm font-medium text-slate-500 mb-2">Ответ:</p>
      <p className="text-slate-800">{text}</p>
    </div>
  );
}
