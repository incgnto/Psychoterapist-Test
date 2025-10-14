'use client';

import { useEffect, useRef, useState } from 'react';
import { initializeSafariAudioContext, unlockSafariAudio } from '@/lib/safari-audio-fix';

export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    initializeSafariAudioContext();
  }, []);

  const cleanText = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/[📍💶🇱🇹]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

  const stop = () => {
    try {
      currentAudioRef.current?.pause();
      if (currentAudioRef.current) currentAudioRef.current.currentTime = 0;
    } catch {}
    if (currentUrlRef.current) {
      try { URL.revokeObjectURL(currentUrlRef.current); } catch {}
    }
    currentAudioRef.current = null;
    currentUrlRef.current = null;
    setIsPlaying(false);
    setIsLoading(false);
  };

  const speak = async (text: string) => {
    try {
      stop();
      await unlockSafariAudio();
      setIsLoading(true);

      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText(text) }),
      });
      if (!response.ok) throw new Error('TTS failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio();
      audio.src = url;
      audio.volume = 1.0;
      audio.playbackRate = 1.0;
      audio.preload = 'auto';

      currentAudioRef.current = audio;
      currentUrlRef.current = url;

      audio.onplay = () => { setIsPlaying(true); setIsLoading(false); };
      audio.onended = stop;
      audio.onerror = stop;

      const p = audio.play();
      if (p !== undefined) await p;
    } catch (e) {
      console.error('Read aloud failed:', e);
      stop();
    }
  };

  const toggle = (text: string) => (isPlaying ? stop() : void speak(text));

  return { isPlaying, isLoading, toggle, stop };
}
