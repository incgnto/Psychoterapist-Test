export function VoiceError({ message, retry }: { message: string; retry?: () => void; }) {
  if (!message) return null;
  return (
    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-600 font-medium">{message}</p>
      {retry && (
        <button onClick={retry} className="mt-2 text-xs underline hover:no-underline font-medium">
          Try again
        </button>
      )}
    </div>
  );
}

export function VoiceStatus({ recording, transcribing }: { recording: boolean; transcribing: boolean; }) {
  if (!recording && !transcribing) return null;
  return (
    <div className="mt-2 p-3 bg-sky-50 border border-sky-200 rounded-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-sky-700 flex items-center gap-2">
          <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
          {transcribing ? 'Converting speech to text…' : 'Recording continuously… Keep speaking'}
        </p>
        {!transcribing && <p className="text-xs text-sky-600">Use Cancel (✗) or End (✓) to stop</p>}
      </div>
    </div>
  );
}
