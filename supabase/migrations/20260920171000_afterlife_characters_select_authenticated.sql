-- Allow authenticated users to query their own characters through the Data API.
-- RLS remains the row-level boundary: only rows with user_id = auth.uid() are visible.
grant select on table public.characters to authenticated;
