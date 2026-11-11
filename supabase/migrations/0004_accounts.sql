-- Layer 1: accounts. Profiles (public), private profile data, linked socials, avatar storage.

-- ---------- profiles: one per auth user, publicly readable once onboarded ----------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            text check (role in ('creator', 'brand', 'admin')),
  display_name    text check (char_length(display_name) between 1 and 60),
  handle          text unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  bio             text check (char_length(bio) <= 600),
  tagline         text check (char_length(tagline) <= 120),
  audience        text check (char_length(audience) <= 160),
  niches          text[] not null default '{}' check (cardinality(niches) <= 8),
  location        text check (char_length(location) <= 80),
  theme           text not null default 'violet' check (theme in ('violet', 'sunset', 'ocean', 'gold', 'midnight')),
  avatar_source   text not null default 'auto' check (avatar_source in ('auto', 'pattern', 'upload')),
  avatar_pattern  smallint not null default 0 check (avatar_pattern between 0 and 5),
  avatar_url      text check (char_length(avatar_url) <= 500),
  taking_bookings boolean not null default true,
  deep_space      boolean not null default false,
  show_badges     boolean not null default true,
  show_audience   boolean not null default true,
  show_comments   boolean not null default true,
  show_rank       boolean not null default true,
  young_tag       boolean not null default false,
  is_founding     boolean not null default false,
  onboarded_at    timestamptz,
  banned_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- private profile data: only the owner can read it ----------
