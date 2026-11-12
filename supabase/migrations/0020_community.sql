-- Layer 5 part 4: community comments on creator profiles, and the leaderboard.

create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  parent_id   bigint references public.comments(id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 500),
  like_count  integer not null default 0,
  hidden_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists comments_creator_idx on public.comments(creator_id, created_at desc);

create table if not exists public.comment_likes (
  comment_id  bigint not null references public.comments(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, profile_id)
);

alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
revoke all on public.comments, public.comment_likes from anon, authenticated;

grant select on public.comments to anon, authenticated;
grant insert (creator_id, author_id, parent_id, body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

-- Visible when not hidden by an admin and the creator has comments switched on.
create policy "comments public" on public.comments for select to anon, authenticated using (
  hidden_at is null and exists (select 1 from public.profiles p where p.id = creator_id and p.show_comments and p.banned_at is null));
-- Signed-in, not banned, not blocked by the creator, and the creator allows comments.
create policy "comments add" on public.comments for insert to authenticated with check (
  author_id = auth.uid()
  and exists (select 1 from public.profiles me where me.id = auth.uid() and me.onboarded_at is not null and me.banned_at is null)
  and exists (select 1 from public.profiles c where c.id = creator_id and c.role = 'creator' and c.show_comments and c.banned_at is null)
  and not exists (select 1 from public.blocks b where (b.blocker_id = creator_id and b.blocked_id = auth.uid()) or (b.blocker_id = auth.uid() and b.blocked_id = creator_id)));
-- Authors delete their own; creators can remove comments on their own page.
create policy "comments remove" on public.comments for delete to authenticated using (author_id = auth.uid() or creator_id = auth.uid());

grant select, insert, delete on public.comment_likes to authenticated;
create policy "likes own read" on public.comment_likes for select to authenticated using (profile_id = auth.uid());
create policy "likes own add" on public.comment_likes for insert to authenticated with check (profile_id = auth.uid());
create policy "likes own remove" on public.comment_likes for delete to authenticated using (profile_id = auth.uid());

-- Replies stay one level deep and on the same page; 10 comments an hour per person.
create or replace function public.comments_before_insert()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare parent public.comments%rowtype; recent int;
begin
  new.body := btrim(new.body);
  if new.parent_id is not null then
    select * into parent from public.comments where id = new.parent_id;
    if parent.id is null or parent.creator_id <> new.creator_id then raise exception 'That comment no longer exists.'; end if;
    if parent.parent_id is not null then new.parent_id := parent.parent_id; end if;
  end if;
  select count(*) into recent from public.comments where author_id = new.author_id and created_at > now() - interval '1 hour';
  if recent >= 10 then raise exception 'You''re commenting a lot. Please wait a bit.'; end if;
  return new;
end $$;
drop trigger if exists comments_before_insert on public.comments;
create trigger comments_before_insert before insert on public.comments for each row execute function public.comments_before_insert();

create or replace function public.comment_likes_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.comments set like_count = (select count(*) from public.comment_likes l where l.comment_id = coalesce(new.comment_id, old.comment_id))
   where id = coalesce(new.comment_id, old.comment_id);
  return null;
end $$;
revoke all on function public.comment_likes_count() from public, anon, authenticated;
drop trigger if exists comment_likes_count on public.comment_likes;
create trigger comment_likes_count after insert or delete on public.comment_likes for each row execute function public.comment_likes_count();

-- ---------- Leaderboard ----------
-- Boards: top_rated (min 5 reviews), streak (current on-time streak), rising (accounts under 90 days, by orbit points).
-- Periods: week, season (calendar quarter), all. Creators who switched off "show rank" are left out.
create or replace function public.leaderboard(p_board text, p_period text default 'all', p_limit integer default 50)
returns table (rank bigint, id uuid, handle text, display_name text, avatar_source text, avatar_pattern smallint, avatar_url text,
               value numeric, detail integer, level text)
language sql stable security definer set search_path = '' as $$
  with since as (
    select case p_period when 'week' then now() - interval '7 days'
                         when 'season' then date_trunc('quarter', now())
                         else '-infinity'::timestamptz end as t
  ),
  eligible as (
    select p.id, p.handle, p.display_name, p.avatar_source, p.avatar_pattern, p.avatar_url, p.created_at, ts.streak, ts.level, ts.review_count
      from public.profiles p left join public.trust_scores ts on ts.profile_id = p.id
     where p.role = 'creator' and p.onboarded_at is not null and p.banned_at is null and p.browse_hidden_at is null and p.show_rank
  ),
  scored as (
    select e.*,
      case p_board
        when 'top_rated' then (select avg(r.overall) from public.reviews r, since
                                where r.subject_id = e.id and r.revealed_at is not null and r.hidden_at is null and r.created_at >= since.t)
        when 'streak' then e.streak
        when 'rising' then (select coalesce(sum(10 + case when o.submitted_at is not null and (o.submitted_at at time zone 'America/Los_Angeles')::date <= o.post_by then 5 else 0 end), 0)
                              from public.orders o, since where o.creator_id = e.id and o.status in ('approved', 'paid') and o.approved_at >= since.t)
      end::numeric as value,
      case p_board
        when 'top_rated' then (select count(*)::int from public.reviews r, since
                                where r.subject_id = e.id and r.revealed_at is not null and r.hidden_at is null and r.created_at >= since.t)
        else (select count(*)::int from public.orders o, since where o.creator_id = e.id and o.status in ('approved', 'paid') and o.approved_at >= since.t)
      end as detail
    from eligible e
    where p_board <> 'rising' or e.created_at > now() - interval '90 days'
  )
  select rank() over (order by s.value desc, s.detail desc), s.id, s.handle, s.display_name, s.avatar_source, s.avatar_pattern, s.avatar_url,
         round(s.value, 2), s.detail, coalesce(s.level, 'comet')
    from scored s
   where s.value is not null and s.value > 0
     and (p_board <> 'top_rated' or coalesce(s.review_count, 0) >= 5)
   order by 1, s.display_name
   limit least(greatest(p_limit, 1), 100);
$$;
grant execute on function public.leaderboard(text, text, integer) to anon, authenticated;
