alter table public.campaign_travels
  add column if not exists progress_percent numeric not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  add column if not exists current_latitude double precision,
  add column if not exists current_longitude double precision;

create table if not exists public.campaign_travel_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  travel_id uuid not null references public.campaign_travels(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  progress_percent numeric not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  type text not null default 'custom' check (type in ('encounter','hazard','discovery','resource','survivor','faction','zombie','custom')),
  status text not null default 'pending' check (status in ('pending','active','resolved','skipped')),
  title text not null default 'Evento de viagem',
  description text not null default '',
  outcome text,
  activated_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_travel_events_travel_progress_idx
  on public.campaign_travel_events(travel_id, progress_percent, created_at);
create index if not exists campaign_travel_events_campaign_created_idx
  on public.campaign_travel_events(campaign_id, created_at desc);

alter table public.campaign_travel_events enable row level security;
drop policy if exists "campaign_travel_events_select_member" on public.campaign_travel_events;
create policy "campaign_travel_events_select_member" on public.campaign_travel_events
for select to authenticated using (
  exists (
    select 1 from public.campaign_members cm
    where cm.campaign_id = campaign_travel_events.campaign_id
      and cm.user_id = (select auth.uid())
  )
);
alter table public.campaign_travel_events replica identity full;
do $$ begin
  begin alter publication supabase_realtime add table public.campaign_travel_events; exception when duplicate_object then null; end;
end $$;
alter table public.campaign_travels replica identity full;

create or replace function public.list_campaign_travel_events(p_travel_id uuid)
returns setof public.campaign_travel_events
language plpgsql security definer set search_path = public
as $$
declare v_role text;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select cm.role into v_role
  from public.campaign_members cm
  join public.campaign_travels t on t.campaign_id = cm.campaign_id
  where t.id = p_travel_id and cm.user_id = (select auth.uid())
  limit 1;
  if v_role is null then raise exception 'NOT_CAMPAIGN_MEMBER'; end if;
  if v_role = 'master' then
    return query select * from public.campaign_travel_events
      where travel_id = p_travel_id order by progress_percent asc, created_at asc;
  end if;
  return query select * from public.campaign_travel_events
    where travel_id = p_travel_id and status <> 'pending'
    order by progress_percent asc, created_at asc;
end; $$;

create or replace function public.create_campaign_travel_event(
  p_travel_id uuid,
  p_progress_percent numeric default 0,
  p_type text default 'custom',
  p_title text default 'Evento de viagem',
  p_description text default ''
)
returns public.campaign_travel_events
language plpgsql security definer set search_path = public
as $$
declare v_row public.campaign_travel_events; v_campaign uuid; v_status text;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select campaign_id, status into v_campaign, v_status from public.campaign_travels where id = p_travel_id;
  if v_campaign is null then raise exception 'TRAVEL_NOT_FOUND'; end if;
  if not exists (
    select 1 from public.campaign_members
    where campaign_id = v_campaign and user_id = (select auth.uid()) and role = 'master'
  ) then raise exception 'MASTER_REQUIRED'; end if;
  if v_status not in ('planned','in_transit') then raise exception 'TRAVEL_NOT_ACTIVE'; end if;
  if coalesce(p_progress_percent,0) < 0 or coalesce(p_progress_percent,0) > 100 then raise exception 'INVALID_PROGRESS'; end if;
  if coalesce(p_type,'custom') not in ('encounter','hazard','discovery','resource','survivor','faction','zombie','custom') then raise exception 'INVALID_EVENT_TYPE'; end if;
  insert into public.campaign_travel_events(
    campaign_id, travel_id, created_by, progress_percent, type, status, title, description
  ) values (
    v_campaign, p_travel_id, (select auth.uid()), greatest(0,least(100,coalesce(p_progress_percent,0))),
    coalesce(p_type,'custom'), 'pending', left(coalesce(nullif(trim(p_title),''),'Evento de viagem'),140), left(coalesce(p_description,''),1000)
  ) returning * into v_row;
  return v_row;
end; $$;

create or replace function public.advance_campaign_travel_progress(
  p_travel_id uuid,
  p_progress_percent numeric
)
returns public.campaign_travels
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.campaign_travels;
  v_progress numeric;
  v_lat double precision;
  v_lng double precision;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select t.* into v_row
  from public.campaign_travels t
  where t.id = p_travel_id
    and exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = t.campaign_id and cm.user_id = (select auth.uid()) and cm.role = 'master'
    )
    and t.status = 'in_transit';
  if v_row.id is null then raise exception 'TRAVEL_NOT_IN_PROGRESS'; end if;
  v_progress := greatest(coalesce(v_row.progress_percent,0), greatest(0,least(100,coalesce(p_progress_percent,0))));
  v_lat := v_row.origin_latitude + (v_row.destination_latitude - v_row.origin_latitude) * (v_progress / 100.0);
  v_lng := v_row.origin_longitude + (v_row.destination_longitude - v_row.origin_longitude) * (v_progress / 100.0);
  update public.campaign_travels
  set progress_percent = v_progress,
      current_latitude = v_lat,
      current_longitude = v_lng,
      updated_at = now()
  where id = v_row.id
  returning * into v_row;
  update public.campaign_map_positions
  set latitude = v_lat, longitude = v_lng, updated_at = now()
  where campaign_id = v_row.campaign_id
    and user_id = any(v_row.participant_user_ids);
  update public.campaign_travel_events
  set status = 'active', activated_at = coalesce(activated_at, now()), updated_at = now()
  where travel_id = v_row.id and status = 'pending' and progress_percent <= v_progress;
  return v_row;
