-- AFTERLIFE character builder: atomic draft persistence and finalization.
create or replace function public.save_afterlife_character_draft(
  p_character_id uuid,
  p_data jsonb default '{}'::jsonb
)
returns public.characters
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ch public.characters%rowtype;
  v_age integer;
  v_height_cm integer;
  v_name text;
  v_origin text;
  v_class text;
begin
  if uid is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_character_id is null then raise exception 'CHARACTER_ID_REQUIRED'; end if;

  v_name := nullif(trim(p_data->>'name'),'');
  v_origin := nullif(trim(coalesce(p_data->>'origin_name',p_data->>'origin')),'');
  v_class := nullif(trim(p_data->>'class'),'');
  v_age := case
    when trim(coalesce(p_data->>'age','')) ~ '^\d{1,3}$' then (p_data->>'age')::integer
    else null
  end;
  v_height_cm := case
    when regexp_replace(coalesce(p_data->>'height',''),'[^0-9,.]','','g') ~ '^[0-9]+([,.][0-9]+)?$'
    then round(replace(regexp_replace(p_data->>'height','[^0-9,.]','','g'),',','.')::numeric * 100)::integer
    else null
  end;

  select * into ch
  from public.characters
  where id = p_character_id
  for update;

  if ch.id is null then
    insert into public.characters(
      id,user_id,status,name,age,gender,race,origin,class,
      hp_current,hp_max,defense,movement,initiative,mana_current,mana_max,
      attributes,conditions,inventory,equipment,creation_state,description,
      appearance,goals,fears,personality,height_cm,updated_at
    )
    values(
      p_character_id,uid,'draft',v_name,v_age,
      nullif(trim(p_data->>'gender'),''),
      'Humano',v_origin,v_class,10,10,10,9,0,0,0,
      coalesce(p_data->'attributes','{}'::jsonb),
      '[]'::jsonb,'[]'::jsonb,'{}'::jsonb,
      coalesce(p_data,'{}'::jsonb),
      nullif(trim(p_data->>'appearance'),''),
      coalesce(p_data->'appearance','{}'::jsonb),
      case when nullif(trim(p_data->>'objective'),'') is null then '{}'::jsonb else to_jsonb(p_data->>'objective') end,
      case when nullif(trim(p_data->>'fear'),'') is null then '{}'::jsonb else to_jsonb(p_data->>'fear') end,
      case when nullif(trim(p_data->>'personality'),'') is null then '{}'::jsonb else to_jsonb(p_data->>'personality') end,
      v_height_cm,now()
    )
    returning * into ch;
  else
    if ch.user_id <> uid then raise exception 'NOT_ALLOWED'; end if;

    update public.characters
    set
      name = coalesce(v_name,name),
      age = coalesce(v_age,age),
      gender = coalesce(nullif(trim(p_data->>'gender'),''),gender),
      race = 'Humano',
      origin = coalesce(v_origin,origin),
      class = coalesce(v_class,class),
      attributes = coalesce(p_data->'attributes',attributes),
      creation_state = coalesce(p_data,'{}'::jsonb),
      description = coalesce(nullif(trim(p_data->>'appearance'),''),description),
      appearance = coalesce(p_data->'appearance',appearance),
      goals = case when p_data ? 'objective' then to_jsonb(coalesce(p_data->>'objective','')) else goals end,
      fears = case when p_data ? 'fear' then to_jsonb(coalesce(p_data->>'fear','')) else fears end,
      personality = case when p_data ? 'personality' then to_jsonb(coalesce(p_data->>'personality','')) else personality end,
      height_cm = coalesce(v_height_cm,height_cm),
      updated_at = now()
    where id = p_character_id and user_id = uid
    returning * into ch;
  end if;

  return ch;
end
$$;

revoke all on function public.save_afterlife_character_draft(uuid,jsonb) from public,anon;
grant execute on function public.save_afterlife_character_draft(uuid,jsonb) to authenticated;

