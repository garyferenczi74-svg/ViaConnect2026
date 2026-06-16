-- Prompt 201: private storage bucket for uploaded Apple Health export zips.
-- The client uploads the zip directly to storage (bypassing the serverless body
-- size limit, since Health exports are large), then the server parser streams it
-- from here. Own-folder access only: a user can read and write under
-- apple-health-imports/{their user id}/...
--
-- All comments use hyphens only. No em-dashes or en-dashes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('apple-health-imports', 'apple-health-imports', false, 209715200,
        array['application/zip','application/x-zip-compressed','application/octet-stream'])
on conflict (id) do nothing;

drop policy if exists apple_health_imports_own_folder on storage.objects;
create policy apple_health_imports_own_folder on storage.objects for all to authenticated
  using (bucket_id = 'apple-health-imports' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'apple-health-imports' and (storage.foldername(name))[1] = auth.uid()::text);
