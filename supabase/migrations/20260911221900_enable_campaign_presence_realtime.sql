-- Keep campaign presence synchronized across connected campaign clients.
-- Safe to run repeatedly: PostgreSQL raises an error if the table is already
-- part of the publication, so guard it with pg_publication_tables first.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'campaign_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_presence;
  END IF;
END
$$;
