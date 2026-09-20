-- AFTERLIFE: make campaign map character-centric instead of member-centric.
create index if not exists characters_campaign_user_status_idx
  on public.characters(campaign_id,user_id,status);

create or replace function public.list_campaign_map_characters(p_campaign_id uuid)
returns table(
  character_id uuid,
  user_id uuid,
  name text,
  race text,
  class text,
  status text,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  is_master boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not public.afterlife_is_member(p_campaign_id,uid) then
    raise exception 'not_campaign_member' using errcode='42501';
  end if;
  is_master := public.afterlife_is_master(p_campaign_id,uid);

  return query
  select c.id,
         c.user_id,
         coalesce(nullif(trim(c.name),''),'Sobrevivente'),
         coalesce(c.race,'Humano'),
         coalesce(c.class,'Sobrevivente'),
         c.status,
         mp.latitude,
         mp.longitude,
         greatest(c.updated_at,coalesce(mp.updated_at,c.updated_at))
  from public.characters c
  left join public.campaign_map_positions mp
    on mp.campaign_id=c.campaign_id and mp.user_id=c.user_id
  where c.campaign_id=p_campaign_id
    and c.status='completed'
    and (is_master or c.user_id=uid)
  order by c.updated_at desc;
end
$$;

revoke all on function public.list_campaign_map_characters(uuid) from public,anon;
grant execute on function public.list_campaign_map_characters(uuid) to authenticated;

create or replace function public.add_campaign_character(
  p_campaign_id uuid,
  p_character_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  ch public.characters%rowtype;
  existing_count integer;
  pos record;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not public.afterlife_is_member(p_campaign_id,uid) then
    raise exception 'not_campaign_member' using errcode='42501';
  end if;

  select * into ch
  from public.characters
  where id=p_character_id and user_id=uid and status='completed'
  for update;

  if ch.id is null then raise exception 'CHARACTER_NOT_AVAILABLE'; end if;

  if ch.campaign_id is not null and ch.campaign_id<>p_campaign_id then
    raise exception 'CHARACTER_IN_ANOTHER_CAMPAIGN'; end if;

  select count(*) into existing_count
  from public.characters
  where campaign_id=p_campaign_id
    and user_id=uid
    and status='completed'
    and id<>p_character_id;

  if existing_count>0 then
    raise exception 'CHARACTER_ALREADY_ACTIVE';
  end if;

  update public.characters
  set campaign_id=p_campaign_id, updated_at=now()
  where id=p_character_id;

  select latitude,longitude into pos
  from public.campaign_map_positions
  where campaign_id=p_campaign_id and user_id=uid;

  if pos.latitude is null or pos.longitude is null then
    insert into public.campaign_map_positions(campaign_id,user_id,latitude,longitude,updated_at)
    values(p_campaign_id,uid,null,null,now())
    on conflict(campaign_id,user_id) do nothing;
  end if;

  return jsonb_build_object(
    'character_id',p_character_id,
    'campaign_id',p_campaign_id,
    'user_id',uid,
    'status','active'
  );
end
$$;

revoke all on function public.add_campaign_character(uuid,uuid) from public,anon;
grant execute on function public.add_campaign_character(uuid,uuid) to authenticated;


-- Character movement permission is implemented as a SECURITY DEFINER RPC.
create or replace function public.move_campaign_character(
  p_campaign_id uuid,
  p_character_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := (select auth.uid()); ch public.characters%rowtype;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_latitude is null or p_longitude is null or p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then raise exception 'INVALID_COORDINATES' using errcode='22023'; end if;
  select * into ch from public.characters where id=p_character_id and campaign_id=p_campaign_id and status='completed' for update;
  if ch.id is null then raise exception 'CHARACTER_NOT_IN_CAMPAIGN' using errcode='42501'; end if;
  if ch.user_id<>uid and not public.afterlife_is_master(p_campaign_id,uid) then raise exception 'CHARACTER_MOVE_FORBIDDEN' using errcode='42501'; end if;
  insert into public.campaign_map_positions(campaign_id,user_id,latitude,longitude,updated_at)
  values(p_campaign_id,ch.user_id,p_latitude,p_longitude,now())
  on conflict(campaign_id,user_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now();
  return jsonb_build_object('character_id',ch.id,'user_id',ch.user_id,'latitude',p_latitude,'longitude',p_longitude,'updated_at',now());
end $$;
revoke all on function public.move_campaign_character(uuid,uuid,double precision,double precision) from public,anon;
grant execute on function public.move_campaign_character(uuid,uuid,double precision,double precision) to authenticated;