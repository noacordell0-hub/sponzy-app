-- Anti-scam rules found by thinking like a dishonest creator.

-- 1) Messages that push payment outside Clouta (Venmo, Cash App, PayPal, gift cards, crypto…) or look like phishing
--    are flagged for the Clouta team automatically (reporter_id null = "flagged by the system").
create or replace function public.flag_risky_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_reason text;
begin
  if new.kind <> 'text' or new.sender_id is null or new.body is null then return new; end if;
  if new.body ~* '\m(venmo|cash ?app|paypal|zelle|western union|moneygram|gift ?cards?|(pay|send)( me| you)? (in |with )?(crypto|bitcoin|btc|usdt|eth)|wire (me|the money|transfer))\M' then
    v_reason := 'Asked to pay outside Clouta';
  elsif new.body ~* '\m(verify (your )?(account|identity|payment)|confirm (your )?(payment|account|card)|(clouta|stripe) (support|team|security|verification)|send (me )?(the|your) (code|otp|password))\M' then
    v_reason := 'Looks like phishing';
  else
    return new;
  end if;
  insert into public.reports (reporter_id, target_type, target_id, target_profile_id, reason, details)
  values (null, 'message', new.id::text, new.sender_id, 'scam', 'Auto-flag: ' || v_reason || ' — "' || left(new.body, 300) || '"');
  return new;
exception when others then
  return new; -- flagging must never stop a message from sending
end $$;
revoke all on function public.flag_risky_message() from public, anon, authenticated;
drop trigger if exists messages_flag_risky on public.messages;
create trigger messages_flag_risky after insert on public.messages for each row execute function public.flag_risky_message();

-- 2) Nobody can pose as Clouta staff: reserved handles and names are refused when set or changed.
--    (Existing accounts are untouched; the check runs only when the value changes.)
create or replace function public.profiles_reserved_names()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.handle is distinct from old.handle and new.handle ~* '^(clouta|admin|administrator|support|help|helpdesk|official|staff|moderator|mod|team|security|billing|payments?|stripe|verify|verification|trust|safety)(_|$)' then
    raise exception 'That handle is reserved. Please choose another.' using errcode = 'P0001';
  end if;
  if new.display_name is distinct from old.display_name and new.display_name ~* '\m(clouta|administrator|admin|moderator|support team|customer support|customer service|verification team)\M' then
    raise exception 'That name is reserved. Please use your own name or brand name.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.profiles_reserved_names() from public, anon, authenticated;
drop trigger if exists profiles_reserved_names on public.profiles;
create trigger profiles_reserved_names before update of handle, display_name on public.profiles
  for each row execute function public.profiles_reserved_names();

-- 3) Self-booking to farm reviews: do two accounts sign in from the same network? (Used only by the server to flag for review;
--    shared homes and offices are normal, so this never blocks anything on its own.)
create or replace function public.accounts_share_ip(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s1 join auth.sessions s2 on s1.ip = s2.ip
    where s1.user_id = p_a and s2.user_id = p_b and s1.ip is not null
      and s1.created_at > now() - interval '60 days' and s2.created_at > now() - interval '60 days');
$$;
revoke all on function public.accounts_share_ip(uuid, uuid) from public, anon, authenticated;
grant execute on function public.accounts_share_ip(uuid, uuid) to service_role;

-- 4) Waitlist: one place per inbox. joe+2@gmail.com and j.o.e@gmail.com are the same inbox as joe@gmail.com,
--    so they can't take extra spots or farm referral credit. (Mirrors normalizeEmail in src/lib/fraud.ts.)
create or replace function public.normalize_email(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when split_part(lower(trim(p)), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(trim(p)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(lower(trim(p)), '@', 1), '+', 1) || '@' || split_part(lower(trim(p)), '@', 2)
  end;
$$;
alter table public.waitlist add column if not exists email_normalized text;
update public.waitlist set email_normalized = public.normalize_email(email) where email_normalized is null;
create index if not exists waitlist_email_normalized_idx on public.waitlist (email_normalized);
create or replace function public.waitlist_set_normalized()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.email_normalized := public.normalize_email(new.email);
  return new;
end $$;
revoke all on function public.waitlist_set_normalized() from public, anon, authenticated;
drop trigger if exists waitlist_set_normalized on public.waitlist;
create trigger waitlist_set_normalized before insert or update of email on public.waitlist
  for each row execute function public.waitlist_set_normalized();
