-- AFTERLIFE P5.6
-- Area-specific loot/content activation.

alter table public.campaign_location_loot
  add column if not exists area_id uuid references public.campaign_location_areas(id) on delete cascade;

create index if not exists campaign_location_loot_area_idx
  on public.campaign_location_loot(area_id, created_at);

create or replace function public.generate_area_loot(p_area_id uuid, p_test_id uuid default null)
returns setof public.campaign_location_loot
language plpgsql security definer set search_path='public'
as $function$
declare
  area public.campaign_location_areas%rowtype;
  loc public.campaign_world_locations%rowtype;
  uid uuid := auth.uid();
  t public.campaign_exploration_tests%rowtype;
  profile jsonb;
  categories jsonb;
  names jsonb;
  cats jsonb;
  n integer := 2;
  i integer;
  chosen integer;
  item_key text;
  item_name text;
  item_category text;
  rarity text := 'comum';
  qty integer;
begin
  if uid is null then raise exception 'Sessão necessária.'; end if;
  select * into area from public.campaign_location_areas where id=p_area_id;
  if not found then raise exception 'Área não encontrada.'; end if;
  select * into loc from public.campaign_world_locations where id=area.location_id;
  if not found then raise exception 'Local da área não encontrado.'; end if;
  if not exists(select 1 from public.campaign_members where campaign_id=area.campaign_id and user_id=uid) then raise exception 'Você não participa desta campanha.'; end if;

  if p_test_id is not null then
    select * into t from public.campaign_exploration_tests where id=p_test_id and area_id=p_area_id and character_id in (select c.id from public.characters c where c.user_id=uid and c.campaign_id=area.campaign_id) limit 1;
  else
    select * into t from public.campaign_exploration_tests x where x.area_id=p_area_id and x.character_id in (select c.id from public.characters c where c.user_id=uid and c.campaign_id=area.campaign_id) and x.action_key in ('search','investigate') and x.result in ('success','great_success','critical') order by x.created_at desc limit 1;
  end if;
  if not found then raise exception 'É necessário concluir uma investigação da área com sucesso.'; end if;

  if exists(select 1 from public.campaign_location_loot l where l.test_id=t.id and l.area_id=p_area_id) then
    return query select * from public.campaign_location_loot where test_id=t.id and area_id=p_area_id and claimed_at is null order by created_at;
    return;
  end if;

  profile := coalesce(area.loot_profile,'{}'::jsonb);
  categories := case when jsonb_typeof(profile->'items')='array' and jsonb_array_length(profile->'items')>0 then profile->'items' else null end;
  names := case when jsonb_typeof(profile->'names')='array' then profile->'names' else null end;
  cats := case when jsonb_typeof(profile->'categories')='array' then profile->'categories' else null end;

  if categories is null then
    categories := '[]'::jsonb;
    if lower(coalesce(area.category,'')) ~ 'hospital|medic|farm' then categories := '["medico","ataduras","medicamento"]'::jsonb;
    elsif lower(coalesce(area.category,'')) ~ 'cozinha|restaurante|mercado|comerc' then categories := '["alimento","agua","suprimento"]'::jsonb;
    elsif lower(coalesce(area.category,'')) ~ 'oficina|garagem|almox' then categories := '["ferramentas","pecas","sucata"]'::jsonb;
    else categories := '["suprimento","agua","material"]'::jsonb;
    end if;
  end if;

  n := case when t.result='critical' then 4 when t.result='great_success' then 3 else 2 end;
  if lower(coalesce(area.danger,'unknown')) in ('high','critical') then rarity := 'incomum'; end if;
  if t.result='critical' and random()<0.45 then rarity := 'raro'; end if;

  for i in 1..n loop
    chosen := 1 + floor(random()*jsonb_array_length(categories))::integer;
    item_key := categories->>((chosen-1));
    item_category := coalesce(cats->>((chosen-1)), item_key);
    item_name := coalesce(names->>((chosen-1)), initcap(replace(item_key,'_',' ')));
    qty := case when t.result='critical' then greatest(1,1+floor(random()*3)::integer) else greatest(1,1+floor(random()*2)::integer) end;
    insert into public.campaign_location_loot(campaign_id,location_id,area_id,generated_by,item_key,item_name,item_category,quantity,rarity,metadata,test_id)
    values(area.campaign_id,area.location_id,area.id,uid,item_key,item_name,item_category,qty,rarity,jsonb_build_object('scope','area','area_id',area.id,'area_category',area.category,'area_danger',area.danger,'test_id',t.id),t.id);
  end loop;

  return query select * from public.campaign_location_loot where test_id=t.id and area_id=p_area_id and claimed_at is null order by created_at;
