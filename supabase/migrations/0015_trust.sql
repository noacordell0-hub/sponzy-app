-- Layer 5 part 1: double-blind reviews, replies, helpful votes, trust scores, badges, streaks, orbit levels.
-- Reviews are written by server code (service role) after checking the order; users read through RLS.

create table if not exists public.reviews (
  id             bigint generated always as identity primary key,
  order_id       bigint not null references public.orders(id) on delete cascade,
  author_id      uuid references public.profiles(id) on delete set null,
  subject_id     uuid references public.profiles(id) on delete cascade,
  author_role    text not null check (author_role in ('brand', 'creator')),
  overall        smallint not null check (overall between 1 and 5),
  quality        smallint check (quality between 1 and 5),
  communication  smallint check (communication between 1 and 5),
  timeliness     smallint check (timeliness between 1 and 5),
  value          smallint check (value between 1 and 5),
  body           text check (char_length(body) <= 2000),
  tags           text[] not null default '{}' check (cardinality(tags) <= 8),
  would_rehire   boolean,
  private_note   text check (char_length(private_note) <= 1000),
  helpful_count  integer not null default 0,
  hidden_at      timestamptz,             -- set by an admin (e.g. a fake review)
  revealed_at    timestamptz,             -- double-blind: null until both sides review or 14 days pass
  created_at     timestamptz not null default now(),
  unique (order_id, author_id)
);
create index if not exists reviews_subject_idx on public.reviews(subject_id, revealed_at desc);

