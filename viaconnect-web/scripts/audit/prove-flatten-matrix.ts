// Local allow/deny proof for the flatten template.
//
//   node --experimental-strip-types scripts/audit/prove-flatten-matrix.ts \
//     --snapshot <pg_policies.json> \
//     --template supabase/manual/flatten_auth_uid_policies.sql \
//     --out-dir supabase/audit
//
// Creates a local database, stubs auth.uid/jwt/role and the tables the sample
// policies reference, loads the before policy text, runs SELECT/INSERT/UPDATE/DELETE
// as anon, owner, other, admin, and service, applies the guarded template for
// that sample, and reruns the matrix. A drifted policy must RAISE and roll back.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { compareFlattenedPolicies } from './diff-auth-policies.ts';
import { quoteIdent } from './emit-alter-policy.ts';

const OWNER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const ADMIN = '33333333-3333-3333-3333-333333333333';
const FORMULA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ITEM = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MEMBER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const PACK = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const DIST = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const PROTOCOL = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const ROW = '99999999-9999-9999-9999-999999999999';

const ACTORS = [
  { name: 'anon', role: 'anon', claims: null },
  {
    name: 'owner',
    role: 'authenticated',
    claims: JSON.stringify({ sub: OWNER, role: 'authenticated', email: 'owner@example.test' }),
  },
  {
    name: 'other',
    role: 'authenticated',
    claims: JSON.stringify({ sub: OTHER, role: 'authenticated', email: 'other@example.test' }),
  },
  {
    name: 'admin',
    role: 'authenticated',
    claims: JSON.stringify({ sub: ADMIN, role: 'admin', email: 'admin@example.test' }),
  },
  {
    name: 'service',
    role: 'service_role',
    claims: JSON.stringify({ sub: ADMIN, role: 'service_role', email: 'service@example.test' }),
  },
] as const;

const OPS = ['select', 'insert', 'update', 'delete'] as const;

interface PolicyRow {
  readonly schemaname: string;
  readonly tablename: string;
  readonly policyname: string;
  readonly permissive: string;
  readonly roles: readonly string[];
  readonly cmd: string;
  readonly qual: string | null;
  readonly with_check: string | null;
}

interface TablePlan {
  readonly name: string;
  readonly shape: string;
  readonly policies: readonly string[];
  readonly select: string;
  readonly insert: string;
  readonly update: string;
  readonly delete: string;
}