end;
$function$;

create or replace function public.claim_area_loot(p_loot_id uuid)
returns public.campaign_location_loot
language plpgsql security definer set search_path='public'
as $function$
declare
  loot public.campaign_location_loot%rowtype;
  ch public.characters%rowtype;
begin
  if auth.uid() is null then raise exception 'Sessão necessária.'; end if;
  select * into loot from public.campaign_location_loot where id=p_loot_id and area_id is not null for update;
  if not found then raise exception 'Loot de área não encontrado.'; end if;
  if not exists(select 1 from public.campaign_members where campaign_id=loot.campaign_id and user_id=auth.uid()) then raise exception 'Você não participa desta campanha.'; end if;
  if loot.claimed_at is not null then raise exception 'Este item já foi coletado.'; end if;
  select * into ch from public.characters c where c.user_id=auth.uid() and c.campaign_id=loot.campaign_id and coalesce(c.status,'completed')='completed' order by c.updated_at desc limit 1;
  if not found then raise exception 'Nenhum personagem ativo encontrado nesta campanha.'; end if;
  update public.characters
    set inventory = (case when jsonb_typeof(ch.inventory)='array' then ch.inventory else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('id',loot.id,'name',loot.item_name,'quantity',loot.quantity,'category',loot.item_category,'rarity',loot.rarity,'source','area_loot','area_id',loot.area_id,'location_id',loot.location_id,'acquired_at',now())),
        updated_at=now()
    where id=ch.id;
  update public.campaign_location_loot set claimed_by=auth.uid(),claimed_at=now() where id=loot.id returning * into loot;
  update public.campaign_location_areas set state=state||jsonb_build_object('loot_claimed_at',now()),updated_at=now() where id=loot.area_id;
  return loot;
end;
$function$;

