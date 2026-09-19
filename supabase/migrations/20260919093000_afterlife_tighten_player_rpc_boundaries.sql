-- AFTERLIFE: player RPC authorization hardening.
create or replace function public.add_campaign_mission_participant(p_mission_id uuid,p_character_id uuid)
returns public.campaign_mission_participants
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.campaign_mission_participants;
  cid uuid;
  uid uuid:=auth.uid();
  owner_id uuid;
begin
  select campaign_id into cid from public.campaign_missions where id=p_mission_id;
  if cid is null then raise exception 'MISSION_NOT_FOUND'; end if;
  select user_id into owner_id from public.characters
  where id=p_character_id and campaign_id=cid and status='completed';
  if owner_id is null then raise exception 'CHARACTER_NOT_AVAILABLE'; end if;
  if not public.afterlife_is_member(cid,uid) then raise exception 'NOT_CAMPAIGN_MEMBER'; end if;
  if not public.afterlife_is_master(cid,uid) and owner_id<>uid then raise exception 'NOT_ALLOWED'; end if;
  insert into public.campaign_mission_participants(mission_id,character_id)
  values(p_mission_id,p_character_id)
  on conflict(mission_id,character_id) do update set status='active'
  returning * into r;
  return r;
end $$;

revoke execute on function public.add_character_inventory_item(uuid,uuid,integer,text,jsonb) from anon,authenticated,public;
revoke execute on function public.append_campaign_event(uuid,text,text,text,uuid,jsonb) from anon,authenticated,public;
revoke execute on function public.ensure_campaign_storage(uuid,text) from anon,authenticated,public;
