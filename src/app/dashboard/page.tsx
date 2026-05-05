'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import {
  clearAuthTokens,
  getCurrentUserRole,
  getRefreshToken,
  isAuthenticated,
} from '@/lib/auth';
import { Chat, PaginatedChats } from '@/lib/types';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SkeletonLine } from '@/components/ui/SkeletonLine';
import { useToast } from '@/components/ui/ToastProvider';

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<Chat[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { showError } = useToast();

  const canPrev = useMemo(() => page > 1, [page]);
  const canNext = useMemo(() => page < totalPages, [page, totalPages]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    const role = getCurrentUserRole();
    setIsAdmin(role === 'ADMIN' || role === 'SUPERADMIN');

    const loadChats = async () => {
      setLoading(true);
      try {
        const data = await apiRequest<PaginatedChats>(
          `/chats?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
          { auth: true },
        );
        setItems(data.items);
        setTotalPages(data.meta.totalPages);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to load chats');
      } finally {
        setLoading(false);
      }
    };

    void loadChats();
  }, [page, router, search, showError]);

  const createChat = async () => {
    const title = newTitle.trim();
    if (!title) return;

    setCreating(true);
    try {
      const chat = await apiRequest<Chat>('/chats', {
        method: 'POST',
        auth: true,
        body: { title },
      });
      setNewTitle('');
      router.push(`/chat/${chat.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await apiRequest<{ success: boolean }>(`/chats/${chatId}`, {
        method: 'DELETE',
        auth: true,
      });
      setItems((prev) => prev.filter((chat) => chat.id !== chatId));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete chat');
    }
  };

  const renameChat = async (chatId: string, currentTitle: string) => {
    const nextTitle = window.prompt('New chat title', currentTitle)?.trim();
    if (!nextTitle || nextTitle === currentTitle) return;

    try {
      const updated = await apiRequest<Chat>(`/chats/${chatId}`, {
        method: 'PATCH',
        auth: true,
        body: { title: nextTitle },
      });
      setItems((prev) =>
        prev.map((chat) => (chat.id === chatId ? { ...chat, title: updated.title } : chat)),
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to rename chat');
    }
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
        });
      } catch {
        // local cleanup is enough for client logout
      }
    }
    clearAuthTokens();
    router.push('/auth/login');
  };

  return (
    <main className="min-h-screen text-main p-4 sm:p-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <GlassPanel strong className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Chats</h1>
              <p className="text-sm text-muted">Fast access to all conversations and quick start for a new one.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Start with a chat title"
                className="h-11 min-w-[260px] rounded-xl glass-panel px-3 text-sm outline-none"
              />
              <AnimatedButton
                type="button"
                onClick={createChat}
                disabled={creating}
                className="h-11 rounded-xl bg-white/15 px-4 text-sm font-medium disabled:opacity-60"
              >
                {creating ? 'Creating...' : 'Create chat'}
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={() => void logout()}
                className="h-11 rounded-xl border border-white/30 bg-white/5 px-4 text-sm"
              >
                Logout
              </AnimatedButton>
              {isAdmin && (
                <AnimatedButton
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="h-11 rounded-xl bg-cyan-500/20 border border-cyan-300/35 px-4 text-sm"
                >
                  Admin Studio
                </AnimatedButton>
              )}
            </div>
          </div>

          <div className="mt-4">
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search by chat title"
              className="h-11 w-full rounded-xl glass-panel px-3 text-sm outline-none"
            />
          </div>
        </GlassPanel>

        <GlassPanel strong className="p-3 sm:p-4 space-y-2">
          {loading && (
            <div className="space-y-2">
              <SkeletonLine className="w-1/3" />
              <SkeletonLine className="w-2/3" />
              <SkeletonLine className="w-1/2" />
            </div>
          )}
          {!loading && items.length === 0 && <p className="text-sm text-muted">No chats found.</p>}
          {items.map((chat) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-3 rounded-xl glass-panel px-3 py-3"
            >
              <Link href={`/chat/${chat.id}`} className="truncate text-sm font-medium hover:underline">
                {chat.title}
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void renameChat(chat.id, chat.title)}
                  className="rounded-lg border border-white/25 px-2 py-1 text-xs text-main hover:bg-white/10"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => void deleteChat(chat.id)}
                  className="rounded-lg border border-red-300/35 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </GlassPanel>

        <div className="flex items-center justify-between">
          <AnimatedButton
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
            className="rounded-xl border border-white/30 bg-white/5 px-4 py-2 text-sm disabled:opacity-40"
          >
            Prev
          </AnimatedButton>
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <AnimatedButton
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!canNext}
            className="rounded-xl border border-white/30 bg-white/5 px-4 py-2 text-sm disabled:opacity-40"
          >
            Next
          </AnimatedButton>
        </div>
      </div>
    </main>
  );
}
