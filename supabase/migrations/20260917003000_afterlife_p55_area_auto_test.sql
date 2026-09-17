-- AFTERLIFE P5.5
-- Automatic tests for internal location areas, reusing campaign_exploration_tests.

alter table public.campaign_exploration_tests
  add column if not exists area_id uuid references public.campaign_location_areas(id) on delete cascade;

create index if not exists campaign_exploration_tests_area_idx
  on public.campaign_exploration_tests(character_id, area_id, action_key, state_signature);

create or replace function public.resolve_location_area_action(p_area_id uuid, p_action_key text default 'investigate')
returns jsonb
language plpgsql
security definer
set search_path='public'
as $function$
declare
  uid uuid := auth.uid();
  area public.campaign_location_areas%rowtype;
  loc public.campaign_world_locations%rowtype;
  ch public.characters%rowtype;
  action text := lower(trim(coalesce(p_action_key,'investigate')));
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
  attrs jsonb := '{}';
  skills jsonb := '{}';
  raw text;
  normalized_key text;
  k text;
  v jsonb;
  noise_next integer;
  discovery_level text := 'none';
  discovery_text text := null;
  revealed_information text := null;
  revealed_event jsonb := null;
  revealed_creatures jsonb := '[]'::jsonb;
  revealed_secrets jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'Sessão necessária.'; end if;

  select a.* into area from public.campaign_location_areas a where a.id=p_area_id for update;
  if not found then raise exception 'Área não encontrada.'; end if;
  select l.* into loc from public.campaign_world_locations l where l.id=area.location_id;
  if not found then raise exception 'Local da área não encontrado.'; end if;
  if not exists (select 1 from public.campaign_members m where m.campaign_id=area.campaign_id and m.user_id=uid) then
    raise exception 'Você não participa desta campanha.';
  end if;
  select * into ch from public.characters c where c.user_id=uid and c.campaign_id=area.campaign_id and coalesce(c.status,'completed')='completed' order by c.updated_at desc limit 1;
  if not found then raise exception 'Nenhum personagem ativo encontrado nesta campanha.'; end if;

  action := case
    when action in ('observe','observar','perceber') then 'observe'
    when action in ('search','buscar','vasculhar','vasculhar_area') then 'search'
    when action in ('track','rastrear') then 'track'
    else 'investigate'
  end;

  select
    case action when 'observe' then 'percepcao' when 'track' then 'sobrevivencia' else 'investigacao' end,
    case action when 'observe' then 'percepcao' when 'track' then 'percepcao' else 'mente' end,
    case action when 'observe' then 'Percepção' when 'track' then 'Sobrevivência' else 'Investigação' end,
    case action when 'observe' then 'Percepção' when 'track' then 'Percepção' else 'Intelecto' end
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

  difficulty := coalesce(area.difficulty, case
    when lower(coalesce(area.danger,'unknown'))='low' then 8
    when lower(coalesce(area.danger,'unknown'))='medium' then 10
    when lower(coalesce(area.danger,'unknown'))='high' then 12
    when lower(coalesce(area.danger,'unknown'))='critical' then 15
    else 10 end);
  if lower(coalesce(area.danger,'unknown'))='critical' then difficulty := least(20,difficulty+1); end if;
  if lower(coalesce(loc.state->>'condition','unknown'))='destroyed' then difficulty := least(20,difficulty+2);
  elsif lower(coalesce(loc.state->>'condition','unknown'))='damaged' then difficulty := least(20,difficulty+1); end if;
  if action='investigate' then modifier := -1; else modifier := 0; end if;

  state_signature := md5(coalesce(area.state::text,'{}') || '|' || coalesce(area.danger,'unknown') || '|' || coalesce(area.difficulty::text,'null') || '|' || coalesce(loc.state::text,'{}') || '|' || coalesce(loc.danger,'unknown'));
  if exists (select 1 from public.campaign_exploration_tests t where t.character_id=ch.id and t.area_id=area.id and t.action_key=action and t.state_signature=state_signature) then
    raise exception 'Esta ação já foi realizada nesta área neste estado. Uma nova tentativa exige uma mudança relevante.';
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
    when 'critical' then 'Você encontra uma pista excepcional na área.'
    when 'great_success' then 'Você encontra informações adicionais e percebe detalhes importantes.'
    when 'success' then 'Você consegue investigar a área.'
    when 'failure' then case lower(coalesce(area.danger,'unknown')) when 'low' then 'Nada conclusivo foi encontrado.' when 'medium' then 'Você perde tempo e faz barulho.' when 'high' then 'A investigação aumenta o risco de chamar atenção.' else 'A ameaça da área pode reagir.' end
    when 'critical_failure' then 'A investigação dá errado e aumenta o risco de chamar atenção.'
  end;

  insert into public.campaign_exploration_tests(campaign_id,character_id,location_id,area_id,action_key,skill_key,attribute_key,die_sides,natural_roll,training_bonus,modifier,total,difficulty,result,consequence,noise_delta,state_signature)
  values(area.campaign_id,ch.id,loc.id,area.id,action,skill_key,attribute_key,die_sides,natural_roll,training_bonus,modifier,total,difficulty,result,consequence,noise_delta,state_signature)
  returning * into test_row;

  noise_next := greatest(0,least(5,coalesce(loc.noise_level,0)+noise_delta));
  update public.campaign_world_locations set noise_level=noise_next,last_visited_at=now(),updated_at=now() where id=loc.id;

  if result in ('success','great_success','critical') then
    discovery_level := case result when 'success' then 'identified' when 'great_success' then 'detailed' else 'exceptional' end;
    discovery_text := case result
      when 'success' then 'Você entende o que está acontecendo nesta área.'
      when 'great_success' then 'Você encontra informações adicionais nesta área.'
      else 'Você percebe detalhes excepcionais e encontra informações muito valiosas.' end;
    revealed_information := area.information;
    if result in ('great_success','critical') then
      revealed_event := area.event;
      revealed_creatures := coalesce(area.creatures,'[]'::jsonb);
    end if;
    if result='critical' then
      revealed_secrets := coalesce(area.secrets,'[]'::jsonb);
    end if;
    update public.campaign_location_areas
      set state = state || jsonb_build_object('investigated',true,'status',case when result='critical' then 'revealed' when result='great_success' then 'searched' else 'identified' end,'last_result',result,'last_test_id',test_row.id,'last_investigated_at',now()),
          updated_at=now()
      where id=area.id;
  end if;

  return jsonb_build_object(
    'test_id',test_row.id,'area_id',area.id,'action',action,
    'skill_key',skill_key,'skill_label',skill_label,
    'attribute_key',attribute_key,'attribute_label',attribute_label,
    'die',('D'||die_sides),'natural_roll',natural_roll,
    'training_bonus',training_bonus,'modifier',modifier,
    'total',total,'difficulty',difficulty,'result',result,
    'consequence',consequence,'noise_delta',noise_delta,'noise_level',noise_next,
    'discovery_level',discovery_level,'discovery_text',discovery_text,
    'revealed_information',revealed_information,
    'revealed_event',coalesce(revealed_event,'{}'::jsonb),
    'revealed_creatures',revealed_creatures,
    'revealed_secrets',revealed_secrets
  );
end;
$function$;

revoke execute on function public.resolve_location_area_action(uuid,text) from anon, public;
grant execute on function public.resolve_location_area_action(uuid,text) to authenticated;
