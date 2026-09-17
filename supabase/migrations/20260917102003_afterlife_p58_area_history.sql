-- AFTERLIFE P5.8
-- Persistent readable history of actions performed inside an internal area.

create index if not exists campaign_exploration_tests_area_created_idx
  on public.campaign_exploration_tests(area_id, created_at desc);

create or replace function public.list_campaign_location_area_tests(
  p_area_id uuid,
  p_limit integer default 15
)
returns table (
  id uuid,
  character_id uuid,
  character_name text,
  action_key text,
  skill_key text,
  attribute_key text,
  die_sides integer,
  natural_roll integer,
  training_bonus integer,
  modifier integer,
  total integer,
  difficulty integer,
  result text,
  consequence text,
  noise_delta integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path='public'
as $function$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    raise exception 'Sessão necessária.';
  end if;

  select a.campaign_id into cid
  from public.campaign_location_areas a
  where a.id=p_area_id;

  if cid is null then
    raise exception 'Área não encontrada.';
  end if;

  if not exists (
    select 1
    from public.campaign_members m
    where m.campaign_id=cid
      and m.user_id=(select auth.uid())
  ) then
    raise exception 'Você não participa desta campanha.';
  end if;

  return query
  select
    t.id,
    t.character_id,
    coalesce(nullif(c.name,''),'Personagem') as character_name,
    t.action_key,
    t.skill_key,
    t.attribute_key,
    t.die_sides,
    t.natural_roll,
    t.training_bonus,
    t.modifier,
    t.total,
    t.difficulty,
    t.result,
    t.consequence,
    t.noise_delta,
    t.created_at
  from public.campaign_exploration_tests t
  left join public.characters c on c.id=t.character_id
  where t.area_id=p_area_id
    and t.campaign_id=cid
  order by t.created_at desc
  limit greatest(1,least(coalesce(p_limit,15),50));
end;
$function$;

revoke execute on function public.list_campaign_location_area_tests(uuid,integer) from anon, public;
grant execute on function public.list_campaign_location_area_tests(uuid,integer) to authenticated;
