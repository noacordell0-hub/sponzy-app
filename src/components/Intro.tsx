/**
 * Branded intro screen. Pure CSS, so it plays and clears itself even before JavaScript loads.
 * An inline script in the layout adds `no-intro` to <html> on repeat views in the same visit.
 */
export function Intro() {
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro-stars" />
      <i className="intro-shoot" />
      <div className="intro-center">
        <span className="intro-ring" />
        <svg className="intro-logo" width="96" height="96" viewBox="0 0 44 44">
          <defs>
            <linearGradient id="intro-lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6C47FF" />
              <stop offset="1" stopColor="#9B5CFF" />
            </linearGradient>
          </defs>
          <path d="M22 3C32 3 40 10 40 20s-8 17-18 17h-2l-8 6v-8C7 32 4 27 4 20 4 10 12 3 22 3z" fill="url(#intro-lg)" />
          <path className="intro-c" d="M27.5 14.5A8 8 0 1 0 27.5 25.5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <span className="intro-word">Clouta</span>
      </div>
    </div>
  );
}
