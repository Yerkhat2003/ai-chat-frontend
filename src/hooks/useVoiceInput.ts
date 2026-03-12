'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export type VoiceResultHandler = (text: string, isFinal: boolean) => void;

export function useVoiceInput(onResult: VoiceResultHandler) {
  const [mounted, setMounted] = useState(false);
  const [isListening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSupported =
    mounted &&
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    setError(null);
    const SpeechRecognitionAPI =
      (window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }).SpeechRecognition ||
      (window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not available.');
      return;
    }

    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const transcript = (results[i][0]?.transcript ?? '').trim();
        if (!transcript) continue;
        onResult(transcript, results[i].isFinal);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access is blocked in browser settings.');
      } else if (event.error === 'network') {
        setError('Browser speech recognition service is unavailable (network error). Try again later or use text input.');
      } else if (event.error !== 'aborted') {
        setError('An error occurred while using voice input. Please try again.');
      }
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch (e) {
      setError('Failed to start speech recognition.');
    }
  }, [isSupported, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  return {
    isListening,
    isSupported: !!isSupported,
    error,
    startListening,
    stopListening,
  };
}

