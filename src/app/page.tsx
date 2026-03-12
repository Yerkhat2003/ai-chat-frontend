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
    <main className="min-h-screen bg-[#072E6A] text-slate-50 flex items-center justify-center px-6 py-8 sm:px-10 sm:py-12">
      <div className="mx-auto w-full max-w-4xl flex flex-col items-center gap-8">
        <header className="w-full max-w-2xl space-y-6 text-left">
          <div className="inline-flex items-center justify-center rounded-2xl bg-[#1C4C9B] px-2 py-2 text-xs font-medium text-slate-100/80">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-[#1C4C9B] text-white shadow-[0_0_18px_rgba(28,76,155,0.9)] -scale-x-100">
              <svg
                viewBox="0 0 1024 1024"
                aria-hidden
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
            
              >
                <path
                  d="M512 896a562.368 562.368 0 0 0 137.962667-17.28L810.666667 981.333333v-179.626666c116.608-77.397333 192-198.592 192-335.402667C1002.666667 232.341333 782.933333 42.666667 512 42.666667S21.333333 232.341333 21.333333 466.304 241.066667 896 512 896z m0-810.922667c247.466667 0 448 170.666667 448 381.269334 0 129.514667-76.032 243.754667-192 312.661333v40.533333l-0.704 85.333334-67.221333-41.408c0.746667-0.256 1.557333-0.448 2.325333-0.725334l-38.826667-32.106666a516.501333 516.501333 0 0 1-151.466666 22.848c-247.466667 0-448-176.704-448-387.285334S264.533333 85.034667 512 85.034667z"
                  fill="#ffffff"
                />
              </svg>
            </span>
          </div>
          <div className="space-y-3 mt-2">
            <p className="text-xl sm:text-2xl font-semibold text-sky-50">
              Hi there!
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
              What would you like to know?
            </h1>
            <p className="max-w-xl text-sm sm:text-base text-sky-100/80">
              Use one of the most common prompts below or ask your own question.
            </p>
          </div>
        </header>

        <section className="w-full max-w-2xl flex flex-col items-center gap-4 flex-1 justify-center">
          {error && (
            <div className="inline-flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-100 max-w-md">
              <span className="mt-0.5 h-4 w-4 rounded-full border border-red-300/70 flex items-center justify-center text-[10px]">
                !
              </span>
              <p>{error}</p>
            </div>
          )}

          {lastQuestion && (
            <div className="w-full space-y-4">
              <div className="rounded-2xl bg-[#072E6A] px-4 py-3 text-sm text-slate-50 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-100/80 mb-1">
                  Your question
                </p>
                <p className="whitespace-pre-wrap">{lastQuestion}</p>
              </div>

              <ChatResponse text={reply ?? ''} streaming={loading} />
            </div>
          )}
        </section>

        <footer className="w-full max-w-2xl mt-4">
          <ChatInput onSend={sendMessage} disabled={loading} />
        </footer>
      </div>
    </main>
  );
}
