-- VIA-10: third-party AI sharing consent columns and AI response reports.
-- Append-only. Do not apply until Gary approves. The app gate stays off
-- until AI_THIRD_PARTY_CONSENT_GATE is set after this migration is applied.
--
-- Reuses public.user_consents (signup privacy/terms plus wearable PHI).
-- Adds the AI agree timestamp, revoke timestamp, and consent-text version.
-- A new table stores in-app reports of AI replies. RLS: each user can
-- read and insert only their own rows. No update or delete policy.

alter table public.user_consents
  add column if not exists ai_data_sharing_accepted_at timestamptz,
  add column if not exists ai_data_sharing_revoked_at timestamptz,
  add column if not exists ai_data_sharing_consent_version text;

comment on column public.user_consents.ai_data_sharing_accepted_at is
  'VIA-10: when the user agreed to send personal data to the third-party AI providers named in the consent text.';
comment on column public.user_consents.ai_data_sharing_revoked_at is
  'VIA-10: when the user withdrew that agree choice. A later accepted_at turns sharing back on.';
comment on column public.user_consents.ai_data_sharing_consent_version is
  'VIA-10: consent text version the user agreed to. A newer version in the app requires a new agree.';

create table if not exists public.ai_response_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid not null,
  surface text not null check (surface in ('advisor', 'hannah')),
  reason text not null check (reason in ('offensive', 'inaccurate', 'harmful', 'privacy', 'other')),
  note text,
  created_at timestamptz not null default now(),
  constraint ai_response_reports_note_len check (note is null or char_length(note) <= 500)
);

comment on table public.ai_response_reports is
  'VIA-10: in-app reports of an AI reply. Own rows only. Does not store the reply text.';

create index if not exists ai_response_reports_user_created_idx
  on public.ai_response_reports (user_id, created_at desc);

alter table public.ai_response_reports enable row level security;

drop policy if exists ai_response_reports_select_own on public.ai_response_reports;
create policy ai_response_reports_select_own
  on public.ai_response_reports
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists ai_response_reports_insert_own on public.ai_response_reports;
create policy ai_response_reports_insert_own
  on public.ai_response_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on table public.ai_response_reports from anon, public;
grant select, insert on table public.ai_response_reports to authenticated;
