-- AFTERLIFE: restore the public RPC endpoint used by the Master storage UI.
-- Authorization remains inside the SECURITY DEFINER function (master-only).
grant execute on function public.ensure_campaign_storage(uuid,text) to authenticated;
revoke execute on function public.ensure_campaign_storage(uuid,text) from anon;
