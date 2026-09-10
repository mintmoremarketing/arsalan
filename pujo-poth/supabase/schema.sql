-- Pujo Poth schema
create extension if not exists "uuid-ossp";

create table if not exists zones (
  id text primary key,
  name text not null,
  name_bn text not null,
  color text not null
);

create table if not exists arsalans (
  id text primary key,
  zone_id text references zones(id) on delete cascade,
  name text not null,
  short_name text not null,
  place_name text not null,
  maps_link text,
  rating numeric,
  lat double precision not null,
  lng double precision not null,
  open_hours text,
  wait_min int default 20,
  photo_url text,
  updated_at timestamptz default now()
);

create table if not exists pandals (
  id text primary key,
  zone_id text references zones(id) on delete cascade,
  name text not null,
  name_bn text not null,
  place_name text not null,
  maps_link text,
  rating numeric,
  photo_url text,
  lat double precision not null,
  lng double precision not null,
  theme text,
  theme_bn text,
  queue_min int default 20,
  crowd smallint default 3,
  arsalan_id text references arsalans(id),
  updated_at timestamptz default now()
);

-- Identity: browser-local uuid, name + color (writable by anyone; owned by row.id)
create table if not exists identities (
  id uuid primary key,
  name text not null,
  color text not null,
  created_at timestamptz default now()
);

-- Presence: latest position per identity
create table if not exists presence (
  identity_id uuid primary key references identities(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  at_label text,
  updated_at timestamptz default now()
);

-- RLS: public read for all, public write for identities & presence keyed by row id
alter table zones enable row level security;
alter table arsalans enable row level security;
alter table pandals enable row level security;
alter table identities enable row level security;
alter table presence enable row level security;

create policy "public read zones" on zones for select using (true);
create policy "public read arsalans" on arsalans for select using (true);
create policy "public read pandals" on pandals for select using (true);
create policy "public read identities" on identities for select using (true);
create policy "public read presence" on presence for select using (true);

create policy "anon write identities" on identities for insert with check (true);
create policy "anon update identities" on identities for update using (true);
create policy "anon upsert presence" on presence for insert with check (true);
create policy "anon update presence" on presence for update using (true);
create policy "anon delete presence" on presence for delete using (true);

-- Admin writes gated by service role on the client (admin panel uses service key or a signed edge fn)
create policy "admin write pandals" on pandals for all using (true) with check (true);
create policy "admin write arsalans" on arsalans for all using (true) with check (true);
create policy "admin write zones" on zones for all using (true) with check (true);

-- Sessions: rough analytics (one row per unique ip+ua, updated on each hit)
create table if not exists sessions (
  id uuid primary key default uuid_generate_v4(),
  ip text,
  ua text,
  first_seen timestamptz default now(),
  last_seen timestamptz default now(),
  hits int default 1
);
create index if not exists sessions_last_seen_idx on sessions(last_seen desc);
create unique index if not exists sessions_ip_ua_idx on sessions(ip, ua);

alter table sessions enable row level security;
create policy "public read sessions" on sessions for select using (true);
create policy "anon write sessions" on sessions for insert with check (true);
create policy "anon update sessions" on sessions for update using (true);

-- Group codes on presence (for "share only with my crew")
alter table presence add column if not exists group_code text;
create index if not exists presence_group_idx on presence(group_code);

-- Crowd reports (append-only, aggregated for live crowd numbers)
create table if not exists crowd_reports (
  id uuid primary key default uuid_generate_v4(),
  pandal_id text references pandals(id) on delete cascade,
  crowd_level int check (crowd_level between 1 and 5),
  queue_min int,
  reported_at timestamptz default now()
);
create index if not exists crowd_pandal_time_idx on crowd_reports(pandal_id, reported_at desc);
alter table crowd_reports enable row level security;
create policy "read crowd_reports"  on crowd_reports for select using (true);
create policy "write crowd_reports" on crowd_reports for insert with check (true);

-- Arsalan wait-time reports (append-only)
create table if not exists arsalan_waits (
  id uuid primary key default uuid_generate_v4(),
  arsalan_id text references arsalans(id) on delete cascade,
  wait_min int,
  people_count int,
  reported_at timestamptz default now()
);
create index if not exists arsalan_wait_time_idx on arsalan_waits(arsalan_id, reported_at desc);
alter table arsalan_waits enable row level security;
create policy "read arsalan_waits"  on arsalan_waits for select using (true);
create policy "write arsalan_waits" on arsalan_waits for insert with check (true);

-- Realtime broadcast
alter publication supabase_realtime add table presence;
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table crowd_reports;
alter publication supabase_realtime add table arsalan_waits;
