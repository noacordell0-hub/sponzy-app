-- Email-link sign-ups get a random hidden password from Supabase, so "has a password"
-- can't tell whether the person ever chose one. Use "has ever signed in" instead.
drop function if exists public.auth_user_status(text);
create function public.auth_user_status(p_email text)
returns table (user_id uuid, ever_signed_in boolean, onboarded boolean)
language sql stable security definer set search_path = '' as $$
  select u.id,
         u.last_sign_in_at is not null,
         exists (select 1 from public.profiles p where p.id = u.id and p.onboarded_at is not null)
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
$$;
revoke all on function public.auth_user_status(text) from public, anon, authenticated;
grant execute on function public.auth_user_status(text) to service_role;
