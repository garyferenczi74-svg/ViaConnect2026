-- Prompt 187 (2026-06-11): private storage bucket for third party nutrition
-- test uploads. Path convention: {user_id}/{upload_id}/{original_filename}.
-- Private: access via signed URLs only (10 minute expiry, created client side
-- under the owner only select policy; the edge function downloads via the
-- service role). 20 MB cap and an explicit mime allowlist enforced at the
-- bucket. Owner folder insert + select only; NO update or delete policies
-- (upload history is retained).
-- Applied to live via MCP 2026-06-11.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nutrition-test-uploads',
  'nutrition-test-uploads',
  false,
  20971520,
  array['application/pdf','image/png','image/jpeg','image/webp','text/csv','application/vnd.ms-excel']
)
on conflict (id) do nothing;

create policy "ntu_storage_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'nutrition-test-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ntu_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'nutrition-test-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
