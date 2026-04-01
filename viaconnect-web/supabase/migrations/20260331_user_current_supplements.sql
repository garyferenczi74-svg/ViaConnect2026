-- User Current Supplements (from CAQ Phase 6)
-- Stores supplements the user reported taking, separate from AI recommendations

create table if not exists user_current_supplements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  supplement_name text not null,
  brand text,
  product_name text,
  formulation text,
  dosage text,
  dosage_form text default 'capsule',
  frequency text default 'daily',
  category text default 'general',
  key_ingredients text[] default '{}',
  source text default 'manual',
  photo_url text,
  is_current boolean default true,
  is_ai_recommended boolean default false,
  added_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, supplement_name)
);

create index if not exists idx_user_current_supplements_user on user_current_supplements (user_id);

-- Supplement adherence tracking
create table if not exists supplement_adherence (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  supplement_name text not null,
  supplement_type text default 'current',
  category text default 'general',
  recommended_dosage text default '',
  recommended_frequency text default 'daily',
  adherence_percent integer default 0,
  streak_days integer default 0,
  total_doses_logged integer default 0,
  started_at timestamptz default now(),
  status text default 'active',
  unique(user_id, supplement_name)
);

create index if not exists idx_supplement_adherence_user on supplement_adherence (user_id);

-- RLS
alter table user_current_supplements enable row level security;
create policy "Users manage own supplements" on user_current_supplements for all using (auth.uid() = user_id);

alter table supplement_adherence enable row level security;
create policy "Users manage own adherence" on supplement_adherence for all using (auth.uid() = user_id);
