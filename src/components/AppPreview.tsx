/**
 * Two phone frames showing what the signed-in app looks like (creator Home and an order tracker).
 * Built in HTML rather than screenshots: crisp at any size, tiny to download, and it never shows a real member's data.
 * Everything inside is example data and is labelled as such.
 */
function Phone({ label, children, tilt }: { label: string; children: React.ReactNode; tilt: string }) {
  return (
    <figure className={`lift relative mx-auto w-full max-w-[300px] ${tilt}`}>
      <div className="rounded-[40px] border-[7px] border-ink bg-ink shadow-[12px_14px_0_rgba(21,19,31,.08)]">
        <div className="relative overflow-hidden rounded-[33px] bg-[#f7f4ee]">
          <div aria-hidden="true" className="mx-auto mt-2 h-[22px] w-[92px] rounded-full bg-ink" />
          <div className="px-4 pb-6 pt-3">{children}</div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-sm font-semibold text-ink-2">{label}</figcaption>
    </figure>
  );
}

const panel = "rounded-2xl border border-black/[.08] bg-white p-3.5";

export default function AppPreview() {
  const bars = [2, 3, 1, 4, 3, 5, 4, 6, 5, 7, 6, 9, 8, 11];
  return (
    <div className="relative grid gap-12 sm:grid-cols-2 sm:gap-8" aria-label="Example screens from the Clouta app">
      <span className="sticker absolute left-1/2 top-[-18px] z-[2] -translate-x-1/2 rounded-md bg-[#FFC83D] px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-wide text-ink shadow-[0_2px_0_rgba(21,19,31,.25)]">
        Example
      </span>
      <Phone label="Your Home: what to do next, and how your shop is doing" tilt="sm:-rotate-[2deg]">
        <p className="font-display text-[26px] leading-tight">Hi, Maya</p>
        <p className="text-[11px] text-ink-2">Here&apos;s your week.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            ["Shop views", "312", "▲ 24%"],
            ["Earned", "$540", "▲ 3 orders"],
          ].map(([l, v, d]) => (
            <div key={l} className={panel}>
              <p className="text-[10px] font-bold">{l}</p>
              <p className="tabular text-[22px] font-extrabold tracking-[-0.03em]">{v}</p>
              <p className="text-[10px] font-semibold text-ok">{d}</p>
            </div>
          ))}
        </div>
        <div className={`${panel} mt-2`}>
          <div className="flex h-14 items-end gap-[3px]" aria-hidden="true">
            {bars.map((b, i) => (
              <div key={i} className="flex-1 rounded-t-[3px] bg-[#5B3DF5]" style={{ height: `${(b / 11) * 100}%` }} />
            ))}
          </div>
          <p className="mt-1 text-[10px] text-ink-2">Views, last 14 days</p>
        </div>
        <div className={`${panel} mt-2`}>
          <p className="text-[10px] font-bold">Needs your attention</p>
          <div className="mt-2 rounded-xl border border-[#F2B8C6] bg-[#FFF5F7] px-2.5 py-2">
            <p className="text-[11px] font-semibold">Post for Glow Co is due Thu</p>
            <p className="text-[10px] text-body">TikTok video · $120 held for you</p>
          </div>
          <div className="mt-1.5 rounded-xl border border-black/10 px-2.5 py-2">
            <p className="text-[11px] font-semibold">New message from Peak Water</p>
            <p className="text-[10px] text-body">&quot;Could you do a story too?&quot;</p>
          </div>
        </div>
      </Phone>
      <Phone label="Every order, step by step, with the money held safely" tilt="sm:rotate-[2deg] sm:mt-10">
        <p className="text-[10px] font-bold text-ink-2">Order #1042</p>
        <p className="font-display text-[24px] leading-tight">TikTok video for Glow Co</p>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-ok-bg px-3 py-2.5">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-ok text-[13px] text-white">🔒</span>
          <span>
            <span className="block text-[12px] font-bold text-ok">$120 held by Clouta</span>
            <span className="block text-[10px] text-body">Released when the post is approved</span>
          </span>
        </div>
        <ol className={`${panel} mt-2 flex flex-col gap-2.5`}>
          {[
            ["Paid up front", "Mon", "done"],
            ["Creator started", "Tue", "done"],
            ["Post submitted", "Thu", "now"],
            ["Brand approves", "within 3 days", ""],
            ["Creator paid", "$114", ""],
          ].map(([t, d, s]) => (
            <li key={t} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`grid size-5 flex-none place-items-center rounded-full text-[10px] font-bold ${s === "done" ? "bg-ok text-white" : s === "now" ? "bg-[#5B3DF5] text-white" : "border border-black/20"}`}
              >
                {s === "done" ? "✓" : ""}
              </span>
              <span className={`flex-1 text-[11px] ${s === "now" ? "font-bold" : s === "done" ? "text-ink-2" : ""}`}>{t}</span>
              <span className="text-[10px] text-ink-2">{d}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="rounded-xl bg-[#5B3DF5] py-2 text-center text-[11px] font-bold text-white shadow-[0_2px_0_#2c1896]">Approve</span>
          <span className="rounded-xl border border-black/15 bg-white py-2 text-center text-[11px] font-bold text-[#4a2fd0]">Ask for a change</span>
        </div>
      </Phone>
    </div>
  );
}
