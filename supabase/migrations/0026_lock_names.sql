-- Names and handles are permanent once someone finishes sign-up, like on other professional marketplaces:
-- brands and creators always know who they're dealing with, and profile links never break.
-- They are set once by complete_onboarding (security definer). Members can no longer update them;
-- the Clouta team can still correct a genuine typo with the service role.
revoke update (display_name, handle) on public.profiles from authenticated;
