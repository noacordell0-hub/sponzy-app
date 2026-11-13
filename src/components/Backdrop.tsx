/**
 * Quiet space backdrop: a few shooting stars plus faint planets.
 * Decorative only: hidden from screen readers, never clickable, and still under reduced motion.
 */
const SHOOTING = [
  { top: "6%", left: "72%", delay: "0.5s", dur: "6s" },
  { top: "18%", left: "98%", delay: "2.5s", dur: "7s" },
  { top: "34%", left: "84%", delay: "4s", dur: "6.5s" },
  { top: "48%", left: "102%", delay: "1.5s", dur: "8s" },
  { top: "62%", left: "76%", delay: "5.5s", dur: "7s" },
  { top: "78%", left: "96%", delay: "3.2s", dur: "6s" },
  { top: "12%", left: "40%", delay: "6.8s", dur: "7.5s" },
  { top: "26%", left: "60%", delay: "1s", dur: "5.5s" },
  { top: "42%", left: "50%", delay: "3.8s", dur: "6.2s" },
  { top: "56%", left: "92%", delay: "0.2s", dur: "5.8s" },
  { top: "70%", left: "58%", delay: "2s", dur: "6.6s" },
  { top: "88%", left: "80%", delay: "4.6s", dur: "5.4s" },
  { top: "3%", left: "90%", delay: "7.4s", dur: "6.8s" },
  { top: "95%", left: "45%", delay: "6s", dur: "6s" },
];

/** Page-wide starfield: twinkling dots plus frequent shooting stars, fixed behind everything. */
export function ShootingStars() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="starfield starfield-a" />
      <div className="starfield starfield-b" />
      <div className="starfield starfield-c" />
      {SHOOTING.map((s, i) => (
        <i key={i} className="shoot" style={{ top: s.top, left: s.left, animationDelay: s.delay, animationDuration: s.dur }} />
      ))}
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
