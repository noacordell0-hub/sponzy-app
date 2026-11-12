-- PENDING APPROVAL. Defense in depth: the waitlist and app_config tables still carry Supabase's default
-- table grants to anon/authenticated. Row level security (no policies) already blocks all access, but
-- revoking the grants means a future policy mistake can't expose emails. The server uses the service role, unaffected.
revoke all on public.waitlist from anon, authenticated;
revoke all on public.app_config from anon, authenticated;
