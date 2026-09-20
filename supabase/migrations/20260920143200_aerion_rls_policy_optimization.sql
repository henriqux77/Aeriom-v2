-- AERIOM-v2: optimize auth.uid() evaluation and remove a permissive-policy overlap.
do $$
declare p record;
begin
  for p in
    select schemaname,tablename,policyname,qual,with_check
    from pg_policies
    where schemaname='public'
      and (coalesce(qual,'') ~ 'auth\.uid\(\)' or coalesce(with_check,'') ~ 'auth\.uid\(\)')
  loop
    if p.qual is not null then
      execute format('alter policy %I on %I.%I using (%s)',p.policyname,p.schemaname,p.tablename,replace(p.qual,'auth.uid()','(select auth.uid())'));
    end if;
    if p.with_check is not null then
      execute format('alter policy %I on %I.%I with check (%s)',p.policyname,p.schemaname,p.tablename,replace(p.with_check,'auth.uid()','(select auth.uid())'));
    end if;
  end loop;
end $$;

drop policy if exists "campaign_system_settings_master_write" on public.campaign_system_settings;
drop policy if exists "campaign_system_settings_member_select" on public.campaign_system_settings;

create policy "campaign_system_settings_member_select"
on public.campaign_system_settings
for select to authenticated
using (aeriom_private.is_campaign_member(campaign_id));

create policy "campaign_system_settings_master_insert"
on public.campaign_system_settings
for insert to authenticated
with check (aeriom_private.is_campaign_master(campaign_id));

create policy "campaign_system_settings_master_update"
on public.campaign_system_settings
for update to authenticated
using (aeriom_private.is_campaign_master(campaign_id))
with check (aeriom_private.is_campaign_master(campaign_id));

create policy "campaign_system_settings_master_delete"
on public.campaign_system_settings
for delete to authenticated
using (aeriom_private.is_campaign_master(campaign_id));
