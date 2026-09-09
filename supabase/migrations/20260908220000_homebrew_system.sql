CREATE TABLE IF NOT EXISTS public.homebrew_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  cover_url text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','unlisted','public')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  version text NOT NULL DEFAULT '1.0.0' CHECK (length(btrim(version)) BETWEEN 1 AND 30),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, slug)
);
CREATE INDEX IF NOT EXISTS homebrew_sources_owner_idx ON public.homebrew_sources(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.homebrew_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.homebrew_sources(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('race','subrace','animalha','class','origin','skill','power','technique','item','equipment','monster','recipe','rule')),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 180),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text,
  content text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  sort_order integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data) = 'object'),
  tags jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tags) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, slug)
);
CREATE INDEX IF NOT EXISTS homebrew_content_source_idx ON public.homebrew_content(source_id, content_type, sort_order, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.homebrew_campaign_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.homebrew_sources(id) ON DELETE CASCADE,
  attached_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(overrides) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, source_id)
);
CREATE INDEX IF NOT EXISTS homebrew_campaign_sources_campaign_idx ON public.homebrew_campaign_sources(campaign_id, enabled, priority);

CREATE TABLE IF NOT EXISTS public.homebrew_content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.homebrew_content(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version >= 1),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_id, version)
);
CREATE INDEX IF NOT EXISTS homebrew_revisions_content_idx ON public.homebrew_content_revisions(content_id, version DESC);

ALTER TABLE public.homebrew_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homebrew_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homebrew_campaign_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homebrew_content_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS homebrew_sources_select ON public.homebrew_sources;
CREATE POLICY homebrew_sources_select ON public.homebrew_sources FOR SELECT USING (
  owner_id = auth.uid()
  OR (visibility IN ('public','unlisted') AND status = 'published')
  OR EXISTS (SELECT 1 FROM public.homebrew_campaign_sources hcs JOIN public.campaign_members cm ON cm.campaign_id=hcs.campaign_id AND cm.user_id=auth.uid() WHERE hcs.source_id=homebrew_sources.id AND hcs.enabled AND homebrew_sources.status='published')
);
DROP POLICY IF EXISTS homebrew_sources_insert ON public.homebrew_sources;
CREATE POLICY homebrew_sources_insert ON public.homebrew_sources FOR INSERT TO authenticated WITH CHECK (owner_id=auth.uid());
DROP POLICY IF EXISTS homebrew_sources_update ON public.homebrew_sources;
CREATE POLICY homebrew_sources_update ON public.homebrew_sources FOR UPDATE TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
DROP POLICY IF EXISTS homebrew_sources_delete ON public.homebrew_sources;
CREATE POLICY homebrew_sources_delete ON public.homebrew_sources FOR DELETE TO authenticated USING (owner_id=auth.uid());

DROP POLICY IF EXISTS homebrew_content_select ON public.homebrew_content;
CREATE POLICY homebrew_content_select ON public.homebrew_content FOR SELECT USING (
  owner_id=auth.uid()
  OR (status='published' AND EXISTS (
    SELECT 1 FROM public.homebrew_sources hs
    WHERE hs.id=homebrew_content.source_id AND (
      (hs.visibility IN ('public','unlisted') AND hs.status='published')
      OR EXISTS (SELECT 1 FROM public.homebrew_campaign_sources hcs JOIN public.campaign_members cm ON cm.campaign_id=hcs.campaign_id AND cm.user_id=auth.uid() WHERE hcs.source_id=hs.id AND hcs.enabled AND hs.status='published')
    )
  ))
);
DROP POLICY IF EXISTS homebrew_content_insert ON public.homebrew_content;
CREATE POLICY homebrew_content_insert ON public.homebrew_content FOR INSERT TO authenticated WITH CHECK (owner_id=auth.uid() AND EXISTS (SELECT 1 FROM public.homebrew_sources hs WHERE hs.id=source_id AND hs.owner_id=auth.uid()));
DROP POLICY IF EXISTS homebrew_content_update ON public.homebrew_content;
CREATE POLICY homebrew_content_update ON public.homebrew_content FOR UPDATE TO authenticated USING (owner_id=auth.uid() AND EXISTS (SELECT 1 FROM public.homebrew_sources hs WHERE hs.id=source_id AND hs.owner_id=auth.uid())) WITH CHECK (owner_id=auth.uid() AND EXISTS (SELECT 1 FROM public.homebrew_sources hs WHERE hs.id=source_id AND hs.owner_id=auth.uid()));
DROP POLICY IF EXISTS homebrew_content_delete ON public.homebrew_content;
CREATE POLICY homebrew_content_delete ON public.homebrew_content FOR DELETE TO authenticated USING (owner_id=auth.uid() AND EXISTS (SELECT 1 FROM public.homebrew_sources hs WHERE hs.id=source_id AND hs.owner_id=auth.uid()));

