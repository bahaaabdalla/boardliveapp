-- profiles: links to auth.users
create table
  public.profiles (
    id uuid not null references auth.users (id) on delete cascade on update cascade,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone default now() not null,
    primary key (id)
  );

-- sessions
create table
  public.sessions (
    id uuid not null default gen_random_uuid (),
    slug text not null,
    host_id uuid not null references public.profiles (id) on delete cascade on update cascade,
    title text not null,
    status text not null default 'idle'::text check (status in ('idle', 'live', 'ended')),
    active_tab text not null default 'board'::text check (active_tab in ('board', 'presentation')),
    current_presentation_id uuid null,
    current_slide_index integer not null default 0,
    created_at timestamp with time zone default now() null,
    primary key (id),
    constraint sessions_slug_key unique (slug)
  );

-- session_participants
create table
  public.session_participants (
    id uuid not null default gen_random_uuid (),
    session_id uuid not null references public.sessions (id) on delete cascade on update cascade,
    user_id uuid null references public.profiles (id) on delete cascade on update cascade,
    guest_name text null,
    role text not null default 'viewer'::text check (role in ('host', 'viewer')),
    joined_at timestamp with time zone default now() not null,
    left_at timestamp with time zone null,
    primary key (id)
  );

-- presentations
create table
  public.presentations (
    id uuid not null default gen_random_uuid (),
    session_id uuid not null references public.sessions (id) on delete cascade on update cascade,
    title text not null,
    file_url text null,
    created_at timestamp with time zone default now() not null,
    primary key (id)
  );

-- Add fk constraint to sessions for current_presentation_id
alter table public.sessions
add constraint sessions_current_presentation_id_fkey foreign key (current_presentation_id) references public.presentations (id) on delete set null on update cascade;

-- presentation_slides
create table
  public.presentation_slides (
    id uuid not null default gen_random_uuid (),
    presentation_id uuid not null references public.presentations (id) on delete cascade on update cascade,
    order_index integer not null,
    image_url text not null,
    primary key (id)
  );

-- session_assets
create table
  public.session_assets (
    id uuid not null default gen_random_uuid (),
    session_id uuid not null references public.sessions (id) on delete cascade on update cascade,
    type text not null check (type in ('image', 'document')),
    url text not null,
    created_at timestamp with time zone default now() not null,
    primary key (id)
  );

-- RLS setup
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.presentations enable row level security;
alter table public.presentation_slides enable row level security;
alter table public.session_assets enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Sessions policies
create policy "Sessions are viewable by everyone." on public.sessions for select using (true);
create policy "Host can insert sessions." on public.sessions for insert with check (auth.uid() = host_id);
create policy "Host can update sessions." on public.sessions for update using (auth.uid() = host_id);
create policy "Host can delete sessions." on public.sessions for delete using (auth.uid() = host_id);

-- Session Participants policies
create policy "Participants viewable by everyone." on public.session_participants for select using (true);
create policy "Anyone can insert participants." on public.session_participants for insert with check (true);
create policy "Anyone can update participants." on public.session_participants for update using (true);

-- Presentations policies
create policy "Presentations viewable by everyone." on public.presentations for select using (true);
create policy "Host can insert presentations." on public.presentations for insert with check (exists (select 1 from public.sessions s where s.id = session_id and s.host_id = auth.uid()));
create policy "Host can update presentations." on public.presentations for update using (exists (select 1 from public.sessions s where s.id = session_id and s.host_id = auth.uid()));

-- Presentation slides policies
create policy "Slides viewable by everyone." on public.presentation_slides for select using (true);
create policy "Host can insert slides." on public.presentation_slides for insert with check (exists (select 1 from public.presentations p join public.sessions s on p.session_id = s.id where p.id = presentation_id and s.host_id = auth.uid()));

-- Session assets policies
create policy "Assets viewable by everyone." on public.session_assets for select using (true);
create policy "Anyone can insert assets." on public.session_assets for insert with check (true);

-- Storage bucket setup
-- Note: Assuming you create a bucket named 'assets' manually or via a separate script if not already present.
insert into storage.buckets (id, name, public) values ('assets', 'assets', true) on conflict do nothing;

create policy "Assets viewable by everyone" on storage.objects for select using (bucket_id = 'assets');
create policy "Anyone can upload assets" on storage.objects for insert with check (bucket_id = 'assets');

-- Function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
