'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import { Chat, PaginatedChats } from '@/lib/types';
import { cn } from '@/lib/cn';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useToast } from '@/components/ui/ToastProvider';

const FAVORITES_KEY = 'favoriteChatIds';

type Props = {
  activeChatId?: string;
  onCreateChat?: () => void | Promise<void>;
  onChatOpen?: () => void;
};

function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function setFavorites(ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export function ChatSidebar({ activeChatId, onCreateChat, onChatOpen }: Props) {
  const [items, setItems] = useState<Chat[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [favorites, setFavoritesState] = useState<string[]>([]);
  const { showError } = useToast();

  useEffect(() => {
    setFavoritesState(getFavorites());
  }, []);

  useEffect(() => {
    const loadChats = async () => {
      setLoading(true);
      try {
        const data = await apiRequest<PaginatedChats>(
          `/chats?page=1&limit=50&search=${encodeURIComponent(search)}`,
          { auth: true },
        );
        setItems(data.items);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to load chats');
      } finally {
        setLoading(false);
      }
    };

    void loadChats();
  }, [search, showError]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, favorites]);

  const toggleFavorite = (chatId: string) => {
    setFavoritesState((prev) => {
      const next = prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId];
      setFavorites(next);
      return next;
    });
  };

  return (
    <GlassPanel strong className="h-full p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wider text-muted">Chats</h2>
        <span className="text-xs text-muted">{items.length}</span>
      </div>

      {onCreateChat && (
        <AnimatedButton
          onClick={() => void onCreateChat()}
          className="w-full bg-white/10 border border-white/20 text-sm text-main"
        >
          New Chat
        </AnimatedButton>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search chats..."
        className="w-full rounded-xl glass-panel px-3 py-2 text-sm outline-none"
      />

      {loading && <p className="text-xs text-muted">Loading...</p>}

      <div className="space-y-2 overflow-y-auto pr-1">
        {sortedItems.map((chat) => {
          const isFav = favorites.includes(chat.id);
          const isActive = activeChatId === chat.id;
          return (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'rounded-xl px-3 py-2 border transition',
                isActive
                  ? 'bg-white/20 border-white/40'
                  : 'bg-white/5 border-white/10 hover:bg-white/10',
              )}
            >
              <div className="flex items-start gap-2">
                <Link
                  href={`/chat/${chat.id}`}
                  onClick={onChatOpen}
                  className="flex-1 text-sm truncate"
                >
                  {chat.title}
                </Link>
                <button
                  type="button"
                  aria-label={isFav ? 'Unfavorite' : 'Favorite'}
                  onClick={() => toggleFavorite(chat.id)}
                  className={cn(
                    'text-xs transition',
                    isFav ? 'text-amber-400' : 'text-muted hover:text-amber-400',
                  )}
                >
                  ★
                </button>
              </div>
            </motion.div>
          );
        })}
        {!loading && sortedItems.length === 0 && (
          <p className="text-xs text-muted">No chats found.</p>
        )}
      </div>
    </GlassPanel>
  );
}
