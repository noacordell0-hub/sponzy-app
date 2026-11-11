/**
 * Quiet space backdrop: a few shooting stars plus faint planets.
 * Decorative only: hidden from screen readers, never clickable, and still under reduced motion.
 */
export function ShootingStars() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <i className="shoot" style={{ top: "8%", left: "78%", animationDelay: "1s" }} />
      <i className="shoot" style={{ top: "26%", left: "96%", animationDelay: "5.5s", animationDuration: "11s" }} />
      <i className="shoot" style={{ top: "52%", left: "88%", animationDelay: "9s", animationDuration: "12s" }} />
    </div>
  );
}

export function HeroPlanets() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[760px] overflow-hidden">
      {/* Ringed planet, top right */}
      <svg className="drift absolute -right-24 top-16 hidden w-[340px] opacity-[0.16] md:block" viewBox="0 0 300 300">
        <defs>
          <radialGradient id="bd-planet" cx="32%" cy="28%" r="80%">
            <stop offset="0" stopColor="#B7A8F5" />
            <stop offset=".5" stopColor="#5E45D6" />
            <stop offset="1" stopColor="#1E1457" />
          </radialGradient>
        </defs>
        <ellipse cx="150" cy="150" rx="132" ry="30" transform="rotate(-14 150 150)" fill="none" stroke="#6C47FF" strokeWidth="3" />
        <circle cx="150" cy="150" r="84" fill="url(#bd-planet)" />
        <path d="M22 182A132 30 -14 0 0 278 118" fill="none" stroke="#6C47FF" strokeWidth="3" />
      </svg>
      {/* Small moon, lower left */}
      <svg className="drift-slow absolute left-[2%] top-[690px] hidden w-20 opacity-[0.22] lg:block" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r="30" fill="#CFCAE3" />
        <circle cx="33" cy="35" r="6" fill="#B9B3D3" />
        <circle cx="51" cy="51" r="8" fill="#B9B3D3" />
      </svg>
      {/* Tiny blue planet */}
      <svg className="drift absolute left-[44%] top-10 hidden w-8 opacity-[0.25] md:block" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r="12" fill="#2E8FC4" />
      </svg>
    </div>
  );
}
