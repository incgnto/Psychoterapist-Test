'use client';

export default function TabPill({ label, active, onClick }) {
  const base =
    'px-3.5 py-2 rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300';
  const activeCls = 'bg-white text-slate-900 shadow-sm border border-slate-200';
  const inactiveCls = 'text-slate-600 hover:text-slate-800 hover:bg-slate-50/80 border border-transparent';
  return (
    <button onClick={onClick} aria-selected={!!active} className={`${base} ${active ? activeCls : inactiveCls}`}>
      {label}
    </button>
  );
}