end; $$;

create or replace function public.resolve_campaign_travel_event(
  p_event_id uuid,
  p_status text,
  p_outcome text default null
)
returns public.campaign_travel_events
language plpgsql security definer set search_path = public
as $$
declare v_row public.campaign_travel_events;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_status not in ('resolved','skipped') then raise exception 'INVALID_EVENT_STATUS'; end if;
  update public.campaign_travel_events e
  set status = p_status,
      outcome = left(coalesce(p_outcome,''),1500),
      resolved_at = now(),
      updated_at = now()
  where e.id = p_event_id
    and e.status = 'active'
    and exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = e.campaign_id and cm.user_id = (select auth.uid()) and cm.role = 'master'
    )
  returning * into v_row;
  if v_row.id is null then raise exception 'TRAVEL_EVENT_NOT_ACTIVE'; end if;
  return v_row;
end; $$;

create or replace function public.start_campaign_travel(p_travel_id uuid)
returns public.campaign_travels
language plpgsql security definer set search_path = public
as $$
declare v_row public.campaign_travels;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.campaign_travels t
  set status='in_transit', started_at=coalesce(started_at,now()), updated_at=now(),
      progress_percent=0, current_latitude=origin_latitude, current_longitude=origin_longitude
  where t.id=p_travel_id
    and exists(select 1 from public.campaign_members cm where cm.campaign_id=t.campaign_id and cm.user_id=(select auth.uid()) and cm.role='master')
    and t.status='planned'
  returning * into v_row;
  if v_row.id is null then raise exception 'TRAVEL_NOT_PLANNED'; end if;
  update public.campaign_map_positions
  set latitude=v_row.origin_latitude, longitude=v_row.origin_longitude, updated_at=now()
  where campaign_id=v_row.campaign_id and user_id=any(v_row.participant_user_ids);
  update public.campaign_travel_events
  set status='active', activated_at=coalesce(activated_at,now()), updated_at=now()
  where travel_id=v_row.id and status='pending' and progress_percent <= 0;
  return v_row;
end; $$;

create or replace function public.complete_campaign_travel(p_travel_id uuid)
returns public.campaign_travels
language plpgsql security definer set search_path = public
as $$
declare v_row public.campaign_travels; uid uuid;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select t.* into v_row from public.campaign_travels t
  where t.id=p_travel_id
    and exists(select 1 from public.campaign_members cm where cm.campaign_id=t.campaign_id and cm.user_id=(select auth.uid()) and cm.role='master')
    and t.status='in_transit';
  if v_row.id is null then raise exception 'TRAVEL_NOT_IN_PROGRESS'; end if;
  foreach uid in array v_row.participant_user_ids loop
    insert into public.campaign_map_positions(campaign_id,user_id,latitude,longitude,updated_at)
    values(v_row.campaign_id,uid,v_row.destination_latitude,v_row.destination_longitude,now())
    on conflict (campaign_id,user_id) do update set latitude=excluded.latitude, longitude=excluded.longitude, updated_at=now();
  end loop;
  update public.campaign_travel_events
  set status='active', activated_at=coalesce(activated_at,now()), updated_at=now()
  where travel_id=v_row.id and status='pending';
  update public.campaign_travels set status='completed', progress_percent=100, current_latitude=destination_latitude, current_longitude=destination_longitude, completed_at=now(), updated_at=now()
  where id=v_row.id returning * into v_row;
  return v_row;
end; $$;

revoke all on function public.list_campaign_travel_events(uuid) from public, anon;
grant execute on function public.list_campaign_travel_events(uuid) to authenticated;
revoke all on function public.create_campaign_travel_event(uuid,numeric,text,text,text) from public, anon;
grant execute on function public.create_campaign_travel_event(uuid,numeric,text,text,text) to authenticated;
revoke all on function public.advance_campaign_travel_progress(uuid,numeric) from public, anon;
grant execute on function public.advance_campaign_travel_progress(uuid,numeric) to authenticated;
revoke all on function public.resolve_campaign_travel_event(uuid,text,text) from public, anon;
grant execute on function public.resolve_campaign_travel_event(uuid,text,text) to authenticated;
revoke all on function public.start_campaign_travel(uuid) from public, anon;
grant execute on function public.start_campaign_travel(uuid) to authenticated;
revoke all on function public.complete_campaign_travel(uuid) from public, anon;
grant execute on function public.complete_campaign_travel(uuid) to authenticated;
