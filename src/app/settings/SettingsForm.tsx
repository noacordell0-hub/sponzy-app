"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ToggleRow } from "@/components/Toggle";

type Prefs = { orders: boolean; messages: boolean; product: boolean };

export default function SettingsForm(props: { userId: string; email: string; deepSpace: boolean; prefs: Prefs; guardianEmail: string | null }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [deep, setDeep] = useState(props.deepSpace);
  const [prefs, setPrefs] = useState<Prefs>(props.prefs);
  const [note, setNote] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function saveDeep(v: boolean) {
    setDeep(v);
    const { error } = await supabase.from("profiles").update({ deep_space: v }).eq("id", props.userId);
    setNote(error ? "Couldn't save that setting." : "Saved.");
    router.refresh();
  }
  async function savePref(k: keyof Prefs, v: boolean) {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    const { error } = await supabase.from("profile_private").update({ email_prefs: next }).eq("id", props.userId);
    setNote(error ? "Couldn't save that setting." : "Saved.");
  }
  async function deleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) });
    const json = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) return setDeleteError(json.error || "Couldn't delete your account.");
    window.location.href = "/?deleted=1";
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <section className="panel flex flex-col gap-2 p-6" aria-labelledby="appearance">
        <h2 id="appearance" className="eyebrow mb-2">
          Appearance
        </h2>
        <ToggleRow label="Deep space mode" hint="A dark, starry background across your Clouta pages" checked={deep} onChange={saveDeep} />
      </section>

      <section className="panel flex flex-col gap-2 p-6" aria-labelledby="emails">
        <h2 id="emails" className="eyebrow mb-2">
          Email notifications
        </h2>
        <ToggleRow label="Orders and payments" hint="New orders, approvals and payouts" checked={prefs.orders} onChange={(v) => savePref("orders", v)} />
        <ToggleRow label="Messages" hint="When someone messages you" checked={prefs.messages} onChange={(v) => savePref("messages", v)} />
        <ToggleRow label="Product news" hint="Launch updates and new features" checked={prefs.product} onChange={(v) => savePref("product", v)} />
        <p className="mt-1 text-xs text-ink-2">Security emails, like login links, are always sent.</p>
      </section>

      {note && (
        <p role="status" className="-mt-3 text-sm font-semibold text-ok on-bg-muted">
          {note}
        </p>
      )}

      <section className="panel flex flex-col gap-4 p-6" aria-labelledby="account">
        <h2 id="account" className="eyebrow">
          Account
        </h2>
        <div>
          <p className="text-sm font-semibold">Email</p>
          <p className="text-sm text-body">{props.email}</p>
        </div>
        {props.guardianEmail && (
          <div>
            <p className="text-sm font-semibold">Parent or guardian</p>
            <p className="text-sm text-body">{props.guardianEmail}</p>
            <p className="text-xs text-ink-2">To change this, contact us.</p>
          </div>
        )}
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-ghost min-h-11 px-5 text-sm">
            Sign out
          </button>
        </form>
      </section>

      <section className="panel flex flex-col gap-3 border-err/30 p-6" aria-labelledby="danger">
        <h2 id="danger" className="text-sm font-bold uppercase tracking-[0.08em] text-err">
          Delete account
        </h2>
        <p className="text-sm text-body">
          This permanently deletes your account, profile, linked socials, photos and waitlist spot, including any Founding
          Creator perks. It can&apos;t be undone.
        </p>
        <label htmlFor="del-confirm" className="text-sm font-semibold">
          Type DELETE to confirm
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input sm:max-w-[240px]" autoComplete="off" />
          <button
            type="button"
            onClick={deleteAccount}
            disabled={confirm !== "DELETE" || deleting}
            className="min-h-12 rounded-[12px] bg-err px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
        {deleteError && (
          <p role="alert" className="text-sm font-semibold text-err">
            {deleteError}
          </p>
        )}
      </section>
    </div>
  );
}
