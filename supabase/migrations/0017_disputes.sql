-- Layer 5 part 2: disputes. Either side can open one before approval; the order pauses, the other side has
-- 48 hours to respond, then an admin refunds, pays, or splits. All writes happen in server code (service role).

create table if not exists public.disputes (
  id                 bigint generated always as identity primary key,
  order_id           bigint not null references public.orders(id) on delete cascade,
  opened_by          uuid references public.profiles(id) on delete set null,
  opener_role        text not null check (opener_role in ('brand', 'creator')),
  reason             text not null check (reason in ('not_delivered', 'not_as_agreed', 'late', 'unresponsive', 'unfair_request', 'other')),
  statement          text not null check (char_length(statement) between 20 and 3000),
  evidence           text[] not null default '{}' check (cardinality(evidence) <= 5),
  response           text check (char_length(response) <= 3000),
  response_evidence  text[] not null default '{}' check (cardinality(response_evidence) <= 5),
  responded_at       timestamptz,
  respond_by         timestamptz not null,
  prev_status        text not null,
  status             text not null default 'open' check (status in ('open', 'resolved', 'withdrawn')),
  decision           text check (decision in ('refund', 'pay', 'split')),
  split_pct          smallint check (split_pct between 0 and 100),   -- creator's share of the payout for a split
  refund_cents       integer,
  payout_cents       integer,
  decision_note      text check (char_length(decision_note) <= 2000),
  decided_by         uuid references public.profiles(id) on delete set null,
  decided_at         timestamptz,
  created_at         timestamptz not null default now()
);
create unique index if not exists disputes_one_open on public.disputes(order_id) where status = 'open';
create index if not exists disputes_status_idx on public.disputes(status, created_at);

alter table public.disputes enable row level security;
revoke all on public.disputes from anon, authenticated;
grant select on public.disputes to authenticated;
create policy "disputes parties read" on public.disputes for select to authenticated using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and auth.uid() in (o.brand_id, o.creator_id)));

-- Recompute trust with disputes counted (lost disputes lower the score and reset streaks).
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

  -- Disputes lost: an admin ruled mostly against this person.
  select count(*) into v_disputes_lost
    from public.disputes d join public.orders o on o.id = d.order_id
   where d.status = 'resolved' and (
     (v_role = 'creator' and o.creator_id = p_id and (d.decision = 'refund' or (d.decision = 'split' and d.split_pct < 50))) or
     (v_role = 'brand' and o.brand_id = p_id and (d.decision = 'pay' or (d.decision = 'split' and d.split_pct > 50))));

  -- Streak: consecutive on-time completed orders with no dispute, newest first (creators). A late or disputed order resets it.
  if v_role = 'creator' then
    for r in select (o.submitted_at is not null and (o.submitted_at at time zone 'America/Los_Angeles')::date <= o.post_by
                     and not exists (select 1 from public.disputes d where d.order_id = o.id)) as on_time
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
           + 15 * case when v_completed + v_disputes_lost > 0 then greatest(0, 1 - v_disputes_lost::numeric / (v_completed + v_disputes_lost)) else 1 end
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
grant execute on function public.refresh_trust(uuid) to service_role;
