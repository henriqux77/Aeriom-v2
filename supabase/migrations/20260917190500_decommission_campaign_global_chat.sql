-- AFTERLIFE campaign chat is retired: keep the physical table for safe rollback/history,
-- but disable browser/API access and Realtime streaming.
revoke execute on function public.list_campaign_messages(uuid, integer, uuid) from anon, authenticated;
revoke execute on function public.send_campaign_message(uuid, text, text, jsonb) from anon, authenticated;
revoke execute on function public.delete_campaign_message(uuid) from anon, authenticated;

alter publication supabase_realtime drop table public.campaign_messages;

drop policy if exists campaign_messages_insert_member on public.campaign_messages;
drop policy if exists campaign_messages_select_member on public.campaign_messages;
