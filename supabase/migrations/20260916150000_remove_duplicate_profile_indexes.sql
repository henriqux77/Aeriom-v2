-- AFTERLIFE P3: remove exact duplicate indexes on profiles.
-- Keep the primary-key index and the existing partial unique index.
DROP INDEX IF EXISTS public.profiles_id_uidx;
DROP INDEX IF EXISTS public.profiles_portal_user_id_uidx;
