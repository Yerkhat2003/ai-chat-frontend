'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { ChatResponse } from '@/components/ChatResponse';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold text-slate-800 text-center mb-6">
          Чат с AI
        </h1>

        <ChatInput onSend={sendMessage} disabled={loading} />

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {lastQuestion && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500 mb-1">Ваш вопрос:</p>
              <p className="text-slate-800 whitespace-pre-wrap">{lastQuestion}</p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>{reply ? 'Печатает...' : 'Думает...'}</span>
              </div>
            )}
            <ChatResponse text={reply ?? ''} streaming={loading} />
          </div>
        )}
      </div>
    </main>
  );
}
