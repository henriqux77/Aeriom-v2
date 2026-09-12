-- Fix authenticated API access for the Master Dashboard.
-- RLS policies remain the authorization boundary; these grants only allow
-- PostgREST to evaluate SELECT/INSERT/UPDATE/DELETE against the tables.
grant select, insert, update, delete on table public.campaign_live_media to authenticated;
grant select, insert, update, delete on table public.campaign_character_settings to authenticated;
revoke select, insert, update, delete on table public.campaign_live_media from anon;
revoke select, insert, update, delete on table public.campaign_character_settings from anon;
