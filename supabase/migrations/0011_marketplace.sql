-- Layer 2: marketplace. One shop-window post per creator, its services, brand profile fields,
-- saved creators, and a search function for Browse.

alter table public.profiles
  add column if not exists website text check (website is null or (char_length(website) <= 200 and website ~* '^https?://')),
  add column if not exists budget text check (char_length(budget) <= 40);
grant update (website, budget) on public.profiles to authenticated;

create table if not exists public.posts (
  id          bigint generated always as identity primary key,
  creator_id  uuid not null unique references public.profiles(id) on delete cascade,
  bio         text check (char_length(bio) <= 1000),
  platforms   text[] not null default '{}',
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint posts_platforms_valid check (platforms <@ array['tiktok','instagram','youtube','x','twitch','facebook']::text[])
);

create table if not exists public.services (
  id               bigint generated always as identity primary key,
  post_id          bigint not null references public.posts(id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  includes         text check (char_length(includes) <= 400),
  price_cents      integer not null check (price_cents between 500 and 10000000),
  turnaround_days  smallint not null check (turnaround_days between 1 and 90),
  revisions        smallint not null default 1 check (revisions between 0 and 5),
  is_bundle        boolean not null default false,
  position         smallint not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists services_post_idx on public.services(post_id);

create table if not exists public.saved_creators (
  brand_id    uuid not null references public.profiles(id) on delete cascade,
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (brand_id, creator_id)
);

-- Keep posts.updated_at fresh; cap services at 10 per post.
create or replace function public.posts_touch()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts for each row execute function public.posts_touch();

create or replace function public.services_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.services where post_id = new.post_id) >= 10 then
    raise exception 'You can list up to 10 services.';
  end if;
  return new;
end $$;
drop trigger if exists services_limit on public.services;
create trigger services_limit before insert on public.services for each row execute function public.services_limit();
revoke all on function public.services_limit() from public, anon, authenticated;
revoke all on function public.posts_touch() from public, anon, authenticated;

-- ---------- Row Level Security ----------
alter table public.posts enable row level security;
alter table public.services enable row level security;
alter table public.saved_creators enable row level security;
revoke all on public.posts, public.services, public.saved_creators from anon, authenticated;

-- posts: public when published (and the creator's profile is public); creators manage their own.
grant select on public.posts to anon, authenticated;
grant insert (creator_id, bio, platforms, published) on public.posts to authenticated;
grant update (bio, platforms, published) on public.posts to authenticated;
create policy "posts readable" on public.posts for select using (
  creator_id = auth.uid() or (published and exists (
    select 1 from public.profiles p where p.id = creator_id and p.onboarded_at is not null and p.banned_at is null)));
create policy "posts creator insert" on public.posts for insert with check (
  creator_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'creator'));
create policy "posts creator update" on public.posts for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());

-- services: visible with their post; the post's creator manages them.
grant select on public.services to anon, authenticated;
grant insert (post_id, name, includes, price_cents, turnaround_days, revisions, is_bundle, position) on public.services to authenticated;
grant update (name, includes, price_cents, turnaround_days, revisions, is_bundle, position) on public.services to authenticated;
grant delete on public.services to authenticated;
create policy "services readable" on public.services for select using (
  exists (select 1 from public.posts po where po.id = post_id));  -- inherits the posts policy
create policy "services owner insert" on public.services for insert with check (
  exists (select 1 from public.posts po where po.id = post_id and po.creator_id = auth.uid()));
create policy "services owner update" on public.services for update using (
  exists (select 1 from public.posts po where po.id = post_id and po.creator_id = auth.uid()));
create policy "services owner delete" on public.services for delete using (
  exists (select 1 from public.posts po where po.id = post_id and po.creator_id = auth.uid()));

-- saved creators: private to the person who saved them.
grant select, insert, delete on public.saved_creators to authenticated;
create policy "saved owner read" on public.saved_creators for select using (brand_id = auth.uid());
create policy "saved owner insert" on public.saved_creators for insert with check (brand_id = auth.uid() and creator_id <> auth.uid());
create policy "saved owner delete" on public.saved_creators for delete using (brand_id = auth.uid());

-- ---------- Browse search (runs with the caller's permissions, so RLS applies) ----------
create or replace function public.search_creators(
  p_q text default null,
  p_niche text default null,
  p_platform text default null,
  p_min_price integer default null,
  p_max_price integer default null,
  p_tier text default null,              -- nano | micro | mid | macro (verified followers)
  p_verified_only boolean default false,
  p_founding_only boolean default false,
  p_young_only boolean default false,
  p_bookable_only boolean default false,
  p_sort text default 'recommended',     -- recommended | price_asc | price_desc | followers | newest
  p_limit integer default 24,
  p_offset integer default 0
) returns table (
  id uuid, handle text, display_name text, tagline text, niches text[], theme text,
  avatar_source text, avatar_pattern smallint, avatar_url text, is_founding boolean, young_tag boolean,
  taking_bookings boolean, min_price_cents integer, service_count integer, platforms text[],
  verified_followers bigint, total_followers bigint, has_verified boolean, main_platform text, published_at timestamptz
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
           (select sa.platform from public.social_accounts sa where sa.profile_id = p.id and sa.is_main limit 1) as main_platform
    from public.profiles p
    join public.posts po on po.creator_id = p.id and po.published
    where p.role = 'creator'
  )
  select b.id, b.handle, b.display_name, b.tagline, b.niches, b.theme, b.avatar_source, b.avatar_pattern, b.avatar_url,
         b.is_founding, b.young_tag, b.taking_bookings, b.min_price_cents, b.service_count, b.platforms,
         b.verified_followers, b.total_followers, coalesce(b.has_verified, false), b.main_platform, b.published_at
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
  order by
    case when p_sort = 'price_asc' then b.min_price_cents end asc nulls last,
    case when p_sort = 'price_desc' then b.min_price_cents end desc nulls last,
    case when p_sort = 'followers' then b.verified_followers end desc nulls last,
    case when p_sort = 'newest' then b.published_at end desc nulls last,
    coalesce(b.has_verified, false) desc, b.taking_bookings desc, b.verified_followers desc, b.published_at desc
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_creators(text, text, text, integer, integer, text, boolean, boolean, boolean, boolean, text, integer, integer) to anon, authenticated;
