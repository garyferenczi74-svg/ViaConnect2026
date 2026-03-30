-- Analytics Events Tracking Table (append-only)
-- Tracks user interactions for onboarding, report, action plan, and engagement metrics

create table if not exists analytics_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  event text not null,
  properties jsonb default '{}',
  timestamp timestamptz default now(),
  page text,
  device text,
  session_id text
);

create index if not exists idx_analytics_events_user_event on analytics_events (user_id, event);
create index if not exists idx_analytics_events_timestamp on analytics_events (timestamp);

-- RLS: users can only insert their own events, admins can read all
alter table analytics_events enable row level security;

create policy "Users can insert own events" on analytics_events
  for insert with check (auth.uid() = user_id);

create policy "Users can read own events" on analytics_events
  for select using (auth.uid() = user_id);
