"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS, PLATFORM_KEYS, type PlatformKey } from "@/lib/platforms";
import { money } from "@/lib/format";
import type { Post, Service } from "@/lib/market";

type Draft = { name: string; price: string; turnaround: string; revisions: number; includes: string; is_bundle: boolean };
const EMPTY: Draft = { name: "", price: "", turnaround: "5", revisions: 1, includes: "", is_bundle: false };
const TEMPLATES: Draft[] = [
  { name: "TikTok video", price: "", turnaround: "5", revisions: 1, includes: "One 30–60s video featuring your product, posted on my TikTok.", is_bundle: false },
  { name: "Instagram Reel", price: "", turnaround: "5", revisions: 1, includes: "One Reel featuring your product, posted on my Instagram.", is_bundle: false },
  { name: "Story shoutout", price: "", turnaround: "2", revisions: 0, includes: "3 Instagram Story frames with your link.", is_bundle: false },
  { name: "YouTube mention", price: "", turnaround: "7", revisions: 1, includes: "A 30–60s sponsored segment in my next video.", is_bundle: false },
];

export default function ShopEditor(props: {
  userId: string;
  handle: string;
  initialPost: Post | null;
  initialServices: Service[];
  socialPlatforms: PlatformKey[];
  /** Publishing needs at least one verified social account (enforced in the database too). */
  verification: "verified" | "pending" | "none";
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [post, setPost] = useState<Post | null>(props.initialPost);
  const [services, setServices] = useState<Service[]>(props.initialServices);
  const [bio, setBio] = useState(props.initialPost?.bio ?? "");
  const [platforms, setPlatforms] = useState<PlatformKey[]>(props.initialPost?.platforms ?? Array.from(new Set(props.socialPlatforms)));
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(props.initialServices.length === 0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function ensurePost(): Promise<Post | null> {
    if (post) return post;
    const { data, error } = await supabase.from("posts").insert({ creator_id: props.userId, bio: bio.trim() || null, platforms }).select().single<Post>();
    if (error || !data) {
      setMsg({ ok: false, text: "Couldn't create your shop. Please try again." });
      return null;
    }
    setPost(data);
    return data;
  }

  async function savePitch() {
    setMsg(null);
    setBusy(true);
    const p = await ensurePost();
    if (p) {
      const { error } = await supabase.from("posts").update({ bio: bio.trim() || null, platforms }).eq("id", p.id);
      setMsg(error ? { ok: false, text: "Couldn't save your pitch." } : { ok: true, text: "Pitch saved." });
    }
    setBusy(false);
  }

  async function saveService(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const price = Math.round(Number(draft.price) * 100);
    const turnaround = Number(draft.turnaround);
    if (!draft.name.trim()) return setMsg({ ok: false, text: "Give the service a name." });
    if (!Number.isFinite(price) || price < 500) return setMsg({ ok: false, text: "Prices start at $5." });
    if (price > 10_000_000) return setMsg({ ok: false, text: "Prices can be up to $100,000." });
    if (!Number.isInteger(turnaround) || turnaround < 1 || turnaround > 90) return setMsg({ ok: false, text: "Turnaround is 1 to 90 days." });

    setBusy(true);
    const p = await ensurePost();
    if (!p) return setBusy(false);
    const row = {
      name: draft.name.trim(),
      price_cents: price,
      turnaround_days: turnaround,
      revisions: draft.revisions,
      includes: draft.includes.trim() || null,
      is_bundle: draft.is_bundle,
    };
    const { error } = editingId
      ? await supabase.from("services").update(row).eq("id", editingId)
      : await supabase.from("services").insert({ ...row, post_id: p.id, position: services.length });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message.includes("up to 10") ? "You can list up to 10 services." : "Couldn't save that service." });
    const { data } = await supabase.from("services").select("*").eq("post_id", p.id).order("position").order("id");
    setServices((data as Service[]) ?? []);
    setDraft(EMPTY);
    setEditingId(null);
    setFormOpen(false);
    setMsg({ ok: true, text: editingId ? "Service updated." : "Service added." });
  }

  async function removeService(id: number) {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return setMsg({ ok: false, text: "Couldn't remove that service." });
    const remaining = services.filter((s) => s.id !== id);
    setServices(remaining);
    if (remaining.length === 0 && post?.published) await setPublished(false);
  }

  async function move(id: number, dir: -1 | 1) {
    const i = services.findIndex((s) => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= services.length) return;
    const next = [...services];
    [next[i], next[j]] = [next[j], next[i]];
    setServices(next);
    await Promise.all(next.map((s, idx) => supabase.from("services").update({ position: idx }).eq("id", s.id)));
  }

  async function setPublished(value: boolean) {
    setMsg(null);
    if (value && services.length === 0) return setMsg({ ok: false, text: "Add at least one service before publishing." });
    if (value && !bio.trim()) return setMsg({ ok: false, text: "Write a short pitch before publishing." });
    if (value && props.verification !== "verified") return setMsg({ ok: false, text: "Verify at least one social account before publishing your shop." });
    setBusy(true);
    const p = await ensurePost();
    if (!p) return setBusy(false);
    const { error } = await supabase.from("posts").update({ published: value, bio: bio.trim() || null, platforms }).eq("id", p.id);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: /verify/i.test(error.message) ? "Verify at least one social account before publishing your shop." : "Couldn't update your shop." });
    setPost({ ...p, published: value });
    setMsg({ ok: true, text: value ? "Your shop is live! Brands can now find you in Browse." : "Your shop is hidden from Browse." });
    router.refresh();
  }

  function edit(s: Service) {
    setEditingId(s.id);
    setDraft({ name: s.name, price: String(s.price_cents / 100), turnaround: String(s.turnaround_days), revisions: s.revisions, includes: s.includes ?? "", is_bundle: s.is_bundle });
    setFormOpen(true);
  }

  const published = Boolean(post?.published);
  const verified = props.verification === "verified";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        {/* Pitch */}
        <section className="panel flex flex-col gap-4 p-6" aria-labelledby="pitch-title">
          <h2 id="pitch-title" className="eyebrow">
            Your pitch
          </h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="shop-bio" className="text-sm font-semibold">
              What do you make, and why should brands work with you?
            </label>
            <textarea
              id="shop-bio"
              value={bio}
              maxLength={1000}
              onChange={(e) => setBio(e.target.value)}
              className="input min-h-[120px]"
              placeholder="I make quick, honest workout videos for busy people. My audience trusts my recommendations because I only promote what I use."
            />
            <p className="text-right text-xs text-ink-2">{bio.length}/1000</p>
          </div>
          <fieldset>
            <legend className="text-sm font-semibold">Platforms you post on</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PLATFORM_KEYS.map((k) => {
                const on = platforms.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPlatforms((ps) => (on ? ps.filter((x) => x !== k) : [...ps, k]))}
                    className={`min-h-10 rounded-full border px-3.5 text-sm font-semibold transition ${on ? "border-violet-deep bg-[#F3F0FF] text-violet-deep" : "border-black/10 bg-white text-body"}`}
                  >
                    {PLATFORMS[k].label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <button type="button" onClick={savePitch} disabled={busy} className="btn btn-ghost min-h-11 self-start px-5 text-sm">
            Save pitch
          </button>
        </section>

        {/* Services */}
        <section className="panel flex flex-col gap-4 p-6" aria-labelledby="svc-title">
          <div className="flex items-center justify-between">
            <h2 id="svc-title" className="eyebrow">
              Services ({services.length}/10)
            </h2>
            {!formOpen && services.length < 10 && (
              <button
                type="button"
                onClick={() => {
                  setDraft(EMPTY);
                  setEditingId(null);
                  setFormOpen(true);
                }}
                className="btn min-h-10 px-4 text-sm"
              >
                + Add service
              </button>
            )}
          </div>

          {services.length > 0 && (
            <ul className="divide-y divide-black/[.06] rounded-xl border border-black/[.08]">
              {services.map((s, i) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {s.name} {s.is_bundle && <span className="badge-violet ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold">Bundle</span>}
                    </p>
                    <p className="text-xs text-ink-2">
                      {s.turnaround_days}-day turnaround · {s.revisions} revision{s.revisions === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="font-bold">{money(s.price_cents)}</p>
                  <div className="flex items-center">
                    <button type="button" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label={`Move ${s.name} up`} className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-black/[.05] disabled:opacity-30">
                      ↑
                    </button>
                    <button type="button" onClick={() => move(s.id, 1)} disabled={i === services.length - 1} aria-label={`Move ${s.name} down`} className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-black/[.05] disabled:opacity-30">
                      ↓
                    </button>
                    <button type="button" onClick={() => edit(s)} className="min-h-9 px-2 text-sm font-semibold text-violet-deep">
                      Edit
                    </button>
                    <button type="button" onClick={() => removeService(s.id)} className="min-h-9 px-2 text-sm font-semibold text-err">
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {formOpen && (
            <form onSubmit={saveService} className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-[#FBFAFF] p-4 sm:p-5" noValidate>
              <p className="font-bold">{editingId ? "Edit service" : "New service"}</p>
              {!editingId && (
                <div>
                  <p className="text-xs font-semibold text-ink-2">Start from a template</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {TEMPLATES.map((t) => (
                      <button key={t.name} type="button" onClick={() => setDraft({ ...t, price: draft.price })} className="min-h-9 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-body hover:text-ink">
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <Field id="svc-name" label="Service name">
                  <input id="svc-name" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="input" placeholder="TikTok video" />
                </Field>
                <Field id="svc-price" label="Price (USD)">
                  <div className="flex items-center rounded-[12px] border border-black/12 bg-white focus-within:border-violet focus-within:shadow-[0_0_0_4px_rgba(108,71,255,.16)]">
                    <span className="pl-3 text-ink-2">$</span>
                    <input
                      id="svc-price"
                      value={draft.price}
                      onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/[^\d.]/g, "") })}
                      inputMode="decimal"
                      className="min-h-12 w-full rounded-[12px] bg-transparent px-1.5 text-base focus:outline-none"
                      placeholder="120"
                    />
                  </div>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="svc-days" label="Turnaround (days)">
                  <input id="svc-days" value={draft.turnaround} onChange={(e) => setDraft({ ...draft, turnaround: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className="input" />
                </Field>
                <Field id="svc-rev" label="Revisions included">
                  <select id="svc-rev" value={draft.revisions} onChange={(e) => setDraft({ ...draft, revisions: Number(e.target.value) })} className="input">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? "No revisions" : `${n} revision${n > 1 ? "s" : ""}`}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field id="svc-inc" label="What's included">
                <textarea id="svc-inc" value={draft.includes} maxLength={400} onChange={(e) => setDraft({ ...draft, includes: e.target.value })} className="input" placeholder="One 30–60s video featuring your product, posted on my TikTok with your link in the caption." />
              </Field>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium">
                <input type="checkbox" checked={draft.is_bundle} onChange={(e) => setDraft({ ...draft, is_bundle: e.target.checked })} className="size-[18px] accent-[#5B3DF5]" />
                This is a bundle of several deliverables
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="btn min-h-11 px-5 text-sm">
                  {busy ? "Saving…" : editingId ? "Save service" : "Add service"}
                </button>
                {(services.length > 0 || editingId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
                      setEditingId(null);
                      setDraft(EMPTY);
                    }}
                    className="btn btn-ghost min-h-11 px-5 text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Publish */}
      <aside className="panel flex flex-col gap-4 p-6 lg:sticky lg:top-24" aria-labelledby="pub-title">
        <h2 id="pub-title" className="eyebrow">
          Visibility
        </h2>
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${published ? "bg-ok" : "bg-[#C9A23A]"}`} aria-hidden="true" />
          <p className="font-bold">{published ? "Live in Browse" : "Draft"}</p>
        </div>
        <p className="text-sm text-body">
          {published ? "Brands can find your shop and see your prices." : "Only you can see your shop. Publish it when you've added a pitch and at least one service."}
        </p>
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className={bio.trim() ? "text-ok" : "text-ink-2"}>{bio.trim() ? "✓" : "○"} Pitch written</li>
          <li className={services.length > 0 ? "text-ok" : "text-ink-2"}>{services.length > 0 ? "✓" : "○"} At least one service</li>
          <li className={platforms.length > 0 ? "text-ok" : "text-ink-2"}>{platforms.length > 0 ? "✓" : "○"} Platforms chosen</li>
          <li className={verified ? "text-ok" : "text-ink-2"}>
            {verified ? "✓" : "○"} Social account verified {props.verification === "pending" && <span className="text-xs">(being checked)</span>}
          </li>
        </ul>
        {!verified && !published && (
          <div className="rounded-xl border border-[#E8D9A8] bg-[#FFF9E8] px-4 py-3 text-sm">
            <p className="font-bold text-ink">{props.verification === "pending" ? "We're checking your account" : "Verify an account to go live"}</p>
            <p className="mt-0.5 text-body">
              {props.verification === "pending"
                ? "Usually within a day. Your shop can go live as soon as you see ✓ Verified."
                : "Every creator on Clouta proves their account is theirs, so brands can trust the follower numbers. It takes 2 minutes."}
            </p>
            {props.verification === "none" && (
              <Link href="/settings/account#socials" className="mt-2 inline-block font-semibold text-violet-deep">
                Verify my account →
              </Link>
            )}
          </div>
        )}
        <button type="button" onClick={() => setPublished(!published)} disabled={busy || (!published && !verified)} className={`btn min-h-12 text-base ${published ? "btn-ghost" : ""}`}>
          {published ? "Unpublish" : "Publish my shop"}
        </button>
        <Link href={`/c/${props.handle}`} className="text-center text-sm font-semibold text-violet-deep">
          Preview my profile →
        </Link>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${msg.ok ? "bg-ok-bg text-ok" : "bg-err-bg text-err"}`}>
            {msg.text}
          </p>
        )}
      </aside>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
