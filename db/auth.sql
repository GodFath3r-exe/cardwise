-- CardWise user accounts + My Cards sync
-- Run in Supabase SQL Editor AFTER schema.sql + seed.sql
-- Requires: Authentication → Providers → Google enabled (see db/AUTH_SETUP.md)

-- Profile row per auth user
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Saved cards (card type ids only — never PAN / CVV)
create table if not exists user_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null references cards (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create index if not exists user_cards_user_id_idx on user_cards (user_id);

alter table profiles enable row level security;
alter table user_cards enable row level security;

drop policy if exists "Users read own profile" on profiles;
create policy "Users read own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id);

drop policy if exists "Users read own cards" on user_cards;
create policy "Users read own cards"
  on user_cards for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own cards" on user_cards;
create policy "Users insert own cards"
  on user_cards for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own cards" on user_cards;
create policy "Users delete own cards"
  on user_cards for delete
  using (auth.uid() = user_id);

-- Auto-create profile when someone signs up / signs in with Google
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
