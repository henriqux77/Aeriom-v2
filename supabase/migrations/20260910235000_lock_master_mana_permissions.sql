ALTER TABLE public.campaign_character_settings
  DROP CONSTRAINT IF EXISTS campaign_character_settings_valid_mana_state;

ALTER TABLE public.campaign_character_settings
  ADD CONSTRAINT campaign_character_settings_valid_mana_state
  CHECK (
    jsonb_typeof(unlocked_manas) = 'array'
    AND unlocked_manas @> '["azul"]'::jsonb
    AND unlocked_manas <@ '["azul","roxa","dourada","branca"]'::jsonb
    AND selected_mana IN ('azul','roxa','dourada','branca')
    AND unlocked_manas @> jsonb_build_array(selected_mana)
  );

DROP POLICY IF EXISTS "players and masters can insert character settings"
  ON public.campaign_character_settings;

CREATE POLICY "owners can initialize safe character settings"
  ON public.campaign_character_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    aeriom_private.is_campaign_master(campaign_id)
    OR (
      EXISTS (
        SELECT 1
        FROM public.campaign_members cm
        JOIN public.characters c ON c.id = campaign_character_settings.character_id
        WHERE cm.campaign_id = campaign_character_settings.campaign_id
          AND cm.user_id = (SELECT auth.uid())
          AND c.user_id = (SELECT auth.uid())
          AND c.campaign_id = campaign_character_settings.campaign_id
      )
      AND unlocked_manas = '["azul"]'::jsonb
      AND selected_mana = 'azul'
      AND permission_overrides = '{}'::jsonb
    )
  );

CREATE OR REPLACE FUNCTION aeriom_private.guard_character_setting_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, aeriom_private
AS $$
BEGIN
  IF aeriom_private.is_campaign_master(NEW.campaign_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.unlocked_manas := '["azul"]'::jsonb;
    NEW.selected_mana := 'azul';
    NEW.permission_overrides := '{}'::jsonb;
    RETURN NEW;
  END IF;

  NEW.unlocked_manas := OLD.unlocked_manas;
  NEW.permission_overrides := OLD.permission_overrides;

  IF NOT (OLD.unlocked_manas @> jsonb_build_array(NEW.selected_mana)) THEN
    NEW.selected_mana := OLD.selected_mana;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_campaign_character_settings_authority
  ON public.campaign_character_settings;

CREATE TRIGGER guard_campaign_character_settings_authority
BEFORE INSERT OR UPDATE
ON public.campaign_character_settings
FOR EACH ROW
EXECUTE FUNCTION aeriom_private.guard_character_setting_authority();