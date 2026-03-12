'use client';

import { useState, useCallback, useRef } from 'react';

type SpeechRecognition = typeof window.SpeechRecognition | undefined;
type SpeechRecognitionInstance = InstanceType<
  NonNullable<typeof window.SpeechRecognition>
>;

export function useVoiceInput(onResult: (text: string) => void) {
  const [isListening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Голосовой ввод не поддерживается в этом браузере');
      return;
    }

    setError(null);
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: SpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError('Голосовой ввод недоступен');
      return;
    }

    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      let final = '';
      for (let i = event.resultIndex; i < results.length; i++) {
        const transcript = results[i][0].transcript;
        if (results[i].isFinal) {
          final += transcript;
        }
      }
      if (final) onResult(final.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('Доступ к микрофону запрещён');
      } else if (event.error !== 'aborted') {
        setError(`Ошибка: ${event.error}`);
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
