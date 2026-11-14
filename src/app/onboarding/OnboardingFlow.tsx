"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SocialsEditor from "@/components/SocialsEditor";
import { Icon } from "@/components/Icons";

type Role = "creator" | "brand";
const STEPS = ["Account type", "Your details", "Link socials"];

function ageFrom(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
}
function suggestHandle(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);
}

export default function OnboardingFlow({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [birth, setBirth] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [founding, setFounding] = useState(false);

  const age = birth ? ageFrom(birth) : null;
  // Clear a stale error as soon as the person edits anything.
  useEffect(() => setError(null), [role, name, handle, birth, guardianName, guardianEmail]);
  const isMinor = age !== null && age >= 13 && age < 18;

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role) return setStep(0);
    if (!name.trim()) return setError("Enter your name or brand name.");
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) return setError("Handles use 3 to 30 lowercase letters, numbers or underscores.");
    if (age === null) return setError("Enter your date of birth.");
    if (age < 13) return setError("You must be at least 13 to use Clouta.");
    if (role === "brand" && age < 18) return setError("Brand accounts must be run by someone 18 or older.");
    if (isMinor && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guardianEmail)) return setError("Add a parent or guardian email.");

    setBusy(true);
    const { error } = await supabase.rpc("complete_onboarding", {
      p_role: role,
      p_display_name: name.trim(),
      p_handle: handle,
      p_birth_date: birth,
      p_guardian_name: isMinor ? guardianName : null,
      p_guardian_email: isMinor ? guardianEmail : null,
    });
    if (error) {
      setBusy(false);
      return setError(error.message || "Couldn't save your details.");
    }
    const { data } = await supabase.from("profiles").select("is_founding").eq("id", userId).single();
    setFounding(Boolean(data?.is_founding));
    setBusy(false);
    setStep(2);
  }

  return (
    <div>
      <ol className="flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-violet-deep" : "bg-black/[.08]"}`} />
            <p className={`mt-2 text-xs font-semibold ${i === step ? "text-ink" : "text-ink-2"}`} aria-current={i === step ? "step" : undefined}>
              {s}
            </p>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="mt-8">
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">How will you use Clouta?</h1>
          <p className="mt-1.5 text-[15px] text-body">Signed in as {email}. You can&apos;t change this later.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
            {(
              [
                ["creator", "I'm a creator", "Sell brand deals from your storefront and get paid securely.", "user"],
                ["brand", "I'm a brand", "Find creators, book collabs and only release payment on approval.", "cash"],
              ] as const
            ).map(([value, title, body, icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={role === value}
                onClick={() => setRole(value)}
                className={`flex min-h-[132px] flex-col gap-2 rounded-2xl border-[1.5px] p-5 text-left transition ${
                  role === value ? "border-violet-deep bg-[#F7F5FF] shadow-[0_0_0_4px_rgba(108,71,255,.12)]" : "border-black/10 bg-white hover:border-black/20"
                }`}
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[#F3F0FF] text-violet-deep">
                  <Icon name={icon} />
                </span>
                <span className="font-bold">{title}</span>
                <span className="text-sm leading-relaxed text-body">{body}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn mt-6 min-h-12 w-full text-base" disabled={!role} onClick={() => setStep(1)}>
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={saveDetails} noValidate className="mt-8 flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.03em]">{role === "brand" ? "About your brand" : "About you"}</h1>
            <p className="mt-1.5 text-[15px] text-body">This is how you&apos;ll appear on Clouta.</p>
          </div>
          <Field label={role === "brand" ? "Brand name" : "Display name"} id="ob-name">
            <input
              id="ob-name"
              value={name}
              maxLength={60}
              autoComplete="name"
              onChange={(e) => {
                setName(e.target.value);
                if (!handleTouched) setHandle(suggestHandle(e.target.value));
              }}
              className="input"
            />
          </Field>
          <Field label="Handle" id="ob-handle" hint={`clouta.vercel.app/${role === "brand" ? "b" : "c"}/${handle || "yourname"}`}>
            <div className="flex items-center rounded-[12px] border border-black/12 bg-white focus-within:border-violet focus-within:shadow-[0_0_0_4px_rgba(108,71,255,.16)]">
              <span className="pl-4 text-ink-2">@</span>
              <input
                id="ob-handle"
                value={handle}
                maxLength={30}
                onChange={(e) => {
                  setHandleTouched(true);
                  setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                }}
                className="min-h-12 flex-1 rounded-[12px] bg-transparent px-1 text-base focus:outline-none"
              />
            </div>
          </Field>
          <p className="-mt-1 flex items-start gap-2 rounded-xl bg-black/[.04] px-3.5 py-2.5 text-[13px] text-body">
            <span aria-hidden="true">🔒</span>
            <span>
              <b className="text-ink">Choose carefully:</b> your {role === "brand" ? "brand name" : "name"} and handle are permanent once you continue, so brands and
              creators always know who they&apos;re dealing with. Your handle is also your profile link.
            </span>
          </p>
          <Field label="Date of birth" id="ob-birth" hint="Kept private. Never shown on your profile.">
            <input id="ob-birth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className="input" max={new Date().toISOString().slice(0, 10)} />
          </Field>

          {isMinor && role === "creator" && (
            <div className="rounded-2xl border border-[#F2D58A] bg-[#FFF9E8] p-4">
              <p className="text-sm font-bold text-[#6B4700]">Young creators are welcome!</p>
              <p className="mt-1 text-sm leading-relaxed text-[#6B4700]">
                Because you&apos;re under 18, a parent or guardian needs to know you&apos;re joining. They&apos;ll manage payouts
                when payments launch and get copies of order emails.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Parent or guardian name" id="ob-gname">
                  <input id="ob-gname" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="input" maxLength={80} />
                </Field>
                <Field label="Their email" id="ob-gemail">
                  <input id="ob-gemail" type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} className="input" />
                </Field>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-[12px] bg-err-bg px-4 py-3 text-sm font-semibold text-err">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" className="btn btn-ghost min-h-12 px-5" onClick={() => setStep(0)}>
              Back
            </button>
            <button type="submit" className="btn min-h-12 flex-1 text-base" disabled={busy}>
              {busy ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="mt-8 flex flex-col gap-5">
          {founding && (
            <div className="chip-pop flex items-center gap-3 rounded-2xl border border-[#F2D58A] bg-[#FFF9E8] p-4">
              <span className="grid size-10 flex-none place-items-center rounded-xl bg-[linear-gradient(150deg,#F5C24B,#C98A00)] text-white">
                <Icon name="star" />
              </span>
              <div>
                <p className="font-bold text-[#6B4700]">You&apos;re a Founding Creator</p>
                <p className="text-sm text-[#6B4700]">Half fees for life and the Founding badge are now on your account.</p>
              </div>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Link your socials</h1>
            <p className="mt-1.5 text-[15px] text-body">
              {role === "brand" ? "Optional: add your brand's accounts so creators can check you out." : "Brands use these to see your reach. Add at least one."}
            </p>
          </div>
          <SocialsEditor userId={userId} initial={[]} />
          <button type="button" className="btn min-h-12 text-base" onClick={() => router.push(role === "brand" ? "/brand?welcome=1" : "/dashboard?welcome=1")}>
            Finish setup
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-2">{hint}</p>}
    </div>
  );
}
