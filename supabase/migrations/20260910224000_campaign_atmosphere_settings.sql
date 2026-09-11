create table if not exists public.campaign_atmosphere_settings (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  preset text not null default 'default',
  mood text not null default 'adventure',
  time_of_day text not null default 'night',
  lighting text not null default 'balanced',
  intensity integer not null default 55,
  accent_color text not null default '#c49e53',
  surface_opacity integer not null default 86,
  vignette integer not null default 42,
  grain integer not null default 0,
  glow integer not null default 18,
  blur integer not null default 0,
  ui_density text not null default 'comfortable',
  sidebar_mode text not null default 'full',
  scene_mode text not null default 'immersive',
  ambient_enabled boolean not null default false,
  show_live_media boolean not null default true,
  show_map_overlay boolean not null default true,
  background_source text not null default 'theme',
  background_url text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint campaign_atmosphere_valid_preset check (preset in ('default','forest','cave','volcano','castle','coast','ruins')),
  constraint campaign_atmosphere_valid_mood check (mood in ('adventure','mystery','danger','calm','celebration','horror')),
  constraint campaign_atmosphere_valid_time check (time_of_day in ('dawn','day','dusk','night','void')),
  constraint campaign_atmosphere_valid_lighting check (lighting in ('warm','balanced','cold','dramatic','dim')),
  constraint campaign_atmosphere_intensity check (intensity between 0 and 100),
  constraint campaign_atmosphere_surface_opacity check (surface_opacity between 45 and 100),
  constraint campaign_atmosphere_vignette check (vignette between 0 and 100),
  constraint campaign_atmosphere_grain check (grain between 0 and 60),
  constraint campaign_atmosphere_glow check (glow between 0 and 60),
  constraint campaign_atmosphere_blur check (blur between 0 and 18),
  constraint campaign_atmosphere_density check (ui_density in ('compact','comfortable','spacious')),
  constraint campaign_atmosphere_sidebar check (sidebar_mode in ('full','minimal')),
  constraint campaign_atmosphere_scene check (scene_mode in ('standard','immersive','cinematic')),
  constraint campaign_atmosphere_background_source check (background_source in ('theme','campaign','custom'))
);

alter table public.campaign_atmosphere_settings enable row level security;

create index if not exists campaign_atmosphere_updated_by_idx on public.campaign_atmosphere_settings(updated_by);

drop policy if exists "campaign_atmosphere_select_member" on public.campaign_atmosphere_settings;
drop policy if exists "campaign_atmosphere_insert_master" on public.campaign_atmosphere_settings;
drop policy if exists "campaign_atmosphere_update_master" on public.campaign_atmosphere_settings;
drop policy if exists "campaign_atmosphere_delete_master" on public.campaign_atmosphere_settings;

create policy "campaign_atmosphere_select_member" on public.campaign_atmosphere_settings for select to authenticated using ((select aeriom_private.is_campaign_member(campaign_id)));
create policy "campaign_atmosphere_insert_master" on public.campaign_atmosphere_settings for insert to authenticated with check ((select aeriom_private.is_campaign_master(campaign_id)) and updated_by = (select auth.uid()));
create policy "campaign_atmosphere_update_master" on public.campaign_atmosphere_settings for update to authenticated using ((select aeriom_private.is_campaign_master(campaign_id))) with check ((select aeriom_private.is_campaign_master(campaign_id)) and updated_by = (select auth.uid()));
create policy "campaign_atmosphere_delete_master" on public.campaign_atmosphere_settings for delete to authenticated using ((select aeriom_private.is_campaign_master(campaign_id)));

grant select, insert, update, delete on public.campaign_atmosphere_settings to authenticated;

create or replace function aeriom_private.touch_campaign_atmosphere_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, aeriom_private
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists campaign_atmosphere_touch_updated_at on public.campaign_atmosphere_settings;
create trigger campaign_atmosphere_touch_updated_at before update on public.campaign_atmosphere_settings for each row execute function aeriom_private.touch_campaign_atmosphere_updated_at();

alter publication supabase_realtime add table public.campaign_atmosphere_settings;

insert into public.campaign_atmosphere_settings (campaign_id, preset, updated_by)
select c.id, coalesce(nullif(c.theme,''),'default'), c.created_by
from public.campaigns c
where not exists (select 1 from public.campaign_atmosphere_settings s where s.campaign_id=c.id);
