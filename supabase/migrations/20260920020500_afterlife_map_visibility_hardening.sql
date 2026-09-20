-- AFTERLIFE MAP 2.0 — visibility and discovery hardening
-- This migration is idempotent and documents the DDL applied to the AFTERLIFE project.

create or replace function public.list_campaign_visible_world_locations(p_campaign_id uuid)
returns table (
  id uuid, campaign_id uuid, source text, external_id text, name text, category text,
  latitude double precision, longitude double precision, address text, danger text,
  discovered boolean, discovered_at timestamptz, last_visited_at timestamptz,
  last_seen_at timestamptz, noise_level integer, updated_at timestamptz
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_member boolean;
  is_master boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select exists(select 1 from public.campaign_members m where m.campaign_id=p_campaign_id and m.user_id=uid),
         exists(select 1 from public.campaign_members m where m.campaign_id=p_campaign_id and m.user_id=uid and m.role='master')
    into is_member,is_master;
  if not is_member then raise exception 'not_campaign_member' using errcode='42501'; end if;
  return query
  select l.id,l.campaign_id,l.source,l.external_id,l.name,l.category,l.latitude,l.longitude,l.address,
         l.danger,l.discovered,l.discovered_at,l.last_visited_at,l.last_seen_at,l.noise_level,l.updated_at
  from public.campaign_world_locations l
  where l.campaign_id=p_campaign_id and (is_master or coalesce(l.discovered,false))
  order by l.updated_at desc;
end;
$$;

create or replace function public.list_campaign_visible_location_areas(p_location_id uuid)
returns table (
  id uuid, location_id uuid, campaign_id uuid, name text, category text,
  description text, difficulty integer, danger text, sort_order integer, updated_at timestamptz
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  discovered_now boolean;
  master_now boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select l.campaign_id,coalesce(l.discovered,false) into cid,discovered_now
  from public.campaign_world_locations l where l.id=p_location_id;
  if cid is null then raise exception 'location_not_found'; end if;
  if not exists(select 1 from public.campaign_members m where m.campaign_id=cid and m.user_id=uid)
    then raise exception 'not_campaign_member' using errcode='42501'; end if;
  select exists(select 1 from public.campaign_members m where m.campaign_id=cid and m.user_id=uid and m.role='master') into master_now;
  if not master_now and not discovered_now then return; end if;
  return query select a.id,a.location_id,a.campaign_id,a.name,a.category,a.description,a.difficulty,a.danger,a.sort_order,a.updated_at
  from public.campaign_location_areas a where a.location_id=p_location_id order by a.sort_order,a.created_at;
end;
$$;

create or replace function public.discover_campaign_world_location(
  p_campaign_id uuid,p_source text,p_external_id text,p_name text,
  p_category text default 'Ponto de interesse',p_latitude double precision default null,
  p_longitude double precision default null,p_address text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (id uuid,campaign_id uuid,name text,category text,
  latitude double precision,longitude double precision,address text,discovered boolean)
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); row public.campaign_world_locations;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not exists(select 1 from public.campaign_members m where m.campaign_id=p_campaign_id and m.user_id=uid)
    then raise exception 'not_campaign_member' using errcode='42501'; end if;
  insert into public.campaign_world_locations(campaign_id,source,external_id,name,category,latitude,longitude,address,resources,last_seen_at,expires_at)
  values(p_campaign_id,coalesce(nullif(p_source,''),'osm'),p_external_id,coalesce(nullif(p_name,''),'Local sem nome'),
    coalesce(nullif(p_category,''),'Ponto de interesse'),p_latitude,p_longitude,p_address,'{}'::jsonb,now(),now()+interval '30 days')
  on conflict(campaign_id,source,external_id) do update set
    name=excluded.name,category=excluded.category,latitude=excluded.latitude,longitude=excluded.longitude,
    address=excluded.address,last_seen_at=now(),expires_at=now()+interval '30 days',updated_at=now()
  returning * into row;
  return query select row.id,row.campaign_id,row.name,row.category,row.latitude,row.longitude,row.address,row.discovered;
end;
$$;

drop policy if exists campaign_world_locations_select_member on public.campaign_world_locations;
drop policy if exists campaign_world_locations_select_master on public.campaign_world_locations;
create policy campaign_world_locations_select_master on public.campaign_world_locations
for select to authenticated using (
  exists(select 1 from public.campaign_members cm where cm.campaign_id=campaign_world_locations.campaign_id and cm.user_id=auth.uid() and cm.role='master')
);

drop policy if exists campaign_location_areas_select_member on public.campaign_location_areas;
drop policy if exists campaign_location_areas_select_master on public.campaign_location_areas;
create policy campaign_location_areas_select_master on public.campaign_location_areas
for select to authenticated using (
  exists(select 1 from public.campaign_members cm where cm.campaign_id=campaign_location_areas.campaign_id and cm.user_id=auth.uid() and cm.role='master')
);

drop policy if exists campaign_location_loot_select on public.campaign_location_loot;
drop policy if exists campaign_location_loot_select_master on public.campaign_location_loot;
create policy campaign_location_loot_select_master on public.campaign_location_loot
for select to authenticated using (
  exists(select 1 from public.campaign_members cm where cm.campaign_id=campaign_location_loot.campaign_id and cm.user_id=auth.uid() and cm.role='master')
);

revoke execute on function public.upsert_campaign_world_location(uuid,text,text,text,text,double precision,double precision,text,jsonb) from anon,authenticated;
revoke execute on function public.list_campaign_visible_world_locations(uuid) from anon;
revoke execute on function public.list_campaign_visible_location_areas(uuid) from anon;
revoke execute on function public.discover_campaign_world_location(uuid,text,text,text,text,double precision,double precision,text,jsonb) from anon;
grant execute on function public.list_campaign_visible_world_locations(uuid) to authenticated;
grant execute on function public.list_campaign_visible_location_areas(uuid) to authenticated;
grant execute on function public.discover_campaign_world_location(uuid,text,text,text,text,double precision,double precision,text,jsonb) to authenticated;
