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
  const [viewers, setViewers] = useState(1);
  const [mobileHeaderOpen, setMobileHeaderOpen] = useState(false);

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

  useEffect(() => {
    if (!token) return;

    const heartbeat = async () => {
      try {
        const data = await apiRequest<{ viewers: number }>(
          `/shared/chats/${token}/presence`,
          {
            method: 'POST',
          },
        );
        setViewers(data.viewers);
      } catch {
        // ignore presence heartbeat errors
      }
    };

    const pullPresence = async () => {
      try {
        const data = await apiRequest<{ viewers: number }>(
          `/shared/chats/${token}/presence`,
        );
        setViewers(data.viewers);
      } catch {
        // ignore presence fetch errors
      }
    };

    void heartbeat();
    const heartbeatTimer = window.setInterval(() => {
      void heartbeat();
    }, 10_000);
    const pollTimer = window.setInterval(() => {
      void pullPresence();
    }, 6_000);

    return () => {
      window.clearInterval(heartbeatTimer);
      window.clearInterval(pollTimer);
    };
  }, [token]);

  const pinnedMessage = chat?.messages.find(
    (message) => message.id === chat?.pinnedMessageId,
  );

  return (
    <main className="min-h-screen text-main p-4 sm:p-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <GlassPanel strong className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">Shared chat</p>
              <h1 className="text-xl font-semibold">{chat?.title ?? 'Loading...'}</h1>
              <p className="text-xs text-muted mt-1">{viewers} viewer(s) online</p>
            </div>
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex rounded-xl border border-white/25 px-3 py-2 text-sm hover:bg-white/10 transition"
            >
              Open app
            </Link>
            <button
              type="button"
              onClick={() => setMobileHeaderOpen((prev) => !prev)}
              className="sm:hidden rounded-lg border border-white/25 px-2 py-1 text-xs"
            >
              ⋯
            </button>
          </div>
          {mobileHeaderOpen && (
            <div className="fixed inset-0 z-50 sm:hidden">
              <button
                type="button"
                onClick={() => setMobileHeaderOpen(false)}
                className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
                aria-label="Close shared chat menu"
              />
              <div className="absolute left-3 right-3 top-16 rounded-2xl border border-white/15 bg-black p-3 text-slate-100 shadow-2xl">
                <Link
                  href="/auth/login"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-white/25 px-3 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
                >
                  Open app
                </Link>
              </div>
            </div>
          )}
        </GlassPanel>

        <GlassPanel strong className="p-4 sm:p-5 space-y-3">
          {!!pinnedMessage && (
            <GlassPanel className="px-3 py-2 border border-amber-300/30">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-amber-300">Pinned highlight</p>
              <p className="text-sm whitespace-pre-wrap">{pinnedMessage.content}</p>
            </GlassPanel>
          )}
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
