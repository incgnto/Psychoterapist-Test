'use client';

export default function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|https?:\/\/[^\s]+)/g);

  return (
    <p className="text-[15px] sm:text-base leading-relaxed text-slate-800">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('http')) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-700 hover:text-sky-800 underline underline-offset-2 decoration-sky-300 break-all transition-colors"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
