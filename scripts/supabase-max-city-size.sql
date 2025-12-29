-- Enforce a max city save size of 20 MiB in Supabase Postgres.
-- Run this in the Supabase SQL Editor (or via your migration pipeline).

-- 20 MiB = 20 * 1024 * 1024 = 20971520 bytes

ALTER TABLE public.game_rooms
  ADD CONSTRAINT game_rooms_game_state_max_20mb
  CHECK (octet_length(game_state) <= 20971520);

