"use client";

/** Accessible on/off switch with a visible label row. */
export function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="text-xs text-ink-2">{hint}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="switch min-h-7" />
    </div>
  );
}
