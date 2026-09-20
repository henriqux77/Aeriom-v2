-- AFTERLIFE MAP V3.3: secure player-facing world layers and optimize map RLS.
-- Raw support tables are master-only; players receive sanitized, perception-limited projections.

DROP POLICY IF EXISTS al_faction_read ON public.campaign_factions;
DROP POLICY IF EXISTS al_faction_read_master ON public.campaign_factions;
CREATE POLICY al_faction_read_master ON public.campaign_factions
  FOR SELECT TO authenticated
  USING (afterlife_is_master(campaign_id, (SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS al_npc_read ON public.campaign_npcs;
DROP POLICY IF EXISTS al_npc_read_master ON public.campaign_npcs;
CREATE POLICY al_npc_read_master ON public.campaign_npcs
  FOR SELECT TO authenticated
  USING (afterlife_is_master(campaign_id, (SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS al_vehicle_read ON public.campaign_vehicles;
DROP POLICY IF EXISTS al_vehicle_read_master ON public.campaign_vehicles;
CREATE POLICY al_vehicle_read_master ON public.campaign_vehicles
  FOR SELECT TO authenticated
  USING (afterlife_is_master(campaign_id, (SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS al_station_read ON public.crafting_stations;
DROP POLICY IF EXISTS al_station_read_master ON public.crafting_stations;
CREATE POLICY al_station_read_master ON public.crafting_stations
  FOR SELECT TO authenticated
  USING (afterlife_is_master(campaign_id, (SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS campaign_map_entities_select_member ON public.campaign_map_entities;
DROP POLICY IF EXISTS campaign_map_entities_select_master ON public.campaign_map_entities;
CREATE POLICY campaign_map_entities_select_master ON public.campaign_map_entities
  FOR SELECT TO authenticated
  USING (afterlife_is_master(campaign_id, (SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS campaign_world_locations_insert_master ON public.campaign_world_locations;
CREATE POLICY campaign_world_locations_insert_master ON public.campaign_world_locations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaign_members m
    WHERE m.campaign_id=campaign_world_locations.campaign_id
      AND m.user_id=(SELECT auth.uid() AS uid)
      AND m.role='master'
  ));

DROP POLICY IF EXISTS campaign_world_locations_select_master ON public.campaign_world_locations;
CREATE POLICY campaign_world_locations_select_master ON public.campaign_world_locations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_members cm
    WHERE cm.campaign_id=campaign_world_locations.campaign_id
      AND cm.user_id=(SELECT auth.uid() AS uid)
      AND cm.role='master'
  ));

DROP POLICY IF EXISTS campaign_world_locations_update_master ON public.campaign_world_locations;
CREATE POLICY campaign_world_locations_update_master ON public.campaign_world_locations
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_members cm
    WHERE cm.campaign_id=campaign_world_locations.campaign_id
      AND cm.user_id=(SELECT auth.uid() AS uid)
      AND cm.role='master'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaign_members cm
    WHERE cm.campaign_id=campaign_world_locations.campaign_id
      AND cm.user_id=(SELECT auth.uid() AS uid)
      AND cm.role='master'
  ));

DROP POLICY IF EXISTS campaign_world_locations_delete_master ON public.campaign_world_locations;
CREATE POLICY campaign_world_locations_delete_master ON public.campaign_world_locations
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_members cm
    WHERE cm.campaign_id=campaign_world_locations.campaign_id
      AND cm.user_id=(SELECT auth.uid() AS uid)
      AND cm.role='master'
  ));

DROP POLICY IF EXISTS campaign_location_areas_select_master ON public.campaign_location_areas;
CREATE POLICY campaign_location_areas_select_master ON public.campaign_location_areas
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_members cm
    WHERE cm.campaign_id=campaign_location_areas.campaign_id
      AND cm.user_id=(SELECT auth.uid() AS uid)
      AND cm.role='master'
  ));

DROP POLICY IF EXISTS campaign_location_areas_insert_master ON public.campaign_location_areas;
CREATE POLICY campaign_location_areas_insert_master ON public.campaign_location_areas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaign_members m
    WHERE m.campaign_id=campaign_location_areas.campaign_id
      AND m.user_id=(SELECT auth.uid() AS uid)
      AND m.role='master'
  ));

DROP POLICY IF EXISTS campaign_location_areas_update_master ON public.campaign_location_areas;
CREATE POLICY campaign_location_areas_update_master ON public.campaign_location_areas
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_members m
    WHERE m.campaign_id=campaign_location_areas.campaign_id
      AND m.user_id=(SELECT auth.uid() AS uid)
      AND m.role='master'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaign_members m
    WHERE m.campaign_id=campaign_location_areas.campaign_id
      AND m.user_id=(SELECT auth.uid() AS uid)
      AND m.role='master'
  ));

DROP POLICY IF EXISTS campaign_location_areas_delete_master ON public.campaign_location_areas;
CREATE POLICY campaign_location_areas_delete_master ON public.campaign_location_areas
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_members m
    WHERE m.campaign_id=campaign_location_areas.campaign_id
      AND m.user_id=(SELECT auth.uid() AS uid)
      AND m.role='master'
  ));

DROP POLICY IF EXISTS campaign_location_loot_select_master ON public.campaign_location_loot;
CREATE POLICY campaign_location_loot_select_master ON public.campaign_location_loot
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_members cm
    WHERE cm.campaign_id=campaign_location_loot.campaign_id
      AND cm.user_id=(SELECT auth.uid() AS uid)
      AND cm.role='master'
  ));