const TABLES: readonly TablePlan[] = [
  plan('profiles', 'owner-only uid = id', ['Users can view own profile', 'Users can insert own profile', 'Users can update own profile'], `INSERT INTO public.profiles (id, role) VALUES ('${OWNER}', 'consumer')`),
  plan('ai_insights', 'owner-only uid = user_id', ['Users can view own ai_insights', 'Users can insert own ai_insights', 'Users can update own ai_insights'], `INSERT INTO public.ai_insights (user_id) VALUES ('${OWNER}')`),
  plan('naturopath_profiles', 'owner-only delete', ['Naturopaths delete own profile'], `INSERT INTO public.naturopath_profiles (user_id) VALUES ('${OWNER}')`),
  plan('nutrition_logs', 'owner-only delete', ['Users delete own nutrition logs'], `INSERT INTO public.nutrition_logs (user_id) VALUES ('${OWNER}')`),
  plan('recommendations', 'owner-only delete', ['Users can delete own recommendations'], `INSERT INTO public.recommendations (user_id) VALUES ('${OWNER}')`),
  plan('body_tracker_activity', 'owner-only ALL', ['Users own activity'], `INSERT INTO public.body_tracker_activity (user_id) VALUES ('${OWNER}')`),
  plan('assessment_results', 'owner-only ALL', ['Users manage own assessment results'], `INSERT INTO public.assessment_results (user_id) VALUES ('${OWNER}')`),
  plan('body_photo_sessions', 'owner-only ALL', ['Users manage own photo sessions'], `INSERT INTO public.body_photo_sessions (user_id) VALUES ('${OWNER}')`),
  plan('photo_share_permissions', 'owner-only delete', ['photo_share_permissions_delete_owner'], `INSERT INTO public.photo_share_permissions (photo_session_user_id) VALUES ('${OWNER}')`),
  plan('audit_logs', 'admin via profiles.role', ['Only admins can view audit logs'], `INSERT INTO public.audit_logs (id) VALUES ('${ROW}')`),
  plan('approver_assignments', 'admin via profiles.role ALL', ['approver_assignments_admin_all'], `INSERT INTO public.approver_assignments (id) VALUES ('${ROW}')`),
  plan('aggregation_snapshots', 'admin via profiles.role array', ['agg_snapshots_exec_admin_all'], `INSERT INTO public.aggregation_snapshots (id) VALUES ('${ROW}')`),
  plan('appeal_agreement_rollups', 'jwt role claim', ['agreement_admin_read'], `INSERT INTO public.appeal_agreement_rollups (id) VALUES ('${ROW}')`),
  plan('appeal_patterns', 'jwt role claim ALL', ['patterns_admin_rw'], `INSERT INTO public.appeal_patterns (id) VALUES ('${ROW}')`),
  plan('marketing_copy_conversions', 'jwt role claim', ['conversions_admin_read'], `INSERT INTO public.marketing_copy_conversions (id) VALUES ('${ROW}')`),
  plan('appeal_analyses', 'jwt role claim', ['appeals_admin_read'], `INSERT INTO public.appeal_analyses (id) VALUES ('${ROW}')`),
  plan('bundles', 'auth.role() = authenticated', ['Authenticated read bundles'], `INSERT INTO public.bundles (id) VALUES ('${ROW}')`),
  plan('email_otps', 'auth.role() = service_role', ['service_role_only_email_otps'], `INSERT INTO public.email_otps (id) VALUES ('${ROW}')`),
  plan('herbs', 'auth.role() = authenticated', ['Authenticated users can view herbs'], `INSERT INTO public.herbs (id) VALUES ('${ROW}')`),
  plan('forecast_monthly', 'auth.role() = authenticated', ['Authenticated read forecast_monthly'], `INSERT INTO public.forecast_monthly (id) VALUES ('${ROW}')`),
  plan('rewards', 'auth.role() = authenticated', ['Authenticated users can view rewards'], `INSERT INTO public.rewards (id) VALUES ('${ROW}')`),
  plan('executive_recommendations', 'auth.role() = authenticated', ['Authenticated read executive_recommendations'], `INSERT INTO public.executive_recommendations (id) VALUES ('${ROW}')`),
  plan('verification_codes', 'jwt email claim', ['Users can read own codes', 'Users can insert own codes', 'Users can update own codes', 'Users can delete own codes'], `INSERT INTO public.verification_codes (email) VALUES ('owner@example.test')`),
  plan('advisor_peptide_shares', 'patient or practitioner linked row', ['peptide_shares_read', 'peptide_shares_practitioner_update', 'peptide_shares_patient_insert'], `INSERT INTO public.advisor_peptide_shares (patient_id, practitioner_id, peptide_name, original_question, advisor_response, status) VALUES ('${OWNER}', '${OTHER}', 'peptide', 'question', 'response', 'pending_review')`),
  plan('botanical_formulas', 'practitioner_id = uid', ['Practitioners can insert formulas', 'Practitioners can update own formulas', 'Practitioners can view own formulas'], `INSERT INTO public.botanical_formulas (id, practitioner_id) VALUES ('${ROW}', '${OWNER}')`),
  plan('botanical_formula_items', 'EXISTS linked formula', ['Items viewable with formula access', 'Items insertable with formula access'], `INSERT INTO public.botanical_formula_items (id, formula_id) VALUES ('${ROW}', '${FORMULA}')`),
  plan('board_packs', 'JOIN board member', ['bp_board_member_distributed'], `INSERT INTO public.board_packs (pack_id) VALUES ('${ROW}')`),
  plan('board_pack_download_events', 'JOIN board member insert', ['bpde_member_insert_own'], `INSERT INTO public.board_pack_download_events (distribution_id) VALUES ('${DIST}')`),
  plan('protocol_ingredients', 'EXISTS parent protocol', ['Users can delete protocol ingredients'], `INSERT INTO public.protocol_ingredients (protocol_id) VALUES ('${PROTOCOL}')`),
  plan('soc2_auditor_grants', 'jwt email or compliance reader', ['soc2_auditor_grants_select_merged'], `INSERT INTO public.soc2_auditor_grants (auditor_email, revoked) VALUES ('owner@example.test', false)`),
];

