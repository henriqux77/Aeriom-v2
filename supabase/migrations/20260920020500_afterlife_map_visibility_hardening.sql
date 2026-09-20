-- AFTERLIFE MAP 2.0 — visibility and discovery hardening
-- Applied to the AFTERLIFE Supabase project.
-- Hidden locations, area internals and loot are no longer directly selectable by players.
-- Players use safe SECURITY DEFINER RPCs for visible information and discovery.

create or replace function public.list_campaign_visible_world_locations(p_campaign_id uuid)
returns table (
  id uuid, campaign_id uuid, source text, external_id text, name text, category text,
  latitude double precision, longitude double precision, address text, danger text,
  discovered boolean, discovered_at timestamptz, last_visited_at timestamptz,
  last_seen_at timestamptz, noise_level integer, updated_at timestamptz
)
language plpgsql stable security definer set search_path=public;

create or replace function public.list_campaign_visible_location_areas(p_location_id uuid)
returns table (
  id uuid, location_id uuid, campaign_id uuid, name text, category text,
  description text, difficulty integer, danger text, sort_order integer, updated_at timestamptz
)
language plpgsql stable security definer set search_path=public;

create or replace function public.discover_campaign_world_location(
  p_campaign_id uuid, p_source text, p_external_id text, p_name text,
  p_category text default 'Ponto de interesse', p_latitude double precision default null,
  p_longitude double precision default null, p_address text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (id uuid, campaign_id uuid, name text, category text,
  latitude double precision, longitude double precision, address text, discovered boolean)
language plpgsql security definer set search_path=public;

drop policy if exists campaign_world_locations_select_member on public.campaign_world_locations;
drop policy if exists campaign_location_areas_select_member on public.campaign_location_areas;
drop policy if exists campaign_location_loot_select on public.campaign_location_loot;

create policy campaign_world_locations_select_master on public.campaign_world_locations
for select to authenticated using (
  exists(select 1 from public.campaign_members cm
    where cm.campaign_id=campaign_world_locations.campaign_id
      and cm.user_id=auth.uid() and cm.role='master')
);

create policy campaign_location_areas_select_master on public.campaign_location_areas
for select to authenticated using (
  exists(select 1 from public.campaign_members cm
    where cm.campaign_id=campaign_location_areas.campaign_id
      and cm.user_id=auth.uid() and cm.role='master')
);

create policy campaign_location_loot_select_master on public.campaign_location_loot
for select to authenticated using (
  exists(select 1 from public.campaign_members cm
    where cm.campaign_id=campaign_location_loot.campaign_id
      and cm.user_id=auth.uid() and cm.role='master')
);

revoke execute on function public.upsert_campaign_world_location(uuid,text,text,text,text,double precision,double precision,text,jsonb) from anon, authenticated;
revoke execute on function public.list_campaign_visible_world_locations(uuid) from anon;
revoke execute on function public.list_campaign_visible_location_areas(uuid) from anon;
revoke execute on function public.discover_campaign_world_location(uuid,text,text,text,text,double precision,double precision,text,jsonb) from anon;
grant execute on function public.list_campaign_visible_world_locations(uuid) to authenticated;
grant execute on function public.list_campaign_visible_location_areas(uuid) to authenticated;
grant execute on function public.discover_campaign_world_location(uuid,text,text,text,text,double precision,double precision,text,jsonb) to authenticated;
