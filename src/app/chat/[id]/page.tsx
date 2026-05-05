'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChatInput } from '@/components/ChatInput';
import { ChatResponse } from '@/components/ChatResponse';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PrettySelect, PrettySelectOption } from '@/components/ui/PrettySelect';
import { SkeletonLine } from '@/components/ui/SkeletonLine';
import { useToast } from '@/components/ui/ToastProvider';
import { API_URL, apiRequest } from '@/lib/api';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  isAuthenticated,
  setAccessToken,
  setRefreshToken,
} from '@/lib/auth';
import { ChatWithMessages, Message, MessageEdit } from '@/lib/types';
import {
  PersonaMode,
  ThemePreset,
  applyThemeClass,
  getPersonaMode,
  getThemePreset,
  setPersonaMode,
  setThemePreset,
} from '@/lib/preferences';

const PROMPT_TEMPLATES = [
  {
    id: 'simple',
    label: 'Explain simply',
    prefix: 'Explain this like I am a beginner. ',
  },
  {
    id: 'plan',
    label: 'Make a plan',
    prefix: 'Create a step-by-step action plan for this request. ',
  },
  {
    id: 'checklist',
    label: 'Checklist',
    prefix: 'Answer as a clear checklist with practical items. ',
  },
];

const PERSONA_OPTIONS: PrettySelectOption[] = [
  { value: 'creative', label: 'Creative' },
  { value: 'precise', label: 'Precise' },
  { value: 'fast', label: 'Fast' },
];

