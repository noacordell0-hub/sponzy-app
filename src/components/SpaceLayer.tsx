/** Decorative background: starfield, shooting star, ringed planet, moon. Never interactive. */
export function SpaceLayer() {
  return (
    <div aria-hidden="true">
      <div className="stars" />
      <div className="shooting-star" />
      <svg className="float pointer-events-none fixed -right-10 top-24 z-0 hidden w-56 opacity-80 md:block" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="planet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b9a8ff" />
            <stop offset="1" stopColor="#6c47ff" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="104" rx="92" ry="22" fill="none" stroke="#ffc83d" strokeOpacity=".55" strokeWidth="5" />
        <circle cx="100" cy="100" r="52" fill="url(#planet)" />
        <path d="M8 104a92 22 0 0 0 184 0" fill="none" stroke="#ffc83d" strokeOpacity=".8" strokeWidth="5" />
        <circle cx="84" cy="84" r="8" fill="#fff" fillOpacity=".25" />
      </svg>
      <svg className="pointer-events-none fixed bottom-24 left-6 z-0 hidden w-16 opacity-70 lg:block" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="24" fill="#ece8ff" />
        <circle cx="22" cy="24" r="5" fill="#d8d0ff" />
        <circle cx="36" cy="38" r="3.5" fill="#d8d0ff" />
      </svg>
    </div>
  );
}

/** Blip the alien, peeking from the bottom-right corner. Hidden on phone layouts. */
export function Blip({ message }: { message: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed bottom-0 right-6 z-10 hidden items-end gap-2 lg:flex">
      <div className="blip mb-16 max-w-48 rounded-[14px] rounded-br-sm bg-white px-3 py-2 text-sm font-bold text-ink shadow-lg ring-1 ring-black/5">
        {message}
      </div>
      <svg className="blip w-20" viewBox="0 0 80 80">
        <line x1="28" y1="18" x2="22" y2="4" stroke="#3ddc97" strokeWidth="3" strokeLinecap="round" />
        <line x1="52" y1="18" x2="58" y2="4" stroke="#3ddc97" strokeWidth="3" strokeLinecap="round" />
        <circle cx="22" cy="4" r="4" fill="#ffc83d" />
        <circle cx="58" cy="4" r="4" fill="#ffc83d" />
        <path d="M8 80V44a32 32 0 0 1 64 0v36z" fill="#3ddc97" />
        <ellipse cx="30" cy="42" rx="7" ry="9" fill="#15131f" />
        <ellipse cx="50" cy="42" rx="7" ry="9" fill="#15131f" />
        <circle cx="32" cy="39" r="2.5" fill="#fff" />
        <circle cx="52" cy="39" r="2.5" fill="#fff" />
        <path d="M33 60q7 6 14 0" stroke="#15131f" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
