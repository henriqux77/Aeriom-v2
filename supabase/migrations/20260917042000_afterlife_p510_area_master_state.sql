-- AFTERLIFE P5.10
-- Mestre controla o estado narrativo de uma área sem apagar o histórico.

create or replace function public.set_campaign_location_area_state(
  p_area_id uuid,
  p_status text default null,
  p_investigated boolean default null,
  p_note text default null
)
returns public.campaign_location_areas
language plpgsql
security definer
set search_path='public'
as $function$
declare
  uid uuid := auth.uid();
  area public.campaign_location_areas%rowtype;
  next_state jsonb;
begin
  if uid is null then raise exception 'Sessão necessária.'; end if;

  select a.* into area
  from public.campaign_location_areas a
  where a.id=p_area_id
  for update;
  if not found then raise exception 'Área não encontrada.'; end if;

  if not exists (
    select 1 from public.campaign_members m
    where m.campaign_id=area.campaign_id
      and m.user_id=(select auth.uid())
      and m.role='master'
  ) then raise exception 'master_required'; end if;

  if p_status is not null and p_status not in ('unknown','identified','searched','revealed') then
    raise exception 'Estado de área inválido.';
  end if;

  next_state := coalesce(area.state,'{}'::jsonb);
  if p_status is not null then next_state := jsonb_set(next_state,'{status}',to_jsonb(p_status),true); end if;
  if p_investigated is not null then next_state := jsonb_set(next_state,'{investigated}',to_jsonb(p_investigated),true); end if;
  if p_note is not null then next_state := jsonb_set(next_state,'{master_note}',to_jsonb(left(trim(p_note),500)),true); end if;
  next_state := jsonb_set(next_state,'{master_updated_at}',to_jsonb(now()),true);

  update public.campaign_location_areas
  set state=next_state, updated_at=now()
  where id=p_area_id
  returning * into area;

  return area;
end;
$function$;

create or replace function public.reset_campaign_location_area_exploration(p_area_id uuid)
returns public.campaign_location_areas
language plpgsql
security definer
set search_path='public'
as $function$
declare
  uid uuid := auth.uid();
  area public.campaign_location_areas%rowtype;
  next_cycle integer;
begin
  if uid is null then raise exception 'Sessão necessária.'; end if;
  select a.* into area from public.campaign_location_areas a where a.id=p_area_id for update;
  if not found then raise exception 'Área não encontrada.'; end if;
  if not exists (
    select 1 from public.campaign_members m
    where m.campaign_id=area.campaign_id and m.user_id=(select auth.uid()) and m.role='master'
  ) then raise exception 'master_required'; end if;

  next_cycle := coalesce((area.state->>'exploration_cycle')::integer,0)+1;
  update public.campaign_location_areas
  set state = jsonb_build_object(
    'status','unknown',
    'investigated',false,
    'exploration_cycle',next_cycle,
    'reset_at',now()
  ), updated_at=now()
  where id=p_area_id
  returning * into area;
  return area;
end;
$function$;

revoke execute on function public.set_campaign_location_area_state(uuid,text,boolean,text) from anon, public;
grant execute on function public.set_campaign_location_area_state(uuid,text,boolean,text) to authenticated;
revoke execute on function public.reset_campaign_location_area_exploration(uuid) from anon, public;
grant execute on function public.reset_campaign_location_area_exploration(uuid) to authenticated;

alter table public.campaign_location_areas replica identity full;
