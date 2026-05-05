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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleOpenChatFromSidebar = () => {
    setSidebarOpen(false);
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
    <main className="h-[100dvh] text-main p-0 sm:min-h-screen sm:p-6">
      <div className="mx-auto h-full w-full max-w-[1300px] grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0 sm:gap-4">
        <div className="hidden lg:block lg:h-[calc(100vh-3rem)]">
          <ChatSidebar onCreateChat={handleNewChat} onChatOpen={handleOpenChatFromSidebar} />
        </div>

        <GlassPanel strong className="relative h-full sm:h-auto lg:h-[calc(100vh-3rem)] flex flex-col overflow-hidden rounded-none sm:rounded-2xl">
          <div className="relative z-20 px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-lg border border-white/25 px-2 py-1 text-xs"
            >
              Chats
            </button>
            <div>
              <h1 className="text-xl font-semibold">Chat Workspace</h1>
              <p className="text-sm text-muted">Choose a chat from the left or create a new one.</p>
            </div>
            <AnimatedButton
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden rounded-xl border border-white/30 bg-white/5 px-3 py-2 text-xs"
            >
              ⋯
            </AnimatedButton>
            <div className="hidden lg:flex items-center gap-2">
              <AnimatedButton
                type="button"
                onClick={() => router.push('/dashboard')}
                className="rounded-xl border border-white/30 bg-white/5 px-4 py-2 text-sm"
              >
                Dashboard
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={() => void logout()}
                className="rounded-xl border border-white/30 bg-white/5 px-4 py-2 text-sm"
              >
                Logout
              </AnimatedButton>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
                aria-label="Close menu overlay"
              />
              <div className="absolute left-3 right-3 top-16 rounded-2xl border border-white/15 bg-black p-3 text-slate-100 shadow-2xl">
                <div className="grid grid-cols-2 gap-2">
                  <AnimatedButton
                    type="button"
                    onClick={() => {
                      router.push('/dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="h-11 w-full justify-center rounded-xl border border-white/30 bg-white/5 px-3 text-xs text-slate-100"
                  >
                    Dashboard
                  </AnimatedButton>
                  <AnimatedButton
                    type="button"
                    onClick={() => {
                      void logout();
                      setMobileMenuOpen(false);
                    }}
                    className="h-11 w-full justify-center rounded-xl border border-white/30 bg-white/5 px-3 text-xs text-slate-100"
                  >
                    Logout
                  </AnimatedButton>
                </div>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 grid place-items-center p-6">
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

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-black/60"
              aria-label="Close sidebar overlay"
            />
            <div className="absolute left-0 top-0 h-full w-[86vw] max-w-sm p-3">
              <ChatSidebar
                onCreateChat={handleNewChat}
                onChatOpen={handleOpenChatFromSidebar}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
