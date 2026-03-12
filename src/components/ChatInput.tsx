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
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение..."
          rows={3}
          disabled={disabled}
          className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-white font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Отправить
          </button>
          {isSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={disabled}
              title={isListening ? 'Остановить запись' : 'Голосовой ввод'}
              className={`relative rounded-lg p-2 transition-colors flex items-center justify-center gap-0.5 min-w-[2.25rem] min-h-[2.25rem] ${
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isListening ? (
                <LevelBars level={micLevel} className="w-5 h-5" />
              ) : (
                <MicrophoneIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>
      {voiceError && (
        <p className="text-sm text-red-600">{voiceError}</p>
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
