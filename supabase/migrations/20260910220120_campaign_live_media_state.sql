create table if not exists public.campaign_live_media (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  media_type text not null check (media_type in ('image','video','audio')),
  source_url text not null,
  title text,
  active boolean not null default true,
  autoplay boolean not null default true,
  loop boolean not null default false,
  volume numeric(3,2) not null default 0.70 check (volume >= 0 and volume <= 1),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  constraint campaign_live_media_campaign_unique unique (campaign_id)
);

create index if not exists campaign_live_media_campaign_idx
  on public.campaign_live_media(campaign_id);

alter table public.campaign_live_media enable row level security;

drop policy if exists "campaign members can read live media" on public.campaign_live_media;
drop policy if exists "campaign masters can insert live media" on public.campaign_live_media;
drop policy if exists "campaign masters can update live media" on public.campaign_live_media;
drop policy if exists "campaign masters can delete live media" on public.campaign_live_media;

create policy "campaign members can read live media"
on public.campaign_live_media
for select
to authenticated
using (aeriom_private.is_campaign_member(campaign_id));

create policy "campaign masters can insert live media"
on public.campaign_live_media
for insert
to authenticated
with check (aeriom_private.is_campaign_master(campaign_id) and updated_by = (select auth.uid()));

create policy "campaign masters can update live media"
on public.campaign_live_media
for update
to authenticated
using (aeriom_private.is_campaign_master(campaign_id))
with check (aeriom_private.is_campaign_master(campaign_id) and updated_by = (select auth.uid()));

create policy "campaign masters can delete live media"
on public.campaign_live_media
for delete
to authenticated
using (aeriom_private.is_campaign_master(campaign_id));

create or replace function public.campaign_live_media_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists campaign_live_media_touch_updated_at on public.campaign_live_media;
create trigger campaign_live_media_touch_updated_at
before update on public.campaign_live_media
for each row
execute function public.campaign_live_media_touch_updated_at();

alter publication supabase_realtime add table public.campaign_live_media;
