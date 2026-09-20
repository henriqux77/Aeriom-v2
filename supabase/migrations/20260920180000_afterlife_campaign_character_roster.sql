-- AFTERLIFE: campaign character roster projection.
create or replace function public.list_campaign_visible_characters(p_campaign_id uuid)
returns table(
  character_id uuid,
  user_id uuid,
  owner_name text,
  name text,
  race text,
  class text,
  power text,
  status text,
  hp_current integer,
  hp_max integer,
  mana_current integer,
  mana_max integer,
  defense integer,
  movement integer,
  xp_total integer,
  avatar_path text
)
language plpgsql
security definer
stable
set search_path=public
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not public.afterlife_is_member(p_campaign_id,uid) then
    raise exception 'not_campaign_member' using errcode='42501';
  end if;

  return query
  select c.id,c.user_id,
         coalesce(nullif(trim(p.display_name),''),'Sobrevivente'),
         coalesce(nullif(trim(c.name),''),'Sobrevivente'),
         coalesce(c.race,'Humano'),
         coalesce(c.class,'Sobrevivente'),
         c.power,c.status,c.hp_current,c.hp_max,c.mana_current,c.mana_max,
         c.defense,c.movement,c.xp_total,c.avatar_path
  from public.characters c
  left join public.profiles p on p.id=c.user_id
  where c.campaign_id=p_campaign_id
    and c.status='completed'
  order by c.updated_at desc;
end
$$;

revoke all on function public.list_campaign_visible_characters(uuid) from public,anon;
grant execute on function public.list_campaign_visible_characters(uuid) to authenticated;
