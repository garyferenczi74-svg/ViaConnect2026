alter table public.audit_logs
  add column if not exists resource_type text,
  add column if not exists resource_id text,
  add column if not exists metadata jsonb,
  add column if not exists ip_address text;
comment on column public.audit_logs.resource_type is 'Prompt 210d: new-shape audit writers (route-level) alongside trigger-shape table_name/record_id.';
