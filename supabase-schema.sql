-- Elite Coach Database Schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New Query)

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Profiles table (auto-created on signup via trigger)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Saved workout programs
create table if not exists public.saved_programs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  answers jsonb default '{}'::jsonb,
  content text not null,
  is_active boolean default false,
  created_at timestamptz default now()
);

-- Chat conversations
create table if not exists public.chat_conversations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workout stats / progress tracking
create table if not exists public.workout_stats (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  completed_workouts jsonb default '{}'::jsonb,
  streak integer default 0,
  longest_streak integer default 0,
  total_workouts integer default 0,
  last_workout_date text,
  updated_at timestamptz default now()
);

-- Health source connections (WHOOP, Oura tokens)
create table if not exists public.health_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null, -- 'whoop' or 'oura'
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  connected_at timestamptz default now(),
  unique(user_id, provider)
);

-- Row Level Security (RLS) — users can only access their own data
alter table public.profiles enable row level security;
alter table public.saved_programs enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.workout_stats enable row level security;
alter table public.health_connections enable row level security;

-- Profiles policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Saved programs policies
create policy "Users can view own programs" on public.saved_programs for select using (auth.uid() = user_id);
create policy "Users can insert own programs" on public.saved_programs for insert with check (auth.uid() = user_id);
create policy "Users can update own programs" on public.saved_programs for update using (auth.uid() = user_id);
create policy "Users can delete own programs" on public.saved_programs for delete using (auth.uid() = user_id);

-- Chat conversations policies
create policy "Users can view own conversations" on public.chat_conversations for select using (auth.uid() = user_id);
create policy "Users can insert own conversations" on public.chat_conversations for insert with check (auth.uid() = user_id);
create policy "Users can update own conversations" on public.chat_conversations for update using (auth.uid() = user_id);
create policy "Users can delete own conversations" on public.chat_conversations for delete using (auth.uid() = user_id);

-- Workout stats policies
create policy "Users can view own stats" on public.workout_stats for select using (auth.uid() = user_id);
create policy "Users can insert own stats" on public.workout_stats for insert with check (auth.uid() = user_id);
create policy "Users can update own stats" on public.workout_stats for update using (auth.uid() = user_id);

-- Health connections policies
create policy "Users can view own connections" on public.health_connections for select using (auth.uid() = user_id);
create policy "Users can insert own connections" on public.health_connections for insert with check (auth.uid() = user_id);
create policy "Users can update own connections" on public.health_connections for update using (auth.uid() = user_id);
create policy "Users can delete own connections" on public.health_connections for delete using (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance
create index if not exists idx_saved_programs_user on public.saved_programs(user_id);
create index if not exists idx_chat_conversations_user on public.chat_conversations(user_id);
create index if not exists idx_health_connections_user on public.health_connections(user_id);
