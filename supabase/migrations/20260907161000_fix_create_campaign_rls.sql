CREATE OR REPLACE FUNCTION public.create_campaign(p_name text, p_description text DEFAULT NULL::text, p_cover_path text DEFAULT NULL::text)
RETURNS public.campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_campaign public.campaigns;
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_cover_path text := nullif(btrim(coalesce(p_cover_path, '')), '');
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if length(v_name) < 1 or length(v_name) > 120 then raise exception 'invalid_campaign_name' using errcode = '22023'; end if;
  if v_description is not null and length(v_description) > 1000 then raise exception 'invalid_campaign_description' using errcode = '22023'; end if;
  insert into public.campaigns (name,description,cover_path,cover_url,created_by)
  values (v_name,v_description,v_cover_path,null,v_user_id)
  returning * into v_campaign;
  return v_campaign;
end;
$function$;
REVOKE ALL ON FUNCTION public.create_campaign(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_campaign(text,text,text) TO authenticated;