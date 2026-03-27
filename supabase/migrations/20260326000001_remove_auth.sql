-- Drop foreign key constraints that tie to auth/profiles
alter table public.sessions drop constraint if exists sessions_host_id_fkey;
alter table public.session_participants drop constraint if exists session_participants_user_id_fkey;

-- Update RLS policies for sessions
drop policy if exists "Host can insert sessions." on public.sessions;
drop policy if exists "Host can update sessions." on public.sessions;
drop policy if exists "Host can delete sessions." on public.sessions;
create policy "Anyone can insert sessions" on public.sessions for insert with check (true);
create policy "Anyone can update sessions" on public.sessions for update using (true);
create policy "Anyone can delete sessions" on public.sessions for delete using (true);

-- Update RLS for presentations
drop policy if exists "Host can insert presentations." on public.presentations;
drop policy if exists "Host can update presentations." on public.presentations;
create policy "Anyone can insert presentations" on public.presentations for insert with check (true);
create policy "Anyone can update presentations" on public.presentations for update using (true);

-- Update RLS for presentation_slides
drop policy if exists "Host can insert slides." on public.presentation_slides;
create policy "Anyone can insert slides" on public.presentation_slides for insert with check (true);
