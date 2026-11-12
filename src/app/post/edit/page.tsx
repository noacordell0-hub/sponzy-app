import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile, type Social } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import ShopEditor from "./ShopEditor";
import type { Post, Service } from "@/lib/market";

export const metadata: Metadata = { title: "My shop · Clouta" };

export default async function ShopEditPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, user, profile } = await requireProfile();
  if (profile.role !== "creator") redirect("/brand");

  const [{ data: post }, { data: socials }] = await Promise.all([
    supabase.from("posts").select("*").eq("creator_id", user.id).maybeSingle<Post>(),
    supabase.from("social_accounts").select("*").eq("profile_id", user.id),
  ]);
  const { data: services } = post ? await supabase.from("services").select("*").eq("post_id", post.id).order("position").order("id") : { data: [] };

  return (
    <AppShell profile={profile} active="shop">
      {welcome && (
        <div role="status" className="chip-pop mb-6 rounded-2xl border border-black/[.06] bg-ok-bg px-5 py-4 text-ok">
          <p className="font-bold">Welcome to Clouta, {profile.display_name}!</p>
          <p className="text-sm">Set up your shop window: write a short pitch, add your services and prices, then publish.</p>
        </div>
      )}
      <div className="mb-8">
        <h1 className="on-bg text-3xl font-extrabold tracking-[-0.03em]">My shop</h1>
        <p className="on-bg-muted mt-1.5 text-[15px] text-body">This is what brands see on your profile and in Browse.</p>
      </div>
      <ShopEditor
        userId={user.id}
        handle={profile.handle ?? ""}
        initialPost={post ?? null}
        initialServices={(services as Service[]) ?? []}
        socialPlatforms={((socials as Social[]) ?? []).map((s) => s.platform)}
      />
    </AppShell>
  );
}
