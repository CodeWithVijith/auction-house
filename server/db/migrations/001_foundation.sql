create table organizations (
  id uuid primary key,
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key,
  email text not null,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  password_hash text not null,
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index users_email_unique on users (lower(email));

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('ADMIN', 'ORGANIZER', 'OPERATOR', 'VIEWER')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table sessions (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('ADMIN', 'ORGANIZER', 'OPERATOR', 'VIEWER')),
  csrf_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_expiry_idx on sessions (expires_at);

create table auction_events (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  season text not null check (length(trim(season)) between 1 and 80),
  timezone text not null,
  unit text not null check (unit in ('INR', 'POINTS')),
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'READY', 'LIVE', 'COMPLETE', 'ARCHIVED')),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index auction_events_org_created_idx
  on auction_events (organization_id, created_at desc);

