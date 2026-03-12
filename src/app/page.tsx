'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { ChatResponse } from '@/components/ChatResponse';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');
const TICK_MS = 32;
const CHARS_PER_TICK = 2;

export default function Home() {
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bufferRef = useRef('');
  const displayedLenRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setError('Введите сообщение');
        return;
      }

      setError(null);
      setReply('');
      bufferRef.current = '';
      displayedLenRef.current = 0;
      setLastQuestion(trimmed);
      setLoading(true);

      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      tickRef.current = setInterval(() => {
        const buf = bufferRef.current;
        const len = displayedLenRef.current;
        if (buf.length === 0) return;
        if (len >= buf.length) {
          if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
          }
          return;
        }
        const next = Math.min(len + CHARS_PER_TICK, buf.length);
        displayedLenRef.current = next;
        setReply(buf.slice(0, next));
      }, TICK_MS);

      try {
        const res = await fetch(`${API_URL}/chat/message/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message =
            data?.message || data?.error || `Ошибка ${res.status}`;
          throw new Error(message);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('Нет потока ответа');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          bufferRef.current += chunk;
        }
        if (!bufferRef.current.trim()) bufferRef.current = 'Нет ответа от модели.';
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при запросе');
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
        setReply(bufferRef.current);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-300 shadow-sm shadow-slate-900/40 backdrop-blur">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            </span>
            <span>AI ассистент онлайн</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-[0_24px_80px_rgba(15,23,42,0.9)] backdrop-blur-xl p-4 sm:p-6 space-y-4">
          <ChatInput onSend={sendMessage} disabled={loading} />

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              <span className="mt-0.5 h-4 w-4 rounded-full border border-red-400/60 flex items-center justify-center text-[10px]">
                !
              </span>
              <p>{error}</p>
            </div>
          )}

          {lastQuestion && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="self-end max-w-[90%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-emerald-500 text-emerald-950 px-3 py-2 text-sm shadow-md shadow-emerald-500/30">
                  <p className="text-[11px] uppercase tracking-wide font-semibold opacity-75 mb-1">
                    Вы
                  </p>
                  <p className="whitespace-pre-wrap">{lastQuestion}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:gap-3">
                {loading && (
                  <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
                    <span className="inline-flex h-3 w-3 items-center justify-center">
                      <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                    </span>
                    <span>{reply ? 'Печатает ответ...' : 'Думает над ответом...'}</span>
                  </div>
                )}

                <ChatResponse
                  text={reply ?? ''}
                  streaming={loading}
                  className="self-start max-w-[95%] sm:max-w-[80%]"
                />
              </div>
            </div>
          )}

          {!lastQuestion && !error && null}
        </div>
      </div>
    </main>
  );
}
