-- AFTERLIFE hardening: survival consistency, diary projection and avatar Storage limits.
create or replace function public.afterlife_init_character_survival()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='completed' then
    insert into public.character_survival(character_id) values(new.id)
    on conflict(character_id) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.afterlife_init_character_survival() from public,anon,authenticated;
drop trigger if exists trg_afterlife_init_character_survival on public.characters;
create trigger trg_afterlife_init_character_survival after insert or update of status on public.characters
for each row execute function public.afterlife_init_character_survival();

drop policy if exists "al_diary_read" on public.campaign_diary_entries;
drop policy if exists "al_diary_read_master" on public.campaign_diary_entries;
create policy "al_diary_read_master" on public.campaign_diary_entries for select to authenticated
using (public.afterlife_is_master(campaign_id,(select auth.uid())));

create or replace function public.list_campaign_visible_diary_entries(p_campaign_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
  if uid is null or not public.afterlife_is_member(p_campaign_id,uid) then raise exception 'NOT_CAMPAIGN_MEMBER'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',d.id,'title',d.title,'body',d.body,'event_type',d.event_type,
    'occurred_at',d.occurred_at,'source_type',d.source_type,'source_id',d.source_id
  ) order by d.occurred_at desc),'[]'::jsonb)
  into result from public.campaign_diary_entries d
  where d.campaign_id=p_campaign_id
    and (public.afterlife_is_master(p_campaign_id,uid) or d.visibility='public');
  return result;
end $$;
revoke all on function public.list_campaign_visible_diary_entries(uuid) from public,anon;
grant execute on function public.list_campaign_visible_diary_entries(uuid) to authenticated;

update storage.buckets set file_size_limit=5242880,
allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif']::text[]
where id='avatars';