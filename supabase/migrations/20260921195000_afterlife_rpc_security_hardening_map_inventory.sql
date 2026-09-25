-- AFTERLIFE security hardening: restrict legacy map-position projections and inventory transfer initiation.

create or replace function public.list_campaign_map_members(p_campaign_id uuid)
returns table(
  user_id uuid,
  role text,
  display_name text,
  avatar_path text,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz
)
language plpgsql
security definer
stable
set search_path='public','extensions','pg_temp'
as $$
declare
  uid uuid := (select auth.uid());
  master_now boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not exists(select 1 from public.campaign_members cm where cm.campaign_id=p_campaign_id and cm.user_id=uid) then
    raise exception 'not_campaign_member' using errcode='42501';
  end if;
  master_now := public.afterlife_is_master(p_campaign_id,uid);

  return query
  select cm.user_id,
         cm.role::text,
         coalesce(nullif(p.display_name,''),'Sobrevivente'),
         p.avatar_path,
         case when master_now or cm.user_id=uid then mp.latitude else null end,
         case when master_now or cm.user_id=uid then mp.longitude else null end,
         case when master_now or cm.user_id=uid then mp.updated_at else null end
  from public.campaign_members cm
  left join public.profiles p on p.id=cm.user_id
  left join public.campaign_map_positions mp
    on mp.campaign_id=cm.campaign_id and mp.user_id=cm.user_id
  where cm.campaign_id=p_campaign_id
  order by case when cm.role::text='master' then 0 else 1 end,
           coalesce(nullif(p.display_name,''),'Sobrevivente');
end
$$;

revoke all on function public.list_campaign_map_members(uuid) from public,anon;
grant execute on function public.list_campaign_map_members(uuid) to authenticated;

create or replace function public.list_campaign_map_positions(p_campaign_id uuid)
returns setof public.campaign_map_positions
language plpgsql
security definer
stable
set search_path='public','extensions','pg_temp'
as $$
declare
  uid uuid := (select auth.uid());
  master_now boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not exists(select 1 from public.campaign_members cm where cm.campaign_id=p_campaign_id and cm.user_id=uid) then
    raise exception 'not_campaign_member' using errcode='42501';
  end if;
  master_now := public.afterlife_is_master(p_campaign_id,uid);

  if master_now then
    return query
      select *
      from public.campaign_map_positions
      where campaign_id=p_campaign_id
      order by updated_at desc;
  else
    return query
      select *
      from public.campaign_map_positions
      where campaign_id=p_campaign_id
        and user_id=uid
      order by updated_at desc;
  end if;
end
$$;

revoke all on function public.list_campaign_map_positions(uuid) from public,anon;
grant execute on function public.list_campaign_map_positions(uuid) to authenticated;

create or replace function public.transfer_character_inventory_item(
  p_inventory_id uuid,
  p_target_character_id uuid,
  p_quantity integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  source public.character_inventory%rowtype;
  target public.characters%rowtype;
  source_ch public.characters%rowtype;
  uid uuid := (select auth.uid());
  master_now boolean := false;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into source
  from public.character_inventory
  where id=p_inventory_id
  for update;
  if source.id is null then raise exception 'INVENTORY_ITEM_NOT_FOUND'; end if;

  select * into source_ch from public.characters where id=source.character_id;
  select * into target from public.characters where id=p_target_character_id;

  if source_ch.id is null or target.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  if source_ch.campaign_id is null or target.campaign_id<>source_ch.campaign_id then
    raise exception 'CHARACTER_CAMPAIGN_MISMATCH';
  end if;
  if target.status<>'completed' then raise exception 'TARGET_CHARACTER_NOT_ACTIVE'; end if;

  master_now := public.afterlife_is_master(source_ch.campaign_id,uid);
  if source_ch.user_id<>uid and not master_now then
    raise exception 'SOURCE_CHARACTER_NOT_OWNER';
  end if;

  if p_quantity<1 or p_quantity>source.quantity then raise exception 'INVALID_QUANTITY'; end if;

  perform public.add_character_inventory_item(
    target.id,source.item_template_id,p_quantity,source.custom_name,source.metadata
  );

  if p_quantity=source.quantity then
    delete from public.character_inventory where id=source.id;
  else
    update public.character_inventory
    set quantity=quantity-p_quantity,updated_at=now()
    where id=source.id;
  end if;

  return jsonb_build_object(
    'transferred',p_quantity,
    'from_character_id',source.character_id,
    'to_character_id',target.id,
    'item_template_id',source.item_template_id
  );
end
$$;

revoke all on function public.transfer_character_inventory_item(uuid,uuid,integer) from public,anon;
grant execute on function public.transfer_character_inventory_item(uuid,uuid,integer) to authenticated;
