type Props = { items: string[]; onPick: (q: string) => void; disabled?: boolean };

export function SuggestedQuestions({ items, onPick, disabled }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-8">
      {items.map((q, i) => (
        <button
          key={i}
          onClick={() => onPick(q)}
          disabled={disabled}
          aria-label={q}
          className="group w-full p-4 sm:p-5 text-left md:text-center rounded-xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-all hover:bg-sky-50/60 hover:border-sky-200 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="block text-[15px] sm:text-base leading-relaxed text-slate-700 transition-colors group-hover:text-slate-800">
            {q}
          </span>
        </button>
      ))}
    </div>
  );
}
