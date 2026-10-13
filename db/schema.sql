-- CardWise cloud schema (PostgreSQL / Supabase)
-- Run this first in the Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- Core card catalog
create table if not exists cards (
  id text primary key,
  name text not null,
  short_name text not null,
  bank text not null,
  network text,
  tagline text,
  best_for text,
  card_group text not null default 'popular', -- popular | sbi
  joining_fee text,
  annual_fee text,
  waiver text,
  fee_hint text,
  earn_label text default 'cashback',
  accent text,
  gradient text,
  is_active boolean not null default true,
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists card_offers (
  id bigserial primary key,
  card_id text not null references cards (id) on delete cascade,
  sort_order int not null default 0,
  title text not null,
  rate text not null,
  rate_value numeric,
  cap_label text,
  cap_amount numeric,
  cap_period text,
  tier text default 'base',
  hint text
);

create index if not exists card_offers_card_id_idx on card_offers (card_id, sort_order);

create table if not exists card_sources (
  id bigserial primary key,
  card_id text not null references cards (id) on delete cascade,
  label text not null,
  url text not null
);

-- URLs the future weekly AI/job will re-fetch
create table if not exists source_urls (
  id bigserial primary key,
  card_id text not null references cards (id) on delete cascade,
  url text not null,
  kind text not null default 'official', -- official | pdf | mitc
  content_hash text,
  last_fetched_at timestamptz,
  last_changed_at timestamptz,
  unique (card_id, url)
);

create table if not exists refresh_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running', -- running | ok | error
  cards_checked int default 0,
  cards_updated int default 0,
  notes text
);

-- Public read access for a future website (optional; tighten later)
alter table cards enable row level security;
alter table card_offers enable row level security;
alter table card_sources enable row level security;

drop policy if exists "Public read cards" on cards;
create policy "Public read cards"
  on cards for select
  using (is_active = true);

drop policy if exists "Public read offers" on card_offers;
create policy "Public read offers"
  on card_offers for select
  using (true);

drop policy if exists "Public read sources" on card_sources;
create policy "Public read sources"
  on card_sources for select
  using (true);

-- source_urls + refresh_runs stay private (no public policies)