CREATE OR REPLACE FUNCTION public.list_campaign_visible_npcs(p_campaign_id uuid)
RETURNS TABLE(id uuid,campaign_id uuid,name text,profession text,faction_id uuid,latitude double precision,longitude double precision,status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); map_lat double precision; map_lng double precision; master_now boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode='42501'; END IF;
  IF NOT public.afterlife_is_member(p_campaign_id,uid) THEN RAISE EXCEPTION 'not_campaign_member' USING errcode='42501'; END IF;
  SELECT latitude,longitude INTO map_lat,map_lng FROM public.campaign_map_positions WHERE campaign_id=p_campaign_id AND user_id=uid;
  SELECT public.afterlife_is_master(p_campaign_id,uid) INTO master_now;
  RETURN QUERY
  SELECT n.id,n.campaign_id,n.name,n.profession,n.faction_id,n.latitude,n.longitude,n.status
  FROM public.campaign_npcs n
  WHERE n.campaign_id=p_campaign_id
    AND (master_now OR (map_lat IS NOT NULL AND map_lng IS NOT NULL AND n.latitude IS NOT NULL AND n.longitude IS NOT NULL AND
      6371000*2*asin(sqrt(power(sin(radians(n.latitude-map_lat)/2),2)+cos(radians(map_lat))*cos(radians(n.latitude))*power(sin(radians(n.longitude-map_lng)/2),2))) <= 380))
  ORDER BY n.updated_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.list_campaign_visible_vehicles(p_campaign_id uuid)
RETURNS TABLE(id uuid,campaign_id uuid,name text,vehicle_type text,owner_character_id uuid,faction_id uuid,latitude double precision,longitude double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); map_lat double precision; map_lng double precision; master_now boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode='42501'; END IF;
  IF NOT public.afterlife_is_member(p_campaign_id,uid) THEN RAISE EXCEPTION 'not_campaign_member' USING errcode='42501'; END IF;
  SELECT latitude,longitude INTO map_lat,map_lng FROM public.campaign_map_positions WHERE campaign_id=p_campaign_id AND user_id=uid;
  SELECT public.afterlife_is_master(p_campaign_id,uid) INTO master_now;
  RETURN QUERY
  SELECT v.id,v.campaign_id,v.name,v.vehicle_type,v.owner_character_id,v.faction_id,v.latitude,v.longitude
  FROM public.campaign_vehicles v
  WHERE v.campaign_id=p_campaign_id
    AND (master_now OR (map_lat IS NOT NULL AND map_lng IS NOT NULL AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL AND
      6371000*2*asin(sqrt(power(sin(radians(v.latitude-map_lat)/2),2)+cos(radians(map_lat))*cos(radians(v.latitude))*power(sin(radians(v.longitude-map_lng)/2),2))) <= 380))
  ORDER BY v.updated_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.list_campaign_visible_stations(p_campaign_id uuid)
RETURNS TABLE(id uuid,campaign_id uuid,name text,station_type text,latitude double precision,longitude double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); map_lat double precision; map_lng double precision; master_now boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode='42501'; END IF;
  IF NOT public.afterlife_is_member(p_campaign_id,uid) THEN RAISE EXCEPTION 'not_campaign_member' USING errcode='42501'; END IF;
  SELECT latitude,longitude INTO map_lat,map_lng FROM public.campaign_map_positions WHERE campaign_id=p_campaign_id AND user_id=uid;
  SELECT public.afterlife_is_master(p_campaign_id,uid) INTO master_now;
  RETURN QUERY
  SELECT s.id,s.campaign_id,s.name,s.station_type,s.latitude,s.longitude
  FROM public.crafting_stations s
  WHERE s.campaign_id=p_campaign_id
    AND (master_now OR (map_lat IS NOT NULL AND map_lng IS NOT NULL AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL AND
      6371000*2*asin(sqrt(power(sin(radians(s.latitude-map_lat)/2),2)+cos(radians(map_lat))*cos(radians(s.latitude))*power(sin(radians(s.longitude-map_lng)/2),2))) <= 380))
  ORDER BY s.updated_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.list_campaign_visible_map_entities(p_campaign_id uuid)
RETURNS TABLE(id uuid,campaign_id uuid,entity_type text,name text,description text,latitude double precision,longitude double precision,geometry jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); map_lat double precision; map_lng double precision; master_now boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode='42501'; END IF;
  IF NOT public.afterlife_is_member(p_campaign_id,uid) THEN RAISE EXCEPTION 'not_campaign_member' USING errcode='42501'; END IF;
  SELECT latitude,longitude INTO map_lat,map_lng FROM public.campaign_map_positions WHERE campaign_id=p_campaign_id AND user_id=uid;
  SELECT public.afterlife_is_master(p_campaign_id,uid) INTO master_now;
  RETURN QUERY
  SELECT e.id,e.campaign_id,e.entity_type,e.name,e.description,e.latitude,e.longitude,e.geometry
  FROM public.campaign_map_entities e
  WHERE e.campaign_id=p_campaign_id
    AND (master_now OR (map_lat IS NOT NULL AND map_lng IS NOT NULL AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL AND
      6371000*2*asin(sqrt(power(sin(radians(e.latitude-map_lat)/2),2)+cos(radians(map_lat))*cos(radians(e.latitude))*power(sin(radians(e.longitude-map_lng)/2),2))) <= 380))
  ORDER BY e.created_at ASC;
END $$;

REVOKE EXECUTE ON FUNCTION public.list_campaign_visible_npcs(uuid) FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.list_campaign_visible_vehicles(uuid) FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.list_campaign_visible_stations(uuid) FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.list_campaign_visible_map_entities(uuid) FROM anon,public;
GRANT EXECUTE ON FUNCTION public.list_campaign_visible_npcs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_campaign_visible_vehicles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_campaign_visible_stations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_campaign_visible_map_entities(uuid) TO authenticated;