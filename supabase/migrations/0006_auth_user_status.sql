-- Server-only helper for password sign-up: does an account exist for this email,
-- does it have a password, and has it finished onboarding?
create or replace function public.auth_user_status(p_email text)
returns table (user_id uuid, has_password boolean, onboarded boolean)
language sql stable security definer set search_path = '' as $$
  select u.id,
         coalesce(u.encrypted_password, '') <> '',
         exists (select 1 from public.profiles p where p.id = u.id and p.onboarded_at is not null)
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
$$;
revoke all on function public.auth_user_status(text) from public, anon, authenticated;
grant execute on function public.auth_user_status(text) to service_role;