create or replace function public.resolve_location_area_action(p_area_id uuid, p_action_key text default 'investigate')
returns jsonb
language plpgsql security definer set search_path='public'
as $function$
declare
  uid uuid := auth.uid();
  area public.campaign_location_areas%rowtype;
  loc public.campaign_world_locations%rowtype;
  ch public.characters%rowtype;
  action text := lower(trim(coalesce(p_action_key,'investigate')));
  skill_key text; attribute_key text; skill_label text; attribute_label text;
  die_sides integer := 8; natural_roll integer; training_bonus integer := 0; modifier integer := 0; difficulty integer := 10; total integer; result text; consequence text;
  noise_delta integer := 0; state_signature text; test_row public.campaign_exploration_tests%rowtype; attrs jsonb := '{}'; skills jsonb := '{}'; raw text; normalized_key text; k text; v jsonb; noise_next integer;
  discovery_level text := 'none'; discovery_text text := null; revealed_information text := null; revealed_event jsonb := '{}'::jsonb; revealed_creatures jsonb := '[]'::jsonb; revealed_secrets jsonb := '[]'::jsonb; loot_json jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'Sessão necessária.'; end if;
  select * into area from public.campaign_location_areas where id=p_area_id for update;
  if not found then raise exception 'Área não encontrada.'; end if;
  select * into loc from public.campaign_world_locations where id=area.location_id;
  if not found then raise exception 'Local da área não encontrado.'; end if;
  if not exists(select 1 from public.campaign_members where campaign_id=area.campaign_id and user_id=uid) then raise exception 'Você não participa desta campanha.'; end if;
  select * into ch from public.characters c where c.user_id=uid and c.campaign_id=area.campaign_id and coalesce(c.status,'completed')='completed' order by c.updated_at desc limit 1;
  if not found then raise exception 'Nenhum personagem ativo encontrado nesta campanha.'; end if;
  action := case when action in ('observe','observar','perceber') then 'observe' when action in ('search','buscar','vasculhar','vasculhar_area') then 'search' when action in ('track','rastrear') then 'track' else 'investigate' end;
  select case action when 'observe' then 'percepcao' when 'track' then 'sobrevivencia' else 'investigacao' end,
         case action when 'observe' then 'percepcao' when 'track' then 'percepcao' else 'mente' end,
         case action when 'observe' then 'Percepção' when 'track' then 'Sobrevivência' else 'Investigação' end,
         case action when 'observe' then 'Percepção' when 'track' then 'Percepção' else 'Intelecto' end
    into skill_key,attribute_key,skill_label,attribute_label;
  attrs:=coalesce(ch.attributes,'{}'); skills:=coalesce(ch.skill_modifiers,'{}'); raw:=attrs->>attribute_key;
  if raw is null and attribute_key='mente' then raw:=coalesce(attrs->>'intelecto',attrs->>'intellect'); end if;
  if raw is null and attribute_key='percepcao' then raw:=coalesce(attrs->>'perception',attrs->>'percepcao'); end if;
  if raw is null then for k,v in select key,value from jsonb_each(attrs) loop normalized_key:=translate(lower(k),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc'); if normalized_key in (attribute_key,'intelecto','presenca','vontade') then raw:=v #>> '{}'; exit; end if; end loop; end if;
  if raw ~* '^d(4|6|8|10|12|20)$' then die_sides:=substring(upper(raw) from 2)::integer; elsif raw ~ '^\d+$' then die_sides:=case when raw::integer<=8 then 4 when raw::integer<=10 then 6 when raw::integer<=12 then 8 when raw::integer=13 then 10 when raw::integer=14 then 12 else 20 end; end if;
  for k,v in select key,value from jsonb_each(skills) loop normalized_key:=translate(lower(k),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc'); if normalized_key=skill_key then if jsonb_typeof(v)='number' then training_bonus:=coalesce((v#>>'{}')::integer,0); elsif jsonb_typeof(v)='object' then training_bonus:=coalesce((v->>'bonus')::integer,(v->>'modifier')::integer,0); end if; exit; end if; end loop;
  difficulty:=coalesce(area.difficulty,case lower(coalesce(area.danger,'unknown')) when 'low' then 8 when 'medium' then 10 when 'high' then 12 when 'critical' then 15 else 10 end);
  if lower(coalesce(area.danger,'unknown'))='critical' then difficulty:=least(20,difficulty+1); end if;
  if lower(coalesce(loc.state->>'condition','unknown'))='destroyed' then difficulty:=least(20,difficulty+2); elsif lower(coalesce(loc.state->>'condition','unknown'))='damaged' then difficulty:=least(20,difficulty+1); end if;
  if action='investigate' then modifier:=-1; end if;
  state_signature:=md5(coalesce(area.state::text,'{}')||'|'||coalesce(area.danger,'unknown')||'|'||coalesce(area.difficulty::text,'null')||'|'||coalesce(area.event::text,'{}')||'|'||coalesce(area.creatures::text,'[]')||'|'||coalesce(area.secrets::text,'[]')||'|'||coalesce(area.loot_profile::text,'{}')||'|'||coalesce(loc.state::text,'{}'));
  if exists(select 1 from public.campaign_exploration_tests t where t.character_id=ch.id and t.area_id=area.id and t.action_key=action and t.state_signature=state_signature) then raise exception 'Esta ação já foi realizada nesta área neste estado. Uma nova tentativa exige uma mudança relevante.'; end if;
  natural_roll:=1+floor(random()*die_sides)::integer; total:=natural_roll+training_bonus+modifier;
  if natural_roll=die_sides then result:='critical'; elsif natural_roll=1 then result:='critical_failure'; elsif total>=difficulty+5 then result:='great_success'; elsif total>=difficulty then result:='success'; else result:='failure'; end if;
  if action in ('search','investigate','track') then noise_delta:=1; end if; if result='critical_failure' then noise_delta:=noise_delta+1; end if;
  consequence:=case result when 'critical' then 'Você descobre praticamente tudo que esta área permite revelar neste teste.' when 'great_success' then 'Você encontra informações adicionais e percebe detalhes importantes.' when 'success' then 'Você consegue investigar a área.' when 'failure' then case lower(coalesce(area.danger,'unknown')) when 'low' then 'Nada conclusivo foi encontrado.' when 'medium' then 'Você perde tempo e faz barulho.' when 'high' then 'A investigação aumenta o risco de chamar atenção.' else 'A ameaça da área pode reagir.' end when 'critical_failure' then 'A investigação dá errado e aumenta o risco de chamar atenção.' end;
  insert into public.campaign_exploration_tests(campaign_id,character_id,location_id,area_id,action_key,skill_key,attribute_key,die_sides,natural_roll,training_bonus,modifier,total,difficulty,result,consequence,noise_delta,state_signature)
  values(area.campaign_id,ch.id,loc.id,area.id,action,skill_key,attribute_key,die_sides,natural_roll,training_bonus,modifier,total,difficulty,result,consequence,noise_delta,state_signature) returning * into test_row;
  noise_next:=greatest(0,least(5,coalesce(loc.noise_level,0)+noise_delta));
  update public.campaign_world_locations set noise_level=noise_next,last_visited_at=now(),updated_at=now() where id=loc.id;
  if result in ('success','great_success','critical') then
    discovery_level:=case result when 'success' then 'identified' when 'great_success' then 'detailed' else 'exceptional' end;
    discovery_text:=case result when 'success' then 'Você entende o que está acontecendo nesta área.' when 'great_success' then 'Você encontra informações adicionais nesta área.' else 'Você percebe detalhes excepcionais e encontra informações muito valiosas.' end;
    revealed_information:=area.information;
    if result in ('great_success','critical') then revealed_event:=coalesce(area.event,'{}'); revealed_creatures:=coalesce(area.creatures,'[]'); perform public.generate_area_loot(area.id,test_row.id); select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at),'[]'::jsonb) into loot_json from public.campaign_location_loot l where l.area_id=area.id and l.test_id=test_row.id and l.claimed_at is null; end if;
    if result='critical' then revealed_secrets:=coalesce(area.secrets,'[]'); end if;
    update public.campaign_location_areas set state=state||jsonb_build_object('investigated',true,'status',case when result='critical' then 'revealed' when result='great_success' then 'searched' else 'identified' end,'last_result',result,'last_test_id',test_row.id,'last_investigated_at',now()),updated_at=now() where id=area.id;
  end if;
  return jsonb_build_object('test_id',test_row.id,'area_id',area.id,'action',action,'skill_key',skill_key,'skill_label',skill_label,'attribute_key',attribute_key,'attribute_label',attribute_label,'die','D'||die_sides,'natural_roll',natural_roll,'training_bonus',training_bonus,'modifier',modifier,'total',total,'difficulty',difficulty,'result',result,'consequence',consequence,'noise_delta',noise_delta,'noise_level',noise_next,'discovery_level',discovery_level,'discovery_text',discovery_text,'revealed_information',coalesce(revealed_information,''),'revealed_event',revealed_event,'revealed_creatures',revealed_creatures,'revealed_secrets',revealed_secrets,'loot',loot_json);
end;
$function$;

revoke execute on function public.generate_area_loot(uuid,uuid) from anon, public;
grant execute on function public.generate_area_loot(uuid,uuid) to authenticated;
revoke execute on function public.claim_area_loot(uuid) from anon, public;
grant execute on function public.claim_area_loot(uuid) to authenticated;
revoke execute on function public.resolve_location_area_action(uuid,text) from anon, public;
grant execute on function public.resolve_location_area_action(uuid,text) to authenticated;

alter table public.campaign_location_loot replica identity full;