create or replace function public.finalize_afterlife_character(
  p_character_id uuid,
  p_data jsonb default '{}'::jsonb
)
returns public.characters
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ch public.characters%rowtype;
  v_age integer;
  v_height_cm integer;
  v_name text := nullif(trim(p_data->>'name'),'');
begin
  if uid is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_character_id is null then raise exception 'CHARACTER_ID_REQUIRED'; end if;
  if length(coalesce(v_name,'')) < 2 then raise exception 'NAME_REQUIRED'; end if;
  if length(v_name) > 60 then raise exception 'NAME_TOO_LONG'; end if;

  v_age := case
    when trim(coalesce(p_data->>'age','')) ~ '^\d{1,3}$' then (p_data->>'age')::integer
    else null
  end;
  if v_age is not null and (v_age < 1 or v_age > 999) then raise exception 'INVALID_AGE'; end if;

  v_height_cm := case
    when regexp_replace(coalesce(p_data->>'height',''),'[^0-9,.]','','g') ~ '^[0-9]+([,.][0-9]+)?$'
    then round(replace(regexp_replace(p_data->>'height','[^0-9,.]','','g'),',','.')::numeric * 100)::integer
    else null
  end;

  select * into ch
  from public.characters
  where id = p_character_id and user_id = uid
  for update;

  if ch.id is null then
    insert into public.characters(
      id,user_id,status,name,age,gender,race,origin,class,
      hp_current,hp_max,defense,movement,initiative,mana_current,mana_max,
      attributes,conditions,inventory,equipment,creation_state,description,
      appearance,goals,fears,personality,height_cm,updated_at
    )
    values(
      p_character_id,uid,'completed',v_name,v_age,
      nullif(trim(p_data->>'gender'),''),
      'Humano',nullif(trim(coalesce(p_data->>'origin_name',p_data->>'origin')),''),
      nullif(trim(p_data->>'class'),''),
      10,10,10,9,0,0,0,
      coalesce(p_data->'attributes','{}'::jsonb),'[]'::jsonb,'[]'::jsonb,'{}'::jsonb,
      coalesce(p_data,'{}'::jsonb),
      nullif(trim(p_data->>'appearance'),''),
      coalesce(p_data->'appearance','{}'::jsonb),
      case when nullif(trim(p_data->>'objective'),'') is null then '{}'::jsonb else to_jsonb(p_data->>'objective') end,
      case when nullif(trim(p_data->>'fear'),'') is null then '{}'::jsonb else to_jsonb(p_data->>'fear') end,
      case when nullif(trim(p_data->>'personality'),'') is null then '{}'::jsonb else to_jsonb(p_data->>'personality') end,
      v_height_cm,now()
    )
    returning * into ch;
  else
    update public.characters
    set
      status='completed',
      name=v_name,
      age=v_age,
      gender=nullif(trim(p_data->>'gender'),''),
      race='Humano',
      origin=nullif(trim(coalesce(p_data->>'origin_name',p_data->>'origin')),''),
      class=nullif(trim(p_data->>'class'),''),
      attributes=coalesce(p_data->'attributes','{}'::jsonb),
      conditions='[]'::jsonb,
      creation_state=coalesce(p_data,'{}'::jsonb),
      description=nullif(trim(p_data->>'appearance'),''),
      appearance=coalesce(p_data->'appearance',appearance),
      goals=case when p_data ? 'objective' then to_jsonb(coalesce(p_data->>'objective','')) else goals end,
      fears=case when p_data ? 'fear' then to_jsonb(coalesce(p_data->>'fear','')) else fears end,
      personality=case when p_data ? 'personality' then to_jsonb(coalesce(p_data->>'personality','')) else personality end,
      height_cm=coalesce(v_height_cm,height_cm),
      updated_at=now()
    where id=p_character_id and user_id=uid
    returning * into ch;
  end if;

  insert into public.character_survival(character_id)
  values(ch.id)
  on conflict(character_id) do nothing;

  return ch;
end
$$;

revoke all on function public.finalize_afterlife_character(uuid,jsonb) from public,anon;
grant execute on function public.finalize_afterlife_character(uuid,jsonb) to authenticated;