const THEME_OPTIONS: PrettySelectOption[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

export default function ChatDetailPage() {
  const params = useParams<{ id: string }>();
  const chatId = useMemo(() => params?.id ?? '', [params]);
  const router = useRouter();

  const [chat, setChat] = useState<ChatWithMessages | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [expandedHistoryMessageId, setExpandedHistoryMessageId] = useState<
    string | null
  >(null);
  const [messageHistories, setMessageHistories] = useState<
    Record<string, MessageEdit[]>
  >({});
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [persona, setPersona] = useState<PersonaMode>('precise');
  const [theme, setTheme] = useState<ThemePreset>('dark');
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [autoVoice, setAutoVoice] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userActionMenuId, setUserActionMenuId] = useState<string | null>(null);
  const { showError, showSuccess } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasExpectedMessagePair = (
    data: ChatWithMessages,
    userContent: string,
    assistantContent: string,
  ) => {
    const userIndex = data.messages.findIndex(
      (message) => message.role === 'USER' && message.content === userContent,
    );
    if (userIndex < 0) return false;

    const aiIndex = data.messages.findIndex(
      (message, index) =>
        index > userIndex &&
        message.role === 'AI' &&
        message.content === assistantContent,
    );

    return aiIndex > userIndex;
  };

  const delay = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });

  useEffect(() => {
    const persistedPersona = getPersonaMode();
    const persistedTheme = getThemePreset();
    setPersona(persistedPersona);
    setTheme(persistedTheme);
    applyThemeClass(persistedTheme);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    if (!chatId) return;

    const loadChat = async () => {
      setLoading(true);
      try {
        const data = await apiRequest<ChatWithMessages>(`/chats/${chatId}`, {
          auth: true,
        });
        setChat(data);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to load chat');
      } finally {
        setLoading(false);
      }
    };

    void loadChat();
  }, [chatId, router, showError]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat?.messages, sending]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserActionMenuId(null);
  }, [chatId]);

  const buildPrompt = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed) return trimmed;

    if (persona === 'creative') {
      return `Reply in a creative but concise way. Keep tone natural, avoid fluffy language, and use examples only when useful.\n\n${trimmed}`;
    }
    if (persona === 'fast') {
      return `Reply very briefly and directly. Use short bullets only if they improve clarity.\n\n${trimmed}`;
    }
    return `Reply clearly and professionally. Keep it concise by default and avoid decorative writing.\n\n${trimmed}`;
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      showError('Please enter a message.');
      return;
    }

    if (editingMessageId) {
      setSending(true);
      try {
        const updated = await apiRequest<Message>(`/messages/${editingMessageId}`, {
          method: 'PATCH',
          auth: true,
          body: { content: trimmed },
        });

        setChat((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((message) =>
              message.id === editingMessageId ? updated : message,
            ),
          };
        });
        setDraft('');
        setEditingMessageId(null);
        showSuccess('Message updated');

        try {
          const refreshedChat = await apiRequest<ChatWithMessages>(
            `/chats/${chatId}`,
            { auth: true },
          );
          setChat(refreshedChat);
        } catch {
          // Keep local optimistic state if chat refresh fails.
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to update message');
      } finally {
        setSending(false);
      }
      return;
    }

    setSending(true);
    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'USER',
      content: trimmed,
      chatId,
      createdAt: new Date().toISOString(),
    };
    const aiMessageId = `temp-ai-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'AI',
      content: '',
      chatId,
      createdAt: new Date().toISOString(),
    };

    setChat((prev) => {
      if (!prev) return prev;
      return { ...prev, messages: [...prev.messages, userMessage, aiMessage] };
    });
    setStreamingMessageId(aiMessageId);

    setDraft('');
    let assistantContent = '';

    try {
      const requestBody = JSON.stringify({
        chatId,
        content: trimmed,
        promptContent: buildPrompt(trimmed),
      });

      const doStreamRequest = () => {
        const token = getAccessToken();
        return fetch(`${API_URL}/messages/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: requestBody,
        });
      };

      let response = await doStreamRequest();
      if (response.status === 401) {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshResponse.ok) {
            const tokens = (await refreshResponse.json()) as {
              accessToken?: string;
              refreshToken?: string;
            };
            if (tokens.accessToken && tokens.refreshToken) {
              setAccessToken(tokens.accessToken);
              setRefreshToken(tokens.refreshToken);
              response = await doStreamRequest();
            }
          } else {
            clearAuthTokens();
          }
        }
      }

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const apiMessage = Array.isArray(errorPayload?.message)
          ? errorPayload.message.join('. ')
          : errorPayload?.message || errorPayload?.error;
        throw new Error(apiMessage || `Failed to stream message (${response.status})`);
      }

      if (!response.body) {
        throw new Error('Streaming is unavailable in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pendingText = '';
      let renderedText = '';
      let streamOpen = true;

      const flushBufferedText = async () => {
        while (streamOpen || pendingText.length > 0) {
          if (!pendingText.length) {
            await delay(18);
            continue;
          }

          const step = Math.min(4, pendingText.length);
          renderedText += pendingText.slice(0, step);
          pendingText = pendingText.slice(step);
          assistantContent = renderedText;

          setChat((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((msg) =>
                msg.id === aiMessageId ? { ...msg, content: assistantContent } : msg,
              ),
            };
          });

          await delay(16);
        }
      };

      const flushPromise = flushBufferedText();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pendingText += decoder.decode(value, { stream: true });
      }

      pendingText += decoder.decode();
      streamOpen = false;
      await flushPromise;
      setChat((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === aiMessageId ? { ...msg, content: assistantContent } : msg,
          ),
        };
      });

      if (autoVoice && assistantContent.trim()) {
        toggleSpeakMessage(aiMessageId, assistantContent);
      }

      try {
        let syncedChat: ChatWithMessages | null = null;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const refreshedChat = await apiRequest<ChatWithMessages>(`/chats/${chatId}`, {
            auth: true,
          });

          if (hasExpectedMessagePair(refreshedChat, trimmed, assistantContent)) {
            syncedChat = refreshedChat;
            break;
          }

          await delay(250 * (attempt + 1));
        }

        if (syncedChat) {
          setChat(syncedChat);
        }
      } catch {
        // Keep already streamed UI content if sync request fails.
      }
    } catch (err) {
      const fallbackText =
        assistantContent.trim() ||
        'Connection interrupted while generating response. Please retry.';
      setChat((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === aiMessageId ? { ...msg, content: fallbackText } : msg,
          ),
        };
      });
      showError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
      setStreamingMessageId(null);
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

  const handleCreateSidebarChat = () => {
    setSidebarOpen(false);
    router.push('/');
  };

  const handleOpenChatFromSidebar = () => {
    setSidebarOpen(false);
  };

  const shareCurrentChat = async () => {
    if (!chat) return;

    try {
      const data = await apiRequest<{ token: string; shareUrlPath: string }>(
        `/chats/${chat.id}/share`,
        {
          method: 'POST',
          auth: true,
        },
      );
      const shareUrl = `${window.location.origin}${data.shareUrlPath}`;
      await navigator.clipboard.writeText(shareUrl);
      showSuccess('Share link copied');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create share link');
    }
  };

  const renameCurrentChat = async () => {
    if (!chat) return;
    const nextTitle = window.prompt('Rename chat', chat.title)?.trim();
    if (!nextTitle || nextTitle === chat.title) return;

    try {
      const updated = await apiRequest<{ title: string }>(`/chats/${chat.id}`, {
        method: 'PATCH',
        auth: true,
        body: { title: nextTitle },
      });
      setChat((prev) => (prev ? { ...prev, title: updated.title } : prev));
      showSuccess('Chat renamed');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to rename chat');
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showSuccess('Copied to clipboard.');
    } catch {
      showError('Failed to copy message.');
    }
  };

  const handleRegenerate = async (assistantMessageId: string) => {
    if (!chat) return;
    const aiIndex = chat.messages.findIndex((m) => m.id === assistantMessageId);
    if (aiIndex <= 0) return;
    const previousUser = [...chat.messages]
      .slice(0, aiIndex)
      .reverse()
      .find((m) => m.role === 'USER');
    if (previousUser) {
      await sendMessage(previousUser.content);
    }
  };

  const handleEditPrompt = (assistantMessageId: string) => {
    if (!chat) return;
    const aiIndex = chat.messages.findIndex((m) => m.id === assistantMessageId);
    if (aiIndex <= 0) return;
    const previousUser = [...chat.messages]
      .slice(0, aiIndex)
      .reverse()
      .find((m) => m.role === 'USER');
    if (previousUser) {
      setDraft(previousUser.content);
    }
  };

  const handleEditUserMessage = (messageId: string) => {
    const target = chat?.messages.find((message) => message.id === messageId);
    if (!target) return;
    setEditingMessageId(messageId);
    setDraft(target.content);
  };

  const handleToggleMessageHistory = async (messageId: string) => {
    if (expandedHistoryMessageId === messageId) {
      setExpandedHistoryMessageId(null);
      return;
    }

    setExpandedHistoryMessageId(messageId);
    if (messageHistories[messageId]) return;

    setHistoryLoadingId(messageId);
    try {
      const history = await apiRequest<MessageEdit[]>(`/messages/${messageId}/edits`, {
        auth: true,
      });
      setMessageHistories((prev) => ({
        ...prev,
        [messageId]: history,
      }));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load edit history');
    } finally {
      setHistoryLoadingId(null);
    }
  };

  const onPersonaChange = (mode: PersonaMode) => {
    setPersona(mode);
    setPersonaMode(mode);
  };

  const onThemeChange = (preset: ThemePreset) => {
    setTheme(preset);
    setThemePreset(preset);
    applyThemeClass(preset);
  };

  const applyTemplate = (templatePrefix: string) => {
    setDraft((prev) => `${templatePrefix}${prev}`.trimStart());
  };

  const togglePinMessage = async (messageId: string) => {
    if (!chat) return;
    const nextPinnedId = chat.pinnedMessageId === messageId ? null : messageId;
    try {
      const data = await apiRequest<{ pinnedMessageId: string | null }>(
        `/chats/${chat.id}/pin`,
        {
          method: 'PATCH',
          auth: true,
          body: { messageId: nextPinnedId },
        },
      );
      setChat((prev) => (prev ? { ...prev, pinnedMessageId: data.pinnedMessageId } : prev));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to pin message');
    }
  };

  const toggleSpeakMessage = (messageId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showError('Voice playback is not supported in this browser');
      return;
    }

    if (currentlySpeakingId === messageId) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      setCurrentlySpeakingId((prev) => (prev === messageId ? null : prev));
    };
    utterance.onerror = () => {
      setCurrentlySpeakingId((prev) => (prev === messageId ? null : prev));
    };
    setCurrentlySpeakingId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  const pinnedMessage = chat?.messages.find(
    (message) => message.id === chat?.pinnedMessageId,
  );

  return (
    <main className="h-[100dvh] text-main p-0 sm:min-h-screen sm:p-6">
      <div className="mx-auto h-full w-full max-w-[1300px] grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0 sm:gap-4">
        <div className="hidden lg:block lg:h-[calc(100vh-3rem)]">
          <ChatSidebar
            activeChatId={chatId}
            onCreateChat={handleCreateSidebarChat}
            onChatOpen={handleOpenChatFromSidebar}
          />
        </div>

        <GlassPanel strong className="relative h-full sm:h-auto lg:h-[calc(100vh-3rem)] flex flex-col overflow-hidden rounded-none sm:rounded-2xl">
          <div className="relative z-20 px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden rounded-lg border border-white/25 px-2 py-1 text-xs"
              >
                Chats
              </button>
              <Link href="/dashboard" className="hidden sm:block text-xs uppercase tracking-widest text-muted hover:text-white">
                Dashboard
              </Link>
              <h1 className="text-lg sm:text-xl font-semibold truncate">{chat?.title ?? 'Chat'}</h1>
            </div>
            <div className="hidden sm:flex items-center gap-2 flex-nowrap">
              <button
                type="button"
                onClick={() => void shareCurrentChat()}
                className="h-8 whitespace-nowrap rounded-lg border border-cyan-300/35 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/10 transition"
              >
                Share
              </button>
              <button
                type="button"
                onClick={() => void renameCurrentChat()}
                className="h-8 whitespace-nowrap rounded-lg border border-white/25 px-2 py-1 text-xs hover:bg-white/10 transition text-main"
              >
                Rename
              </button>
              <PrettySelect
                value={persona}
                options={PERSONA_OPTIONS}
                onChange={(nextValue) => onPersonaChange(nextValue as PersonaMode)}
                className="min-h-0 h-8 min-w-[92px] rounded-lg px-2 py-1 text-xs"
              />
              <PrettySelect
                value={theme}
                options={THEME_OPTIONS}
                onChange={(nextValue) => onThemeChange(nextValue as ThemePreset)}
                className="min-h-0 h-8 min-w-[92px] rounded-lg px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => setAutoVoice((prev) => !prev)}
                className="h-8 whitespace-nowrap rounded-lg border border-white/25 px-2 py-1 text-xs hover:bg-white/10 transition text-main"
              >
                {autoVoice ? 'Auto voice on' : 'Auto voice off'}
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="h-8 whitespace-nowrap rounded-lg border border-white/25 px-2 py-1 text-xs hover:bg-white/10 transition text-main"
              >
                Logout
              </button>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="sm:hidden rounded-lg border border-white/25 px-2 py-1 text-xs"
            >
              ⋯
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 sm:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
                aria-label="Close mobile actions menu"
              />
              <div className="absolute left-3 right-3 top-16 rounded-2xl border border-white/15 bg-black p-3 text-slate-100 shadow-2xl">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      router.push('/dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-lg border border-white/25 px-2 py-2 text-xs text-slate-100"
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void shareCurrentChat();
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-lg border border-cyan-300/35 px-2 py-2 text-xs text-cyan-200"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void renameCurrentChat();
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-lg border border-white/25 px-2 py-2 text-xs text-slate-100"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoVoice((prev) => !prev);
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-lg border border-white/25 px-2 py-2 text-xs text-slate-100"
                  >
                    {autoVoice ? 'Auto voice on' : 'Auto voice off'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void logout();
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-lg border border-white/25 px-2 py-2 text-xs text-slate-100"
                  >
                    Logout
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <PrettySelect
                    value={persona}
                    options={PERSONA_OPTIONS}
                    onChange={(nextValue) => {
                      onPersonaChange(nextValue as PersonaMode);
                      setMobileMenuOpen(false);
                    }}
                    className="min-h-0 h-10 w-full rounded-lg px-2 py-2 text-xs"
                    variant="dark"
                  />
                  <PrettySelect
                    value={theme}
                    options={THEME_OPTIONS}
                    onChange={(nextValue) => {
                      onThemeChange(nextValue as ThemePreset);
                      setMobileMenuOpen(false);
                    }}
                    className="min-h-0 h-10 w-full rounded-lg px-2 py-2 text-xs"
                    variant="dark"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
            {pinnedMessage && (
              <GlassPanel className="px-3 py-2 border border-amber-300/30">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-widest text-amber-300">Pinned highlight</p>
                  <button
                    type="button"
                    onClick={() => void togglePinMessage(pinnedMessage.id)}
                    className="text-[10px] text-muted hover:underline"
                  >
                    Unpin
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{pinnedMessage.content}</p>
              </GlassPanel>
            )}
            {loading && (
              <div className="space-y-3">
                <SkeletonLine className="w-32" />
                <SkeletonLine className="w-2/3" />
                <SkeletonLine className="w-1/2" />
              </div>
            )}

            {!loading && chat?.messages.length === 0 && (
              <p className="text-sm text-muted">Start your conversation to see messages here.</p>
            )}

            {chat?.messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-visible ${
                  msg.role === 'USER' ? 'ml-auto max-w-[85%]' : 'mr-auto max-w-[90%]'
                } ${userActionMenuId === msg.id ? 'z-30' : 'z-0'}`}
              >
                {msg.role === 'AI' ? (
                  <ChatResponse
                    text={msg.content}
                    streaming={streamingMessageId === msg.id}
                    onCopy={() => void handleCopy(msg.content)}
                    onRegenerate={() => void handleRegenerate(msg.id)}
                    onEditPrompt={() => handleEditPrompt(msg.id)}
                    onSpeakToggle={() => toggleSpeakMessage(msg.id, msg.content)}
                    speaking={currentlySpeakingId === msg.id}
                    onPinToggle={() => void togglePinMessage(msg.id)}
                    pinned={chat?.pinnedMessageId === msg.id}
                    compactActions
                  />
                ) : (
                  <GlassPanel className="px-3 py-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted">You</p>
                      <div className="hidden sm:flex items-center gap-2">
                        {msg.isEdited ? (
                          <span className="text-[10px] text-amber-300">Edited</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleEditUserMessage(msg.id)}
                          className="text-[10px] text-cyan-300 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleMessageHistory(msg.id)}
                          className="text-[10px] text-muted hover:underline"
                        >
                          History
                        </button>
                        <button
                          type="button"
                          onClick={() => void togglePinMessage(msg.id)}
                          className="text-[10px] text-amber-300 hover:underline"
                        >
                          {chat?.pinnedMessageId === msg.id ? 'Unpin' : 'Pin'}
                        </button>
                      </div>
                      <div className="relative sm:hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setUserActionMenuId((prev) => (prev === msg.id ? null : msg.id))
                          }
                          className="rounded border border-white/20 px-2 py-1 text-[10px]"
                        >
                          Actions
                        </button>
                        {userActionMenuId === msg.id && (
                          <div className="absolute right-0 top-full mt-2 z-40 w-28 rounded-lg border border-white/20 bg-black p-1 text-slate-100 shadow-xl">
                            <button
                              type="button"
                              onClick={() => {
                                handleEditUserMessage(msg.id);
                                setUserActionMenuId(null);
                              }}
                              className="w-full rounded px-2 py-1 text-left text-[10px] text-slate-100 hover:bg-white/10"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleToggleMessageHistory(msg.id);
                                setUserActionMenuId(null);
                              }}
                              className="w-full rounded px-2 py-1 text-left text-[10px] text-slate-100 hover:bg-white/10"
                            >
                              History
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void togglePinMessage(msg.id);
                                setUserActionMenuId(null);
                              }}
                              className="w-full rounded px-2 py-1 text-left text-[10px] text-slate-100 hover:bg-white/10"
                            >
                              {chat?.pinnedMessageId === msg.id ? 'Unpin' : 'Pin'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {expandedHistoryMessageId === msg.id && (
                      <div className="mt-2 rounded-lg border border-white/15 p-2">
                        {historyLoadingId === msg.id && (
                          <p className="text-[11px] text-muted">Loading history...</p>
                        )}
                        {!historyLoadingId && !(messageHistories[msg.id]?.length > 0) && (
                          <p className="text-[11px] text-muted">No edits yet.</p>
                        )}
                        {!historyLoadingId && messageHistories[msg.id]?.length ? (
                          <div className="space-y-1">
                            {messageHistories[msg.id].map((edit, index) => (
                              <div key={edit.id} className="text-[11px] text-muted">
                                <p className="font-medium">
                                  v{messageHistories[msg.id].length - index} ·{' '}
                                  {new Date(edit.editedAt).toLocaleString()}
                                </p>
                                <p className="whitespace-pre-wrap text-main">
                                  {edit.previousContent}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </GlassPanel>
                )}
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-white/10 bg-black/10 backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
              {PROMPT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template.prefix)}
                  className="shrink-0 rounded-lg border border-white/20 px-2 py-1 text-xs text-muted hover:text-main hover:bg-white/10 transition"
                >
                  {template.label}
                </button>
              ))}
            </div>
            <ChatInput
              onSend={sendMessage}
              disabled={sending}
              value={draft}
              onValueChange={setDraft}
              placeholder={
                editingMessageId
                  ? 'Edit message and press Enter to save'
                  : 'Ask whatever you want'
              }
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
                activeChatId={chatId}
                onCreateChat={handleCreateSidebarChat}
                onChatOpen={handleOpenChatFromSidebar}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
