-- Layer 5 part 3: reports, blocks, moderation actions (warning / suspension / ban), ban evasion, auto-flag,
-- and Browse filters for ratings. Admin actions run in server code with the service role.

-- Hidden from Browse after 3+ reports from different people in 7 days (auto-flag, never auto-ban).
-- ban_until: null with banned_at set = permanent ban; a date = suspension that lifts automatically.
alter table public.profiles
  add column if not exists browse_hidden_at timestamptz,
  add column if not exists ban_until timestamptz;

create table if not exists public.reports (
  id                 bigint generated always as identity primary key,
  reporter_id        uuid references public.profiles(id) on delete set null,
  target_type        text not null check (target_type in ('profile', 'review', 'comment', 'message')),
  target_id          text not null,
  target_profile_id  uuid references public.profiles(id) on delete cascade,
  reason             text not null check (reason in ('spam', 'scam', 'harassment', 'fake_reviews', 'impersonation', 'other')),
  details            text check (char_length(details) <= 1000),
  screenshot_url     text check (char_length(screenshot_url) <= 500),
  status             text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  handled_by         uuid references public.profiles(id) on delete set null,
  handled_at         timestamptz,
  created_at         timestamptz not null default now()
);
create unique index if not exists reports_once on public.reports(reporter_id, target_type, target_id) where status = 'open';
create index if not exists reports_target_idx on public.reports(target_profile_id, created_at desc);
create index if not exists reports_open_idx on public.reports(status, created_at) where status = 'open';

create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.moderation_actions (
  id               bigint generated always as identity primary key,
  profile_id       uuid references public.profiles(id) on delete cascade,
  action           text not null check (action in ('warning', 'suspension', 'ban', 'unban', 'dismiss', 'hide_content', 'restore_content', 'unflag')),
  reason           text,
  note             text check (char_length(note) <= 2000),
  until            timestamptz,
  report_ids       bigint[] not null default '{}',
  admin_id         uuid references public.profiles(id) on delete set null,
  acknowledged_at  timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists moderation_profile_idx on public.moderation_actions(profile_id, created_at desc);

-- Emails and social handles of permanently banned accounts (never readable by users).
create table if not exists public.banned_identities (
  kind        text not null check (kind in ('email', 'social')),
  value       text not null,
  profile_id  uuid,
  created_at  timestamptz not null default now(),
  primary key (kind, value)
);

alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.banned_identities enable row level security;
revoke all on public.reports, public.blocks, public.moderation_actions, public.banned_identities from anon, authenticated;

grant select on public.reports to authenticated;
create policy "reports own or admin" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());

grant select, insert, delete on public.blocks to authenticated;
create policy "blocks own read" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "blocks own add" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks own remove" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- People see warnings and suspensions about themselves (and can mark a warning as read).
grant select on public.moderation_actions to authenticated;
grant update (acknowledged_at) on public.moderation_actions to authenticated;
create policy "moderation own or admin" on public.moderation_actions for select to authenticated using (
  public.is_admin() or (profile_id = auth.uid() and action in ('warning', 'suspension', 'ban', 'unban')));
create policy "moderation acknowledge own" on public.moderation_actions for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------- Auto-flag ----------
create or replace function public.reports_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.target_profile_id is not null and (
    select count(distinct reporter_id) from public.reports
     where target_profile_id = new.target_profile_id and created_at > now() - interval '7 days') >= 3 then
    update public.profiles set browse_hidden_at = coalesce(browse_hidden_at, now()) where id = new.target_profile_id;
  end if;
  return null;
end $$;
revoke all on function public.reports_after_insert() from public, anon, authenticated;
drop trigger if exists reports_after_insert on public.reports;
create trigger reports_after_insert after insert on public.reports for each row execute function public.reports_after_insert();

-- ---------- Blocks stop messages in both directions ----------
create or replace function public.messages_block_check()
returns trigger language plpgsql security definer set search_path = '' as $$
declare other uuid;
begin
  if new.sender_id is null then return new; end if;
  select case when t.a_id = new.sender_id then t.b_id else t.a_id end into other from public.threads t where t.id = new.thread_id;
  if exists (select 1 from public.blocks b where (b.blocker_id = new.sender_id and b.blocked_id = other) or (b.blocker_id = other and b.blocked_id = new.sender_id)) then
    raise exception 'You can''t message this person.';
  end if;
  return new;
end $$;
revoke all on function public.messages_block_check() from public, anon, authenticated;
drop trigger if exists messages_block_check on public.messages;
create trigger messages_block_check before insert on public.messages for each row execute function public.messages_block_check();

-- ---------- Ban evasion ----------
create or replace function public.block_banned_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and exists (select 1 from public.banned_identities where kind = 'email' and value = lower(new.email)) then
    raise exception 'This email can''t be used on Clouta.';
  end if;
  return new;
end $$;
revoke all on function public.block_banned_signup() from public, anon, authenticated;
drop trigger if exists block_banned_signup on auth.users;
create trigger block_banned_signup before insert on auth.users for each row execute function public.block_banned_signup();

create or replace function public.block_banned_socials()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.banned_identities
              where kind = 'social' and value = new.platform || ':' || lower(new.handle) and profile_id is distinct from new.profile_id) then
    raise exception 'This social account can''t be linked on Clouta.';
  end if;
  return new;
end $$;
revoke all on function public.block_banned_socials() from public, anon, authenticated;
drop trigger if exists block_banned_socials on public.social_accounts;
create trigger block_banned_socials before insert or update of platform, handle on public.social_accounts for each row execute function public.block_banned_socials();

