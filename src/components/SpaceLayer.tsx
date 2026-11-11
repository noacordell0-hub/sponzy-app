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
        <b className="text-violet-deep">Blip:</b> {message}
      </div>
      <svg className="blip w-16 overflow-visible" viewBox="0 0 64 64">
        <path d="M23 16L18 5" stroke="#6BB892" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="18" cy="4.5" r="3.6" fill="#F2CF7A" />
        <path d="M41 16L46 5" stroke="#6BB892" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="46" cy="4.5" r="3.6" fill="#F2CF7A" />
        <ellipse cx="32" cy="38" rx="26" ry="24" fill="#8DD6B0" />
        <ellipse cx="32" cy="15" rx="7" ry="4.5" fill="#8DD6B0" />
        <ellipse cx="32" cy="49" rx="15" ry="10" fill="#D3EEDF" />
        <ellipse cx="13" cy="59" rx="6" ry="4.5" fill="#7FCBA2" />
        <ellipse cx="51" cy="59" rx="6" ry="4.5" fill="#7FCBA2" />
        <ellipse cx="22" cy="35" rx="7.5" ry="9" fill="#1B1B26" />
        <ellipse cx="42" cy="35" rx="7.5" ry="9" fill="#1B1B26" />
        <circle cx="24.5" cy="31" r="2.7" fill="#fff" />
        <circle cx="20" cy="38" r="1.2" fill="#fff" />
        <circle cx="44.5" cy="31" r="2.7" fill="#fff" />
        <circle cx="40" cy="38" r="1.2" fill="#fff" />
        <ellipse cx="13" cy="44" rx="4" ry="2.6" fill="#FF7FA8" opacity=".22" />
        <ellipse cx="51" cy="44" rx="4" ry="2.6" fill="#FF7FA8" opacity=".22" />
        <path d="M28.5 46q3.5 2.6 7 0" fill="none" stroke="#1B1B26" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Sponzy logo mark from the prototype: speech bubble with an S and a gold sparkle. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <defs>
        <linearGradient id="sponzy-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6C47FF" />
          <stop offset="1" stopColor="#FF5F8F" />
        </linearGradient>
      </defs>
      <path d="M22 3C32 3 40 10 40 20s-8 17-18 17h-2l-8 6v-8C7 32 4 27 4 20 4 10 12 3 22 3z" fill="url(#sponzy-lg)" />
      <path d="M27 15c-5-3-12 0-10.5 4.5S28 22 27 27s-7 5-11 2" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M35 2l1.7 4.8L41.5 8.5l-4.8 1.7L35 15l-1.7-4.8L28.5 8.5l4.8-1.7z" fill="#FFC83D" />
    </svg>
  );
}
