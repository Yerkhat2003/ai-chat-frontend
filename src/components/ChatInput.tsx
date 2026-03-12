'use client';

import { useState, useRef, useCallback } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useMicLevel } from '@/hooks/useMicLevel';

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceCommittedRef = useRef('');

  const handleSubmit = useCallback(() => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue('');
  }, [value, disabled, onSend]);

  const onVoiceResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      voiceCommittedRef.current =
        (voiceCommittedRef.current ? `${voiceCommittedRef.current} ` : '') + text;
      setValue(voiceCommittedRef.current);
    } else {
      setValue(
        voiceCommittedRef.current
          ? `${voiceCommittedRef.current} ${text}`
          : text
      );
    }
    textareaRef.current?.focus();
  }, []);

  const {
    isListening,
    isSupported,
    error: voiceError,
    startListening,
    stopListening,
  } = useVoiceInput(onVoiceResult);

  const micLevel = useMicLevel(isListening);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      voiceCommittedRef.current = value;
      startListening();
    }
  }, [isListening, value, startListening, stopListening]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-end">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сформулируйте свой вопрос или запрос..."
            rows={3}
            disabled={disabled}
            className="peer flex-1 w-full resize-none rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 shadow-inner shadow-black/40 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <div className="pointer-events-none absolute inset-x-3 bottom-2 flex items-end justify-end text-[10px] text-slate-500">
            <span>
              <span className="font-mono text-slate-300">Enter</span> — отправка,&nbsp;
              <span className="font-mono text-slate-400">Shift+Enter</span> — перенос
            </span>
          </div>
        </div>
        <div className="flex gap-2 sm:flex-col sm:gap-2">
          {isSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={disabled}
              title={isListening ? 'Остановить запись' : 'Голосовой ввод'}
              className={`relative inline-flex items-center justify-center gap-1 rounded-2xl border px-3 py-2 text-sm font-medium transition-all sm:min-w-[3rem] sm:min-h-[3rem] ${
                isListening
                  ? 'border-red-500/70 bg-red-500/20 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                  : 'border-slate-700 bg-slate-900/80 text-slate-100 hover:border-emerald-500/70 hover:bg-slate-900'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isListening ? (
                <>
                  <LevelBars level={micLevel} className="w-5 h-5" />
                  <span className="hidden sm:inline text-[11px]">Слушаю…</span>
                </>
              ) : (
                <>
                  <MicrophoneIcon className="w-5 h-5" />
                  <span className="hidden sm:inline text-[11px]">Голос</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-[0_12px_40px_rgba(16,185,129,0.7)] transition-all hover:bg-emerald-400 hover:shadow-[0_18px_60px_rgba(16,185,129,0.9)] disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <span>Отправить</span>
          </button>
        </div>
      </div>
      {voiceError && (
        <p className="text-xs text-red-300">{voiceError}</p>
      )}
    </div>
  );
}

const BARS = 5;
const MIN_BAR_HEIGHT = 18;

function LevelBars({ level, className }: { level: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-end justify-center gap-0.5 h-5 ${className ?? ''}`}
      aria-hidden
    >
      {Array.from({ length: BARS }, (_, i) => {
        const low = i / BARS;
        const high = (i + 1) / BARS;
        let pct = MIN_BAR_HEIGHT;
        if (level >= high) pct = 100;
        else if (level > low) pct = MIN_BAR_HEIGHT + ((level - low) / (high - low)) * (100 - MIN_BAR_HEIGHT);
        return (
          <span
            key={i}
            className="w-0.5 rounded-full bg-current shrink-0 transition-[height] duration-75 ease-out"
            style={{ height: `${pct}%` }}
          />
        );
      })}
    </span>
  );
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}
