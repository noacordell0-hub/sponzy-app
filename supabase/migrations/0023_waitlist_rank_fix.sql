-- PENDING APPROVAL. Fix: "each friend moves you up 5 spots" moved people up only 4 when scores tied,
-- because ties went to the earlier signup. Ties now go to the person with more invites, so one invite = exactly 5 spots.
create or replace function public.waitlist_status(p_code text)
 returns table(position_in_line bigint, referrals bigint, total bigint)
 language sql stable security definer set search_path to 'public'
as $function$
  with ranked as (
    select w.id, w.referral_code,
           row_number() over (order by w.created_at, w.id) as base_pos,
           (select count(*) from public.waitlist r where r.referred_by = w.id) as refs
    from public.waitlist w
  ),
  scored as (
    select id, referral_code, refs, base_pos - 5 * refs as score, base_pos from ranked
  )
  select
    (select count(*) from scored s2
      where (s2.score, -s2.refs, s2.base_pos) < (me.score, -me.refs, me.base_pos)) + 1,
    me.refs,
    (select count(*) from scored)
  from scored me
  where me.referral_code = p_code;
$function$;
