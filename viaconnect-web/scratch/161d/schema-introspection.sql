-- Step A3 live database introspection
-- Run by orchestrator via Supabase MCP execute_sql 2026-05-12
-- Read-only queries; no data modification.

-- Q1: Does the column exist anywhere?
SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE column_name = 'compute_seq'
 ORDER BY table_schema, table_name;

-- Q2: Any indexes referencing compute_seq?
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE schemaname = 'public' AND indexdef ILIKE '%compute_seq%';

-- Q3: Any constraints referencing it?
SELECT conname, conrelid::regclass AS table_name, pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
 WHERE pg_get_constraintdef(oid) ILIKE '%compute_seq%'
 ORDER BY conname;

-- Q4: Full column shape of bio_optimization_history.
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'bio_optimization_history'
 ORDER BY ordinal_position;

-- Q5: Functions referencing compute_seq.
SELECT proname, pg_get_function_identity_arguments(oid) AS args, pg_get_functiondef(oid) AS body
  FROM pg_proc
 WHERE pronamespace = 'public'::regnamespace
   AND (proname = 'compute_bio_optimization_score' OR pg_get_functiondef(oid) ILIKE '%compute_seq%')
 ORDER BY proname;
