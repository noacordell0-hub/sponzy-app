-- Layer 4: accepted offers can now be checked out; update the system message.
create or replace function public.respond_offer(p_message bigint, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.messages%rowtype; me uuid := auth.uid(); who text; verb text;
begin
  select * into m from public.messages where id = p_message for update;
  if not found or m.kind <> 'offer' or not public.is_thread_member(m.thread_id) then raise exception 'Offer not found.'; end if;
  if m.offer_status <> 'pending' then raise exception 'This offer has already been answered.'; end if;
  if p_action in ('accept', 'decline') and m.sender_id = me then raise exception 'You can''t answer your own offer.'; end if;
  if p_action = 'withdraw' and m.sender_id is distinct from me then raise exception 'Only the sender can withdraw an offer.'; end if;
  if p_action not in ('accept', 'decline', 'withdraw') then raise exception 'Unknown action.'; end if;

  update public.messages
     set offer_status = case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'withdrawn' end
   where id = m.id;

  select coalesce(display_name, 'Someone') into who from public.profiles where id = me;
  verb := case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'withdrew' end;
  insert into public.messages (thread_id, sender_id, kind, body)
  values (m.thread_id, null, 'system',
          format('%s %s the offer "%s".', who, verb, m.offer->>'title')
          || case when p_action = 'accept' then ' The brand can now check out to place the order.' else '' end);
end $$;

