ALTER TABLE public.campaign_character_settings
  ADD COLUMN IF NOT EXISTS permission_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION aeriom_private.enforce_character_campaign_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  perms jsonb := '{}'::jsonb;
  is_master boolean := false;
BEGIN
  IF OLD.campaign_id IS NULL OR auth.uid() IS NULL OR OLD.user_id <> auth.uid() THEN
    RETURN NEW;
  END IF;
  SELECT aeriom_private.is_campaign_master(OLD.campaign_id) INTO is_master;
  IF COALESCE(is_master, false) THEN RETURN NEW; END IF;
  SELECT COALESCE(permission_overrides, '{}'::jsonb) INTO perms
  FROM public.campaign_character_settings
  WHERE campaign_id = OLD.campaign_id AND character_id = OLD.id LIMIT 1;

  IF COALESCE((perms->>'edit_concept')::boolean, true) = false AND (
    NEW.name IS DISTINCT FROM OLD.name OR NEW.age IS DISTINCT FROM OLD.age OR
    NEW.gender IS DISTINCT FROM OLD.gender OR NEW.origin IS DISTINCT FROM OLD.origin OR
    NEW.description IS DISTINCT FROM OLD.description OR
    (NEW.creation_state->>'name') IS DISTINCT FROM (OLD.creation_state->>'name') OR
    (NEW.creation_state->>'age') IS DISTINCT FROM (OLD.creation_state->>'age') OR
    (NEW.creation_state->>'gender') IS DISTINCT FROM (OLD.creation_state->>'gender') OR
    (NEW.creation_state->>'origin') IS DISTINCT FROM (OLD.creation_state->>'origin') OR
    (NEW.creation_state->>'description') IS DISTINCT FROM (OLD.creation_state->>'description') OR
    (NEW.creation_state->>'personality') IS DISTINCT FROM (OLD.creation_state->>'personality') OR
    (NEW.creation_state->>'objective') IS DISTINCT FROM (OLD.creation_state->>'objective') OR
    (NEW.creation_state->>'fear') IS DISTINCT FROM (OLD.creation_state->>'fear') OR
    (NEW.creation_state->>'importantBond') IS DISTINCT FROM (OLD.creation_state->>'importantBond') OR
    (NEW.creation_state->>'history') IS DISTINCT FROM (OLD.creation_state->>'history') OR
    (NEW.creation_state->>'region') IS DISTINCT FROM (OLD.creation_state->>'region')
  ) THEN RAISE EXCEPTION 'O Mestre bloqueou a edição das informações básicas desta ficha.'; END IF;

  IF COALESCE((perms->>'edit_appearance')::boolean, true) = false AND (
    NEW.appearance IS DISTINCT FROM OLD.appearance OR NEW.avatar_path IS DISTINCT FROM OLD.avatar_path OR
    (NEW.creation_state->'appearance') IS DISTINCT FROM (OLD.creation_state->'appearance')
  ) THEN RAISE EXCEPTION 'O Mestre bloqueou a edição da aparência desta ficha.'; END IF;

  IF COALESCE((perms->>'edit_attributes')::boolean, true) = false AND (
    NEW.attributes IS DISTINCT FROM OLD.attributes OR
    (NEW.creation_state->'assignedDice') IS DISTINCT FROM (OLD.creation_state->'assignedDice')
  ) THEN RAISE EXCEPTION 'O Mestre bloqueou a edição dos atributos desta ficha.'; END IF;

  IF COALESCE((perms->>'edit_skills')::boolean, true) = false AND (
    NEW.skill_modifiers IS DISTINCT FROM OLD.skill_modifiers OR
    (NEW.creation_state->'skills') IS DISTINCT FROM (OLD.creation_state->'skills')
  ) THEN RAISE EXCEPTION 'O Mestre bloqueou a edição das perícias desta ficha.'; END IF;

  IF COALESCE((perms->>'edit_powers')::boolean, true) = false AND (
    NEW.power IS DISTINCT FROM OLD.power OR
    (NEW.creation_state->>'primaryPower') IS DISTINCT FROM (OLD.creation_state->>'primaryPower') OR
    (NEW.creation_state->>'parallelPower') IS DISTINCT FROM (OLD.creation_state->>'parallelPower') OR
    (NEW.creation_state->'mana') IS DISTINCT FROM (OLD.creation_state->'mana')
  ) THEN RAISE EXCEPTION 'O Mestre bloqueou a edição de Poder e Mana desta ficha.'; END IF;

  IF COALESCE((perms->>'edit_techniques')::boolean, true) = false AND (
    NEW.techniques IS DISTINCT FROM OLD.techniques OR
    (NEW.creation_state->'techniques') IS DISTINCT FROM (OLD.creation_state->'techniques')
  ) THEN RAISE EXCEPTION 'O Mestre bloqueou a edição das técnicas desta ficha.'; END IF;

  IF COALESCE((perms->>'edit_inventory')::boolean, true) = false AND (
    NEW.inventory IS DISTINCT FROM OLD.inventory OR
    (NEW.creation_state->'inventory') IS DISTINCT FROM (OLD.creation_state->'inventory')
  ) THEN RAISE EXCEPTION 'O Mestre bloqueou a edição do inventário desta ficha.'; END IF;

  IF COALESCE((perms->>'edit_equipment')::boolean, true) = false AND
     NEW.equipment IS DISTINCT FROM OLD.equipment
  THEN RAISE EXCEPTION 'O Mestre bloqueou a edição dos equipamentos desta ficha.'; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_character_campaign_permissions ON public.characters;
CREATE TRIGGER enforce_character_campaign_permissions
BEFORE UPDATE ON public.characters
FOR EACH ROW EXECUTE FUNCTION aeriom_private.enforce_character_campaign_permissions();