DROP POLICY IF EXISTS homebrew_campaign_sources_select ON public.homebrew_campaign_sources;
CREATE POLICY homebrew_campaign_sources_select ON public.homebrew_campaign_sources FOR SELECT USING (attached_by=auth.uid() OR aeriom_private.is_campaign_member(campaign_id));
DROP POLICY IF EXISTS homebrew_campaign_sources_insert ON public.homebrew_campaign_sources;
CREATE POLICY homebrew_campaign_sources_insert ON public.homebrew_campaign_sources FOR INSERT TO authenticated WITH CHECK (
  aeriom_private.is_campaign_master(campaign_id) AND attached_by=auth.uid()
  AND EXISTS (SELECT 1 FROM public.homebrew_sources hs WHERE hs.id=source_id AND hs.status='published' AND (hs.owner_id=auth.uid() OR hs.visibility IN ('public','unlisted')))
);
DROP POLICY IF EXISTS homebrew_campaign_sources_update ON public.homebrew_campaign_sources;
CREATE POLICY homebrew_campaign_sources_update ON public.homebrew_campaign_sources FOR UPDATE TO authenticated USING (aeriom_private.is_campaign_master(campaign_id)) WITH CHECK (aeriom_private.is_campaign_master(campaign_id));
DROP POLICY IF EXISTS homebrew_campaign_sources_delete ON public.homebrew_campaign_sources;
CREATE POLICY homebrew_campaign_sources_delete ON public.homebrew_campaign_sources FOR DELETE TO authenticated USING (aeriom_private.is_campaign_master(campaign_id));

DROP POLICY IF EXISTS homebrew_revisions_select ON public.homebrew_content_revisions;
CREATE POLICY homebrew_revisions_select ON public.homebrew_content_revisions FOR SELECT USING (EXISTS (SELECT 1 FROM public.homebrew_content hc WHERE hc.id=content_id AND hc.owner_id=auth.uid()));
DROP POLICY IF EXISTS homebrew_revisions_insert ON public.homebrew_content_revisions;
CREATE POLICY homebrew_revisions_insert ON public.homebrew_content_revisions FOR INSERT TO authenticated WITH CHECK (changed_by=auth.uid() AND EXISTS (SELECT 1 FROM public.homebrew_content hc JOIN public.homebrew_sources hs ON hs.id=hc.source_id WHERE hc.id=content_id AND hc.owner_id=auth.uid() AND hs.owner_id=auth.uid()));

CREATE OR REPLACE FUNCTION public.homebrew_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS homebrew_sources_updated_at ON public.homebrew_sources;
CREATE TRIGGER homebrew_sources_updated_at BEFORE UPDATE ON public.homebrew_sources FOR EACH ROW EXECUTE FUNCTION public.homebrew_touch_updated_at();
DROP TRIGGER IF EXISTS homebrew_content_updated_at ON public.homebrew_content;
CREATE TRIGGER homebrew_content_updated_at BEFORE UPDATE ON public.homebrew_content FOR EACH ROW EXECUTE FUNCTION public.homebrew_touch_updated_at();
DROP TRIGGER IF EXISTS homebrew_campaign_sources_updated_at ON public.homebrew_campaign_sources;
CREATE TRIGGER homebrew_campaign_sources_updated_at BEFORE UPDATE ON public.homebrew_campaign_sources FOR EACH ROW EXECUTE FUNCTION public.homebrew_touch_updated_at();

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_sources; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_content; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_campaign_sources; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;