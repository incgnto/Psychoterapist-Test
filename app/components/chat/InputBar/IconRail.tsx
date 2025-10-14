import { Mic, Pause, Play, Radio, Paperclip, X, Check } from "lucide-react";

export function IconRail({
  fileInputRef,
  onPickFiles,
  onOpenVoiceMode,
  voice,
  isTranscribing,
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
    end: () => void;
    speechSupported: boolean;
  };
  isTranscribing: boolean;
}) {
  const { isRecording, isPaused, setIsPaused, start, cancel, end, speechSupported } = voice;

  return (
    <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2">
      <input type="file" ref={fileInputRef} onChange={onPickFiles} multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" />
      <button onClick={() => fileInputRef.current?.click()} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition" aria-label="Attach files">
        <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      <button onClick={onOpenVoiceMode} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-purple-600 hover:text-purple-700 hover:bg-purple-50 active:scale-[0.98] transition" aria-label="Voice mode">
        <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      {!isRecording ? (
        <button onClick={start} disabled={!speechSupported} className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center transition ${!speechSupported ? "text-slate-300 cursor-not-allowed bg-slate-100" : "text-slate-600 hover:text-sky-600 hover:bg-sky-50 active:scale-[0.98]"}`} aria-label="Start voice recording">
          <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      ) : (
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button onClick={() => setIsPaused(!isPaused)} className="hidden sm:flex h-9 w-9 rounded-full text-sky-700 hover:bg-sky-50 items-center justify-center transition" aria-label={isPaused ? "Resume recording" : "Pause recording"}>
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button onClick={cancel} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-500 hover:bg-slate-600 text-white transition flex items-center justify-center" aria-label="Cancel recording">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={end} disabled={isTranscribing} className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full text-white transition flex items-center justify-center ${isTranscribing ? "bg-sky-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`} aria-label="End recording">
            {isTranscribing ? <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <span className="ml-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}
