-- AFTERLIFE P2: optimize auth helper evaluation and add missing FK indexes.
-- Behavioral intent is preserved; only evaluation/caching and role scoping are tightened.

DROP POLICY IF EXISTS campaign_exploration_tests_insert_member ON public.campaign_exploration_tests;
CREATE POLICY campaign_exploration_tests_insert_member ON public.campaign_exploration_tests FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_members m WHERE m.campaign_id = campaign_exploration_tests.campaign_id AND m.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS campaign_exploration_tests_select_member ON public.campaign_exploration_tests;
CREATE POLICY campaign_exploration_tests_select_member ON public.campaign_exploration_tests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_members m WHERE m.campaign_id = campaign_exploration_tests.campaign_id AND m.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS campaign_invites_delete_own ON public.campaign_invites;
CREATE POLICY campaign_invites_delete_own ON public.campaign_invites FOR DELETE TO authenticated USING (created_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS campaign_invites_insert_own ON public.campaign_invites;
CREATE POLICY campaign_invites_insert_own ON public.campaign_invites FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS campaign_invites_select_own ON public.campaign_invites;
CREATE POLICY campaign_invites_select_own ON public.campaign_invites FOR SELECT TO authenticated USING (created_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS campaign_invites_update_own ON public.campaign_invites;
CREATE POLICY campaign_invites_update_own ON public.campaign_invites FOR UPDATE TO authenticated USING (created_by = (SELECT auth.uid())) WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS campaign_location_loot_select ON public.campaign_location_loot;
CREATE POLICY campaign_location_loot_select ON public.campaign_location_loot FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_members m WHERE m.campaign_id = campaign_location_loot.campaign_id AND m.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS campaign_map_entities_delete_master ON public.campaign_map_entities;
CREATE POLICY campaign_map_entities_delete_master ON public.campaign_map_entities FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_map_entities.campaign_id AND cm.user_id = (SELECT auth.uid()) AND cm.role = 'master'));
DROP POLICY IF EXISTS campaign_map_entities_insert_master ON public.campaign_map_entities;
CREATE POLICY campaign_map_entities_insert_master ON public.campaign_map_entities FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_map_entities.campaign_id AND cm.user_id = (SELECT auth.uid()) AND cm.role = 'master'));
DROP POLICY IF EXISTS campaign_map_entities_select_member ON public.campaign_map_entities;
CREATE POLICY campaign_map_entities_select_member ON public.campaign_map_entities FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_map_entities.campaign_id AND cm.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS campaign_map_entities_update_master ON public.campaign_map_entities;
CREATE POLICY campaign_map_entities_update_master ON public.campaign_map_entities FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_map_entities.campaign_id AND cm.user_id = (SELECT auth.uid()) AND cm.role = 'master')) WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_map_entities.campaign_id AND cm.user_id = (SELECT auth.uid()) AND cm.role = 'master'));

DROP POLICY IF EXISTS campaign_map_positions_insert_self ON public.campaign_map_positions;
CREATE POLICY campaign_map_positions_insert_self ON public.campaign_map_positions FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_map_positions.campaign_id AND cm.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS campaign_map_positions_select_member ON public.campaign_map_positions;
CREATE POLICY campaign_map_positions_select_member ON public.campaign_map_positions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_map_positions.campaign_id AND cm.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS campaign_map_positions_update_self ON public.campaign_map_positions;
CREATE POLICY campaign_map_positions_update_self ON public.campaign_map_positions FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_map_positions.campaign_id AND cm.user_id = (SELECT auth.uid()))) WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_map_positions.campaign_id AND cm.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS campaign_members_delete_self ON public.campaign_members;
CREATE POLICY campaign_members_delete_self ON public.campaign_members FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS campaign_members_insert_self ON public.campaign_members;
CREATE POLICY campaign_members_insert_self ON public.campaign_members FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS campaign_members_select_own ON public.campaign_members;
CREATE POLICY campaign_members_select_own ON public.campaign_members FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS campaign_members_update_self ON public.campaign_members;
CREATE POLICY campaign_members_update_self ON public.campaign_members FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS campaign_presence_delete_self ON public.campaign_presence;
CREATE POLICY campaign_presence_delete_self ON public.campaign_presence FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS campaign_presence_insert_self ON public.campaign_presence;
CREATE POLICY campaign_presence_insert_self ON public.campaign_presence FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_presence.campaign_id AND cm.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS campaign_presence_select_member ON public.campaign_presence;
CREATE POLICY campaign_presence_select_member ON public.campaign_presence FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_presence.campaign_id AND cm.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS campaign_presence_update_self ON public.campaign_presence;
CREATE POLICY campaign_presence_update_self ON public.campaign_presence FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_presence.campaign_id AND cm.user_id = (SELECT auth.uid()))) WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_presence.campaign_id AND cm.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS campaign_world_locations_delete_master ON public.campaign_world_locations;
CREATE POLICY campaign_world_locations_delete_master ON public.campaign_world_locations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_world_locations.campaign_id AND cm.user_id = (SELECT auth.uid()) AND cm.role = 'master'));
DROP POLICY IF EXISTS campaign_world_locations_insert_member ON public.campaign_world_locations;
CREATE POLICY campaign_world_locations_insert_member ON public.campaign_world_locations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_world_locations.campaign_id AND cm.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS campaign_world_locations_select_member ON public.campaign_world_locations;
CREATE POLICY campaign_world_locations_select_member ON public.campaign_world_locations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_world_locations.campaign_id AND cm.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS campaign_world_locations_update_master ON public.campaign_world_locations;
CREATE POLICY campaign_world_locations_update_master ON public.campaign_world_locations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_world_locations.campaign_id AND cm.user_id = (SELECT auth.uid()) AND cm.role = 'master')) WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaign_world_locations.campaign_id AND cm.user_id = (SELECT auth.uid()) AND cm.role = 'master'));

