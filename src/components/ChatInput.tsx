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
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceCommittedRef = useRef('');

  const handleSubmit = useCallback(() => {
    if (disabled) return;
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
    inputRef.current?.focus();
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
    <div className="w-full max-w-2xl mx-auto">
      <div
        className="flex items-stretch h-16 rounded-2xl overflow-hidden
        bg-[#072E6A]
        border border-[#1C4C9A] shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-3 flex-1 px-4">
          {isSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={disabled}
              title={isListening ? 'Остановить запись' : 'Голосовой ввод'}
              className="flex items-center justify-center w-9 h-9 rounded-full text-blue-100 hover:bg-blue-800/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isListening ? (
                <LevelBars level={micLevel} className="w-4 h-4" />
              ) : (
                <MicrophoneIcon className="w-4 h-4" />
              )}
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask whatever you want"
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-blue-100 placeholder-blue-300"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className="flex items-center justify-center h-full px-5 rounded-2xl
          bg-[#1C4C9A] hover:bg-[#2455AA]
          transition-colors disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 7l6 5-6 5" />
          </svg>
        </button>
      </div>
      {voiceError && (
        <p className="mt-1 text-xs text-red-300">{voiceError}</p>
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
