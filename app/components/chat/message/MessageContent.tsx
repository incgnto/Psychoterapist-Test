'use client';

import FormattedText from './FormattedText';

export function MessageContent({ content }: { content: string }) {
  const paragraphs = content.split('\n\n').filter((p) => p.trim());

  return (
    <div className="space-y-3 sm:space-y-4">
      {paragraphs.map((p, i) => {
        const infoBlock = p.includes('**Before we continue**');
        const stepBlock = p.includes('**Next step:**');
        const noteBlock = p.includes('🧠') || p.includes('📝') || p.includes('💭');

        const wrapper = infoBlock
          ? 'p-3 bg-sky-50 border-l-4 border-sky-400 rounded-r-lg'
          : stepBlock
          ? 'p-3 bg-emerald-50 border-l-4 border-emerald-400 rounded-r-lg'
          : noteBlock
          ? 'p-3 bg-slate-50 ring-1 ring-slate-200 rounded-lg'
          : '';

        return (
          <div key={i} className={wrapper}>
            <FormattedText text={p} />
          </div>
        );
      })}
    </div>
  );
}
