-- AFTERLIFE P5.4
-- Internal areas/rooms for discovered world locations.

create table if not exists public.campaign_location_areas (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  location_id uuid not null references public.campaign_world_locations(id) on delete cascade,
  name text not null,
  category text not null default 'área',
  description text,
  difficulty integer,
  danger text default 'unknown',
  information text,
  event jsonb not null default '{}'::jsonb,
  loot_profile jsonb not null default '{}'::jsonb,
  creatures jsonb not null default '[]'::jsonb,
  secrets jsonb not null default '[]'::jsonb,
  state jsonb not null default jsonb_build_object('status','unknown','investigated',false),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_location_areas_location_idx on public.campaign_location_areas(location_id, sort_order, created_at);
create index if not exists campaign_location_areas_campaign_idx on public.campaign_location_areas(campaign_id, sort_order, created_at);

alter table public.campaign_location_areas enable row level security;

drop policy if exists campaign_location_areas_select_member on public.campaign_location_areas;
create policy campaign_location_areas_select_member on public.campaign_location_areas for select to authenticated
using (exists (select 1 from public.campaign_members m where m.campaign_id=campaign_location_areas.campaign_id and m.user_id=(select auth.uid())));

drop policy if exists campaign_location_areas_insert_master on public.campaign_location_areas;
create policy campaign_location_areas_insert_master on public.campaign_location_areas for insert to authenticated
with check (exists (select 1 from public.campaign_members m where m.campaign_id=campaign_location_areas.campaign_id and m.user_id=(select auth.uid()) and m.role='master'));

drop policy if exists campaign_location_areas_update_master on public.campaign_location_areas;
create policy campaign_location_areas_update_master on public.campaign_location_areas for update to authenticated
using (exists (select 1 from public.campaign_members m where m.campaign_id=campaign_location_areas.campaign_id and m.user_id=(select auth.uid()) and m.role='master'))
with check (exists (select 1 from public.campaign_members m where m.campaign_id=campaign_location_areas.campaign_id and m.user_id=(select auth.uid()) and m.role='master'));

drop policy if exists campaign_location_areas_delete_master on public.campaign_location_areas;
create policy campaign_location_areas_delete_master on public.campaign_location_areas for delete to authenticated
using (exists (select 1 from public.campaign_members m where m.campaign_id=campaign_location_areas.campaign_id and m.user_id=(select auth.uid()) and m.role='master'));

create or replace function public.list_campaign_location_areas(p_location_id uuid)
returns setof public.campaign_location_areas
language plpgsql security definer set search_path='public'
as $function$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.campaign_world_locations l join public.campaign_members m on m.campaign_id=l.campaign_id where l.id=p_location_id and m.user_id=auth.uid()) then raise exception 'not_campaign_member'; end if;
  return query select a.* from public.campaign_location_areas a where a.location_id=p_location_id order by a.sort_order, a.created_at;
end;
$function$;

create or replace function public.create_campaign_location_area(p_location_id uuid,p_name text,p_category text default 'área',p_description text default null,p_difficulty integer default null,p_danger text default 'unknown',p_information text default null,p_event jsonb default '{}'::jsonb,p_loot_profile jsonb default '{}'::jsonb,p_creatures jsonb default '[]'::jsonb,p_secrets jsonb default '[]'::jsonb)
returns public.campaign_location_areas
language plpgsql security definer set search_path='public'
as $function$
declare r public.campaign_location_areas; cid uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select campaign_id into cid from public.campaign_world_locations where id=p_location_id;
  if cid is null then raise exception 'location_not_found'; end if;
  if not exists(select 1 from public.campaign_members where campaign_id=cid and user_id=auth.uid() and role='master') then raise exception 'master_required'; end if;
  insert into public.campaign_location_areas(campaign_id,location_id,name,category,description,difficulty,danger,information,event,loot_profile,creatures,secrets,sort_order)
  values(cid,p_location_id,coalesce(nullif(trim(p_name),''),'Área sem nome'),coalesce(nullif(trim(p_category),''),'área'),p_description,p_difficulty,coalesce(nullif(trim(p_danger),''),'unknown'),p_information,coalesce(p_event,'{}'::jsonb),coalesce(p_loot_profile,'{}'::jsonb),coalesce(p_creatures,'[]'::jsonb),coalesce(p_secrets,'[]'::jsonb),(select coalesce(max(sort_order),-1)+1 from public.campaign_location_areas where location_id=p_location_id)) returning * into r;
  return r;
end;
$function$;

create or replace function public.update_campaign_location_area(p_id uuid,p_name text default null,p_category text default null,p_description text default null,p_difficulty integer default null,p_danger text default null,p_information text default null,p_event jsonb default null,p_loot_profile jsonb default null,p_creatures jsonb default null,p_secrets jsonb default null,p_state jsonb default null)
returns public.campaign_location_areas
language plpgsql security definer set search_path='public'
as $function$
declare r public.campaign_location_areas;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.campaign_location_areas a join public.campaign_members m on m.campaign_id=a.campaign_id where a.id=p_id and m.user_id=auth.uid() and m.role='master') then raise exception 'master_required'; end if;
  update public.campaign_location_areas set name=coalesce(nullif(trim(p_name),''),name),category=coalesce(nullif(trim(p_category),''),category),description=p_description,difficulty=p_difficulty,danger=coalesce(nullif(trim(p_danger),''),danger),information=p_information,event=coalesce(p_event,event),loot_profile=coalesce(p_loot_profile,loot_profile),creatures=coalesce(p_creatures,creatures),secrets=coalesce(p_secrets,secrets),state=coalesce(p_state,state),updated_at=now() where id=p_id returning * into r;
  return r;
end;
$function$;

create or replace function public.delete_campaign_location_area(p_id uuid)
returns boolean
language plpgsql security definer set search_path='public'
as $function$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.campaign_location_areas a join public.campaign_members m on m.campaign_id=a.campaign_id where a.id=p_id and m.user_id=auth.uid() and m.role='master') then raise exception 'master_required'; end if;
  delete from public.campaign_location_areas where id=p_id;
  return true;
end;
$function$;

revoke execute on function public.list_campaign_location_areas(uuid) from anon, public;
grant execute on function public.list_campaign_location_areas(uuid) to authenticated;
revoke execute on function public.create_campaign_location_area(uuid,text,text,text,integer,text,text,jsonb,jsonb,jsonb,jsonb) from anon, public;
grant execute on function public.create_campaign_location_area(uuid,text,text,text,integer,text,text,jsonb,jsonb,jsonb,jsonb) to authenticated;
revoke execute on function public.update_campaign_location_area(uuid,text,text,text,integer,text,text,jsonb,jsonb,jsonb,jsonb,jsonb) from anon, public;
grant execute on function public.update_campaign_location_area(uuid,text,text,text,integer,text,text,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;
revoke execute on function public.delete_campaign_location_area(uuid) from anon, public;
grant execute on function public.delete_campaign_location_area(uuid) to authenticated;

alter table public.campaign_location_areas replica identity full;
alter publication supabase_realtime add table public.campaign_location_areas;