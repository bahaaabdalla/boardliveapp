-- Migration: Add board-assets storage bucket + session status column
-- Run this in Supabase SQL editor if not already applied

-- 1. Create the board-assets bucket for whiteboard image uploads
insert into storage.buckets (id, name, public)
values ('board-assets', 'board-assets', true)
on conflict do nothing;

-- Storage policies for board-assets
create policy "Board assets viewable by everyone"
  on storage.objects for select
  using (bucket_id = 'board-assets');

create policy "Anyone can upload board assets"
  on storage.objects for insert
  with check (bucket_id = 'board-assets');

-- 2. Add status column to sessions if not already present
-- (older schema uses 'idle'|'live'|'ended', new code also broadcasts 'ended')
alter table public.sessions
  alter column status set default 'live';

-- Ensure 'ended' is a valid status value (add if the check constraint is too strict)
-- The existing check already includes 'ended' from schema v1.
-- No further changes needed unless you're starting fresh.
