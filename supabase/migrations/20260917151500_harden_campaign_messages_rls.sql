-- P11 social hardening: campaign_messages is accessed through RPCs and Realtime.
-- Keep only the row-level policies currently required by the social module.

DROP POLICY IF EXISTS campaign_messages_update_author ON public.campaign_messages;

-- These privileges are not required by the browser/API social flow.
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.campaign_messages
  FROM anon, authenticated;
