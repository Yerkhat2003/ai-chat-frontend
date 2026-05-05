'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useMicLevel } from '@/hooks/useMicLevel';
import { TypingCaret } from '@/components/ui/TypingCaret';
import { cn } from '@/lib/cn';

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  error?: string | null;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
};

export function ChatInput({
  onSend,
  disabled,
  error,
  value,
  onValueChange,
  placeholder = 'Ask whatever you want',
}: Props) {
  const [internalValue, setInternalValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceCommittedRef = useRef('');
  const currentValue = value ?? internalValue;
  const setCurrentValue = onValueChange ?? setInternalValue;

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    onSend(currentValue);
    if (!onValueChange) setInternalValue('');
  }, [currentValue, disabled, onSend, onValueChange]);

  const onVoiceResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      voiceCommittedRef.current =
        (voiceCommittedRef.current ? `${voiceCommittedRef.current} ` : '') + text;
      setCurrentValue(voiceCommittedRef.current);
    } else {
      setCurrentValue(
        voiceCommittedRef.current
          ? `${voiceCommittedRef.current} ${text}`
          : text
      );
    }
    inputRef.current?.focus();
  }, [setCurrentValue]);

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
      voiceCommittedRef.current = currentValue;
      startListening();
    }
  }, [isListening, currentValue, startListening, stopListening]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        layout
        className={cn(
          'flex items-stretch h-14 rounded-2xl overflow-hidden border shadow-[0_10px_30px_rgba(0,0,0,0.22)]',
          'glass-panel-strong',
          disabled ? 'opacity-80' : 'accent-glow',
        )}
      >
        <div className="flex items-center gap-3 flex-1 px-4">
          {isSupported && (
            <motion.button
              type="button"
              onClick={handleMicClick}
              disabled={disabled}
              title={isListening ? 'Stop recording' : 'Voice input'}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed',
                isListening
                  ? 'bg-rose-500/20 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.45)]'
                  : 'text-main hover:bg-white/10',
              )}
            >
              {isListening ? (
                <LevelBars level={micLevel} className="w-4 h-4" />
              ) : (
                <MicrophoneIcon className="w-4 h-4" />
              )}
            </motion.button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-sm text-main placeholder:text-[var(--text-muted)]"
          />
          {disabled && (
            <span className="text-xs text-muted inline-flex items-center gap-1">
              Sending
              <TypingCaret />
            </span>
          )}
        </div>

        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center h-full px-5 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 border-l border-white/15"
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
        </motion.button>
      </motion.div>
      {(error || voiceError) && (
        <p className="mt-1 text-xs text-red-300">{error ?? voiceError}</p>
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
