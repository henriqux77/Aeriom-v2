CREATE TABLE IF NOT EXISTS public.campaign_presence (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id,user_id)
);
CREATE INDEX IF NOT EXISTS campaign_presence_last_seen_idx ON public.campaign_presence(campaign_id,last_seen_at DESC);
ALTER TABLE public.campaign_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_presence_select_member ON public.campaign_presence;
CREATE POLICY campaign_presence_select_member ON public.campaign_presence FOR SELECT USING (aeriom_private.is_campaign_member(campaign_id));
DROP POLICY IF EXISTS campaign_presence_insert_self ON public.campaign_presence;
CREATE POLICY campaign_presence_insert_self ON public.campaign_presence FOR INSERT WITH CHECK (user_id=auth.uid() AND aeriom_private.is_campaign_member(campaign_id));
DROP POLICY IF EXISTS campaign_presence_update_self ON public.campaign_presence;
CREATE POLICY campaign_presence_update_self ON public.campaign_presence FOR UPDATE USING (user_id=auth.uid() AND aeriom_private.is_campaign_member(campaign_id)) WITH CHECK (user_id=auth.uid() AND aeriom_private.is_campaign_member(campaign_id));
DROP POLICY IF EXISTS campaign_presence_delete_self ON public.campaign_presence;
CREATE POLICY campaign_presence_delete_self ON public.campaign_presence FOR DELETE USING (user_id=auth.uid());