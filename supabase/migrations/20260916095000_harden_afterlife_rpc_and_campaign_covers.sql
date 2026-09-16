-- AFTERLIFE P0/P1 hardening
-- User-facing privileged RPCs remain executable by authenticated users because
-- the frontend legitimately calls them. Anonymous/public execution is removed.

revoke execute on function public.accept_campaign_invite(text) from anon, public;
revoke execute on function public.claim_location_loot(uuid) from anon, public;
revoke execute on function public.create_campaign(uuid,text,text,text,text,text,double precision,double precision,text) from anon, public;
revoke execute on function public.create_campaign_map_entity(uuid,text,text,text,double precision,double precision,jsonb,jsonb,jsonb) from anon, public;
revoke execute on function public.delete_campaign_map_entity(uuid) from anon, public;
revoke execute on function public.ensure_campaign_map_position(uuid) from anon, public;
revoke execute on function public.ensure_campaign_map_positions(uuid) from anon, public;
revoke execute on function public.generate_campaign_invite(uuid,integer) from anon, public;
revoke execute on function public.generate_location_loot(uuid) from anon, public;
revoke execute on function public.get_campaign_world_location(uuid) from anon, public;
revoke execute on function public.list_campaign_map_entities(uuid) from anon, public;
revoke execute on function public.list_campaign_map_members(uuid) from anon, public;
revoke execute on function public.list_campaign_map_positions(uuid) from anon, public;
revoke execute on function public.list_campaign_members(uuid) from anon, public;
revoke execute on function public.list_my_campaigns() from anon, public;
revoke execute on function public.mark_campaign_presence_offline(uuid) from anon, public;
revoke execute on function public.move_campaign_member_position(uuid,uuid,double precision,double precision) from anon, public;
revoke execute on function public.prune_campaign_world_locations(uuid) from anon, public;
revoke execute on function public.resolve_location_action(uuid,text) from anon, public;
revoke execute on function public.touch_campaign_presence(uuid) from anon, public;
revoke execute on function public.update_campaign_map_entity(uuid,text,text,double precision,double precision,jsonb,jsonb,jsonb) from anon, public;
revoke execute on function public.update_campaign_world_location(uuid,text,jsonb,text,text) from anon, public;
revoke execute on function public.upsert_campaign_world_location(uuid,text,text,text,text,double precision,double precision,text,jsonb) from anon, public;
revoke execute on function public.visit_campaign_world_location(uuid) from anon, public;

-- Prevent automatic future exposure of public-schema functions to anonymous/public callers.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, public;

-- Keep campaign covers public/readable, but constrain uploads to the authenticated
-- user's top-level folder and to the formats used by the AFTERLIFE frontend.
drop policy if exists campaign_covers_insert_auth on storage.objects;
create policy campaign_covers_insert_auth
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campaign-covers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']::text[]
where id = 'campaign-covers';
