'use client';

export default function BackHomeLink({ href }: { href: string }) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    const ok = window.confirm('Are you sure you want to go back to the main site?');
    if (!ok) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <a
      href={href}
      onClick={onClick}
      className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                 text-slate-600 hover:text-slate-800 hover:bg-slate-50/80
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 transition"
      title="Go back to the main website"
    >
      Logout
    </a>
  );
}
