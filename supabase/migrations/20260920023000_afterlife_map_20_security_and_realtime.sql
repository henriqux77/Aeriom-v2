-- AFTERLIFE MAP 2.0
-- Safe player-facing map APIs and realtime for horde events.
drop function if exists public.list_campaign_visible_world_locations(uuid);
drop function if exists public.get_campaign_visible_world_location(uuid);

create function public.list_campaign_visible_world_locations(p_campaign_id uuid)
returns table(
  id uuid, campaign_id uuid, name text, category text, latitude double precision, longitude double precision,
  address text, discovered boolean, danger text, condition text, looted_percent integer, noise_level integer
)
language plpgsql stable security definer set search_path=public
as $$
declare uid uuid:=auth.uid(); is_master boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select exists(select 1 from public.campaign_members m where m.campaign_id=p_campaign_id and m.user_id=uid and m.role='master') into is_master;
  if not exists(select 1 from public.campaign_members m where m.campaign_id=p_campaign_id and m.user_id=uid) then
    raise exception 'not_campaign_member' using errcode='42501';
  end if;
  return query
  select w.id,w.campaign_id,w.name,w.category,w.latitude,w.longitude,w.address,w.discovered,
    case when is_master then w.danger else null end,
    case when is_master then coalesce(w.state->>'condition','unknown') else 'discovered' end,
    case when is_master then greatest(0,least(100,coalesce((w.state->>'looted_percent')::integer,0))) else null end,
    case when is_master then w.noise_level else null end
  from public.campaign_world_locations w
  where w.campaign_id=p_campaign_id and (is_master or w.discovered=true)
  order by w.updated_at desc;
end;
$$;

create function public.get_campaign_visible_world_location(p_id uuid)
returns table(
  id uuid, campaign_id uuid, name text, category text, latitude double precision, longitude double precision,
  address text, discovered boolean, danger text, condition text, looted_percent integer, noise_level integer
)
language plpgsql stable security definer set search_path=public
as $$
declare uid uuid:=auth.uid(); is_master boolean; is_member boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select exists(
    select 1 from public.campaign_world_locations w
    join public.campaign_members m on m.campaign_id=w.campaign_id
    where w.id=p_id and m.user_id=uid and m.role='master'
  ) into is_master;
  select exists(
    select 1 from public.campaign_world_locations w
    join public.campaign_members m on m.campaign_id=w.campaign_id
    where w.id=p_id and m.user_id=uid
  ) into is_member;
  if not is_member then raise exception 'location_not_found'; end if;
  return query
  select w.id,w.campaign_id,w.name,w.category,w.latitude,w.longitude,w.address,w.discovered,
    case when is_master then w.danger else null end,
    case when is_master then coalesce(w.state->>'condition','unknown') else 'discovered' end,
    case when is_master then greatest(0,least(100,coalesce((w.state->>'looted_percent')::integer,0))) else null end,
    case when is_master then w.noise_level else null end
  from public.campaign_world_locations w
  where w.id=p_id and (is_master or w.discovered=true);
end;
$$;

revoke execute on function public.get_campaign_world_location(uuid) from anon,authenticated,public;
revoke execute on function public.visit_campaign_world_location(uuid) from anon,authenticated,public;

grant execute on function public.list_campaign_visible_world_locations(uuid) to authenticated;
grant execute on function public.get_campaign_visible_world_location(uuid) to authenticated;

create or replace function public.discover_campaign_world_location(
  p_campaign_id uuid,p_source text,p_external_id text,p_name text,
  p_category text default 'Ponto de interesse',p_latitude double precision default null,
  p_longitude double precision default null,p_address text default null,p_metadata jsonb default '{}'::jsonb
)
returns table(id uuid,campaign_id uuid,name text,category text,latitude double precision,longitude double precision,address text,discovered boolean)
language plpgsql security definer set search_path=public
as $$
declare uid uuid:=auth.uid(); row public.campaign_world_locations;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not exists(select 1 from public.campaign_members m where m.campaign_id=p_campaign_id and m.user_id=uid)
    then raise exception 'not_campaign_member' using errcode='42501'; end if;
  insert into public.campaign_world_locations(
    campaign_id,source,external_id,name,category,latitude,longitude,address,resources,
    discovered,discovered_at,last_seen_at,expires_at
  ) values(
    p_campaign_id,coalesce(nullif(p_source,''),'osm'),p_external_id,
    coalesce(nullif(p_name,''),'Local sem nome'),coalesce(nullif(p_category,''),'Ponto de interesse'),
    p_latitude,p_longitude,p_address,'{}'::jsonb,true,now(),now(),now()+interval '30 days'
  )
  on conflict(campaign_id,source,external_id)
  do update set name=excluded.name,category=excluded.category,latitude=excluded.latitude,longitude=excluded.longitude,
    address=excluded.address,discovered=true,discovered_at=coalesce(public.campaign_world_locations.discovered_at,now()),
    last_seen_at=now(),expires_at=now()+interval '30 days',updated_at=now()
  returning * into row;
  return query select row.id,row.campaign_id,row.name,row.category,row.latitude,row.longitude,row.address,row.discovered;
end;
$$;
grant execute on function public.discover_campaign_world_location(uuid,text,text,text,text,double precision,double precision,text,jsonb) to authenticated;

alter table public.campaign_horde_events replica identity full;
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='campaign_horde_events') then
    alter publication supabase_realtime add table public.campaign_horde_events;
  end if;
end $$;