create table if not exists public.campaign_travels (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  status text not null default 'planned' check (status in ('planned','in_transit','completed','cancelled')),
  origin_latitude double precision not null,
  origin_longitude double precision not null,
  destination_latitude double precision not null,
  destination_longitude double precision not null,
  destination_location_id uuid references public.campaign_world_locations(id) on delete set null,
  destination_name text not null default 'Destino no mapa',
  route jsonb not null default '{}'::jsonb,
  distance_m numeric not null default 0 check (distance_m >= 0),
  speed_kmh numeric not null default 5 check (speed_kmh > 0 and speed_kmh <= 300),
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  fuel_per_km numeric not null default 0 check (fuel_per_km >= 0),
  fuel_cost numeric not null default 0 check (fuel_cost >= 0),
  energy_per_km numeric not null default 0 check (energy_per_km >= 0),
  energy_cost numeric not null default 0 check (energy_cost >= 0),
  exposure_per_km numeric not null default 0 check (exposure_per_km >= 0),
  exposure numeric not null default 0 check (exposure >= 0),
  participant_user_ids uuid[] not null default '{}'::uuid[],
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_travels_campaign_created_idx on public.campaign_travels(campaign_id, created_at desc);
create index if not exists campaign_travels_status_idx on public.campaign_travels(campaign_id, status);
create unique index if not exists campaign_travels_one_active_idx on public.campaign_travels(campaign_id) where status in ('planned','in_transit');

alter table public.campaign_travels enable row level security;
drop policy if exists "campaign_travels_select_member" on public.campaign_travels;
create policy "campaign_travels_select_member" on public.campaign_travels
for select to authenticated using (
  exists (select 1 from public.campaign_members cm where cm.campaign_id = campaign_travels.campaign_id and cm.user_id = (select auth.uid()))
);

alter table public.campaign_travels replica identity full;
do $$ begin
  begin alter publication supabase_realtime add table public.campaign_travels; exception when duplicate_object then null; end;
end $$;

drop function if exists public.list_campaign_travels(uuid, integer);
create or replace function public.list_campaign_travels(p_campaign_id uuid, p_limit integer default 12)
returns setof public.campaign_travels
language plpgsql security definer set search_path = public
as $$
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.campaign_members where campaign_id = p_campaign_id and user_id = (select auth.uid())) then raise exception 'NOT_CAMPAIGN_MEMBER'; end if;
  return query select * from public.campaign_travels where campaign_id = p_campaign_id order by case when status in ('planned','in_transit') then 0 else 1 end, created_at desc limit greatest(1, least(coalesce(p_limit,12), 50));
end; $$;

drop function if exists public.create_campaign_travel(uuid,double precision,double precision,double precision,double precision,uuid,text,jsonb,numeric,numeric,numeric,numeric,numeric,uuid[]);
create or replace function public.create_campaign_travel(
  p_campaign_id uuid,
  p_origin_latitude double precision,
  p_origin_longitude double precision,
  p_destination_latitude double precision,
  p_destination_longitude double precision,
  p_destination_location_id uuid default null,
  p_destination_name text default 'Destino no mapa',
  p_route jsonb default '{}'::jsonb,
  p_distance_m numeric default 0,
  p_speed_kmh numeric default 5,
  p_fuel_per_km numeric default 0,
  p_energy_per_km numeric default 0,
  p_exposure_per_km numeric default 0,
  p_participant_user_ids uuid[] default '{}'::uuid[]
)
returns public.campaign_travels
language plpgsql security definer set search_path = public
as $$
declare v_row public.campaign_travels; v_minutes integer; v_fuel numeric; v_energy numeric; v_exposure numeric;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.campaign_members where campaign_id = p_campaign_id and user_id = (select auth.uid()) and role = 'master') then raise exception 'MASTER_REQUIRED'; end if;
  if p_destination_latitude not between -90 and 90 or p_origin_latitude not between -90 and 90 or p_destination_longitude not between -180 and 180 or p_origin_longitude not between -180 and 180 then raise exception 'INVALID_COORDINATES'; end if;
  if coalesce(p_speed_kmh,0) <= 0 or p_speed_kmh > 300 then raise exception 'INVALID_SPEED'; end if;
  if coalesce(p_distance_m,0) < 0 then raise exception 'INVALID_DISTANCE'; end if;
  if exists (select 1 from public.campaign_travels where campaign_id = p_campaign_id and status in ('planned','in_transit')) then raise exception 'TRAVEL_ALREADY_ACTIVE'; end if;
  if exists (select 1 from unnest(coalesce(p_participant_user_ids,'{}'::uuid[])) uid where not exists (select 1 from public.campaign_members cm where cm.campaign_id = p_campaign_id and cm.user_id = uid)) then raise exception 'INVALID_PARTICIPANT'; end if;
  v_minutes := greatest(0, round((coalesce(p_distance_m,0) / 1000) / p_speed_kmh * 60));
  v_fuel := greatest(0, coalesce(p_distance_m,0) / 1000 * greatest(0,coalesce(p_fuel_per_km,0)));
  v_energy := greatest(0, coalesce(p_distance_m,0) / 1000 * greatest(0,coalesce(p_energy_per_km,0)));
  v_exposure := greatest(0, coalesce(p_distance_m,0) / 1000 * greatest(0,coalesce(p_exposure_per_km,0)));
  insert into public.campaign_travels(campaign_id,created_by,origin_latitude,origin_longitude,destination_latitude,destination_longitude,destination_location_id,destination_name,route,distance_m,speed_kmh,estimated_minutes,fuel_per_km,fuel_cost,energy_per_km,energy_cost,exposure_per_km,exposure,participant_user_ids)
  values(p_campaign_id,(select auth.uid()),p_origin_latitude,p_origin_longitude,p_destination_latitude,p_destination_longitude,p_destination_location_id,left(coalesce(nullif(trim(p_destination_name),''),'Destino no mapa'),140),coalesce(p_route,'{}'::jsonb),greatest(0,coalesce(p_distance_m,0)),p_speed_kmh,v_minutes,greatest(0,coalesce(p_fuel_per_km,0)),v_fuel,greatest(0,coalesce(p_energy_per_km,0)),v_energy,greatest(0,coalesce(p_exposure_per_km,0)),v_exposure,coalesce(p_participant_user_ids,'{}'::uuid[])) returning * into v_row;
  return v_row;
