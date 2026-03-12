'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Возвращает уровень звука с микрофона (0–1) при включённой записи.
 */
export function useMicLevel(enabled: boolean): number {
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setLevel(0);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          if (cancelled || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const average = sum / dataArray.length;
          const normalized = Math.min(1, average / 128);
          setLevel(normalized);
          rafRef.current = requestAnimationFrame(updateLevel);
        };
        rafRef.current = requestAnimationFrame(updateLevel);
      } catch {
        setLevel(0);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      analyserRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
      setLevel(0);
    };
  }, [enabled]);

  return level;
}
