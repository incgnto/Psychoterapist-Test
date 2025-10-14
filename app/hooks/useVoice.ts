import { useEffect, useRef, useState } from "react";

type MicState = 'granted' | 'denied' | 'prompt' | 'unknown';
type Mode = 'inactive' | 'continuous';

export function useVoice(onInterim: (text: string) => void, onCommit: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<MicState>('unknown');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [mediaSupported, setMediaSupported] = useState(false);
  const [mode, setMode] = useState<Mode>('inactive');

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent);

    setMediaSupported(!!(navigator.mediaDevices && (window as any).MediaRecorder));

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSpeechSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    if (isIOS || (isSafari && isMac)) rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsRecording(true);
      setRecordingError(null);
      finalRef.current = '';
      setMode('continuous');
    };
    rec.onresult = (ev: any) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = r[0]?.transcript ?? '';
        if (!t) continue;
        if (r.isFinal) final += (final ? ' ' : '') + t.trim();
        else interim += t;
      }
      finalRef.current = final.trim();
      onInterim([final, interim].filter(Boolean).join(' ').trim());
    };
    rec.onerror = (ev: any) => {
      setIsRecording(false);
      setIsTranscribing(false);
      setMode('inactive');
      setRecordingError(ev?.error ? `Speech recognition error: ${ev.error}` : 'Speech recognition failed');
    };
    rec.onend = () => {
      setIsRecording(false);
      setIsTranscribing(false);
      setMode('inactive');
      const committed = finalRef.current.trim();
      if (committed) onCommit(committed);
      finalRef.current = '';
    };

    recognitionRef.current = rec;

    // permissions (best-effort)
    (async () => {
      try {
        if (navigator.permissions?.query) {
          const ps = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicPermission(ps.state as MicState);
          ps.addEventListener('change', () => setMicPermission(ps.state as MicState));
        }
      } catch { /* noop */ }
    })();
  }, [onInterim, onCommit]);

  const requestMic = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
      setMicPermission('granted');
      return true;
    } catch {
      setMicPermission('denied'); return false;
    }
  };

  const start = async () => {
    if (isRecording) return;
    if (!recognitionRef.current && !mediaSupported) {
      setRecordingError('Voice input not supported on this device'); return;
    }
    if (micPermission === 'denied') { setRecordingError('Microphone permission denied'); return; }
    if (micPermission === 'prompt' || micPermission === 'unknown') {
      const ok = await requestMic(); if (!ok) return;
    }
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      } else {
        await startMediaRecorder();
      }
      setIsPaused(false);
      navigator.vibrate?.(50);
    } catch (e) {
      if (mediaSupported) await startMediaRecorder();
      else setRecordingError('Could not start recording');
    }
  };

  const startMediaRecorder = async () => {
    setRecordingError(null);
    setIsRecording(true);
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    const mr = new MediaRecorder(stream, { mimeType: mime });
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e: BlobEvent) => {
      if (e.data?.size) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      if (mode !== 'inactive') {
        setIsTranscribing(true);
        const blob = new Blob(chunksRef.current, { type: mime });
        const form = new FormData();
        form.append('audio', blob, mime.includes('webm') ? 'audio.webm' : 'audio.mp4');
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: form });
          const data = await res.json();
          const text = (data?.text || '').trim();
          if (text) onCommit(text);
        } catch { /* swallow */ }
        setIsTranscribing(false);
      }
      setIsRecording(false);
      setMode('inactive');
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      chunksRef.current = [];
    };

    mr.start();
    setMode('continuous');
  };

  const cancel = () => {
    recognitionRef.current?.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    setIsRecording(false);
    setIsTranscribing(false);
    setMode('inactive');
    navigator.vibrate?.([50,50,50]);
  };

  const end = () => {
    recognitionRef.current?.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    navigator.vibrate?.(100);
  };

  return {
    // state
    isRecording, isPaused, setIsPaused,
    isTranscribing, recordingError, micPermission, speechSupported,
    // controls
    start, cancel, end,
  };
}
