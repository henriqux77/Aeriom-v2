-- AFTERLIFE P5.9
-- Shared realtime synchronization for area exploration history and state changes.

alter table public.campaign_exploration_tests replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='campaign_exploration_tests'
  ) then
    execute 'alter publication supabase_realtime add table public.campaign_exploration_tests';
  end if;
end
$$;
