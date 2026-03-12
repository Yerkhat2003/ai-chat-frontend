'use client';

import { useState, useCallback } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { ChatResponse } from '@/components/ChatResponse';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setError('Введите сообщение');
        return;
      }

      setError(null);
      setReply(null);
      setLoading(true);

      try {
        const res = await fetch(`${API_URL}/chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const message =
            data?.message || data?.error || `Ошибка ${res.status}`;
          throw new Error(message);
        }

        if (typeof data?.reply === 'string') {
          setReply(data.reply);
        } else {
          throw new Error('Неверный формат ответа от сервера');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при запросе');
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

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-slate-500">
            <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            <span>Ожидание ответа...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {reply && !loading && (
          <ChatResponse className="mt-4" text={reply} />
        )}
      </div>
    </main>
  );
}