end; $$;

drop function if exists public.start_campaign_travel(uuid);
create or replace function public.start_campaign_travel(p_travel_id uuid)
returns public.campaign_travels
language plpgsql security definer set search_path = public
as $$
declare v_row public.campaign_travels;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.campaign_travels t set status='in_transit',started_at=coalesce(started_at,now()),updated_at=now() where t.id=p_travel_id and exists(select 1 from public.campaign_members cm where cm.campaign_id=t.campaign_id and cm.user_id=(select auth.uid()) and cm.role='master') and t.status='planned' returning * into v_row;
  if v_row.id is null then raise exception 'TRAVEL_NOT_PLANNED'; end if;
  return v_row;
end; $$;

drop function if exists public.complete_campaign_travel(uuid);
create or replace function public.complete_campaign_travel(p_travel_id uuid)
returns public.campaign_travels
language plpgsql security definer set search_path = public
as $$
declare v_row public.campaign_travels; uid uuid;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select t.* into v_row from public.campaign_travels t where t.id=p_travel_id and exists(select 1 from public.campaign_members cm where cm.campaign_id=t.campaign_id and cm.user_id=(select auth.uid()) and cm.role='master') and t.status='in_transit';
  if v_row.id is null then raise exception 'TRAVEL_NOT_IN_PROGRESS'; end if;
  foreach uid in array v_row.participant_user_ids loop
    insert into public.campaign_map_positions(campaign_id,user_id,latitude,longitude,updated_at) values(v_row.campaign_id,uid,v_row.destination_latitude,v_row.destination_longitude,now()) on conflict (campaign_id,user_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now();
  end loop;
  update public.campaign_travels set status='completed',completed_at=now(),updated_at=now() where id=v_row.id returning * into v_row;
  return v_row;
end; $$;

drop function if exists public.cancel_campaign_travel(uuid);
create or replace function public.cancel_campaign_travel(p_travel_id uuid)
returns public.campaign_travels
language plpgsql security definer set search_path = public
as $$
declare v_row public.campaign_travels;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.campaign_travels t set status='cancelled',cancelled_at=now(),updated_at=now() where t.id=p_travel_id and exists(select 1 from public.campaign_members cm where cm.campaign_id=t.campaign_id and cm.user_id=(select auth.uid()) and cm.role='master') and t.status in ('planned','in_transit') returning * into v_row;
  if v_row.id is null then raise exception 'TRAVEL_NOT_CANCELLABLE'; end if;
  return v_row;
end; $$;

revoke all on function public.list_campaign_travels(uuid,integer) from public,anon;
grant execute on function public.list_campaign_travels(uuid,integer) to authenticated;
revoke all on function public.create_campaign_travel(uuid,double precision,double precision,double precision,double precision,uuid,text,jsonb,numeric,numeric,numeric,numeric,numeric,uuid[]) from public,anon;
grant execute on function public.create_campaign_travel(uuid,double precision,double precision,double precision,double precision,uuid,text,jsonb,numeric,numeric,numeric,numeric,numeric,uuid[]) to authenticated;
revoke all on function public.start_campaign_travel(uuid) from public,anon;
grant execute on function public.start_campaign_travel(uuid) to authenticated;
revoke all on function public.complete_campaign_travel(uuid) from public,anon;
grant execute on function public.complete_campaign_travel(uuid) to authenticated;
revoke all on function public.cancel_campaign_travel(uuid) from public,anon;
grant execute on function public.cancel_campaign_travel(uuid) to authenticated;
