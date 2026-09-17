create table if not exists public.campaign_infection_zones (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  zone_key text not null,
  zone_name text not null default 'Zona de infecção',
  city_name text not null default 'Cidade da campanha',
  latitude double precision not null,
  longitude double precision not null,
  radius_m integer not null default 650 check (radius_m between 120 and 3000),
  infection_percent numeric(5,2) not null default 0 check (infection_percent between 0 and 100),
  zombie_density_percent numeric(5,2) not null default 0 check (zombie_density_percent between 0 and 100),
  spread_rate numeric(5,2) not null default 0 check (spread_rate between 0 and 100),
  outbreak_stage text not null default 'contained' check (outbreak_stage in ('contained','active','severe','critical')),
  updated_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, zone_key)
);

create index if not exists campaign_infection_zones_campaign_idx on public.campaign_infection_zones(campaign_id);

alter table public.campaign_infection_zones enable row level security;

create policy "campaign infection zones master select" on public.campaign_infection_zones
  for select to authenticated
  using (exists(select 1 from public.campaign_members cm where cm.campaign_id=campaign_infection_zones.campaign_id and cm.user_id=(select auth.uid()) and cm.role='master'));

create policy "campaign infection zones master update" on public.campaign_infection_zones
  for update to authenticated
  using (exists(select 1 from public.campaign_members cm where cm.campaign_id=campaign_infection_zones.campaign_id and cm.user_id=(select auth.uid()) and cm.role='master'))
  with check (exists(select 1 from public.campaign_members cm where cm.campaign_id=campaign_infection_zones.campaign_id and cm.user_id=(select auth.uid()) and cm.role='master'));

create policy "campaign infection zones master insert" on public.campaign_infection_zones
  for insert to authenticated
  with check (exists(select 1 from public.campaign_members cm where cm.campaign_id=campaign_infection_zones.campaign_id and cm.user_id=(select auth.uid()) and cm.role='master'));

create policy "campaign infection zones master delete" on public.campaign_infection_zones
  for delete to authenticated
  using (exists(select 1 from public.campaign_members cm where cm.campaign_id=campaign_infection_zones.campaign_id and cm.user_id=(select auth.uid()) and cm.role='master'));

create or replace function public.campaign_infection_set_updated_at()
returns trigger language plpgsql security invoker set search_path=public as $$
begin new.updated_at=now(); return new; end;
$$;

drop trigger if exists trg_campaign_infection_zones_updated_at on public.campaign_infection_zones;
create trigger trg_campaign_infection_zones_updated_at before update on public.campaign_infection_zones for each row execute function public.campaign_infection_set_updated_at();

create or replace function public.ensure_campaign_infection_zones(p_campaign_id uuid, p_city_name text default 'Cidade da campanha')
returns setof public.campaign_infection_zones
language plpgsql security definer set search_path=public
as $$
declare c_lat double precision; c_lng double precision; city text; x int; y int; dist double precision; noise int; inf numeric; zd numeric; spread numeric; stage text; zone_label text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.campaign_members cm where cm.campaign_id=p_campaign_id and cm.user_id=auth.uid() and cm.role='master') then raise exception 'master_only'; end if;
  select latitude,longitude into c_lat,c_lng from public.campaigns where id=p_campaign_id;
  if c_lat is null or c_lng is null then raise exception 'campaign_location_missing'; end if;
  city := coalesce(nullif(trim(p_city_name),''),'Cidade da campanha');
  for x in -2..2 loop
    for y in -2..2 loop
      dist := sqrt((x*x + y*y)::double precision);
      noise := mod(abs(hashtext(format('%s:%s:%s',p_campaign_id,x,y))),11);
      inf := greatest(8, least(100, round(92 - (dist*18) + noise, 2)));
      zd := greatest(5, least(100, round(inf * 0.94 + noise * 0.7, 2)));
      spread := greatest(2, least(100, round(inf * 0.62, 2)));
      stage := case when inf >= 82 then 'critical' when inf >= 62 then 'severe' when inf >= 40 then 'active' else 'contained' end;
      zone_label := case when x=0 and y=0 then 'NÚCLEO URBANO' when dist <= 1.5 then 'ANEL INTERNO' when dist <= 2.5 then 'ANEL EXTERNO' else 'PERIFERIA' end;
      insert into public.campaign_infection_zones(campaign_id,zone_key,zone_name,city_name,latitude,longitude,radius_m,infection_percent,zombie_density_percent,spread_rate,outbreak_stage,updated_by)
      values(p_campaign_id,format('grid_%s_%s',x,y),zone_label,city,c_lat + (y*0.009),c_lng + ((x*0.012)/greatest(cos(radians(c_lat)),0.25)),650,inf,zd,spread,stage,auth.uid())
      on conflict(campaign_id,zone_key) do nothing;
    end loop;
  end loop;
  return query select * from public.campaign_infection_zones where campaign_id=p_campaign_id order by infection_percent desc, zone_key;
end;
$$;

create or replace function public.list_campaign_infection_zones(p_campaign_id uuid)
returns setof public.campaign_infection_zones
language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.campaign_members cm where cm.campaign_id=p_campaign_id and cm.user_id=auth.uid() and cm.role='master') then raise exception 'master_only'; end if;
  return query select * from public.campaign_infection_zones where campaign_id=p_campaign_id order by infection_percent desc, zone_key;
end;
$$;

create or replace function public.update_campaign_infection_zone(p_id uuid, p_infection numeric, p_zombie_density numeric, p_spread_rate numeric, p_stage text)
returns public.campaign_infection_zones
language plpgsql security definer set search_path=public
as $$
declare r public.campaign_infection_zones;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.campaign_infection_zones z join public.campaign_members cm on cm.campaign_id=z.campaign_id where z.id=p_id and cm.user_id=auth.uid() and cm.role='master') then raise exception 'master_only'; end if;
  update public.campaign_infection_zones z set infection_percent=greatest(0,least(100,coalesce(p_infection,z.infection_percent))), zombie_density_percent=greatest(0,least(100,coalesce(p_zombie_density,z.zombie_density_percent))), spread_rate=greatest(0,least(100,coalesce(p_spread_rate,z.spread_rate))), outbreak_stage=case when p_stage in ('contained','active','severe','critical') then p_stage else z.outbreak_stage end, updated_by=auth.uid() where z.id=p_id returning * into r;
  return r;
end;
$$;

revoke execute on function public.ensure_campaign_infection_zones(uuid,text) from public, anon;
revoke execute on function public.list_campaign_infection_zones(uuid) from public, anon;
revoke execute on function public.update_campaign_infection_zone(uuid,numeric,numeric,numeric,text) from public, anon;
grant execute on function public.ensure_campaign_infection_zones(uuid,text) to authenticated;
grant execute on function public.list_campaign_infection_zones(uuid) to authenticated;
grant execute on function public.update_campaign_infection_zone(uuid,numeric,numeric,numeric,text) to authenticated;

alter publication supabase_realtime add table public.campaign_infection_zones;
