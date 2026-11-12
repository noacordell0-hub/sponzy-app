-- Social account verification (bio-code check reviewed by an admin) and the two integrity fixes:
-- 1) editing a verified account's handle or followers removes its verification;
-- 2) once a handle is verified on a platform, nobody else can claim it.

alter table public.profiles add column if not exists is_admin boolean not null default false;

alter table public.social_accounts
  add column if not exists verify_code text,
  add column if not exists verify_requested_at timestamptz,
  add column if not exists verified_at timestamptz;

-- (2) one verified owner per platform handle
create unique index if not exists social_accounts_verified_handle_uniq
  on public.social_accounts (platform, lower(handle)) where verified;

-- (1) user edits to handle/followers drop verification (admin functions run as the owner role, not 'authenticated')
create or replace function public.social_accounts_before_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user = 'authenticated'
     and (new.handle is distinct from old.handle or new.followers is distinct from old.followers) then
    new.verified := false;
    new.verified_at := null;
    new.verify_requested_at := null;
  end if;
  return new;
end $$;
drop trigger if exists social_accounts_before_update on public.social_accounts;
create trigger social_accounts_before_update before update on public.social_accounts
  for each row execute function public.social_accounts_before_update();

-- Creator asks to verify one of their accounts: returns the code to put in their bio.
create or replace function public.request_social_verification(p_social_id bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare s public.social_accounts%rowtype; code text;
begin
  select * into s from public.social_accounts where id = p_social_id;
  if not found or s.profile_id is distinct from auth.uid() then raise exception 'Account not found.'; end if;
  if s.verified then raise exception 'This account is already verified.'; end if;
  if exists (select 1 from public.social_accounts o where o.verified and o.platform = s.platform and lower(o.handle) = lower(s.handle)) then
    raise exception 'This handle is already verified by another Clouta account. If it is yours, please report it.';
  end if;
  code := coalesce(s.verify_code, 'clouta-' || upper(substr(md5(random()::text || s.id::text), 1, 4)));
  update public.social_accounts set verify_code = code, verify_requested_at = now() where id = s.id;
  return code;
end $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- Admin: pending verification requests.
create or replace function public.admin_pending_verifications()
returns table (id bigint, platform text, handle text, followers bigint, verify_code text, verify_requested_at timestamptz,
               display_name text, profile_handle text, is_minor boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
    select s.id, s.platform, s.handle, s.followers, s.verify_code, s.verify_requested_at,
           p.display_name, p.handle, coalesce(pp.is_minor, false)
    from public.social_accounts s
    join public.profiles p on p.id = s.profile_id
    left join public.profile_private pp on pp.id = s.profile_id
    where s.verify_requested_at is not null and not s.verified
    order by s.verify_requested_at;
end $$;

-- Admin: approve (with the real follower count seen on the profile) or reject a request.
create or replace function public.admin_review_social(p_social_id bigint, p_approve boolean, p_followers bigint default null)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.social_accounts%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  select * into s from public.social_accounts where id = p_social_id;
  if not found then raise exception 'Account not found.'; end if;
  if p_approve then
    if p_followers is null or p_followers < 0 then raise exception 'Enter the follower count shown on the profile.'; end if;
    if exists (select 1 from public.social_accounts o where o.verified and o.id <> s.id and o.platform = s.platform and lower(o.handle) = lower(s.handle)) then
      raise exception 'Another Clouta account already verified this handle.';
    end if;
    update public.social_accounts
       set verified = true, verified_at = now(), followers = p_followers, verify_code = null, verify_requested_at = null
     where id = s.id;
  else
    update public.social_accounts set verify_code = null, verify_requested_at = null where id = s.id;
  end if;
end $$;

revoke all on function public.social_accounts_before_update() from public, anon, authenticated;
revoke all on function public.request_social_verification(bigint) from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_pending_verifications() from public, anon;
revoke all on function public.admin_review_social(bigint, boolean, bigint) from public, anon;
grant execute on function public.request_social_verification(bigint) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_pending_verifications() to authenticated;
grant execute on function public.admin_review_social(bigint, boolean, bigint) to authenticated;
