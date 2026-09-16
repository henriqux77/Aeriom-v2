create table if not exists public.campaign_map_entities (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null,
  name text not null,
  description text,
  latitude double precision,
  longitude double precision,
  geometry jsonb,
  state jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_map_entities_campaign_idx on public.campaign_map_entities(campaign_id);
create index if not exists campaign_map_entities_type_idx on public.campaign_map_entities(campaign_id,entity_type);

alter table public.campaign_map_entities enable row level security;

drop policy if exists campaign_map_entities_select_member on public.campaign_map_entities;
create policy campaign_map_entities_select_member
on public.campaign_map_entities for select
using (aeriom_private.is_campaign_member(campaign_id));

drop policy if exists campaign_map_entities_insert_master on public.campaign_map_entities;
create policy campaign_map_entities_insert_master
on public.campaign_map_entities for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.campaign_members cm
    where cm.campaign_id = campaign_map_entities.campaign_id
      and cm.user_id = auth.uid()
      and cm.role = 'master'
  )
);

drop policy if exists campaign_map_entities_update_master on public.campaign_map_entities;
create policy campaign_map_entities_update_master
on public.campaign_map_entities for update
using (
  exists (
    select 1 from public.campaign_members cm
    where cm.campaign_id = campaign_map_entities.campaign_id
      and cm.user_id = auth.uid()
      and cm.role = 'master'
  )
)
with check (
  exists (
    select 1 from public.campaign_members cm
    where cm.campaign_id = campaign_map_entities.campaign_id
      and cm.user_id = auth.uid()
      and cm.role = 'master'
  )
);

drop policy if exists campaign_map_entities_delete_master on public.campaign_map_entities;
create policy campaign_map_entities_delete_master
on public.campaign_map_entities for delete
using (
  exists (
    select 1 from public.campaign_members cm
    where cm.campaign_id = campaign_map_entities.campaign_id
      and cm.user_id = auth.uid()
      and cm.role = 'master'
  )
);

create or replace function public.list_campaign_map_entities(p_campaign_id uuid)
returns setof public.campaign_map_entities
language sql
stable
security definer
set search_path = public, extensions
as $$
  select e.*
  from public.campaign_map_entities e
  where e.campaign_id = p_campaign_id
    and aeriom_private.is_campaign_member(p_campaign_id)
  order by e.created_at asc;
$$;

create or replace function public.create_campaign_map_entity(
  p_campaign_id uuid,
  p_entity_type text,
  p_name text,
  p_description text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_geometry jsonb default null,
  p_state jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns public.campaign_map_entities
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.campaign_map_entities;
begin
  if not exists (
    select 1 from public.campaign_members cm
    where cm.campaign_id = p_campaign_id and cm.user_id = auth.uid() and cm.role = 'master'
  ) then raise exception 'Apenas o Mestre pode editar o mapa.'; end if;

  if nullif(trim(p_name),'') is null then raise exception 'Nome do elemento é obrigatório.'; end if;
  if p_entity_type is null or trim(p_entity_type) = '' then raise exception 'Tipo do elemento é obrigatório.'; end if;

  insert into public.campaign_map_entities(
    campaign_id, created_by, entity_type, name, description,
    latitude, longitude, geometry, state, metadata
  ) values (
    p_campaign_id, auth.uid(), lower(trim(p_entity_type)), trim(p_name), nullif(trim(coalesce(p_description,'')),''),
    p_latitude, p_longitude, p_geometry, coalesce(p_state,'{}'::jsonb), coalesce(p_metadata,'{}'::jsonb)
  ) returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.update_campaign_map_entity(
  p_entity_id uuid,
  p_name text default null,
  p_description text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_geometry jsonb default null,
  p_state jsonb default null,
  p_metadata jsonb default null
)
returns public.campaign_map_entities
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_row public.campaign_map_entities;
begin
  if not exists (
    select 1
    from public.campaign_map_entities e
    join public.campaign_members cm on cm.campaign_id = e.campaign_id
    where e.id = p_entity_id and cm.user_id = auth.uid() and cm.role = 'master'
  ) then raise exception 'Apenas o Mestre pode editar o mapa.'; end if;

  update public.campaign_map_entities
  set name = coalesce(nullif(trim(p_name),''), name),
      description = case when p_description is null then description else nullif(trim(p_description),'') end,
      latitude = p_latitude,
      longitude = p_longitude,
      geometry = p_geometry,
      state = coalesce(p_state,state),
      metadata = coalesce(p_metadata,metadata),
      updated_at = now()
  where id = p_entity_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.delete_campaign_map_entity(p_entity_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_deleted boolean;
begin
  if not exists (
    select 1
    from public.campaign_map_entities e
    join public.campaign_members cm on cm.campaign_id = e.campaign_id
    where e.id = p_entity_id and cm.user_id = auth.uid() and cm.role = 'master'
  ) then raise exception 'Apenas o Mestre pode editar o mapa.'; end if;

  delete from public.campaign_map_entities where id = p_entity_id;
  get diagnostics v_deleted = row_count;
  return coalesce(v_deleted,false);
end;
$$;

grant execute on function public.list_campaign_map_entities(uuid) to authenticated;
grant execute on function public.create_campaign_map_entity(uuid,text,text,text,double precision,double precision,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.update_campaign_map_entity(uuid,text,text,double precision,double precision,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.delete_campaign_map_entity(uuid) to authenticated;
