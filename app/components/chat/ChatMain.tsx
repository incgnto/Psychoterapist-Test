'use client';

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';

import ChatHeader from './ChatHeader';
import { WelcomeHero } from './WelcomeHero';
import { SuggestedQuestions } from './SuggestedQuestions';
import { MessagesList } from './MessagesList';
import { InputBar } from './InputBar/InputBar';
import VoiceMode from '../VoiceModeSafe';

import { useChat } from '@/app/hooks/useChat';
import { useAttachments } from '@/app/hooks/useAttachments';
import { useVoice } from '@/app/hooks/useVoice';
import { fileToBase64, isImage } from '@/app/utils/files';

type Props = {
  newChatTrigger?: number;
  selectedSession?: any;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
};

const suggested = [
  'I’m feeling anxious — can you help me calm down?',
  'Something’s been on my mind — can we unpack it together?',
  'I’d like to start my day with a positive check-in',
  'Quick advice on how to feel better right now?',
];

export default function ChatMain({
  newChatTrigger,
  selectedSession,
  isSidebarOpen,
  onToggleSidebar,
}: Props) {
  const { messages = [], isLoading = false, sendMessage, startNewChat, loadSession, threadId } = useChat() || {};

  const [message, setMessage] = useState('');
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);

  // Attachments
  const { attachedFiles, removeAt, clearAll, handleFileInput, handleDrop } = useAttachments();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === Voice gating to prevent repopulating input after Send ===
  const voiceEnabledRef = useRef(true);

  // Voice (interim -> update input, final -> append to input)
  const rawVoice = useVoice(
    (live) => {
      if (voiceEnabledRef.current) setMessage(live);
    },
    (finalText) => {
      if (voiceEnabledRef.current) {
        setMessage((prev) => (prev ? `${prev} ` : '') + finalText);
      }
    }
  );

  // Wrap voice to flip the gate appropriately
  const voice = useMemo(
    () => ({
      ...rawVoice,
      start: () => {
        voiceEnabledRef.current = true;
        return rawVoice.start();
      },
      cancel: () => {
        voiceEnabledRef.current = false;
        return rawVoice.cancel();
      },
      end: () => {
        voiceEnabledRef.current = false; // prevent final callback from refilling input
        return rawVoice.end();
      },
      onOpenVoiceMode: () => setIsVoiceModeOpen(true),
    }),
    [rawVoice]
  );

  // Quick question pick
  const onPickQuick = useCallback(
    async (q: string) => {
      if (sendMessage) await sendMessage(q);
    },
    [sendMessage]
  );

  // Build & send message
  const handleSend = useCallback(async () => {
    if ((!message.trim() && attachedFiles.length === 0) || !sendMessage) return;

    const text = message.trim();

    // Stop accepting voice updates for this cycle so final STT won't refill input
    voiceEnabledRef.current = false;
    setMessage(''); // clear immediately

    const images: Array<{ type: 'image'; data: string; mimeType: string; name: string }> = [];
    const docs: { type: 'document'; name: string; mimeType: string; text: string }[] = [];
    const nonImageNames: string[] = [];

    for (const f of attachedFiles) {
      if (isImage(f)) {
        try {
          images.push({ type: 'image', data: await fileToBase64(f), mimeType: f.type, name: f.name });
        } catch {
          /* ignore */
        }
      } else {
        try {
          let extracted = '';
          if (f.type.startsWith('text/')) {
            extracted = await f.text();
          } else {
            const form = new FormData();
            form.append('file', f);
            const res = await fetch('/api/extract-text', { method: 'POST', body: form });
            if (res.ok) {
              const d = await res.json();
              extracted = (d?.text || '') as string;
            }
          }
          if (extracted.trim()) {
            docs.push({ type: 'document', name: f.name, mimeType: f.type, text: extracted.trim() });
          } else {
            nonImageNames.push(f.name);
          }
        } catch {
          nonImageNames.push(f.name);
        }
      }
    }

    // Final text
    let finalText = text;
    if (nonImageNames.length) {
      const label = nonImageNames.map((n) => `[File attached: ${n}]`).join('\n');
      finalText = finalText ? `${finalText}\n\n${label}` : label;
    }

    clearAll();
    await sendMessage(finalText, images.length ? images : undefined, docs);

    // (Optional) Re-enable voice updates on next STT start; handled in voice.start()
  }, [message, attachedFiles, sendMessage, clearAll]);

  // External triggers / session selection
  useEffect(() => {
    if (newChatTrigger && newChatTrigger > 0 && startNewChat) startNewChat();
  }, [newChatTrigger, startNewChat]);

  useEffect(() => {
    if (selectedSession && loadSession) loadSession(selectedSession);
  }, [selectedSession, loadSession]);

  return (
    <div className="flex-1 flex flex-col">
      <ChatHeader isSidebarOpen={isSidebarOpen} onToggleSidebar={onToggleSidebar} />

      <div className="flex-1 flex flex-col">
        {messages.length <= 1 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="max-w-4xl w-full">
              <WelcomeHero />
              <SuggestedQuestions items={suggested} onPick={onPickQuick} disabled={isLoading} />
            </div>
          </div>
        ) : (
          <MessagesList messages={messages} isLoading={isLoading} threadId={threadId} />
        )}
      </div>

      <InputBar
        message={message}
        setMessage={setMessage}
        attachedFiles={attachedFiles}
        onRemoveFile={(i) => removeAt(i)}
        onSend={handleSend}
        isLoading={isLoading}
        isDragOver={isDragOver}
        setIsDragOver={setIsDragOver}
        fileInputRef={fileInputRef}
        onPickFiles={handleFileInput}
        onDropFiles={handleDrop}
        voice={voice}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />

      <VoiceMode isOpen={isVoiceModeOpen} onClose={() => setIsVoiceModeOpen(false)} />
    </div>
  );
}
