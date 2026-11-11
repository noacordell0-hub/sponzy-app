-- Private beta gate enforced in the database: only waitlist members can finish onboarding
-- while app_config.beta_open is false. At public launch run:
--   update public.app_config set beta_open = true;
-- (and set BETA_OPEN=true in Vercel so the sign-up page stops checking too).
create table if not exists public.app_config (
  id boolean primary key default true check (id),
  beta_open boolean not null default false
);
insert into public.app_config (id) values (true) on conflict do nothing;
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

-- Redefine onboarding with the beta check.
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
  select email into user_email from auth.users where id = uid;
  if not coalesce((select beta_open from public.app_config limit 1), false)
     and not exists (select 1 from public.waitlist w where lower(w.email::text) = lower(user_email)) then
    raise exception 'Clouta is in private beta. Join the waitlist with this email to get access.';
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
