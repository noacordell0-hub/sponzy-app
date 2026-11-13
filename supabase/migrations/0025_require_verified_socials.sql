-- Verification is required, no exceptions:
-- 1) a creator's shop can only be published once at least one social account is verified;
-- 2) if their last verified account loses its ✓ (edited, removed, or rejected), the shop is unpublished automatically;
-- 3) other people can only see a creator's verified accounts, so self-reported follower counts are never shown.

create or replace function public.creator_has_verified_social(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.social_accounts s where s.profile_id = p_profile_id and s.verified);
$$;
revoke all on function public.creator_has_verified_social(uuid) from public, anon;
grant execute on function public.creator_has_verified_social(uuid) to authenticated;

-- (1) publishing needs a verified account
create or replace function public.posts_require_verified()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.published and (tg_op = 'INSERT' or not coalesce(old.published, false))
     and not public.creator_has_verified_social(new.creator_id) then
    raise exception 'Verify at least one social account before publishing your shop.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.posts_require_verified() from public, anon, authenticated;
drop trigger if exists posts_require_verified on public.posts;
create trigger posts_require_verified before insert or update of published on public.posts
  for each row execute function public.posts_require_verified();

-- (2) losing the last verified account hides the shop
-- (fires on any update: editing a verified handle clears the ✓ in a BEFORE trigger, which "update of verified" would miss)
create or replace function public.socials_unpublish_if_unverified()
returns trigger language plpgsql security definer set search_path = '' as $$
declare pid uuid := coalesce(new.profile_id, old.profile_id);
begin
  -- only matters when an account that was verified stops being verified (or is removed)
  if not old.verified or (tg_op = 'UPDATE' and new.verified) then return null; end if;
  if not public.creator_has_verified_social(pid) then
    update public.posts set published = false where creator_id = pid and published;
  end if;
  return null;
end $$;
revoke all on function public.socials_unpublish_if_unverified() from public, anon, authenticated;
drop trigger if exists socials_unpublish_if_unverified on public.social_accounts;
create trigger socials_unpublish_if_unverified after update or delete on public.social_accounts
  for each row execute function public.socials_unpublish_if_unverified();

-- (3) only verified accounts are public (owners still see all of theirs; admins use their own functions;
--     brand accounts are not verified, so theirs stay public)
drop policy if exists "socials readable" on public.social_accounts;
create policy "socials readable" on public.social_accounts for select using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.onboarded_at is not null and p.banned_at is null
      and (p.role <> 'creator' or social_accounts.verified)));

-- Any shop already live without a verified account goes back to draft.
update public.posts po set published = false
 where po.published and not public.creator_has_verified_social(po.creator_id);
