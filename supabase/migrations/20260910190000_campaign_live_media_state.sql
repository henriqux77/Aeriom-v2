CREATE TABLE IF NOT EXISTS public.campaign_live_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE REFERENCES public.campaigns(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image','video','audio')),
  source_url text NOT NULL CHECK (length(btrim(source_url)) BETWEEN 8 AND 2000),
  title text,
  active boolean NOT NULL DEFAULT true,
  autoplay boolean NOT NULL DEFAULT true,
  loop boolean NOT NULL DEFAULT false,
  volume numeric(4,3) NOT NULL DEFAULT 0.7 CHECK (volume >= 0 AND volume <= 1),
  updated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_live_media_campaign_idx
  ON public.campaign_live_media(campaign_id, updated_at DESC);

ALTER TABLE public.campaign_live_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_live_media_select_member ON public.campaign_live_media;
CREATE POLICY campaign_live_media_select_member
  ON public.campaign_live_media FOR SELECT TO authenticated
  USING (aeriom_private.is_campaign_member(campaign_id));

DROP POLICY IF EXISTS campaign_live_media_write_master ON public.campaign_live_media;
CREATE POLICY campaign_live_media_write_master
  ON public.campaign_live_media FOR INSERT TO authenticated
  WITH CHECK (aeriom_private.is_campaign_master(campaign_id) AND updated_by=auth.uid());

DROP POLICY IF EXISTS campaign_live_media_update_master ON public.campaign_live_media;
CREATE POLICY campaign_live_media_update_master
  ON public.campaign_live_media FOR UPDATE TO authenticated
  USING (aeriom_private.is_campaign_master(campaign_id))
  WITH CHECK (aeriom_private.is_campaign_master(campaign_id));

DROP POLICY IF EXISTS campaign_live_media_delete_master ON public.campaign_live_media;
CREATE POLICY campaign_live_media_delete_master
  ON public.campaign_live_media FOR DELETE TO authenticated
  USING (aeriom_private.is_campaign_master(campaign_id));

CREATE OR REPLACE FUNCTION public.campaign_live_media_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS campaign_live_media_touch_updated_at ON public.campaign_live_media;
CREATE TRIGGER campaign_live_media_touch_updated_at
  BEFORE UPDATE ON public.campaign_live_media
  FOR EACH ROW EXECUTE FUNCTION public.campaign_live_media_touch_updated_at();

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_live_media;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
