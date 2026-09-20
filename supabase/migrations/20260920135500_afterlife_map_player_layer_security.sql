-- AFTERLIFE MAP SECURITY: sanitize player-facing world support layers.
-- Raw tables remain master-only; players read minimal projections via RPCs.

DROP POLICY IF EXISTS al_faction_read ON public.campaign_factions;
CREATE POLICY al_faction_read_master ON public.campaign_factions
  FOR SELECT TO authenticated
  USING (afterlife_is_master(campaign_id, (SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS al_npc_read ON public.campaign_npcs;
CREATE POLICY al_npc_read_master ON public.campaign_npcs
  FOR SELECT TO authenticated
  USING (afterlife_is_master(campaign_id, (SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS al_vehicle_read ON public.campaign_vehicles;
CREATE POLICY al_vehicle_read_master ON public.campaign_vehicles
  FOR SELECT TO authenticated
  USING (afterlife_is_master(campaign_id, (SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS al_station_read ON public.crafting_stations;
CREATE POLICY al_station_read_master ON public.crafting_stations
  FOR SELECT TO authenticated
  USING (afterlife_is_master(campaign_id, (SELECT auth.uid() AS uid)));

CREATE OR REPLACE FUNCTION public.list_campaign_visible_factions(p_campaign_id uuid)
RETURNS TABLE(id uuid,campaign_id uuid,name text,faction_type text,description text,leader_npc_id uuid,territory jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode='42501'; END IF;
  IF NOT public.afterlife_is_member(p_campaign_id,uid) THEN RAISE EXCEPTION 'not_campaign_member' USING errcode='42501'; END IF;
  RETURN QUERY SELECT f.id,f.campaign_id,f.name,f.faction_type,f.description,f.leader_npc_id,f.territory
  FROM public.campaign_factions f WHERE f.campaign_id=p_campaign_id ORDER BY f.updated_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.list_campaign_visible_npcs(p_campaign_id uuid)
RETURNS TABLE(id uuid,campaign_id uuid,name text,profession text,faction_id uuid,latitude double precision,longitude double precision,status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode='42501'; END IF;
  IF NOT public.afterlife_is_member(p_campaign_id,uid) THEN RAISE EXCEPTION 'not_campaign_member' USING errcode='42501'; END IF;
  RETURN QUERY SELECT n.id,n.campaign_id,n.name,n.profession,n.faction_id,n.latitude,n.longitude,n.status
  FROM public.campaign_npcs n WHERE n.campaign_id=p_campaign_id ORDER BY n.updated_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.list_campaign_visible_vehicles(p_campaign_id uuid)
RETURNS TABLE(id uuid,campaign_id uuid,name text,vehicle_type text,owner_character_id uuid,faction_id uuid,latitude double precision,longitude double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode='42501'; END IF;
  IF NOT public.afterlife_is_member(p_campaign_id,uid) THEN RAISE EXCEPTION 'not_campaign_member' USING errcode='42501'; END IF;
  RETURN QUERY SELECT v.id,v.campaign_id,v.name,v.vehicle_type,v.owner_character_id,v.faction_id,v.latitude,v.longitude
  FROM public.campaign_vehicles v WHERE v.campaign_id=p_campaign_id ORDER BY v.updated_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.list_campaign_visible_stations(p_campaign_id uuid)
RETURNS TABLE(id uuid,campaign_id uuid,name text,station_type text,latitude double precision,longitude double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode='42501'; END IF;
  IF NOT public.afterlife_is_member(p_campaign_id,uid) THEN RAISE EXCEPTION 'not_campaign_member' USING errcode='42501'; END IF;
  RETURN QUERY SELECT s.id,s.campaign_id,s.name,s.station_type,s.latitude,s.longitude
  FROM public.crafting_stations s WHERE s.campaign_id=p_campaign_id ORDER BY s.updated_at DESC;
END $$;

REVOKE EXECUTE ON FUNCTION public.list_campaign_visible_factions(uuid) FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.list_campaign_visible_npcs(uuid) FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.list_campaign_visible_vehicles(uuid) FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.list_campaign_visible_stations(uuid) FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.discover_campaign_world_location(uuid,text,text,text,text,double precision,double precision,text,jsonb) FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.get_campaign_visible_world_location(uuid) FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.list_campaign_visible_location_areas(uuid) FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.list_campaign_visible_world_locations(uuid) FROM anon,public;
GRANT EXECUTE ON FUNCTION public.list_campaign_visible_factions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_campaign_visible_npcs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_campaign_visible_vehicles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_campaign_visible_stations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_campaign_world_location(uuid,text,text,text,text,double precision,double precision,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_visible_world_location(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_campaign_visible_location_areas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_campaign_visible_world_locations(uuid) TO authenticated;
