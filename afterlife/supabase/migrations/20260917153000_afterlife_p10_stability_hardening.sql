-- AFTERLIFE P10 — stability / hardening
-- The migration is applied live in Supabase as afterlife_p10_stability_hardening.
-- It fixes the two combat functions with mutable search_path, consolidates the
-- redundant campaigns SELECT policy, and adds indexes for the currently
-- unindexed foreign keys identified during the 17/09/2026 audit.

alter function public.aerion_combat_roll(integer) set search_path = public, pg_temp;
alter function public.aerion_combat_physical_tier(integer) set search_path = public, pg_temp;

drop policy if exists campaigns_select_own on public.campaigns;

create index if not exists campaign_travels_created_by_idx on public.campaign_travels(created_by);
create index if not exists campaign_travels_destination_location_id_idx on public.campaign_travels(destination_location_id);
create index if not exists campaign_travel_events_created_by_idx on public.campaign_travel_events(created_by);
create index if not exists campaign_combats_created_by_idx on public.campaign_combats(created_by);
create index if not exists campaign_combats_turn_combatant_idx on public.campaign_combats(turn_combatant_id);
create index if not exists campaign_combatants_last_hit_by_idx on public.campaign_combatants(last_hit_by);
create index if not exists campaign_combatants_owner_user_id_idx on public.campaign_combatants(owner_user_id);
create index if not exists campaign_combatants_source_entity_id_idx on public.campaign_combatants(source_entity_id);
create index if not exists campaign_combat_events_actor_combatant_id_idx on public.campaign_combat_events(actor_combatant_id);
create index if not exists campaign_combat_events_created_by_idx on public.campaign_combat_events(created_by);
create index if not exists campaign_combat_events_target_combatant_id_idx on public.campaign_combat_events(target_combatant_id);
create index if not exists campaign_combat_rewards_character_id_idx on public.campaign_combat_rewards(character_id);
create index if not exists campaign_combat_rewards_defeated_combatant_id_idx on public.campaign_combat_rewards(defeated_combatant_id);
create index if not exists campaign_combat_rewards_killer_combatant_id_idx on public.campaign_combat_rewards(killer_combatant_id);