create table if not exists public.review_replies (
  review_id   bigint primary key references public.reviews(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create table if not exists public.review_votes (
  review_id   bigint not null references public.reviews(id) on delete cascade,
  voter_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (review_id, voter_id)
);

-- Computed trust numbers (never typed in). Refreshed by refresh_trust() after orders and reviews change, and nightly.
create table if not exists public.trust_scores (
  profile_id      uuid primary key references public.profiles(id) on delete cascade,
  score           smallint not null default 0,
  tier            text not null default 'new' check (tier in ('new', 'trusted', 'highly_trusted')),
  completed       integer not null default 0,
  on_time_rate    numeric(4,3),
  avg_rating      numeric(3,2),
  review_count    integer not null default 0,
  rehire_rate     numeric(4,3),
  repeat_partners integer not null default 0,
  streak          integer not null default 0,
  best_streak     integer not null default 0,
  disputes_lost   integer not null default 0,
  points          integer not null default 0,
  level           text not null default 'comet',
  updated_at      timestamptz not null default now()
);

create table if not exists public.profile_badges (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  code        text not null check (code in ('founding', 'verified_socials', 'top_rated', 'on_time_pro', 'hot_streak',
                                            'cosmic_collab', 'elite', 'fifty_collabs')),
  earned_at   timestamptz not null default now(),
  primary key (profile_id, code)
);

-- ---------- RLS ----------
alter table public.reviews enable row level security;
alter table public.review_replies enable row level security;
alter table public.review_votes enable row level security;
alter table public.trust_scores enable row level security;
alter table public.profile_badges enable row level security;
revoke all on public.reviews, public.review_replies, public.review_votes, public.trust_scores, public.profile_badges from anon, authenticated;

-- Everything except the private note (only admins read that, via the server).
grant select (id, order_id, author_id, subject_id, author_role, overall, quality, communication, timeliness, value, body,
              tags, would_rehire, helpful_count, hidden_at, revealed_at, created_at) on public.reviews to anon, authenticated;
create policy "reviews public when revealed" on public.reviews for select using (
  (revealed_at is not null and hidden_at is null) or author_id = auth.uid() or public.is_admin());

grant select on public.review_replies to anon, authenticated;
create policy "replies visible with review" on public.review_replies for select using (
  exists (select 1 from public.reviews r where r.id = review_id));

grant select, insert, delete on public.review_votes to authenticated;
create policy "votes read own" on public.review_votes for select using (voter_id = auth.uid());
create policy "votes add own" on public.review_votes for insert with check (
  voter_id = auth.uid()
  and exists (select 1 from public.reviews r where r.id = review_id and r.revealed_at is not null
              and r.author_id is distinct from auth.uid() and r.subject_id is distinct from auth.uid()));
create policy "votes remove own" on public.review_votes for delete using (voter_id = auth.uid());

grant select on public.trust_scores, public.profile_badges to anon, authenticated;
create policy "trust public" on public.trust_scores for select using (true);
create policy "badges public" on public.profile_badges for select using (true);

-- Keep helpful_count in step with votes.
create or replace function public.review_votes_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.reviews set helpful_count = (select count(*) from public.review_votes v where v.review_id = coalesce(new.review_id, old.review_id))
   where id = coalesce(new.review_id, old.review_id);
  return null;
end $$;
revoke all on function public.review_votes_count() from public, anon, authenticated;
drop trigger if exists review_votes_count on public.review_votes;
create trigger review_votes_count after insert or delete on public.review_votes for each row execute function public.review_votes_count();

-- ---------- Trust computation ----------
create or replace function public.refresh_trust(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role text; v_founding boolean; v_website text;
  v_completed int; v_on_time int; v_on_time_rate numeric; v_avg numeric; v_reviews int; v_rehire numeric;
  v_partners int; v_repeat int; v_streak int := 0; v_best int := 0; v_run int := 0; v_counting boolean := true;
  v_threads int; v_fast int; v_reply numeric; v_verified boolean; v_disputes_lost int := 0;
  v_score numeric; v_tier text; v_points int := 0; v_level text; v_five int;
  r record;
begin
  select role, is_founding, website into v_role, v_founding, v_website from public.profiles where id = p_id;
  if v_role is null then return; end if;

  -- Completed orders (approved or paid) for this side.
  select count(*),
         count(*) filter (where o.submitted_at is not null and (o.submitted_at at time zone 'America/Los_Angeles')::date <= o.post_by)
    into v_completed, v_on_time
    from public.orders o
   where o.status in ('approved', 'paid') and (case when v_role = 'creator' then o.creator_id else o.brand_id end) = p_id;
  v_on_time_rate := case when v_completed > 0 then v_on_time::numeric / v_completed end;

  -- Revealed, visible reviews about this person.
  select avg(overall), count(*), avg(case when would_rehire then 1.0 when would_rehire = false then 0.0 end)
    into v_avg, v_reviews, v_rehire
    from public.reviews where subject_id = p_id and revealed_at is not null and hidden_at is null;

  -- Repeat partners: people with 2+ completed orders together.
  select count(*), count(*) filter (where n >= 2) into v_partners, v_repeat
    from (select case when v_role = 'creator' then brand_id else creator_id end as partner, count(*) n
            from public.orders
           where status in ('approved', 'paid') and (case when v_role = 'creator' then creator_id else brand_id end) = p_id
           group by 1) t where partner is not null;

  -- Streak: consecutive on-time completed orders, newest first (creators). Disputes reset it once they exist.
  if v_role = 'creator' then
    for r in select (o.submitted_at is not null and (o.submitted_at at time zone 'America/Los_Angeles')::date <= o.post_by) as on_time
               from public.orders o where o.creator_id = p_id and o.status in ('approved', 'paid')
              order by o.approved_at desc nulls last loop
      if r.on_time then
        v_run := v_run + 1;
        if v_counting then v_streak := v_run; end if;
      else
        v_counting := false; v_best := greatest(v_best, v_run); v_run := 0;
      end if;
    end loop;
    v_best := greatest(v_best, v_run, v_streak);
  end if;

  -- Reply time: share of conversations started by someone else that this person answered within 24 hours.
  select count(*), count(*) filter (where replied is not null and replied - first_in <= interval '24 hours')
    into v_threads, v_fast
    from (select t.id,
                 (select min(m.created_at) from public.messages m where m.thread_id = t.id and m.sender_id is distinct from p_id and m.kind <> 'system') first_in,
                 (select min(m.created_at) from public.messages m where m.thread_id = t.id and m.sender_id = p_id and m.kind <> 'system') replied
            from public.threads t where p_id in (t.a_id, t.b_id)) x
   where first_in is not null and (replied is null or replied > first_in);
  v_reply := case when v_threads > 0 then v_fast::numeric / v_threads else 0.5 end;

  v_verified := case when v_role = 'creator'
                     then exists (select 1 from public.social_accounts s where s.profile_id = p_id and s.verified)
                     else coalesce(v_website, '') <> '' end;

  -- Weighted score (weights from CLAUDE.md; tune later).
  v_score := 30 * coalesce(v_on_time_rate, case when v_role = 'brand' and v_completed > 0 then 1 else 0.5 end)
           + 30 * coalesce((v_avg - 1) / 4, 0.6)
           + 15 * case when v_completed > 0 then greatest(0, 1 - v_disputes_lost::numeric / v_completed) else 1 end
           + 10 * case when v_partners > 0 then least(1, 2 * v_repeat::numeric / v_partners) else 0 end
           + 10 * v_reply
           +  5 * case when v_verified then 1 else 0 end;
  v_score := round(least(100, greatest(0, v_score)));
  v_tier := case when v_completed < 3 or v_score < 50 then 'new' when v_score < 80 then 'trusted' else 'highly_trusted' end;

  -- Orbit points: 10 per completed order, +5 if on time, +5 per 5-star review received.
  select count(*) into v_five from public.reviews where subject_id = p_id and revealed_at is not null and hidden_at is null and overall = 5;
  v_points := 10 * v_completed + 5 * v_on_time + 5 * v_five;
  v_level := case when v_points >= 2500 then 'supernova' when v_points >= 1000 then 'star' when v_points >= 400 then 'planet'
                  when v_points >= 150 then 'moon' when v_points >= 50 then 'meteor' else 'comet' end;

  insert into public.trust_scores as ts (profile_id, score, tier, completed, on_time_rate, avg_rating, review_count, rehire_rate,
                                         repeat_partners, streak, best_streak, disputes_lost, points, level, updated_at)
  values (p_id, v_score, v_tier, v_completed, v_on_time_rate, v_avg, v_reviews, v_rehire, v_repeat, v_streak, v_best,
          v_disputes_lost, v_points, v_level, now())
  on conflict (profile_id) do update set score = excluded.score, tier = excluded.tier, completed = excluded.completed,
    on_time_rate = excluded.on_time_rate, avg_rating = excluded.avg_rating, review_count = excluded.review_count,
    rehire_rate = excluded.rehire_rate, repeat_partners = excluded.repeat_partners, streak = excluded.streak,
    best_streak = excluded.best_streak, disputes_lost = excluded.disputes_lost, points = excluded.points,
    level = excluded.level, updated_at = now();

  -- Badges by rule. Milestones are kept once earned; Top Rated, On-Time Pro and Hot Streak follow current numbers.
  delete from public.profile_badges where profile_id = p_id and code in ('top_rated', 'on_time_pro', 'hot_streak', 'verified_socials')
    and not (
      (code = 'top_rated' and coalesce(v_avg, 0) >= 4.8 and v_reviews >= 10) or
      (code = 'on_time_pro' and v_streak >= 10) or
      (code = 'hot_streak' and v_streak >= 5) or
      (code = 'verified_socials' and v_role = 'creator' and v_verified));
  insert into public.profile_badges (profile_id, code)
  select p_id, c from (values
    ('founding', v_founding),
    ('verified_socials', v_role = 'creator' and v_verified),
    ('top_rated', coalesce(v_avg, 0) >= 4.8 and v_reviews >= 10),
    ('on_time_pro', v_streak >= 10),
    ('hot_streak', v_streak >= 5),
    ('cosmic_collab', v_completed >= 1),
    ('elite', v_completed >= 40),
    ('fifty_collabs', v_completed >= 50)) b(c, ok)
  where ok
  on conflict do nothing;
end $$;
revoke all on function public.refresh_trust(uuid) from public, anon, authenticated;

-- Reveal reviews whose 14-day window has passed, then refresh the people affected. Called by the daily job.
create or replace function public.reveal_due_reviews()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_n int;
begin
  with done as (
    update public.reviews r set revealed_at = now()
      from public.orders o
     where r.order_id = o.id and r.revealed_at is null and o.approved_at < now() - interval '14 days'
    returning r.subject_id)
  select array_agg(distinct subject_id), count(*) into v_ids, v_n from done;
  if v_ids is not null then perform public.refresh_trust(x) from unnest(v_ids) x; end if;
  return coalesce(v_n, 0);
end $$;
revoke all on function public.reveal_due_reviews() from public, anon, authenticated;

create or replace function public.refresh_all_trust()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n int := 0; r record;
begin
  for r in select id from public.profiles where onboarded_at is not null and banned_at is null loop
    perform public.refresh_trust(r.id); v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.refresh_all_trust() from public, anon, authenticated;

grant execute on function public.refresh_trust(uuid), public.reveal_due_reviews(), public.refresh_all_trust() to service_role;

-- Seed everyone once so profiles show their badges right away.
select public.refresh_all_trust();