create table if not exists public.profile_private (
  id             uuid primary key references public.profiles(id) on delete cascade,
  birth_date     date,
  is_minor       boolean not null default false,
  guardian_name  text check (char_length(guardian_name) <= 80),
  guardian_email text check (guardian_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  email_prefs    jsonb not null default '{"orders": true, "messages": true, "product": true}',
  created_at     timestamptz not null default now()
);

-- ---------- linked social accounts ----------
create table if not exists public.social_accounts (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  platform    text not null check (platform in ('tiktok', 'instagram', 'youtube', 'x', 'twitch', 'facebook')),
  handle      text not null check (handle ~ '^[A-Za-z0-9_.]{1,40}$'),
  followers   bigint not null default 0 check (followers between 0 and 10000000000),
  verified    boolean not null default false,
  is_main     boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (profile_id, platform)
);
create index if not exists social_accounts_profile_idx on public.social_accounts(profile_id);

-- ---------- triggers ----------
-- New auth user -> empty profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh, and only allow the Young entrepreneur tag for minors.
create or replace function public.profiles_before_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if new.young_tag and not coalesce((select p.is_minor from public.profile_private p where p.id = new.id), false) then
    new.young_tag := false;
  end if;
  return new;
end $$;
drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update before update on public.profiles
  for each row execute function public.profiles_before_update();

-- The social account with the most followers is the "main" one (photo source).
create or replace function public.refresh_main_social()
returns trigger language plpgsql security definer set search_path = '' as $$
declare pid uuid := coalesce(new.profile_id, old.profile_id);
begin
  update public.social_accounts s
     set is_main = (s.id = (select s2.id from public.social_accounts s2
                             where s2.profile_id = pid order by s2.followers desc, s2.id limit 1))
   where s.profile_id = pid;
  return null;
end $$;
drop trigger if exists social_accounts_main on public.social_accounts;
create trigger social_accounts_main after insert or delete or update of followers on public.social_accounts
  for each row execute function public.refresh_main_social();

-- ---------- onboarding: the only way to set role, handle, age and Founding status ----------
create or replace function public.complete_onboarding(
  p_role text, p_display_name text, p_handle text, p_birth_date date,
  p_guardian_name text default null, p_guardian_email text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  years int;
  user_email text;
  founding boolean := false;
  founding_spots constant int := 1000;
begin
  if uid is null then raise exception 'Not signed in.'; end if;
  if exists (select 1 from public.profiles where id = uid and onboarded_at is not null) then
    raise exception 'Onboarding is already complete.';
  end if;
  if p_role not in ('creator', 'brand') then raise exception 'Choose creator or brand.'; end if;
  if p_birth_date is null or p_birth_date > current_date then raise exception 'Enter a valid date of birth.'; end if;

  years := date_part('year', age(current_date, p_birth_date));
  if years < 13 then raise exception 'You must be at least 13 to use Clouta.'; end if;
  if p_role = 'brand' and years < 18 then raise exception 'Brand accounts must be run by someone 18 or older.'; end if;
  if years < 18 and (p_guardian_email is null or p_guardian_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'Creators under 18 need a parent or guardian email.';
  end if;

  if p_handle !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'Handles use 3 to 30 lowercase letters, numbers or underscores.';
  end if;
  if exists (select 1 from public.profiles where handle = p_handle and id <> uid) then
    raise exception 'That handle is taken.';
  end if;

  -- Founding Creator: among the first founding_spots creators on the waitlist.
  select email into user_email from auth.users where id = uid;
  if p_role = 'creator' then
    select coalesce(rn <= founding_spots, false) into founding from (
      select email, row_number() over (order by created_at, id) as rn
      from public.waitlist where role = 'creator'
    ) w where lower(w.email::text) = lower(user_email);
    founding := coalesce(founding, false);
  end if;

  update public.profiles
     set role = p_role, display_name = trim(p_display_name), handle = p_handle,
         is_founding = founding, onboarded_at = now()
   where id = uid;

  insert into public.profile_private (id, birth_date, is_minor, guardian_name, guardian_email)
  values (uid, p_birth_date, years < 18, nullif(trim(p_guardian_name), ''), nullif(trim(p_guardian_email), ''))
  on conflict (id) do update set birth_date = excluded.birth_date, is_minor = excluded.is_minor,
    guardian_name = excluded.guardian_name, guardian_email = excluded.guardian_email;
end $$;

revoke all on function public.complete_onboarding(text, text, text, date, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text, date, text, text) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.profiles_before_update() from public, anon, authenticated;
revoke all on function public.refresh_main_social() from public, anon, authenticated;

-- ---------- Row Level Security and column permissions ----------
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.social_accounts enable row level security;

revoke all on public.profiles, public.profile_private, public.social_accounts from anon, authenticated;

-- profiles: anyone can read onboarded, unbanned profiles; owners read their own.
grant select on public.profiles to anon, authenticated;
create policy "profiles readable" on public.profiles for select
  using ((onboarded_at is not null and banned_at is null) or id = auth.uid());
-- Owners may edit only these columns (not role, Founding, ban or onboarding fields).
grant update (display_name, handle, bio, tagline, audience, niches, location, theme, avatar_source,
              avatar_pattern, avatar_url, taking_bookings, deep_space, show_badges, show_audience,
              show_comments, show_rank, young_tag) on public.profiles to authenticated;
create policy "profiles owner update" on public.profiles for update
  using (id = auth.uid() and banned_at is null) with check (id = auth.uid());

-- profile_private: owner only; only email preferences are editable.
grant select on public.profile_private to authenticated;
grant update (email_prefs) on public.profile_private to authenticated;
create policy "private owner read" on public.profile_private for select using (id = auth.uid());
create policy "private owner update" on public.profile_private for update using (id = auth.uid()) with check (id = auth.uid());

-- social_accounts: public when the profile is public; owners manage their own (not verified/is_main).
grant select on public.social_accounts to anon, authenticated;
grant insert (profile_id, platform, handle, followers) on public.social_accounts to authenticated;
grant update (handle, followers) on public.social_accounts to authenticated;
grant delete on public.social_accounts to authenticated;
create policy "socials readable" on public.social_accounts for select using (
  profile_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = profile_id and p.onboarded_at is not null and p.banned_at is null));
create policy "socials owner insert" on public.social_accounts for insert with check (profile_id = auth.uid());
create policy "socials owner update" on public.social_accounts for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "socials owner delete" on public.social_accounts for delete using (profile_id = auth.uid());

-- ---------- avatar uploads: public images, each user writes only to their own folder ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists "avatars owner insert" on storage.objects;
drop policy if exists "avatars owner update" on storage.objects;
drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
