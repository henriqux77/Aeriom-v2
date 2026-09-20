-- AERION: live clients subscribe to these two tables.
alter table public.campaign_system_settings replica identity full;
alter table public.characters replica identity full;
alter publication supabase_realtime add table public.campaign_system_settings;
alter publication supabase_realtime add table public.characters;
