'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInput } from '@/components/ChatInput';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useToast } from '@/components/ui/ToastProvider';
import { clearAuthTokens, getRefreshToken, isAuthenticated } from '@/lib/auth';
import { apiRequest } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const { showError } = useToast();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  const getAutoTitle = (text: string) => {
    const normalized = text.trim().replace(/\s+/g, ' ');
    if (!normalized) return 'New chat';
    return normalized.length > 48 ? `${normalized.slice(0, 48).trim()}...` : normalized;
  };

  const handleSendFirstMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      showError('Please enter a message.');
      return;
    }

    setSending(true);
    setDraft('');
    try {
      const newChat = await apiRequest<{ id: string; title: string }>('/chats', {
        method: 'POST',
        auth: true,
        body: { title: getAutoTitle(trimmed) },
      });

      await apiRequest('/messages', {
        method: 'POST',
        auth: true,
        body: {
          chatId: newChat.id,
          content: trimmed,
          promptContent: trimmed,
        },
      });

      router.push(`/chat/${newChat.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to start chat');
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = () => {
    setDraft('');
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

  if (!authChecked) {
    return <main className="min-h-screen" />;
  }

  return (
    <main className="min-h-screen text-main p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1300px] grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="lg:h-[calc(100vh-3rem)]">
          <ChatSidebar onCreateChat={handleNewChat} />
        </div>

        <GlassPanel strong className="lg:h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Chat Workspace</h1>
              <p className="text-sm text-muted">Choose a chat from the left or create a new one.</p>
            </div>
            <AnimatedButton
              type="button"
              onClick={() => void logout()}
              className="rounded-xl border border-white/30 bg-white/5 px-4 py-2 text-sm"
            >
              Logout
            </AnimatedButton>
          </div>

          <div className="flex-1 grid place-items-center p-6">
            <div className="max-w-lg text-center space-y-2">
              <p className="text-xl font-semibold">What do you want to know?</p>
              <p className="text-sm text-muted">
                Type your first message. We will create a new chat and set its title automatically.
              </p>
            </div>
          </div>

          <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-white/10 bg-black/10 backdrop-blur-md">
            <ChatInput
              onSend={handleSendFirstMessage}
              disabled={sending}
              value={draft}
              onValueChange={setDraft}
              placeholder="Send a message to start a new chat"
            />
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
