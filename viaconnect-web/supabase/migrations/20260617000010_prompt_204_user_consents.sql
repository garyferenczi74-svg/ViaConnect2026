-- Prompt 204: signup consent acknowledgment storage.
-- Captures privacy and terms acceptance recorded at account creation. The row
-- is written by a security definer trigger from the signUp user_metadata, so no
-- client insert policy is required (the signup flow has no authenticated session
-- until email verification, so a client-side insert would fail RLS).
--
-- An existing trigger on_auth_user_created calls public.handle_new_user to create
-- the profiles row. This migration adds a SEPARATE, additive AFTER INSERT trigger
-- dedicated to consent and does NOT modify handle_new_user, to avoid any risk to
-- the existing signup path. Append-only migration; does not edit prior migrations.

create table if not exists public.user_consents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  privacy_accepted_at timestamptz,
  terms_accepted_at timestamptz,
  policy_version text,
  created_at timestamptz not null default now()
);

alter table public.user_consents enable row level security;

drop policy if exists "user_consents_select_own" on public.user_consents;
create policy "user_consents_select_own"
  on public.user_consents
  for select
  using (auth.uid() = user_id);

create or replace function public.handle_user_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'privacy_accepted_at'
     or new.raw_user_meta_data ? 'terms_accepted_at' then
    insert into public.user_consents (
      user_id,
      privacy_accepted_at,
      terms_accepted_at,
      policy_version
    )
    values (
      new.id,
      (new.raw_user_meta_data ->> 'privacy_accepted_at')::timestamptz,
      (new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz,
      new.raw_user_meta_data ->> 'policy_version'
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_consent on auth.users;
create trigger on_auth_user_created_consent
  after insert on auth.users
  for each row
  execute function public.handle_user_consent();
