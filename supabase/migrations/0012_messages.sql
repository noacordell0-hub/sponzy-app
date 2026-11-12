-- Layer 3: direct message threads with text, offer and system messages, plus read tracking.
-- Realtime: messages and threads are added to the supabase_realtime publication; RLS limits delivery.

create table if not exists public.threads (
  id               bigint generated always as identity primary key,
  a_id             uuid not null references public.profiles(id) on delete cascade,
  b_id             uuid not null references public.profiles(id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  constraint threads_pair_ordered check (a_id < b_id),
  unique (a_id, b_id)
);
create index if not exists threads_a_idx on public.threads(a_id, last_message_at desc);
create index if not exists threads_b_idx on public.threads(b_id, last_message_at desc);

create table if not exists public.messages (
  id            bigint generated always as identity primary key,
  thread_id     bigint not null references public.threads(id) on delete cascade,
  sender_id     uuid references public.profiles(id) on delete set null,   -- null for system messages
  kind          text not null default 'text' check (kind in ('text', 'offer', 'system')),
  body          text not null check (char_length(body) between 1 and 4000),
  offer         jsonb,          -- {title, price_cents, turnaround_days, revisions, includes}
  offer_status  text check (offer_status in ('pending', 'accepted', 'declined', 'withdrawn')),
  order_id      bigint,         -- linked in Layer 4 when an order exists
  created_at    timestamptz not null default now(),
  constraint messages_offer_shape check (
    (kind = 'offer' and offer is not null and offer_status is not null) or (kind <> 'offer' and offer is null and offer_status is null))
);
create index if not exists messages_thread_idx on public.messages(thread_id, created_at);

create table if not exists public.thread_reads (
  thread_id     bigint not null references public.threads(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  last_read_at  timestamptz not null default now(),
  primary key (thread_id, profile_id)
);

create or replace function public.is_thread_member(p_thread bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.threads t where t.id = p_thread and auth.uid() in (t.a_id, t.b_id));
$$;

-- ---------- Starting a conversation ----------
create or replace function public.start_thread(p_other uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); lo uuid; hi uuid; tid bigint;
begin
  if me is null then raise exception 'Please log in to send messages.'; end if;
  if p_other = me then raise exception 'You can''t message yourself.'; end if;
  if not exists (select 1 from public.profiles where id = me and onboarded_at is not null and banned_at is null) then
    raise exception 'Finish setting up your account first.';
  end if;
  if not exists (select 1 from public.profiles where id = p_other and onboarded_at is not null and banned_at is null) then
    raise exception 'That account isn''t available.';
  end if;
  lo := least(me, p_other); hi := greatest(me, p_other);
  insert into public.threads (a_id, b_id) values (lo, hi) on conflict (a_id, b_id) do nothing;
  select id into tid from public.threads where a_id = lo and b_id = hi;
  return tid;
end $$;

-- ---------- Message rules ----------
-- Runs as the caller (security invoker) so current_user tells a user apart from the system functions.
create or replace function public.messages_before_insert()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare recent int; price int; days int; revs int;
begin
  -- System messages are only created by the functions below (which run as the table owner).
  if new.kind = 'system' and current_user = 'authenticated' then raise exception 'Not allowed.'; end if;
  if current_user = 'authenticated' then
    if new.sender_id is distinct from auth.uid() then raise exception 'Not allowed.'; end if;
    if exists (select 1 from public.profiles where id = auth.uid() and banned_at is not null) then raise exception 'Your account can''t send messages.'; end if;
    select count(*) into recent from public.messages where sender_id = auth.uid() and created_at > now() - interval '1 minute';
    if recent >= 20 then raise exception 'You''re sending messages too quickly. Please wait a moment.'; end if;
  end if;
  new.body := btrim(new.body);
  if new.kind = 'offer' then
    price := (new.offer->>'price_cents')::int;
    days := (new.offer->>'turnaround_days')::int;
    revs := coalesce((new.offer->>'revisions')::int, 0);
    if coalesce(char_length(new.offer->>'title'), 0) not between 1 and 80 then raise exception 'Give the offer a title.'; end if;
    if price is null or price < 500 or price > 10000000 then raise exception 'Offers are between $5 and $100,000.'; end if;
    if days is null or days < 1 or days > 90 then raise exception 'Turnaround is 1 to 90 days.'; end if;
    if revs < 0 or revs > 5 then raise exception 'Revisions are 0 to 5.'; end if;
    if char_length(coalesce(new.offer->>'includes', '')) > 600 then raise exception 'Keep the details under 600 characters.'; end if;
    new.offer := jsonb_build_object('title', btrim(new.offer->>'title'), 'price_cents', price, 'turnaround_days', days,
                                    'revisions', revs, 'includes', nullif(btrim(coalesce(new.offer->>'includes', '')), ''));
    new.offer_status := 'pending';
  end if;
  return new;
end $$;
drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert before insert on public.messages for each row execute function public.messages_before_insert();

create or replace function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.threads set last_message_at = new.created_at where id = new.thread_id;
  if new.sender_id is not null then
    insert into public.thread_reads (thread_id, profile_id, last_read_at) values (new.thread_id, new.sender_id, new.created_at)
    on conflict (thread_id, profile_id) do update set last_read_at = greatest(public.thread_reads.last_read_at, excluded.last_read_at);
  end if;
  return null;
end $$;
drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages for each row execute function public.messages_after_insert();

-- ---------- Offers: accept, decline, withdraw ----------
create or replace function public.respond_offer(p_message bigint, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.messages%rowtype; me uuid := auth.uid(); who text; verb text;
begin
  select * into m from public.messages where id = p_message for update;
  if not found or m.kind <> 'offer' or not public.is_thread_member(m.thread_id) then raise exception 'Offer not found.'; end if;
  if m.offer_status <> 'pending' then raise exception 'This offer has already been answered.'; end if;
  if p_action in ('accept', 'decline') and m.sender_id = me then raise exception 'You can''t answer your own offer.'; end if;
  if p_action = 'withdraw' and m.sender_id is distinct from me then raise exception 'Only the sender can withdraw an offer.'; end if;
  if p_action not in ('accept', 'decline', 'withdraw') then raise exception 'Unknown action.'; end if;

  update public.messages
     set offer_status = case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'withdrawn' end
   where id = m.id;

  select coalesce(display_name, 'Someone') into who from public.profiles where id = me;
  verb := case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'withdrew' end;
  insert into public.messages (thread_id, sender_id, kind, body)
  values (m.thread_id, null, 'system',
          format('%s %s the offer "%s".', who, verb, m.offer->>'title')
          || case when p_action = 'accept' then ' Checkout opens when payments launch on Clouta.' else '' end);
end $$;

-- ---------- Read tracking and inbox ----------
create or replace function public.mark_thread_read(p_thread bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_thread_member(p_thread) then raise exception 'Not found.'; end if;
  insert into public.thread_reads (thread_id, profile_id, last_read_at) values (p_thread, auth.uid(), now())
  on conflict (thread_id, profile_id) do update set last_read_at = now();
end $$;

create or replace function public.inbox()
returns table (
  thread_id bigint, other_id uuid, other_name text, other_handle text, other_role text,
  other_avatar_source text, other_avatar_pattern smallint, other_avatar_url text,
  last_body text, last_kind text, last_sender uuid, last_message_at timestamptz, unread integer
)
language sql stable security invoker set search_path = '' as $$
  select t.id, o.id, o.display_name, o.handle, o.role, o.avatar_source, o.avatar_pattern, o.avatar_url,
         lm.body, lm.kind, lm.sender_id, t.last_message_at,
         (select count(*)::int from public.messages m
           where m.thread_id = t.id and m.sender_id is distinct from auth.uid()
             and m.created_at > coalesce((select r.last_read_at from public.thread_reads r where r.thread_id = t.id and r.profile_id = auth.uid()), '-infinity'))
  from public.threads t
  join public.profiles o on o.id = case when t.a_id = auth.uid() then t.b_id else t.a_id end
  left join lateral (select m.body, m.kind, m.sender_id from public.messages m where m.thread_id = t.id order by m.created_at desc, m.id desc limit 1) lm on true
  where auth.uid() in (t.a_id, t.b_id)
    and exists (select 1 from public.messages m where m.thread_id = t.id)
  order by t.last_message_at desc;
$$;

create or replace function public.unread_total()
returns integer language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(unread), 0)::int from public.inbox();
$$;

-- ---------- Permissions ----------
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.thread_reads enable row level security;
revoke all on public.threads, public.messages, public.thread_reads from anon, authenticated;

grant select on public.threads to authenticated;
create policy "threads members read" on public.threads for select using (auth.uid() in (a_id, b_id));

grant select on public.messages to authenticated;
grant insert (thread_id, sender_id, kind, body, offer) on public.messages to authenticated;
create policy "messages members read" on public.messages for select using (public.is_thread_member(thread_id));
create policy "messages members insert" on public.messages for insert with check (
  sender_id = auth.uid() and kind in ('text', 'offer') and public.is_thread_member(thread_id));

grant select on public.thread_reads to authenticated;
create policy "reads own" on public.thread_reads for select using (profile_id = auth.uid());

revoke all on function public.is_thread_member(bigint) from public, anon;
revoke all on function public.start_thread(uuid) from public, anon;
revoke all on function public.respond_offer(bigint, text) from public, anon;
revoke all on function public.mark_thread_read(bigint) from public, anon;
revoke all on function public.inbox() from public, anon;
revoke all on function public.unread_total() from public, anon;
revoke all on function public.messages_before_insert() from public, anon, authenticated;
revoke all on function public.messages_after_insert() from public, anon, authenticated;
grant execute on function public.is_thread_member(bigint), public.start_thread(uuid), public.respond_offer(bigint, text),
  public.mark_thread_read(bigint), public.inbox(), public.unread_total() to authenticated;

-- ---------- Realtime ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'threads') then
    alter publication supabase_realtime add table public.threads;
  end if;
end $$;
