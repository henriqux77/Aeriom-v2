-- AERION: trigger function, not a frontend RPC.
revoke execute on function public.aerion_log_combat_event_to_timeline() from anon,authenticated,public;
