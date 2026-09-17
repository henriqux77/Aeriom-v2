create table if not exists public.campaign_combats (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  status text not null default 'setup' check (status in ('setup','active','ended')),
  round integer not null default 0 check (round >= 0),
  turn_index integer not null default 0 check (turn_index >= 0),
  turn_combatant_id uuid,
  settings jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists campaign_combats_one_active_idx on public.campaign_combats(campaign_id) where status in ('setup','active');
create index if not exists campaign_combats_campaign_created_idx on public.campaign_combats(campaign_id,created_at desc);

create table if not exists public.campaign_combatants (
  id uuid primary key default gen_random_uuid(),
  combat_id uuid not null references public.campaign_combats(id) on delete cascade,
  entity_type text not null check (entity_type in ('character','creature','npc')),
  character_id uuid references public.characters(id) on delete set null,
  source_entity_id uuid references public.campaign_map_entities(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  hp_current integer not null default 1,
  hp_max integer not null default 1,
  mana_current integer not null default 0,
  mana_max integer not null default 0,
  defense integer not null default 10,
  movement integer not null default 0,
  initiative_roll integer not null default 0,
  initiative_die integer not null default 20,
  action_state jsonb not null default '{"main":true,"move":true,"quick":true,"reaction":true,"movement_used":0,"defense_bonus":0}'::jsonb,
  conditions jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  defeated_at timestamptz,
  last_hit_by uuid references public.campaign_combatants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_combatants_combat_idx on public.campaign_combatants(combat_id,sort_order);
create index if not exists campaign_combatants_character_idx on public.campaign_combatants(character_id);
alter table public.campaign_combats drop constraint if exists campaign_combats_turn_fk;
alter table public.campaign_combats add constraint campaign_combats_turn_fk foreign key (turn_combatant_id) references public.campaign_combatants(id) on delete set null;

create table if not exists public.campaign_combat_events (
  id uuid primary key default gen_random_uuid(),
  combat_id uuid not null references public.campaign_combats(id) on delete cascade,
  round integer not null default 0,
  actor_combatant_id uuid references public.campaign_combatants(id) on delete set null,
  target_combatant_id uuid references public.campaign_combatants(id) on delete set null,
  event_type text not null,
  action_key text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists campaign_combat_events_combat_created_idx on public.campaign_combat_events(combat_id,created_at desc);

create table if not exists public.campaign_combat_rewards (
  id uuid primary key default gen_random_uuid(),
  combat_id uuid not null references public.campaign_combats(id) on delete cascade,
  defeated_combatant_id uuid references public.campaign_combatants(id) on delete set null,
  killer_combatant_id uuid references public.campaign_combatants(id) on delete set null,
  character_id uuid references public.characters(id) on delete set null,
  xp_amount integer not null default 0 check (xp_amount>=0),
  loot jsonb not null default '[]'::jsonb,
  loot_claimed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists campaign_combat_rewards_combat_idx on public.campaign_combat_rewards(combat_id,created_at desc);

alter table public.campaign_combats enable row level security;
alter table public.campaign_combatants enable row level security;
alter table public.campaign_combat_events enable row level security;
alter table public.campaign_combat_rewards enable row level security;
drop policy if exists "combat_select_member" on public.campaign_combats;
create policy "combat_select_member" on public.campaign_combats for select to authenticated using (exists(select 1 from public.campaign_members cm where cm.campaign_id=campaign_combats.campaign_id and cm.user_id=(select auth.uid())));
drop policy if exists "combatants_select_member" on public.campaign_combatants;
create policy "combatants_select_member" on public.campaign_combatants for select to authenticated using (exists(select 1 from public.campaign_combats c join public.campaign_members cm on cm.campaign_id=c.campaign_id where c.id=campaign_combatants.combat_id and cm.user_id=(select auth.uid())));
drop policy if exists "combat_events_select_member" on public.campaign_combat_events;
create policy "combat_events_select_member" on public.campaign_combat_events for select to authenticated using (exists(select 1 from public.campaign_combats c join public.campaign_members cm on cm.campaign_id=c.campaign_id where c.id=combat_events.combat_id and cm.user_id=(select auth.uid())));
drop policy if exists "combat_rewards_select_member" on public.campaign_combat_rewards;
create policy "combat_rewards_select_member" on public.campaign_combat_rewards for select to authenticated using (exists(select 1 from public.campaign_combats c join public.campaign_members cm on cm.campaign_id=c.campaign_id where c.id=campaign_combat_rewards.combat_id and cm.user_id=(select auth.uid())));

alter table public.campaign_combats replica identity full;
alter table public.campaign_combatants replica identity full;
alter table public.campaign_combat_events replica identity full;
alter table public.campaign_combat_rewards replica identity full;
do $$ begin
  begin alter publication supabase_realtime add table public.campaign_combats; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.campaign_combatants; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.campaign_combat_events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.campaign_combat_rewards; exception when duplicate_object then null; end;
end $$;

create or replace function public.aerion_combat_attribute_die(p_attributes jsonb,p_key text,p_fallback integer default 8)
returns integer language plpgsql immutable set search_path=public as $$ declare v text;n integer;begin v:=coalesce(p_attributes->>p_key,p_attributes->>replace(p_key,'_',''),p_attributes->>initcap(p_key));n:=nullif(regexp_replace(coalesce(v,''),'[^0-9]','','g'),'')::integer;if n is null then n:=p_fallback;end if;if n not in(4,6,8,10,12,20)then n:=p_fallback;end if;return n;end $$;
create or replace function public.aerion_combat_roll(p_sides integer) returns integer language sql volatile as $$ select 1+floor(random()*greatest(1,p_sides))::integer $$;
create or replace function public.aerion_combat_physical_tier(p_die integer) returns jsonb language sql immutable as $$ select case when p_die>=20 then jsonb_build_object('damage_die',8,'bonus',2) when p_die>=12 then jsonb_build_object('damage_die',8,'bonus',1) when p_die>=10 then jsonb_build_object('damage_die',6,'bonus',1) when p_die>=8 then jsonb_build_object('damage_die',6,'bonus',0) else jsonb_build_object('damage_die',4,'bonus',0) end $$;

create or replace function public.create_campaign_combat(p_campaign_id uuid) returns public.campaign_combats language plpgsql security definer set search_path=public as $$ declare v public.campaign_combats;begin if(select auth.uid())is null then raise exception 'AUTH_REQUIRED';end if;if not exists(select 1 from public.campaign_members where campaign_id=p_campaign_id and user_id=(select auth.uid()) and role='master')then raise exception 'MASTER_REQUIRED';end if;if exists(select 1 from public.campaign_combats where campaign_id=p_campaign_id and status in('setup','active'))then raise exception 'COMBAT_ALREADY_ACTIVE';end if;insert into public.campaign_combats(campaign_id,created_by,status,settings)values(p_campaign_id,(select auth.uid()),'setup','{"turn_mode":"manual","actions":{"main":1,"move":1,"quick":1,"reaction":1}}'::jsonb)returning * into v;return v;end $$;
create or replace function public.list_campaign_combats(p_campaign_id uuid,p_limit integer default 10)returns setof public.campaign_combats language plpgsql security definer set search_path=public as $$ begin if(select auth.uid())is null then raise exception 'AUTH_REQUIRED';end if;if not exists(select 1 from public.campaign_members where campaign_id=p_campaign_id and user_id=(select auth.uid()))then raise exception 'NOT_CAMPAIGN_MEMBER';end if;return query select * from public.campaign_combats where campaign_id=p_campaign_id order by created_at desc limit greatest(1,least(coalesce(p_limit,10),50));end $$;
create or replace function public.list_campaign_combatants(p_combat_id uuid)returns setof public.campaign_combatants language plpgsql security definer set search_path=public as $$ begin if(select auth.uid())is null then raise exception 'AUTH_REQUIRED';end if;if not exists(select 1 from public.campaign_combats c join public.campaign_members cm on cm.campaign_id=c.campaign_id where c.id=p_combat_id and cm.user_id=(select auth.uid()))then raise exception 'NOT_COMBAT_MEMBER';end if;return query select * from public.campaign_combatants where combat_id=p_combat_id order by sort_order,created_at;end $$;
create or replace function public.list_campaign_combat_events(p_combat_id uuid,p_limit integer default 80)returns setof public.campaign_combat_events language plpgsql security definer set search_path=public as $$ begin if(select auth.uid())is null then raise exception 'AUTH_REQUIRED';end if;if not exists(select 1 from public.campaign_combats c join public.campaign_members cm on cm.campaign_id=c.campaign_id where c.id=p_combat_id and cm.user_id=(select auth.uid()))then raise exception 'NOT_COMBAT_MEMBER';end if;return query select * from public.campaign_combat_events where combat_id=p_combat_id order by created_at desc limit greatest(1,least(coalesce(p_limit,80),200));end $$;
create or replace function public.list_campaign_available_characters(p_campaign_id uuid)returns table(id uuid,name text,status text,user_id uuid,hp_max integer,mana_max integer)language plpgsql security definer set search_path=public as $$ begin if(select auth.uid())is null then raise exception 'AUTH_REQUIRED';end if;if not exists(select 1 from public.campaign_members where campaign_id=p_campaign_id and user_id=(select auth.uid()) and role='master')then raise exception 'MASTER_REQUIRED';end if;return query select c.id,c.name,c.status,c.user_id,c.hp_max,c.mana_max from public.characters c where c.campaign_id=p_campaign_id and c.status='completed' order by c.name;end $$;
create or replace function public.add_campaign_combat_character(p_combat_id uuid,p_character_id uuid)returns public.campaign_combatants language plpgsql security definer set search_path=public as $$ declare v public.characters%rowtype;c public.campaign_combats%rowtype;r public.campaign_combatants;die integer;begin if(select auth.uid())is null then raise exception 'AUTH_REQUIRED';end if;select * into c from public.campaign_combats where id=p_combat_id;if c.id is null then raise exception 'COMBAT_NOT_FOUND';end if;if not exists(select 1 from public.campaign_members where campaign_id=c.campaign_id and user_id=(select auth.uid()) and role='master')then raise exception 'MASTER_REQUIRED';end if;select * into v from public.characters where id=p_character_id and campaign_id=c.campaign_id and status='completed';if v.id is null then raise exception 'CHARACTER_NOT_AVAILABLE';end if;if exists(select 1 from public.campaign_combatants where combat_id=c.id and character_id=p_character_id)then raise exception 'CHARACTER_ALREADY_IN_COMBAT';end if;die:=public.aerion_combat_attribute_die(coalesce(v.attributes,'{}'::jsonb),'agilidade',8);insert into public.campaign_combatants(combat_id,entity_type,character_id,owner_user_id,display_name,hp_current,hp_max,mana_current,mana_max,defense,movement,initiative_die,metadata,sort_order)values(c.id,'character',v.id,v.user_id,v.name,greatest(0,v.hp_current),greatest(1,v.hp_max),greatest(0,v.mana_current),greatest(0,v.mana_max),coalesce(v.defense,10),coalesce(v.movement,0),die,jsonb_build_object('attributes',coalesce(v.attributes,'{}'::jsonb),'skill_modifiers',coalesce(v.skill_modifiers,'{}'::jsonb),'techniques',coalesce(v.techniques,'[]'::jsonb),'race',v.race,'class',v.class),coalesce((select max(sort_order)+1 from public.campaign_combatants where combat_id=c.id),0))returning * into r;return r;end $$;
create or replace function public.add_campaign_combat_creature(p_combat_id uuid,p_name text,p_hp_max integer,p_defense integer default 10,p_movement integer default 0,p_metadata jsonb default '{}'::jsonb)returns public.campaign_combatants language plpgsql security definer set search_path=public as $$ declare c public.campaign_combats%rowtype;r public.campaign_combatants;begin if(select auth.uid())is null then raise exception 'AUTH_REQUIRED';end if();end $$;
