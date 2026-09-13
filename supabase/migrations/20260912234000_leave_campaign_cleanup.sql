-- Player exit: remove all campaign-scoped data owned by the current player.
-- The account/profile remains intact. Masters cannot use this exit path.
create or replace function public.leave_campaign(p_campaign_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  member_role text;
  character_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select role::text into member_role
  from public.campaign_members
  where campaign_id = p_campaign_id
    and user_id = auth.uid()
  limit 1;

  if member_role is null then
    raise exception 'Você não participa desta campanha';
  end if;

  if member_role <> 'player' then
    raise exception 'O Mestre não pode sair desta forma';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[]) into character_ids
  from public.characters
  where campaign_id = p_campaign_id
    and user_id = auth.uid();

  delete from public.combat_loot_claims
   where campaign_id = p_campaign_id
     and user_id = auth.uid();

  delete from public.dice_rolls
   where campaign_id = p_campaign_id
     and user_id = auth.uid();

  delete from public.campaign_character_settings
   where campaign_id = p_campaign_id
     and character_id = any(character_ids);

  delete from public.campaign_presence
   where campaign_id = p_campaign_id
     and user_id = auth.uid();

  delete from public.characters
   where campaign_id = p_campaign_id
     and user_id = auth.uid();

  delete from public.campaign_members
   where campaign_id = p_campaign_id
     and user_id = auth.uid()
     and role::text = 'player';

  return true;
end;
$$;

revoke all on function public.leave_campaign(uuid) from public;
grant execute on function public.leave_campaign(uuid) to authenticated;
