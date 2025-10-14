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
};

const suggested = [
  'I’m feeling anxious — can you help me calm down?',
  'Something’s been on my mind — can we unpack it together?',
  'I’d like to start my day with a positive check-in',
  'Quick advice on how to feel better right now?',
];

export default function ChatMain({ newChatTrigger, selectedSession }: Props) {
  const { messages = [], isLoading = false, sendMessage, startNewChat, loadSession } = useChat() || {};

  const [message, setMessage] = useState('');
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);

  // Attachments
  const { attachedFiles, removeAt, clearAll, handleFileInput, handleDrop } = useAttachments();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice (interim -> update input, final -> append to input)
  const voice = useVoice(
    (live) => setMessage(live),
    (finalText) => setMessage((prev) => (prev ? `${prev} ` : '') + finalText)
  );
  const voiceAPI = useMemo(
    () => ({
      ...voice,
      onOpenVoiceMode: () => setIsVoiceModeOpen(true),
    }),
    [voice]
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
    setMessage('');

    const images: Array<{ type: 'image'; data: string; mimeType: string; name: string }> = [];
    const docs: { type: 'document'; name: string; mimeType: string; text: string }[] = [];
    const nonImageNames: string[] = [];

    for (const f of attachedFiles) {
      if (isImage(f)) {
        try {
          images.push({ type: 'image', data: await fileToBase64(f), mimeType: f.type, name: f.name });
        } catch {
          // ignore bad file
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

    // Build final text (explicit, no precedence pitfalls)
    let finalText = text;
    if (nonImageNames.length) {
      const label = nonImageNames.map((n) => `[File attached: ${n}]`).join('\n');
      finalText = finalText ? `${finalText}\n\n${label}` : label;
    }

    // Clear after reading
    clearAll();

    await sendMessage(finalText, images.length ? images : undefined, docs);
  }, [message, attachedFiles, sendMessage, clearAll]);

  // Optional: react to triggers / external session selection
  useEffect(() => {
    if (newChatTrigger && newChatTrigger > 0 && startNewChat) startNewChat();
  }, [newChatTrigger, startNewChat]);

  useEffect(() => {
    if (selectedSession && loadSession) loadSession(selectedSession);
  }, [selectedSession, loadSession]);

  return (
    <div className="flex-1 flex flex-col">
      <ChatHeader />

      <div className="flex-1 flex flex-col">
        {messages.length <= 1 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="max-w-4xl w-full">
              <WelcomeHero />
              <SuggestedQuestions items={suggested} onPick={onPickQuick} disabled={isLoading} />
            </div>
          </div>
        ) : (
          <MessagesList messages={messages} isLoading={isLoading} />
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
        voice={voiceAPI}
         onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();            // or handleSend()
    }
  }}
      />

      <VoiceMode isOpen={isVoiceModeOpen} onClose={() => setIsVoiceModeOpen(false)} />
    </div>
  );
}
