import { Mic, Pause, Play, Radio, Paperclip, X } from "lucide-react";

export function IconRail({
  fileInputRef,
  onPickFiles,
  onOpenVoiceMode,
  voice,
  isTranscribing,
  sttUiActive,
  setSttUiActive,
}: {
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPickFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenVoiceMode: () => void;
  voice: {
    isRecording: boolean;
    isPaused: boolean;
    setIsPaused: (b: boolean) => void;
    start: () => void;
    cancel: () => void;
    end: () => Promise<void> | void;
    speechSupported: boolean;
  };
  isTranscribing: boolean;
  sttUiActive: boolean;
  setSttUiActive: (b: boolean) => void;
}) {
  const { isPaused, setIsPaused, start, cancel, speechSupported } = voice;

  const showSttControls = sttUiActive;

  const handleStart = () => {
    setSttUiActive(true);
    start();
  };

  const handleCancel = () => {
    setSttUiActive(false);
    cancel();
  };

  return (
    <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2">
      <input type="file" ref={fileInputRef} onChange={onPickFiles} multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="hidden h-8 w-8 sm:h-9 sm:w-9 rounded-full items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition"
        aria-label="Attach files"
      >
        <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <button
        onClick={onOpenVoiceMode}
        className="hidden group h-8 w-auto sm:h-9 sm:w-auto rounded-full items-center justify-center gap-1.5 sm:gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 active:scale-[0.98] transition px-2 sm:px-3"
        aria-label="Voice mode"
      >
        <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline text-xs font-medium text-purple-600 group-hover:text-purple-700">Audio</span>
      </button>

      {!showSttControls ? (
        <button
          onClick={handleStart}
          disabled={!speechSupported}
          className={`group h-8 sm:h-9 rounded-full flex items-center justify-center gap-1.5 sm:gap-2 transition px-2 sm:px-3 ${
            !speechSupported
              ? "text-slate-300 cursor-not-allowed bg-slate-100"
              : "text-slate-600 hover:text-sky-600 hover:bg-sky-50 active:scale-[0.98]"
          }`}
          aria-label="Start voice recording"
        >
          <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline text-xs font-medium text-slate-600 group-hover:text-sky-600">Speech to text</span>
        </button>
      ) : (
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="sm:flex h-9 w-9 rounded-full text-sky-700 hover:bg-sky-50 items-center justify-center transition"
            aria-label={isPaused ? "Resume recording" : "Pause recording"}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>

          <button
            onClick={handleCancel}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-500 hover:bg-slate-600 text-white transition flex items-center justify-center"
            aria-label="Cancel recording"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <span className="ml-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}
