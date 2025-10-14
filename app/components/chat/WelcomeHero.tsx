export function WelcomeHero() {
  return (
    <div className="text-center mb-8 sm:mb-10">
      <div className="flex items-center justify-center mb-5">
        <div className="group relative h-12 w-12 sm:h-16 sm:w-16 cursor-default">
          <span className="pointer-events-none absolute -inset-2 rounded-full bg-sky-300/25 blur-xl motion-safe:animate-glow-slow transition-all duration-300 group-hover:bg-sky-400/25" />
          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-sky-300/25 motion-safe:animate-ripple-slow" />
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-300 via-sky-400 to-teal-400 shadow-[0_6px_18px_rgba(14,165,233,0.25)] motion-safe:animate-breathe-slow transition-all duration-300 group-hover:animate-breathe-fast group-hover:scale-[1.06] group-hover:brightness-95 group-hover:saturate-110" />
          <span className="pointer-events-none absolute inset-0 rounded-full bg-white/25 mix-blend-overlay" />
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/60" />
        </div>
      </div>
      <h1 className="text-[20px] sm:text-[28px] font-semibold text-slate-800 tracking-tight">
        Hi—how are you feeling today?
      </h1>
      <p className="mt-2 text-sm sm:text-base text-slate-600">
        I’m here to listen. Share as little or as much as you like.
      </p>
    </div>
  );
}
