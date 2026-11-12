import type { Metadata } from "next";
import { requireProfile, type Profile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import MessagesView from "./MessagesView";
import type { InboxRow, Message } from "@/lib/chat";

export const metadata: Metadata = { title: "Messages · Clouta" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ t?: string; error?: string }> }) {
  const { t, error } = await searchParams;
  const { supabase, user, profile } = await requireProfile();
  const { data: inboxData } = await supabase.rpc("inbox");
  const inbox = (inboxData as InboxRow[]) ?? [];

  const threadId = Number(t) || null;
  let messages: Message[] = [];
  let other: Pick<Profile, "id" | "display_name" | "handle" | "role" | "avatar_source" | "avatar_pattern" | "avatar_url" | "young_tag"> | null = null;
  if (threadId) {
    const { data: thread } = await supabase.from("threads").select("id, a_id, b_id").eq("id", threadId).maybeSingle();
    if (thread) {
      const otherId = thread.a_id === user.id ? thread.b_id : thread.a_id;
      const [{ data: msgs }, { data: o }] = await Promise.all([
        supabase.from("messages").select("*").eq("thread_id", threadId).order("created_at").order("id").limit(500),
        supabase.from("profiles").select("id, display_name, handle, role, avatar_source, avatar_pattern, avatar_url, young_tag").eq("id", otherId).maybeSingle(),
      ]);
      messages = (msgs as Message[]) ?? [];
      other = o ?? null;
    }
  }

  return (
    <AppShell profile={profile} active="messages" wide>
      <h1 className="on-bg sr-only">Messages</h1>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-err-bg px-4 py-3 text-sm font-semibold text-err">
          {error === "notfound" ? "That account couldn't be found." : error}
        </p>
      )}
      <MessagesView me={user.id} myName={profile.display_name ?? "You"} inbox={inbox} threadId={other ? threadId : null} initialMessages={messages} other={other} />
    </AppShell>
  );
}
