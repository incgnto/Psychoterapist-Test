'use client';

import { Send } from 'lucide-react';
import { FilePreview } from './FilePreview';
import { IconRail } from './IconRail';
import React from 'react';

export interface InputBarProps {
  message: string;
  setMessage: (v: string) => void;

  attachedFiles: File[];
  onRemoveFile: (i: number) => void;

  onSend: () => void;
  isLoading: boolean;

  isDragOver: boolean;
  setIsDragOver: (b: boolean) => void;

  fileInputRef: React.RefObject<HTMLInputElement>;
  onPickFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropFiles: (e: React.DragEvent) => void;

  voice: any;

  /** Optional: Enter to send (Shift+Enter for newline) */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function InputBar({
  message,
  setMessage,
  attachedFiles,
  onRemoveFile,
  onSend,
  isLoading,
  isDragOver,
  setIsDragOver,
  fileInputRef,
  onPickFiles,
  onDropFiles,
  voice,
  onKeyDown, // <-- optional
}: InputBarProps) {
  return (
    <div className="sticky bottom-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-t border-gray-200 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <FilePreview files={attachedFiles} onRemove={onRemoveFile} />

        <div
          className={`flex items-center gap-2 sm:gap-3 rounded-xl border ${
            isDragOver
              ? 'bg-sky-50 border-sky-200 ring-2 ring-sky-300/60'
              : 'bg-white border-slate-200'
          } transition-colors`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            onDropFiles(e);
            setIsDragOver(false);
          }}
        >
          {/* Textarea + icon rail */}
          <div className="relative flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onKeyDown}             
              rows={1}
              placeholder={isDragOver ? 'Drop files here...' : 'Type what’s on your mind…'}
              className="block w-full resize-none bg-transparent px-3 sm:px-4 py-[10px] sm:py-3 pr-28 sm:pr-40 text-[15px] sm:text-base leading-6 text-slate-800 placeholder:text-slate-400 focus:outline-none"
              style={{ minHeight: '44px', maxHeight: '160px' }}
              aria-label="Message input"
            />

            <IconRail
              fileInputRef={fileInputRef}
              onPickFiles={onPickFiles}
              onOpenVoiceMode={() => voice?.onOpenVoiceMode?.()}
              voice={voice}
              isTranscribing={voice?.isTranscribing}
            />
          </div>

          {/* Send */}
          <button
            onClick={onSend}
            disabled={(!message.trim() && attachedFiles.length === 0) || isLoading}
            className="flex-shrink-0 h-11 sm:h-12 px-3 sm:px-4 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
