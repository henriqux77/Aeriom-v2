CREATE OR REPLACE FUNCTION public.create_campaign(
  p_id uuid,
  p_name text,
  p_description text DEFAULT '',
  p_country text DEFAULT 'Local não definido',
  p_tone text DEFAULT 'Realista',
  p_scale text DEFAULT 'world',
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_cover_path text DEFAULT NULL
)
RETURNS public.campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_campaign public.campaigns;
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_country text := btrim(coalesce(p_country, ''));
  v_tone text := btrim(coalesce(p_tone, 'Realista'));
  v_scale text := btrim(coalesce(p_scale, 'world'));
  v_cover_path text := nullif(btrim(coalesce(p_cover_path, '')), '');
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if length(v_name) < 3 or length(v_name) > 100 then
    raise exception 'invalid_campaign_name' using errcode = '22023';
  end if;
  if length(v_description) > 600 then
    raise exception 'invalid_campaign_description' using errcode = '22023';
  end if;
  if length(v_country) < 1 or length(v_country) > 120 then
    raise exception 'invalid_campaign_country' using errcode = '22023';
  end if;
  if v_tone not in ('Realista','Sobrevivência extrema','Horror','Ação','Exploração') then
    raise exception 'invalid_campaign_tone' using errcode = '22023';
  end if;
  if v_scale not in ('world','regional','city','local') then
    raise exception 'invalid_campaign_scale' using errcode = '22023';
  end if;
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then
    raise exception 'invalid_campaign_latitude' using errcode = '22023';
  end if;
  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then
    raise exception 'invalid_campaign_longitude' using errcode = '22023';
  end if;
  insert into public.campaigns (
    id, created_by, name, description, country, tone, scale,
    latitude, longitude, cover_path, cover_url
  ) values (
    v_id, v_user_id, v_name, v_description, v_country, v_tone, v_scale,
    p_latitude, p_longitude, v_cover_path, null
  )
  returning * into v_campaign;
  return v_campaign;
end;
$function$;

REVOKE ALL ON FUNCTION public.create_campaign(uuid,text,text,text,text,text,double precision,double precision,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_campaign(uuid,text,text,text,text,text,double precision,double precision,text) TO authenticated;
