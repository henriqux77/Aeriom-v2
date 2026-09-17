-- Keep campaign presence honest when a browser closes without completing pagehide.
-- The client refreshes every 15s, so 45s is a safe heartbeat window.
create or replace function public.list_campaign_members(p_campaign_id uuid)
returns table(
  user_id uuid,
  role text,
  display_name text,
  avatar_path text,
  is_online boolean,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode='42501';
  end if;

  if not exists (
    select 1
    from public.campaign_members cm
    where cm.campaign_id = p_campaign_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'not_campaign_member' using errcode='42501';
  end if;

  return query
  select
    cm.user_id,
    cm.role::text,
    coalesce(nullif(p.display_name, ''), 'Sobrevivente') as display_name,
    p.avatar_path,
    (
      coalesce(cp.is_online, false)
      and cp.last_seen_at >= now() - interval '45 seconds'
    ) as is_online,
    cp.last_seen_at
  from public.campaign_members cm
  left join public.profiles p
    on p.id = cm.user_id
  left join public.campaign_presence cp
    on cp.campaign_id = cm.campaign_id
   and cp.user_id = cm.user_id
  where cm.campaign_id = p_campaign_id
  order by
    case when (
      coalesce(cp.is_online, false)
      and cp.last_seen_at >= now() - interval '45 seconds'
    ) then 0 else 1 end,
    cm.role desc,
    lower(coalesce(nullif(p.display_name, ''), 'Sobrevivente'));
end;
$$;

-- Profile images are private, but campaign members should be able to view
-- the avatars of people sitting at the same virtual campaign table.
drop policy if exists "afterlife avatars select campaign members" on storage.objects;
create policy "afterlife avatars select campaign members"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.campaign_members viewer
    join public.campaign_members owner_member
      on owner_member.campaign_id = viewer.campaign_id
    where viewer.user_id = auth.uid()
      and (storage.foldername(name))[1] = owner_member.user_id::text
  )
);