DROP POLICY IF EXISTS campaigns_delete_own ON public.campaigns;
CREATE POLICY campaigns_delete_own ON public.campaigns FOR DELETE TO authenticated USING (created_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS campaigns_insert_own ON public.campaigns;
CREATE POLICY campaigns_insert_own ON public.campaigns FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS campaigns_select_member ON public.campaigns;
CREATE POLICY campaigns_select_member ON public.campaigns FOR SELECT TO authenticated USING (created_by = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.campaign_id = campaigns.id AND cm.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS campaigns_select_own ON public.campaigns;
CREATE POLICY campaigns_select_own ON public.campaigns FOR SELECT TO authenticated USING (created_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS campaigns_update_own ON public.campaigns;
CREATE POLICY campaigns_update_own ON public.campaigns FOR UPDATE TO authenticated USING (created_by = (SELECT auth.uid())) WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "afterlife characters delete own" ON public.characters;
CREATE POLICY "afterlife characters delete own" ON public.characters FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "afterlife characters insert own" ON public.characters;
CREATE POLICY "afterlife characters insert own" ON public.characters FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "afterlife characters select own" ON public.characters;
CREATE POLICY "afterlife characters select own" ON public.characters FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "afterlife characters update own" ON public.characters;
CREATE POLICY "afterlife characters update own" ON public.characters FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "afterlife recovery delete own" ON public.profile_recovery_contacts;
CREATE POLICY "afterlife recovery delete own" ON public.profile_recovery_contacts FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "afterlife recovery insert own" ON public.profile_recovery_contacts;
CREATE POLICY "afterlife recovery insert own" ON public.profile_recovery_contacts FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "afterlife recovery select own" ON public.profile_recovery_contacts;
CREATE POLICY "afterlife recovery select own" ON public.profile_recovery_contacts FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "afterlife recovery update own" ON public.profile_recovery_contacts;
CREATE POLICY "afterlife recovery update own" ON public.profile_recovery_contacts FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "afterlife profiles delete own" ON public.profiles;
CREATE POLICY "afterlife profiles delete own" ON public.profiles FOR DELETE TO authenticated USING ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "afterlife profiles insert own" ON public.profiles;
CREATE POLICY "afterlife profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "afterlife profiles select own" ON public.profiles;
CREATE POLICY "afterlife profiles select own" ON public.profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "afterlife profiles update own" ON public.profiles;
CREATE POLICY "afterlife profiles update own" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

CREATE INDEX IF NOT EXISTS campaign_exploration_tests_character_idx ON public.campaign_exploration_tests (character_id);
CREATE INDEX IF NOT EXISTS campaign_invites_created_by_idx ON public.campaign_invites (created_by);
CREATE INDEX IF NOT EXISTS campaign_map_entities_created_by_idx ON public.campaign_map_entities (created_by);
CREATE INDEX IF NOT EXISTS campaign_map_positions_user_idx ON public.campaign_map_positions (user_id);
CREATE INDEX IF NOT EXISTS campaign_presence_user_idx ON public.campaign_presence (user_id);
