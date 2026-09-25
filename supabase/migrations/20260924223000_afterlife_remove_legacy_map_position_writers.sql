-- AFTERLIFE 2026-09-24: remove legacy member-wide map writers.
revoke execute on function public.ensure_campaign_map_positions(uuid) from authenticated,anon,public;
revoke execute on function public.ensure_campaign_map_position(uuid) from authenticated,anon,public;

create or replace function public.mark_campaign_presence_offline(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then return; end if;
  if not exists(
    select 1 from public.campaign_members
    where campaign_id=p_campaign_id and user_id=uid
  ) then
    return;
  end if;
  update public.campaign_presence
  set is_online=false,last_seen_at=now()
  where campaign_id=p_campaign_id and user_id=uid;
end;
$$;

revoke all on function public.mark_campaign_presence_offline(uuid) from public,anon;
grant execute on function public.mark_campaign_presence_offline(uuid) to authenticated;