function plan(name: string, shape: string, policies: readonly string[], insert: string): TablePlan {
  return {
    name,
    shape,
    policies,
    select: `SELECT count(*) FROM public.${name}`,
    insert,
    update: `UPDATE public.${name} SET touch = touch + 1`,
    delete: `DELETE FROM public.${name}`,
  };
}

function argValue(argv: readonly string[], flag: string): string {
  const index = argv.indexOf(flag);
  const value = index === -1 ? undefined : argv[index + 1];
  if (value === undefined) throw new Error(`missing ${flag}`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPolicies(filePath: string): PolicyRow[] {
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.policies)) throw new Error('snapshot policies');
  return parsed.policies.map((row) => {
    if (!isRecord(row)) throw new Error('policy');
    return {
      schemaname: String(row.schemaname),
      tablename: String(row.tablename),
      policyname: String(row.policyname),
      permissive: String(row.permissive),
      roles: Array.isArray(row.roles) ? row.roles.map((role) => String(role)) : [],
      cmd: String(row.cmd),
      qual: row.qual === null ? null : String(row.qual),
      with_check: row.with_check === null ? null : String(row.with_check),
    };
  });
}

function psql(database: string, sql: string, allowFail = false): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('sudo', ['-u', 'postgres', 'psql', '-d', database, '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    encoding: 'utf8',
    input: sql,
    maxBuffer: 64 * 1024 * 1024,
  });
  const status = result.status ?? 1;
  if (!allowFail && status !== 0) {
    throw new Error(`psql ${database} failed\n${result.stdout}\n${result.stderr}`);
  }
  return { status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function psqlValue(database: string, sql: string): string {
  const result = spawnSync('sudo', ['-u', 'postgres', 'psql', '-d', database, '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return (result.stdout ?? '').trim();
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function createPolicySql(policy: PolicyRow): string {
  const roles = policy.roles.map((role) => (role === 'public' ? 'PUBLIC' : quoteIdent(role))).join(', ');
  let sql = `CREATE POLICY ${quoteIdent(policy.policyname)} ON public.${quoteIdent(policy.tablename)} AS ${policy.permissive} FOR ${policy.cmd} TO ${roles}`;
  if (policy.qual !== null) sql += ` USING (${policy.qual})`;
  if (policy.with_check !== null) sql += ` WITH CHECK (${policy.with_check})`;
  return `${sql};`;
}

function extractChunk(template: string, table: string, policyName: string): string {
  const marker = `-- policy public.${table} :: ${policyName}\n`;
  const at = template.indexOf(marker);
  if (at === -1) throw new Error(`template missing ${marker.trim()}`);
  const next = template.indexOf('\n-- policy ', at + marker.length);
  const end = next === -1 ? template.length : next;
  return template.slice(at, end).trim();
}

function stmtFor(table: TablePlan, op: (typeof OPS)[number]): string {
  if (op === 'select') return table.select;
  if (op === 'insert') return table.insert;
  if (op === 'update') return table.update;
  return table.delete;
}

function matrixSql(phase: string): string {
  const calls: string[] = [];
  for (const table of TABLES) {
    for (const actor of ACTORS) {
      for (const op of OPS) {
        const claims = actor.claims === null ? 'NULL' : `$${phase}$${actor.claims}$${phase}$`;
        calls.push(
          `SELECT run_cell(${sqlString(phase)}, ${sqlString(table.name)}, ${sqlString(actor.name)}, ${sqlString(actor.role)}, ${claims}, ${sqlString(op)}, ${sqlString(stmtFor(table, op))});`,
        );
      }
    }
  }
  return calls.join('\n');
}

function renderMatrix(phase: string, rows: readonly string[]): string {
  const lines = [
    `# Flatten allow/deny matrix (${phase})`,
    '',
    `Policies loaded: ${TABLES.reduce((sum, table) => sum + table.policies.length, 0)}`,
    `Tables: ${TABLES.length}`,
    'Actors: anon (no jwt), owner (authenticated sub of the fixture row), other (a different authenticated user; practitioner on advisor_peptide_shares), admin (authenticated jwt role admin, profiles.role admin), service (database role service_role, BYPASSRLS).',
    'Commands: select (visible rows), insert (ok or SQLSTATE), update (rows changed or SQLSTATE), delete (rows changed or SQLSTATE).',
    `Cells: ${TABLES.length * ACTORS.length * OPS.length}`,
    '',
    'SELECT/INSERT/UPDATE/DELETE run inside a subtransaction that rolls back, so each cell sees the same seed.',
    '',
  ];
  const byKey = new Map<string, string>();
  for (const row of rows) {
    const [tbl, actor, op, result] = row.split('\t');
    if (tbl === undefined || actor === undefined || op === undefined || result === undefined) continue;
    byKey.set(`${tbl}\t${actor}\t${op}`, result);
  }
  for (const table of TABLES) {
    lines.push(`## ${table.name}`);
    lines.push('');
    lines.push(`Shape: ${table.shape}.`);
    lines.push(`Policies: ${table.policies.join('; ')}.`);
    lines.push('');
    lines.push('| actor | select | insert | update | delete |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const actor of ACTORS) {
      const cells = OPS.map((op) => byKey.get(`${table.name}\t${actor.name}\t${op}`) ?? 'missing');
      lines.push(`| ${actor.name} | ${cells.join(' | ')} |`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function expectCell(rows: Map<string, string>, table: string, actor: string, op: string, expected: string): void {
  const actual = rows.get(`${table}\t${actor}\t${op}`);
  if (actual !== expected) {
    throw new Error(`expectation ${table} ${actor} ${op}: wanted ${expected}, got ${actual ?? 'missing'}`);
  }
}

function main(): void {
  const snapshotPath = argValue(process.argv.slice(2), '--snapshot');
  const templatePath = argValue(process.argv.slice(2), '--template');
  const outDir = argValue(process.argv.slice(2), '--out-dir');
  const policies = readPolicies(snapshotPath);
  const wanted = new Map<string, PolicyRow>();
  for (const policy of policies) wanted.set(`${policy.tablename}\t${policy.policyname}`, policy);
  const sample: PolicyRow[] = [];
  for (const table of TABLES) {
    for (const name of table.policies) {
      const policy = wanted.get(`${table.name}\t${name}`);
      if (policy === undefined) throw new Error(`snapshot missing ${table.name}.${name}`);
      sample.push(policy);
    }
  }
  const template = readFileSync(templatePath, 'utf8');
  const searchPathMatch = template.match(/^SET LOCAL search_path TO (.+);$/m);
  const searchPath = searchPathMatch?.[1];
  if (searchPath === undefined) throw new Error('template missing SET LOCAL search_path');
  const chunks = sample.map((policy) => extractChunk(template, policy.tablename, policy.policyname));

  psql(
    'postgres',
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'flatten_proof' AND pid <> pg_backend_pid();\nDROP DATABASE IF EXISTS flatten_proof;\nCREATE DATABASE flatten_proof;\n`,
  );
  const setup = `
SET statement_timeout = '120s';
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fn$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$fn$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $fn$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text
$fn$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $fn$
  SELECT coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb
$fn$;
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END
$roles$;
ALTER ROLE anon NOSUPERUSER NOBYPASSRLS NOLOGIN;
ALTER ROLE authenticated NOSUPERUSER NOBYPASSRLS NOLOGIN;
ALTER ROLE service_role NOSUPERUSER BYPASSRLS NOLOGIN;
GRANT anon TO postgres;
GRANT authenticated TO postgres;
GRANT service_role TO postgres;
CREATE OR REPLACE FUNCTION public.is_compliance_reader() RETURNS boolean LANGUAGE sql STABLE AS $fn$ SELECT false $fn$;
DO $enum$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nda_status') THEN
    CREATE TYPE public.nda_status AS ENUM ('on_file', 'missing');
  END IF;
END $enum$;
CREATE TABLE public.profiles (id uuid, role text, touch int DEFAULT 0);
CREATE TABLE public.ai_insights (user_id uuid, touch int DEFAULT 0);
CREATE TABLE public.naturopath_profiles (user_id uuid, touch int DEFAULT 0);
CREATE TABLE public.nutrition_logs (user_id uuid, touch int DEFAULT 0);
CREATE TABLE public.recommendations (user_id uuid, touch int DEFAULT 0);
CREATE TABLE public.body_tracker_activity (user_id uuid, touch int DEFAULT 0);
CREATE TABLE public.assessment_results (user_id uuid, touch int DEFAULT 0);
CREATE TABLE public.body_photo_sessions (user_id uuid, touch int DEFAULT 0);
CREATE TABLE public.photo_share_permissions (photo_session_user_id uuid, touch int DEFAULT 0);
CREATE TABLE public.audit_logs (id uuid, touch int DEFAULT 0);
CREATE TABLE public.approver_assignments (id uuid, touch int DEFAULT 0);
CREATE TABLE public.aggregation_snapshots (id uuid, touch int DEFAULT 0);
CREATE TABLE public.appeal_agreement_rollups (id uuid, touch int DEFAULT 0);
CREATE TABLE public.appeal_patterns (id uuid, touch int DEFAULT 0);
CREATE TABLE public.marketing_copy_conversions (id uuid, touch int DEFAULT 0);
CREATE TABLE public.appeal_analyses (id uuid, touch int DEFAULT 0);
CREATE TABLE public.bundles (id uuid, touch int DEFAULT 0);
CREATE TABLE public.email_otps (id uuid, touch int DEFAULT 0);
CREATE TABLE public.herbs (id uuid, touch int DEFAULT 0);
CREATE TABLE public.forecast_monthly (id uuid, touch int DEFAULT 0);
CREATE TABLE public.rewards (id uuid, touch int DEFAULT 0);
CREATE TABLE public.executive_recommendations (id uuid, touch int DEFAULT 0);
CREATE TABLE public.verification_codes (email text, touch int DEFAULT 0);
CREATE TABLE public.advisor_peptide_shares (patient_id uuid, practitioner_id uuid, peptide_name text, original_question text, advisor_response text, status text, touch int DEFAULT 0);
CREATE TABLE public.protocol_shares (patient_id uuid, provider_id uuid, status text);
CREATE TABLE public.botanical_formulas (id uuid, practitioner_id uuid, touch int DEFAULT 0);
CREATE TABLE public.botanical_formula_items (id uuid, formula_id uuid, touch int DEFAULT 0);
CREATE TABLE public.board_members (member_id uuid, auth_user_id uuid, departure_date date, nda_status public.nda_status);
CREATE TABLE public.board_pack_distributions (distribution_id uuid, pack_id uuid, member_id uuid, access_revoked_at timestamptz);
CREATE TABLE public.board_packs (pack_id uuid, touch int DEFAULT 0);
CREATE TABLE public.board_pack_download_events (distribution_id uuid, touch int DEFAULT 0);
CREATE TABLE public.protocols (id uuid, user_id uuid);
CREATE TABLE public.protocol_ingredients (protocol_id uuid, touch int DEFAULT 0);
CREATE TABLE public.soc2_auditor_grants (auditor_email text, revoked boolean, touch int DEFAULT 0);
CREATE TABLE public.proof_sentinel (id int);
${sample.map((policy) => createPolicySql(policy)).join('\n')}
INSERT INTO public.profiles (id, role) VALUES ('${OWNER}', 'consumer'), ('${ADMIN}', 'admin');
INSERT INTO public.ai_insights (user_id) VALUES ('${OWNER}');
INSERT INTO public.naturopath_profiles (user_id) VALUES ('${OWNER}');
INSERT INTO public.nutrition_logs (user_id) VALUES ('${OWNER}');
INSERT INTO public.recommendations (user_id) VALUES ('${OWNER}');
INSERT INTO public.body_tracker_activity (user_id) VALUES ('${OWNER}');
INSERT INTO public.assessment_results (user_id) VALUES ('${OWNER}');
INSERT INTO public.body_photo_sessions (user_id) VALUES ('${OWNER}');
INSERT INTO public.photo_share_permissions (photo_session_user_id) VALUES ('${OWNER}');
INSERT INTO public.audit_logs (id) VALUES ('${ROW}');
INSERT INTO public.approver_assignments (id) VALUES ('${ROW}');
INSERT INTO public.aggregation_snapshots (id) VALUES ('${ROW}');
INSERT INTO public.appeal_agreement_rollups (id) VALUES ('${ROW}');
INSERT INTO public.appeal_patterns (id) VALUES ('${ROW}');
INSERT INTO public.marketing_copy_conversions (id) VALUES ('${ROW}');
INSERT INTO public.appeal_analyses (id) VALUES ('${ROW}');
INSERT INTO public.bundles (id) VALUES ('${ROW}');
INSERT INTO public.email_otps (id) VALUES ('${ROW}');
INSERT INTO public.herbs (id) VALUES ('${ROW}');
INSERT INTO public.forecast_monthly (id) VALUES ('${ROW}');
INSERT INTO public.rewards (id) VALUES ('${ROW}');
INSERT INTO public.executive_recommendations (id) VALUES ('${ROW}');
INSERT INTO public.verification_codes (email) VALUES ('owner@example.test');
INSERT INTO public.protocol_shares (patient_id, provider_id, status) VALUES ('${OWNER}', '${OTHER}', 'active');
INSERT INTO public.advisor_peptide_shares (patient_id, practitioner_id, peptide_name, original_question, advisor_response, status) VALUES ('${OWNER}', '${OTHER}', 'peptide', 'question', 'response', 'pending_review');
INSERT INTO public.botanical_formulas (id, practitioner_id) VALUES ('${FORMULA}', '${OWNER}');
INSERT INTO public.botanical_formula_items (id, formula_id) VALUES ('${ITEM}', '${FORMULA}');
INSERT INTO public.board_members (member_id, auth_user_id, departure_date, nda_status) VALUES ('${MEMBER}', '${OWNER}', NULL, 'on_file');
INSERT INTO public.board_pack_distributions (distribution_id, pack_id, member_id, access_revoked_at) VALUES ('${DIST}', '${PACK}', '${MEMBER}', NULL);
INSERT INTO public.board_packs (pack_id) VALUES ('${PACK}');
INSERT INTO public.board_pack_download_events (distribution_id) VALUES ('${DIST}');
INSERT INTO public.protocols (id, user_id) VALUES ('${PROTOCOL}', '${OWNER}');
INSERT INTO public.protocol_ingredients (protocol_id) VALUES ('${PROTOCOL}');
INSERT INTO public.soc2_auditor_grants (auditor_email, revoked) VALUES ('owner@example.test', false);
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_compliance_reader() TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.nda_status TO anon, authenticated, service_role;
DO $rls$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'proof_sentinel' AND tablename NOT IN ('protocol_shares', 'protocols', 'board_members', 'board_pack_distributions')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END
$rls$;
CREATE TABLE public.matrix_results (phase text, tbl text, actor text, op text, result text);
CREATE OR REPLACE FUNCTION public.run_cell(phase text, tbl text, actor text, dbrole name, claims text, op text, stmt text)
RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE
  n bigint;
  outcome text;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', coalesce(claims, ''), true);
    EXECUTE format('SET LOCAL ROLE %I', dbrole);
    IF op = 'select' THEN
      EXECUTE stmt INTO n;
      outcome := 'rows=' || n::text;
    ELSIF op = 'insert' THEN
      EXECUTE stmt;
      outcome := 'ok';
    ELSE
      EXECUTE stmt;
      GET DIAGNOSTICS n = ROW_COUNT;
      outcome := 'rows=' || n::text;
    END IF;
    RAISE EXCEPTION 'rollback_cell' USING ERRCODE = 'P0001';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      NULL;
    WHEN OTHERS THEN
      outcome := SQLSTATE;
  END;
  RESET ROLE;
  INSERT INTO public.matrix_results VALUES (phase, tbl, actor, op, outcome);
END
$fn$;
`;
  psql('flatten_proof', setup);
  psql('flatten_proof', matrixSql('before'));
  const beforeRows = psqlValue(
    'flatten_proof',
    "SELECT coalesce(string_agg(tbl || E'\\t' || actor || E'\\t' || op || E'\\t' || result, E'\\n' ORDER BY tbl, actor, op), '') FROM matrix_results WHERE phase = 'before'",
  ).split('\n').filter((row) => row.length > 0);
  const beforeMap = new Map<string, string>();
  for (const row of beforeRows) {
    const parts = row.split('\t');
    beforeMap.set(`${parts[0]}\t${parts[1]}\t${parts[2]}`, parts[3] ?? '');
  }
  expectCell(beforeMap, 'profiles', 'owner', 'select', 'rows=1');
  expectCell(beforeMap, 'profiles', 'other', 'select', 'rows=0');
  expectCell(beforeMap, 'profiles', 'anon', 'select', 'rows=0');
  expectCell(beforeMap, 'profiles', 'service', 'select', 'rows=2');
  expectCell(beforeMap, 'audit_logs', 'admin', 'select', 'rows=1');
  expectCell(beforeMap, 'audit_logs', 'owner', 'select', 'rows=0');
  expectCell(beforeMap, 'appeal_agreement_rollups', 'admin', 'select', 'rows=1');
  expectCell(beforeMap, 'appeal_agreement_rollups', 'owner', 'select', 'rows=0');
  expectCell(beforeMap, 'bundles', 'owner', 'select', 'rows=1');
  expectCell(beforeMap, 'bundles', 'admin', 'select', 'rows=0');
  expectCell(beforeMap, 'verification_codes', 'owner', 'select', 'rows=1');
  expectCell(beforeMap, 'verification_codes', 'other', 'select', 'rows=0');
  expectCell(beforeMap, 'advisor_peptide_shares', 'owner', 'select', 'rows=1');
  expectCell(beforeMap, 'advisor_peptide_shares', 'other', 'select', 'rows=1');
  expectCell(beforeMap, 'advisor_peptide_shares', 'anon', 'select', 'rows=0');
  expectCell(beforeMap, 'botanical_formulas', 'owner', 'select', 'rows=1');
  expectCell(beforeMap, 'botanical_formulas', 'other', 'select', 'rows=0');
  expectCell(beforeMap, 'board_packs', 'owner', 'select', 'rows=1');
  expectCell(beforeMap, 'board_packs', 'other', 'select', 'rows=0');
  expectCell(beforeMap, 'email_otps', 'owner', 'select', 'rows=0');
  expectCell(beforeMap, 'email_otps', 'service', 'select', 'rows=1');

  const apply = `BEGIN;\nSET LOCAL lock_timeout = '3s';\nSET LOCAL statement_timeout = '60s';\nSET LOCAL search_path TO ${searchPath};\n${chunks.join('\n\n')}\nCOMMIT;\n`;
  psql('flatten_proof', apply);
  psql('flatten_proof', matrixSql('after'));
  const afterRows = psqlValue(
    'flatten_proof',
    "SELECT coalesce(string_agg(tbl || E'\\t' || actor || E'\\t' || op || E'\\t' || result, E'\\n' ORDER BY tbl, actor, op), '') FROM matrix_results WHERE phase = 'after'",
  ).split('\n').filter((row) => row.length > 0);
  const afterMap = new Map<string, string>();
  let mismatches = 0;
  for (const row of afterRows) {
    const parts = row.split('\t');
    const key = `${parts[0]}\t${parts[1]}\t${parts[2]}`;
    const result = parts[3] ?? '';
    afterMap.set(key, result);
    if (beforeMap.get(key) !== result) mismatches += 1;
  }
  for (const key of beforeMap.keys()) {
    if (!afterMap.has(key)) mismatches += 1;
  }
  if (beforeRows.length !== TABLES.length * ACTORS.length * OPS.length) {
    throw new Error(`before cells ${beforeRows.length}`);
  }
  if (mismatches !== 0) throw new Error(`matrix mismatches ${mismatches}`);

  const afterJson = psqlValue(
    'flatten_proof',
    `SELECT coalesce(json_agg(json_build_object(
        'schemaname', schemaname,
        'tablename', tablename,
        'policyname', policyname,
        'permissive', permissive,
        'roles', roles,
        'cmd', cmd,
        'qual', qual,
        'with_check', with_check
      ) ORDER BY tablename, policyname), '[]'::json)::text
     FROM pg_policies
     WHERE schemaname = 'public'`,
  );
  const afterPolicies = JSON.parse(afterJson) as PolicyRow[];
  const compared = compareFlattenedPolicies(sample, afterPolicies, new Set());
  if (compared.mismatches.length > 0) {
    throw new Error(compared.mismatches.slice(0, 10).join('\n'));
  }

  const profiles = sample.find((policy) => policy.tablename === 'profiles' && policy.policyname === 'Users can view own profile');
  if (profiles === undefined || profiles.qual === null) throw new Error('profiles policy');
  const beforeMd5 = psqlValue(
    'flatten_proof',
    `SELECT md5(pg_get_expr(polqual, polrelid)) FROM pg_policy WHERE polrelid = 'public.profiles'::regclass AND polname = 'Users can view own profile'`,
  );
  const drift = psql(
    'flatten_proof',
    `BEGIN;\nSET LOCAL search_path TO ${searchPath};\nINSERT INTO public.proof_sentinel (id) VALUES (1);\nALTER POLICY ${quoteIdent(profiles.policyname)} ON public.profiles USING (false);\n${extractChunk(template, 'profiles', profiles.policyname)}\nCOMMIT;\n`,
    true,
  );
  if (drift.status === 0) throw new Error('drift guard did not fail');
  const driftText = `${drift.stdout}\n${drift.stderr}`;
  if (!driftText.includes('policy drift')) throw new Error(`drift error was not policy drift:\n${driftText}`);
  const sentinel = psqlValue('flatten_proof', 'SELECT count(*) FROM public.proof_sentinel');
  const afterMd5 = psqlValue(
    'flatten_proof',
    `SELECT md5(pg_get_expr(polqual, polrelid)) FROM pg_policy WHERE polrelid = 'public.profiles'::regclass AND polname = 'Users can view own profile'`,
  );
  if (sentinel !== '0') throw new Error(`sentinel remained ${sentinel}`);
  if (afterMd5 !== beforeMd5) throw new Error(`policy md5 changed across rolled-back drift ${beforeMd5} -> ${afterMd5}`);

  writeFileSync(path.join(outDir, '2026-09-26-flatten-matrix-before.md'), renderMatrix('before', beforeRows));
  writeFileSync(path.join(outDir, '2026-09-26-flatten-matrix-after.md'), renderMatrix('after', afterRows));
  process.stdout.write(
    `${JSON.stringify({
      policies: sample.length,
      tables: TABLES.length,
      cells: beforeRows.length,
      mismatches,
      expressionCompared: compared.compared,
      intendedExpressionChanges: compared.intendedChanges,
      expressionMismatches: compared.mismatches.length,
      driftRaised: true,
      driftRolledBack: true,
      sentinel,
    })}\n`,
  );
}

main();
