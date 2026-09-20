-- AFTERLIFE MAP V3.1: keep player discovery server-authoritative.
-- Players can only materialize a real-world location while it is inside their 380m perception radius.
-- Non-discovered campaign locations cannot be searched/investigated through the RPC layer.
CREATE OR REPLACE FUNCTION public.discover_campaign_world_location(p_campaign_id uuid, p_source text, p_external_id text, p_name text, p_category text DEFAULT 'Ponto de interesse'::text, p_latitude double precision DEFAULT NULL::double precision, p_longitude double precision DEFAULT NULL::double precision, p_address text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, campaign_id uuid, name text, category text, latitude double precision, longitude double precision, address text, discovered boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid:=auth.uid();
  row public.campaign_world_locations;
  master_now boolean := false;
  map_lat double precision;
  map_lng double precision;
begin
  if uid is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not exists(select 1 from public.campaign_members m where m.campaign_id=p_campaign_id and m.user_id=uid)
    then raise exception 'not_campaign_member' using errcode='42501'; end if;

  select exists(
    select 1 from public.campaign_members m
    where m.campaign_id=p_campaign_id and m.user_id=uid and m.role='master'
  ) into master_now;

  if not master_now then
    select latitude,longitude into map_lat,map_lng
    from public.campaign_map_positions
    where campaign_id=p_campaign_id and user_id=uid;

    if p_latitude is null or p_longitude is null or map_lat is null or map_lng is null
       or 6371000 * 2 * asin(sqrt(
         power(sin(radians(p_latitude-map_lat)/2),2)
         + cos(radians(map_lat))*cos(radians(p_latitude))
         * power(sin(radians(p_longitude-map_lng)/2),2)
       )) > 380 then
      raise exception 'location_outside_perception';
    end if;
  end if;

  insert into public.campaign_world_locations(
    campaign_id,source,external_id,name,category,latitude,longitude,address,resources,
    discovered,discovered_at,last_seen_at,expires_at
  ) values(
    p_campaign_id,coalesce(nullif(p_source,''),'osm'),p_external_id,
    coalesce(nullif(p_name,''),'Local sem nome'),
    coalesce(nullif(p_category,''),'Ponto de interesse'),
    p_latitude,p_longitude,p_address,'{}'::jsonb,
    true,now(),now(),now()+interval '30 days'
  )
  on conflict(campaign_id,source,external_id)
  do update set
    name=excluded.name,category=excluded.category,latitude=excluded.latitude,longitude=excluded.longitude,
    address=excluded.address,discovered=true,discovered_at=coalesce(public.campaign_world_locations.discovered_at,now()),
    last_seen_at=now(),expires_at=now()+interval '30 days',updated_at=now()
  returning * into row;

  return query select row.id,row.campaign_id,row.name,row.category,row.latitude,row.longitude,row.address,row.discovered;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_location_action(p_location_id uuid, p_action_key text DEFAULT 'search'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  loc public.campaign_world_locations%rowtype;
  ch public.characters%rowtype;
  action text := lower(trim(coalesce(p_action_key,'search')));
  skill_key text;
  attribute_key text;
  skill_label text;
  attribute_label text;
  die_sides integer := 8;
  natural_roll integer;
  training_bonus integer := 0;
  modifier integer := 0;
  difficulty integer := 10;
  total integer;
  result text;
  consequence text := null;
  noise_delta integer := 0;
  state_signature text;
  test_row public.campaign_exploration_tests%rowtype;
  loot_json jsonb := '[]'::jsonb;
  attrs jsonb := '{}';
  skills jsonb := '{}';
  raw text;
  normalized_key text;
  k text;
  v jsonb;
  noise_next integer;
  discovery_level text := 'none';
  discovery_text text := null;
begin
  if uid is null then raise exception 'Sessão necessária.'; end if;
  select * into loc from public.campaign_world_locations where id=p_location_id for update;
  if not found then raise exception 'Local não encontrado.'; end if;
  if not exists (select 1 from public.campaign_members m where m.campaign_id=loc.campaign_id and m.user_id=uid) then raise exception 'Você não participa desta campanha.'; end if;
  if not exists (
    select 1 from public.campaign_members m
    where m.campaign_id=loc.campaign_id and m.user_id=uid and m.role='master'
  ) and not coalesce(loc.discovered,false) and action <> 'observe' then
    raise exception 'location_not_discovered';
  end if;
  select * into ch from public.characters c where c.user_id=uid and c.campaign_id=loc.campaign_id and coalesce(c.status,'completed')='completed' order by c.updated_at desc limit 1;
  if not found then raise exception 'Nenhum personagem ativo encontrado nesta campanha.'; end if;

  action := case
    when action in ('search','vasculhar','vasculhar_local') then 'search'
    when action in ('observe','observar') then 'observe'
    when action in ('investigate','investigar','analisar') then 'investigate'
    when action in ('track','rastrear') then 'track'
    else 'search'
  end;

  select
    case action when 'observe' then 'percepcao' when 'track' then 'sobrevivencia' when 'investigate' then 'investigacao' else 'investigacao' end,
    case action when 'observe' then 'percepcao' when 'track' then 'percepcao' when 'investigate' then 'mente' else 'mente' end,
    case action when 'observe' then 'Percepção' when 'track' then 'Sobrevivência' when 'investigate' then 'Investigação' else 'Investigação' end,
    case action when 'observe' then 'Percepção' when 'track' then 'Percepção' when 'investigate' then 'Intelecto' else 'Intelecto' end
  into skill_key,attribute_key,skill_label,attribute_label;

  attrs := coalesce(ch.attributes,'{}'::jsonb);
  skills := coalesce(ch.skill_modifiers,'{}'::jsonb);

  raw := attrs->>attribute_key;
  if raw is null and attribute_key='mente' then raw := coalesce(attrs->>'intelecto',attrs->>'intellect'); end if;
  if raw is null and attribute_key='percepcao' then raw := coalesce(attrs->>'perception',attrs->>'percepcao'); end if;
  if raw is null then
    for k,v in select key,value from jsonb_each(attrs) loop
      normalized_key := translate(lower(k),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc');
      if normalized_key in (attribute_key,'intelecto','presenca','vontade') then raw := v #>> '{}'; exit; end if;
    end loop;
  end if;
  if raw ~* '^d(4|6|8|10|12|20)$' then die_sides := substring(upper(raw) from 2)::integer;
  elsif raw ~ '^\d+$' then
    die_sides := case when raw::integer <= 8 then 4 when raw::integer <= 10 then 6 when raw::integer <= 12 then 8 when raw::integer = 13 then 10 when raw::integer = 14 then 12 else 20 end;
  end if;

  for k,v in select key,value from jsonb_each(skills) loop
    normalized_key := translate(lower(k),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc');
    if normalized_key = skill_key then
      if jsonb_typeof(v)='number' then training_bonus := coalesce((v#>>'{}')::integer,0);
      elsif jsonb_typeof(v)='object' then training_bonus := coalesce((v->>'bonus')::integer,(v->>'modifier')::integer,0); end if;
      exit;
    end if;
  end loop;

  difficulty := case
    when lower(coalesce(loc.danger,'unknown'))='low' then 8
    when lower(coalesce(loc.danger,'unknown'))='medium' then 10
    when lower(coalesce(loc.danger,'unknown'))='high' then 12
    when lower(coalesce(loc.danger,'unknown'))='critical' then 15
    else 10 end;
  if lower(coalesce(loc.state->>'condition','unknown'))='destroyed' then difficulty := least(18,difficulty+3);
  elsif lower(coalesce(loc.state->>'condition','unknown'))='damaged' then difficulty := least(18,difficulty+1);
  end if;
  if action='investigate' then modifier := -1; else modifier := 0; end if;

  state_signature := md5(coalesce(loc.state::text,'{}') || '|' || coalesce(loc.danger,'unknown') || '|' || coalesce(loc.resources::text,'{}'));
  if exists (select 1 from public.campaign_exploration_tests t where t.character_id=ch.id and t.location_id=loc.id and t.action_key=action and t.state_signature=state_signature) then
    raise exception 'Esta ação já foi realizada neste estado do local. Uma nova tentativa exige uma mudança relevante na situação.';
  end if;

  natural_roll := 1 + floor(random()*die_sides)::integer;
  total := natural_roll + training_bonus + modifier;
  if natural_roll = die_sides then result := 'critical';
  elsif natural_roll = 1 then result := 'critical_failure';
  elsif total >= difficulty + 5 then result := 'great_success';
  elsif total >= difficulty then result := 'success';
  else result := 'failure'; end if;

  if action in ('search','investigate','track') then noise_delta := 1; end if;
  if result='critical_failure' then noise_delta := noise_delta + 1; end if;
  consequence := case result
    when 'critical' then case action when 'search' then 'Descoberta excepcional.' when 'observe' then 'Percepção excepcional.' else 'Informação excepcional.' end
    when 'great_success' then 'Descoberta adicional.'
    when 'success' then 'Resultado concluído.'
    when 'failure' then case lower(coalesce(loc.danger,'unknown')) when 'low' then 'Nada relevante encontrado.' when 'medium' then 'Tempo perdido.' when 'high' then 'Há risco de chamar atenção.' else 'A ameaça pode reagir.' end
    when 'critical_failure' then 'Consequência agravada e possível alteração do local.'
  end;

  insert into public.campaign_exploration_tests(campaign_id,character_id,location_id,action_key,skill_key,attribute_key,die_sides,natural_roll,training_bonus,modifier,total,difficulty,result,consequence,noise_delta,state_signature)
  values(loc.campaign_id,ch.id,loc.id,action,skill_key,attribute_key,die_sides,natural_roll,training_bonus,modifier,total,difficulty,result,consequence,noise_delta,state_signature)
  returning * into test_row;

  noise_next := greatest(0,least(5,coalesce(loc.noise_level,0)+noise_delta));
  if action='observe' and not coalesce(loc.discovered,false) then
    if result in ('critical','great_success') then
      discovery_level := 'detailed';
      discovery_text := 'Você identifica o local e percebe detalhes importantes ao redor.';
    elsif result='success' then
      discovery_level := 'identified';
      discovery_text := 'Você identifica o local.';
    elsif result in ('failure','critical_failure') then
      discovery_level := 'sighted';
      discovery_text := case when result='critical_failure' then 'Você percebe que há algo ali, mas não consegue identificar com segurança.' else 'Você percebe algo no local, mas ainda não consegue confirmar o que é.' end;
    end if;
  end if;

  if action='observe' and result in ('success','great_success','critical') and not coalesce(loc.discovered,false) then
    update public.campaign_world_locations
      set discovered=true,
          discovered_at=coalesce(discovered_at,now()),
          noise_level=noise_next,
          last_seen_at=now(),
          updated_at=now()
      where id=loc.id;
  else
    update public.campaign_world_locations
      set noise_level=noise_next,
          last_visited_at=now(),
          updated_at=now()
      where id=loc.id;
  end if;

  if action='search' and result in ('success','great_success','critical') then
    perform public.generate_location_loot(loc.id);
    select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at), '[]'::jsonb)
      into loot_json
      from public.campaign_location_loot l where l.location_id=loc.id and l.test_id=test_row.id;
  end if;

  return jsonb_build_object(
    'test_id',test_row.id,
    'action',action,
    'skill_key',skill_key,
    'skill_label',skill_label,
    'attribute_key',attribute_key,
    'attribute_label',attribute_label,
    'die',('D'||die_sides),
    'natural_roll',natural_roll,
    'training_bonus',training_bonus,
    'modifier',modifier,
    'total',total,
    'difficulty',difficulty,
    'result',result,
    'consequence',consequence,
    'noise_delta',noise_delta,
    'noise_level',noise_next,
    'discovered',case when action='observe' and result in ('success','great_success','critical') then true else coalesce(loc.discovered,false) end,
    'discovery_level',discovery_level,
    'discovery_text',discovery_text,
    'loot',loot_json
  );
end;
$function$
;
