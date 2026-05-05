'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { SharedChatWithMessages } from '@/lib/types';
import { ChatResponse } from '@/components/ChatResponse';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { SkeletonLine } from '@/components/ui/SkeletonLine';

export default function SharedChatPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const [chat, setChat] = useState<SharedChatWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadSharedChat = async () => {
      setLoading(true);
      try {
        const data = await apiRequest<SharedChatWithMessages>(
          `/shared/chats/${token}`,
        );
        setChat(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open shared chat');
      } finally {
        setLoading(false);
      }
    };

    void loadSharedChat();
  }, [token]);

  return (
    <main className="min-h-screen text-main p-4 sm:p-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <GlassPanel strong className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">Shared chat</p>
              <h1 className="text-xl font-semibold">{chat?.title ?? 'Loading...'}</h1>
            </div>
            <Link
              href="/auth/login"
              className="rounded-xl border border-white/25 px-3 py-2 text-sm hover:bg-white/10 transition"
            >
              Open app
            </Link>
          </div>
        </GlassPanel>

        <GlassPanel strong className="p-4 sm:p-5 space-y-3">
          {loading && (
            <div className="space-y-2">
              <SkeletonLine className="w-1/3" />
              <SkeletonLine className="w-2/3" />
              <SkeletonLine className="w-1/2" />
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-red-300">{error}</p>
          )}

          {!loading && !error && chat?.messages.length === 0 && (
            <p className="text-sm text-muted">This shared chat has no messages yet.</p>
          )}

          {!loading &&
            !error &&
            chat?.messages.map((message) =>
              message.role === 'AI' ? (
                <ChatResponse key={message.id} text={message.content} />
              ) : (
                <GlassPanel key={message.id} className="px-3 py-2">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">User</p>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </GlassPanel>
              ),
            )}
        </GlassPanel>
      </div>
    </main>
  );
}