-- Lift suspensions whose end date has passed (daily job).
create or replace function public.lift_expired_suspensions()
returns integer language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with lifted as (
    update public.profiles set banned_at = null, ban_until = null
     where banned_at is not null and ban_until is not null and ban_until < now()
    returning id)
  insert into public.moderation_actions (profile_id, action, note)
  select id, 'unban', 'Suspension ended.' from lifted;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.lift_expired_suspensions() from public, anon, authenticated;
grant execute on function public.lift_expired_suspensions() to service_role;

-- ---------- Browse: hide flagged accounts; add ratings, Top Rated and On-Time Pro ----------
drop function if exists public.search_creators(text, text, text, integer, integer, text, boolean, boolean, boolean, boolean, text, integer, integer);
create or replace function public.search_creators(
  p_q text default null,
  p_niche text default null,
  p_platform text default null,
  p_min_price integer default null,
  p_max_price integer default null,
  p_tier text default null,
  p_verified_only boolean default false,
  p_founding_only boolean default false,
  p_young_only boolean default false,
  p_bookable_only boolean default false,
  p_sort text default 'recommended',     -- recommended | price_asc | price_desc | followers | newest | rating
  p_limit integer default 24,
  p_offset integer default 0,
  p_top_rated boolean default false,
  p_on_time_pro boolean default false
) returns table (
  id uuid, handle text, display_name text, tagline text, niches text[], theme text,
  avatar_source text, avatar_pattern smallint, avatar_url text, is_founding boolean, young_tag boolean,
  taking_bookings boolean, min_price_cents integer, service_count integer, platforms text[],
  verified_followers bigint, total_followers bigint, has_verified boolean, main_platform text, published_at timestamptz,
  avg_rating numeric, review_count integer, badges text[]
)
language sql stable security invoker set search_path = '' as $$
  with base as (
    select p.id, p.handle, p.display_name, p.tagline, p.niches, p.theme, p.avatar_source, p.avatar_pattern,
           p.avatar_url, p.is_founding, p.young_tag, p.taking_bookings, po.platforms, po.created_at as published_at,
           (select min(s.price_cents) from public.services s where s.post_id = po.id) as min_price_cents,
           (select count(*)::int from public.services s where s.post_id = po.id) as service_count,
           (select coalesce(sum(sa.followers) filter (where sa.verified), 0) from public.social_accounts sa where sa.profile_id = p.id) as verified_followers,
           (select coalesce(sum(sa.followers), 0) from public.social_accounts sa where sa.profile_id = p.id) as total_followers,
           (select bool_or(sa.verified) from public.social_accounts sa where sa.profile_id = p.id) as has_verified,
           (select sa.platform from public.social_accounts sa where sa.profile_id = p.id and sa.is_main limit 1) as main_platform,
           ts.avg_rating, coalesce(ts.review_count, 0) as review_count,
           coalesce((select array_agg(pb.code) from public.profile_badges pb where pb.profile_id = p.id), '{}') as badges
    from public.profiles p
    join public.posts po on po.creator_id = p.id and po.published
    left join public.trust_scores ts on ts.profile_id = p.id
    where p.role = 'creator' and p.browse_hidden_at is null
  )
  select b.id, b.handle, b.display_name, b.tagline, b.niches, b.theme, b.avatar_source, b.avatar_pattern, b.avatar_url,
         b.is_founding, b.young_tag, b.taking_bookings, b.min_price_cents, b.service_count, b.platforms,
         b.verified_followers, b.total_followers, coalesce(b.has_verified, false), b.main_platform, b.published_at,
         b.avg_rating, b.review_count, b.badges
  from base b
  where b.service_count > 0
    and (p_q is null or p_q = '' or b.display_name ilike '%' || p_q || '%' or b.handle ilike '%' || p_q || '%'
         or b.tagline ilike '%' || p_q || '%' or exists (select 1 from unnest(b.niches) n where n ilike '%' || p_q || '%'))
    and (p_niche is null or exists (select 1 from unnest(b.niches) n where lower(n) = lower(p_niche)))
    and (p_platform is null or p_platform = any(b.platforms))
    and (p_min_price is null or b.min_price_cents >= p_min_price)
    and (p_max_price is null or b.min_price_cents <= p_max_price)
    and (p_tier is null
         or (p_tier = 'nano'  and b.verified_followers between 1000 and 9999)
         or (p_tier = 'micro' and b.verified_followers between 10000 and 99999)
         or (p_tier = 'mid'   and b.verified_followers between 100000 and 499999)
         or (p_tier = 'macro' and b.verified_followers >= 500000))
    and (not p_verified_only or coalesce(b.has_verified, false))
    and (not p_founding_only or b.is_founding)
    and (not p_young_only or b.young_tag)
    and (not p_bookable_only or b.taking_bookings)
    and (not p_top_rated or 'top_rated' = any(b.badges))
    and (not p_on_time_pro or 'on_time_pro' = any(b.badges))
  order by
    case when p_sort = 'price_asc' then b.min_price_cents end asc nulls last,
    case when p_sort = 'price_desc' then b.min_price_cents end desc nulls last,
    case when p_sort = 'followers' then b.verified_followers end desc nulls last,
    case when p_sort = 'newest' then b.published_at end desc nulls last,
    case when p_sort = 'rating' then b.avg_rating end desc nulls last,
    case when p_sort = 'rating' then b.review_count end desc,
    coalesce(b.has_verified, false) desc, b.taking_bookings desc, b.verified_followers desc, b.published_at desc
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_creators(text, text, text, integer, integer, text, boolean, boolean, boolean, boolean, text, integer, integer, boolean, boolean) to anon, authenticated;
