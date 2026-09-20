-- AFTERLIFE — rebuild completo do mapa: realtime
-- O mapa novo usa estes dados sincronizados; nenhum chat global é restaurado.
do $$
declare
  t text;
  tables text[] := array[
    'campaign_map_positions','campaign_map_entities','campaign_world_locations',
    'campaign_infection_zones','campaign_hordes','campaign_factions','campaign_npcs',
    'campaign_travels','campaign_travel_events','crafting_stations'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I replica identity full', t);
      if not exists (
        select 1 from pg_publication_tables
        where pubname='supabase_realtime' and schemaname='public' and tablename=t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end if;
  end loop;
end $$;