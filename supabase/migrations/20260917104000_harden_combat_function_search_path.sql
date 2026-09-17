-- P10 security hardening: keep the combat helper functions on a fixed search path.
-- These functions only use PostgreSQL/public built-ins and do not need pg_temp.
alter function public.aerion_combat_roll(integer)
  set search_path = public;

alter function public.aerion_combat_physical_tier(integer)
  set search_path = public;
