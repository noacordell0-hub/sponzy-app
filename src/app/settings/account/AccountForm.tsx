"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import SocialsEditor from "@/components/SocialsEditor";
import { ToggleRow } from "@/components/Toggle";
import { AVATAR_PATTERNS, THEMES, type ThemeKey } from "@/lib/look";
import { PLATFORMS, formatFollowers } from "@/lib/platforms";
import { prepareAvatar } from "@/lib/image";
import type { Profile, Social } from "@/lib/auth";

type Draft = { display_name: string; handle: string } & Pick<
  Profile,
  | "tagline" | "bio" | "audience" | "location" | "theme" | "avatar_source" | "avatar_pattern"
  | "avatar_url" | "taking_bookings" | "show_badges" | "show_audience" | "show_comments" | "show_rank" | "young_tag"
> & { niches: string };

export default function AccountForm({ profile, socials, isMinor }: { profile: Profile; socials: Social[]; isMinor: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [d, setD] = useState<Draft>({
    display_name: profile.display_name ?? "",
    handle: profile.handle ?? "",
    tagline: profile.tagline ?? "",
    bio: profile.bio ?? "",
    audience: profile.audience ?? "",
    location: profile.location ?? "",
    theme: profile.theme,
    avatar_source: profile.avatar_source,
    avatar_pattern: profile.avatar_pattern,
    avatar_url: profile.avatar_url,
    taking_bookings: profile.taking_bookings,
    show_badges: profile.show_badges,
    show_audience: profile.show_audience,
    show_comments: profile.show_comments,
    show_rank: profile.show_rank,
    young_tag: profile.young_tag,
    niches: profile.niches.join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    setMsg(null);
  };

  const main = socials.find((s) => s.is_main) ?? null;
  const isCreator = profile.role === "creator";

  async function upload(file: File) {
    if (!file.type.startsWith("image/") && !/\.(heic|heif|avif|webp|jpe?g|png|gif|bmp)$/i.test(file.name)) {
      return setMsg({ ok: false, text: "That file isn't an image." });
    }
    if (file.size > 25 * 1024 * 1024) return setMsg({ ok: false, text: "That image is over 25 MB. Try a smaller one." });
    setUploading(true);
    let prepared: Awaited<ReturnType<typeof prepareAvatar>>;
    try {
      prepared = await prepareAvatar(file);
    } catch {
      setUploading(false);
      return setMsg({ ok: false, text: "Your browser can't open this image type. Try saving it as a JPG or PNG first." });
    }
    const path = `${profile.id}/avatar-${Date.now()}.${prepared.ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, prepared.blob, { upsert: false, contentType: prepared.type });
    setUploading(false);
    if (error) return setMsg({ ok: false, text: "Upload failed. Please try again." });
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setD((prev) => ({ ...prev, avatar_source: "upload", avatar_url: data.publicUrl }));
    setMsg({ ok: true, text: "Photo ready. Save changes to use it." });
  }

  async function save() {
    setMsg(null);
    if (!d.display_name.trim()) return setMsg({ ok: false, text: "Display name can't be empty." });
    if (!/^[a-z0-9_]{3,30}$/.test(d.handle)) return setMsg({ ok: false, text: "Handles use 3 to 30 lowercase letters, numbers or underscores." });
    const niches = d.niches.split(",").map((n) => n.trim()).filter(Boolean).slice(0, 8);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: d.display_name.trim(),
        handle: d.handle,
        tagline: (d.tagline ?? "").trim() || null,
        bio: (d.bio ?? "").trim() || null,
        audience: (d.audience ?? "").trim() || null,
        location: (d.location ?? "").trim() || null,
        niches,
        theme: d.theme,
        avatar_source: d.avatar_source,
        avatar_pattern: d.avatar_pattern,
        avatar_url: d.avatar_source === "upload" ? d.avatar_url : profile.avatar_url,
        taking_bookings: d.taking_bookings,
        show_badges: d.show_badges,
        show_audience: d.show_audience,
        show_comments: d.show_comments,
        show_rank: d.show_rank,
        young_tag: d.young_tag,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      return setMsg({ ok: false, text: error.code === "23505" ? "That handle is taken." : "Couldn't save. Check your details and try again." });
    }
    setMsg({ ok: true, text: "Changes saved." });
    router.refresh();
  }

  const theme = THEMES[d.theme];
  const sourceOptions = [
    { key: "auto" as const, title: "Auto: your top platform", sub: main ? `${PLATFORMS[main.platform].label} · ${formatFollowers(main.followers)} followers` : "Link a social account to use this" },
    { key: "pattern" as const, title: "Clouta pattern", sub: "A pattern avatar made for you" },
    { key: "upload" as const, title: "Upload a photo", sub: "Any photo or GIF. We crop and resize it for you" },
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
      {/* Profile picture */}
      <section className="panel flex flex-col items-center gap-4 p-6 text-center lg:sticky lg:top-24" aria-labelledby="pic-title">
        <Avatar name={d.display_name} source={d.avatar_source} pattern={d.avatar_pattern} url={d.avatar_url} mainPlatform={main?.platform} size={120} rounded={36} />
        <div>
          <h2 id="pic-title" className="text-lg font-bold">
            Profile picture
          </h2>
          <p className="mt-1 text-sm text-body">Choose where your picture comes from. You can change it anytime.</p>
        </div>
        <div className="flex w-full flex-col gap-2" role="radiogroup" aria-label="Picture source">
          {sourceOptions.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={d.avatar_source === o.key}
              onClick={() => (o.key === "upload" && !d.avatar_url ? fileRef.current?.click() : set("avatar_source", o.key))}
              className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition ${
                d.avatar_source === o.key ? "border-violet-deep bg-[#F7F5FF]" : "border-black/10 hover:border-black/20"
              }`}
            >
              <span className="flex-1">
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="block text-xs text-ink-2">{o.sub}</span>
              </span>
              {o.key === "auto" && <span className="badge-gold rounded-md px-2 py-0.5 text-[11px] font-semibold">Default</span>}
            </button>
          ))}
        </div>
        {d.avatar_source === "pattern" && (
          <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Pattern">
            {AVATAR_PATTERNS.map((bg, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={d.avatar_pattern === i}
                aria-label={`Pattern ${i + 1}`}
                onClick={() => set("avatar_pattern", i)}
                className={`size-11 rounded-xl ${d.avatar_pattern === i ? "ring-[3px] ring-violet-deep ring-offset-2" : ""}`}
                style={{ background: bg }}
              />
            ))}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost min-h-11 w-full text-sm" disabled={uploading}>
          {uploading ? "Uploading…" : d.avatar_url ? "Upload a different photo" : "Upload a photo"}
        </button>
      </section>

      <div className="flex flex-col gap-6">
        {/* Theme */}
        <section className="panel flex flex-col gap-4 p-6" aria-labelledby="theme-title">
          <h2 id="theme-title" className="eyebrow">
            Theme
          </h2>
          <div className="overflow-hidden rounded-2xl border border-black/[.07]">
            <div className="h-20" style={{ background: theme.banner }} />
            <div className="-mt-6 flex items-end gap-3 px-4 pb-4">
              <span className="rounded-2xl border-[3px] border-white">
                <Avatar name={d.display_name} source={d.avatar_source} pattern={d.avatar_pattern} url={d.avatar_url} size={52} rounded={14} />
              </span>
              <div className="min-w-0 flex-1 pb-0.5">
                <p className="truncate font-bold">{d.display_name || "Your name"}</p>
                <p className="text-xs text-ink-2">@{d.handle}</p>
              </div>
              <span className="mb-1 rounded-[10px] px-4 py-2 text-sm font-bold" style={{ background: theme.button, color: theme.text }}>
                Message
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Theme">
            {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={d.theme === k}
                onClick={() => set("theme", k)}
                className="flex flex-col items-center gap-1.5"
              >
                <span className={`size-11 rounded-full ${d.theme === k ? "ring-[3px] ring-ink ring-offset-2" : ""}`} style={{ background: THEMES[k].banner }} />
                <span className="text-xs font-semibold text-body">{THEMES[k].label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Show on profile */}
        <section className="panel flex flex-col gap-2 p-6" aria-labelledby="show-title">
          <h2 id="show-title" className="eyebrow mb-2">
            Show on your profile
          </h2>
          {isCreator && <ToggleRow label="Taking bookings" hint="Turn off to pause new orders" checked={d.taking_bookings} onChange={(v) => set("taking_bookings", v)} />}
          <ToggleRow label="Badge case" hint="Your badges and level" checked={d.show_badges} onChange={(v) => set("show_badges", v)} />
          {isCreator && <ToggleRow label="Audience snapshot" hint="Audience, location, best platform" checked={d.show_audience} onChange={(v) => set("show_audience", v)} />}
          <ToggleRow label="Community comments" hint="Questions and vibe checks" checked={d.show_comments} onChange={(v) => set("show_comments", v)} />
          {isCreator && <ToggleRow label="Leaderboard rank" hint="Your orbit and rank" checked={d.show_rank} onChange={(v) => set("show_rank", v)} />}
          {isMinor && (
            <ToggleRow label="Young entrepreneur tag" hint="Lets brands looking to back young creators find you. Your age stays private." checked={d.young_tag} onChange={(v) => set("young_tag", v)} />
          )}
        </section>

        {/* Details */}
        <section className="panel flex flex-col gap-4 p-6" aria-labelledby="details-title">
          <h2 id="details-title" className="eyebrow">
            Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="f-name" label="Display name" value={d.display_name} onChange={(v) => set("display_name", v)} max={60} />
            <TextField id="f-handle" label="Handle" value={d.handle} onChange={(v) => set("handle", v.toLowerCase().replace(/[^a-z0-9_]/g, ""))} max={30} prefix="@" />
          </div>
          <TextField id="f-tagline" label="Tagline" value={d.tagline ?? ""} onChange={(v) => set("tagline", v)} max={120} placeholder="Quick, honest workout content for busy people" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="f-niches" label="Vibe tags" value={d.niches} onChange={(v) => set("niches", v)} max={200} placeholder="Fitness, Wellness" hint="Separate with commas, up to 8" />
            <TextField id="f-audience" label={isCreator ? "Target audience" : "Who you want to reach"} value={d.audience ?? ""} onChange={(v) => set("audience", v)} max={160} placeholder="Women 20-35, home workouts" />
          </div>
          <TextField id="f-location" label="Location" value={d.location ?? ""} onChange={(v) => set("location", v)} max={80} placeholder={isMinor ? "Shown publicly, so keep it general, e.g. a country" : "City or country"} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-bio" className="text-sm font-semibold">
              Bio
            </label>
            <textarea id="f-bio" value={d.bio ?? ""} maxLength={600} onChange={(e) => set("bio", e.target.value)} className="input" placeholder="Tell brands what you make and who watches it." />
            <p className="text-right text-xs text-ink-2">{(d.bio ?? "").length}/600</p>
          </div>
        </section>

        {/* Linked accounts */}
        <section className="panel flex flex-col gap-4 p-6" aria-labelledby="linked-title">
          <h2 id="linked-title" className="eyebrow">
            Linked accounts
          </h2>
          <SocialsEditor userId={profile.id} initial={socials} onChange={() => router.refresh()} />
        </section>

        <div className="panel sticky bottom-4 z-10 flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
          <button type="button" onClick={save} className="btn min-h-12 px-8 text-base" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${msg.ok ? "bg-ok-bg text-ok" : "bg-err-bg text-err"}`}>
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TextField(props: { id: string; label: string; value: string; onChange: (v: string) => void; max: number; placeholder?: string; hint?: string; prefix?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.id} className="text-sm font-semibold">
        {props.label}
      </label>
      {props.prefix ? (
        <div className="flex items-center rounded-[12px] border border-black/12 bg-white focus-within:border-violet focus-within:shadow-[0_0_0_4px_rgba(108,71,255,.16)]">
          <span className="pl-4 text-ink-2">{props.prefix}</span>
          <input id={props.id} value={props.value} maxLength={props.max} onChange={(e) => props.onChange(e.target.value)} className="min-h-12 flex-1 rounded-[12px] bg-transparent px-1 text-base focus:outline-none" />
        </div>
      ) : (
        <input id={props.id} value={props.value} maxLength={props.max} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} className="input" />
      )}
      {props.hint && <p className="text-xs text-ink-2">{props.hint}</p>}
    </div>
  );
}
