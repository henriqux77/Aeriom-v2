ALTER TABLE public.campaign_character_settings
  ADD COLUMN IF NOT EXISTS permission_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.campaign_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type = ANY (ARRAY[
    'chapter','session','event','npc','location','faction','mission','diary'
  ])),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 180),
  description text,
  content text,
  visibility text NOT NULL DEFAULT 'master' CHECK (visibility = ANY (ARRAY['public','master'])),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_content_campaign_idx
  ON public.campaign_content(campaign_id, content_type, sort_order, created_at DESC);

ALTER TABLE public.campaign_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_content_select_member ON public.campaign_content;
CREATE POLICY campaign_content_select_member
  ON public.campaign_content
  FOR SELECT
  USING (
    aeriom_private.is_campaign_member(campaign_id)
    AND (
      visibility = 'public'
      OR aeriom_private.is_campaign_master(campaign_id)
    )
  );

DROP POLICY IF EXISTS campaign_content_insert_master ON public.campaign_content;
CREATE POLICY campaign_content_insert_master
  ON public.campaign_content
  FOR INSERT
  WITH CHECK (
    aeriom_private.is_campaign_master(campaign_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS campaign_content_update_master ON public.campaign_content;
CREATE POLICY campaign_content_update_master
  ON public.campaign_content
  FOR UPDATE
  USING (aeriom_private.is_campaign_master(campaign_id))
  WITH CHECK (aeriom_private.is_campaign_master(campaign_id));

DROP POLICY IF EXISTS campaign_content_delete_master ON public.campaign_content;
CREATE POLICY campaign_content_delete_master
  ON public.campaign_content
  FOR DELETE
  USING (aeriom_private.is_campaign_master(campaign_id));