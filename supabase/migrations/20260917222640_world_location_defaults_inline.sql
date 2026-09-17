create or replace function public.upsert_campaign_world_location(
  p_campaign_id uuid,
  p_source text,
  p_external_id text,
  p_name text,
  p_category text default 'Ponto de interesse',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_address text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.campaign_world_locations
language plpgsql
security definer
set search_path = public
as $function$
declare
  r public.campaign_world_locations;
  source_key text := coalesce(nullif(p_source,''),'osm');
  generated_resources jsonb := case
    when jsonb_typeof(coalesce(p_metadata,'{}'::jsonb)->'generated_defaults') = 'object'
      then coalesce(p_metadata,'{}'::jsonb)->'generated_defaults'
    else '{}'::jsonb
  end;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  if not exists(
    select 1 from public.campaign_members cm
    where cm.campaign_id = p_campaign_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'not_campaign_member';
  end if;

  insert into public.campaign_world_locations(
    campaign_id, source, external_id, name, category,
    latitude, longitude, address, resources, last_seen_at, expires_at
  )
  values(
    p_campaign_id, source_key, p_external_id,
    coalesce(nullif(p_name,''),'Local sem nome'),
    coalesce(nullif(p_category,''),'Ponto de interesse'),
    p_latitude, p_longitude, p_address,
    generated_resources, now(), now()+interval '30 days'
  )
  on conflict(campaign_id,source,external_id)
  do update set
    name=excluded.name,
    category=excluded.category,
    latitude=excluded.latitude,
    longitude=excluded.longitude,
    address=excluded.address,
    last_seen_at=now(),
    expires_at=now()+interval '30 days',
    updated_at=now();

  select * into r
  from public.campaign_world_locations w
  where w.campaign_id=p_campaign_id
    and w.source=source_key
    and w.external_id=p_external_id;

  return r;
end
$function$;
