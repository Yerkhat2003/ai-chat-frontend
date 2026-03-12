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
      setError('Голосовой ввод не поддерживается в этом браузере');
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
      setError('Голосовой ввод недоступен');
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
        setError('Доступ к микрофону запрещён в настройках браузера');
      } else if (event.error === 'network') {
        setError('Сервис распознавания речи в браузере недоступен (ошибка сети). Попробуйте ещё раз позже или используйте текстовый ввод.');
      } else if (event.error !== 'aborted') {
        setError('Произошла ошибка голосового ввода. Попробуйте ещё раз.');
      }
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch (e) {
      setError('Не удалось запустить распознавание речи');
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

