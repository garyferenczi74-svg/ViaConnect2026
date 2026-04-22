// Photo Sync prompt #110 §5.5: SNP asset upload helper.
//
// Run:
//   npx tsx scripts/upload-snp-assets.ts --source ./incoming-snp-assets --dry-run
//   npx tsx scripts/upload-snp-assets.ts --source ./incoming-snp-assets --apply
//
// Options:
//   --source <dir>      directory of .webp (or .png with --allow-png) files
//                       to upload. Subfolder structure is preserved into
//                       the Products bucket (so services/foo.webp lands at
//                       Products/services/foo.webp).
//   --dry-run           default; no network writes
//   --apply             actually upload
//   --allow-png         accept .png alongside .webp (5MB / 50KB still enforced)
//   --overwrite         upsert=true; mandatory for replacing existing objects.
//                       Each overwrite is audit-logged with a note.
//   --no-auto-sync      skip the post-upload `sync --plan-file=... --apply`.
//                       Default behavior runs the sync automatically once
//                       all uploads succeed so the DB points at the new
//                       bucket objects in a single operational step.
//
// This is the ONLY script in #110 that writes to the bucket. Bucket write
// policy MUST remain admin-only. Service-role key required; scrubbed
// before any stdout write. Zero-byte / oversize / disallowed-mime files
// are rejected pre-flight so an accidental upload can't pollute the
// bucket. All actions go to /tmp/viaconnect/snp-upload-log-{ISO}.json.

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { getServiceRoleClient, AUDIT_OUT_DIR, nowIsoForFilename, safeLog } from './audit/_supabase-client';
import { PHOTO_BUCKET } from '../src/lib/photoSync/types';

interface CliFlags {
  source: string | null;
  apply: boolean;
  allow_png: boolean;
  overwrite: boolean;
  auto_sync: boolean;
}

function parseFlags(argv: ReadonlyArray<string>): CliFlags {
  const flags: CliFlags = { source: null, apply: false, allow_png: false, overwrite: false, auto_sync: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') flags.apply = true;
    else if (a === '--dry-run') flags.apply = false;
    else if (a === '--allow-png') flags.allow_png = true;
    else if (a === '--overwrite') flags.overwrite = true;
    else if (a === '--no-auto-sync') flags.auto_sync = false;
    else if (a === '--source') flags.source = argv[++i];
    else if (a.startsWith('--source=')) flags.source = a.slice('--source='.length);
  }
  return flags;
}

const FILENAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*\.webp$/;
const FILENAME_PNG_RE = /^[a-z0-9]+(-[a-z0-9]+)*\.png$/;
const MIN_BYTES = 50 * 1024;
const MAX_BYTES = 5 * 1024 * 1024;

function* walk(dir: string): Generator<string> {
  let entries: ReadonlyArray<{ name: string; isDir: boolean }>;
  try {
    entries = readdirSync(dir, { withFileTypes: true }).map((e) => ({ name: e.name, isDir: e.isDirectory() }));
  } catch (e) {
    throw new Error(`cannot read --source ${dir}: ${(e as Error).message}`);
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDir) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

interface StagedFile {
  local_path: string;
  relative_path: string;      // path within --source, used as bucket key
  basename: string;
  size_bytes: number;
  mime_type: 'image/webp' | 'image/png';
}

interface StagedReject {
  local_path: string;
  reason: string;
}

function stage(sourceDir: string, allow_png: boolean): { accepted: StagedFile[]; rejected: StagedReject[] } {
  const accepted: StagedFile[] = [];
  const rejected: StagedReject[] = [];
  for (const full of walk(sourceDir)) {
    const relPath = relative(sourceDir, full).split(sep).join('/');
    const basename = relPath.split('/').pop() ?? relPath;
    const lower = basename.toLowerCase();

    let mime: StagedFile['mime_type'] | null = null;
    if (FILENAME_RE.test(lower)) mime = 'image/webp';
    else if (allow_png && FILENAME_PNG_RE.test(lower)) mime = 'image/png';

    if (!mime) {
      rejected.push({ local_path: full, reason: `filename '${basename}' does not match ^[a-z0-9]+(-[a-z0-9]+)*\\.(webp${allow_png ? '|png' : ''})$` });
      continue;
    }

    let size: number;
    try {
      size = statSync(full).size;
    } catch (e) {
      rejected.push({ local_path: full, reason: `stat failed: ${(e as Error).message}` });
      continue;
    }
    if (size <= 0) {
      rejected.push({ local_path: full, reason: 'zero-byte file' });
      continue;
    }
    if (size < MIN_BYTES) {
      rejected.push({ local_path: full, reason: `file too small: ${size} bytes < ${MIN_BYTES}` });
      continue;
    }
    if (size > MAX_BYTES) {
      rejected.push({ local_path: full, reason: `file too large: ${size} bytes > ${MAX_BYTES}` });
      continue;
    }

    accepted.push({ local_path: full, relative_path: relPath, basename, size_bytes: size, mime_type: mime });
  }
  return { accepted, rejected };
}

interface UploadResult {
  bucket_key: string;
  size_bytes: number;
  mime_type: string;
  outcome: 'uploaded' | 'overwritten' | 'skipped_exists' | 'error';
  error?: string;
  overwrite_used: boolean;
}

async function uploadOne(
  sb: ReturnType<typeof getServiceRoleClient>,
  f: StagedFile,
  overwrite: boolean,
): Promise<UploadResult> {
  const key = f.relative_path;
  let buffer: Buffer;
  try {
    buffer = readFileSync(f.local_path);
  } catch (e) {
    return { bucket_key: key, size_bytes: f.size_bytes, mime_type: f.mime_type, outcome: 'error', error: (e as Error).message, overwrite_used: false };
  }
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(key, buffer, {
    contentType: f.mime_type,
    cacheControl: '31536000',
    upsert: overwrite,
  });
  if (error) {
    // supabase-js returns "Duplicate" for existing keys when upsert=false.
    const msg = error.message ?? String(error);
    if (/duplicate|already exists/i.test(msg) && !overwrite) {
      return { bucket_key: key, size_bytes: f.size_bytes, mime_type: f.mime_type, outcome: 'skipped_exists', overwrite_used: false };
    }
    return { bucket_key: key, size_bytes: f.size_bytes, mime_type: f.mime_type, outcome: 'error', error: msg, overwrite_used: overwrite };
  }
  return {
    bucket_key: key,
    size_bytes: f.size_bytes,
    mime_type: f.mime_type,
    outcome: overwrite ? 'overwritten' : 'uploaded',
    overwrite_used: overwrite,
  };
}

async function autoSync(planFile: string | null): Promise<number> {
  return new Promise<number>((resolve) => {
    const args = ['tsx', 'scripts/sync-supplement-photos.ts', '--apply'];
    if (planFile) args.push(`--plan-file=${planFile}`);
    args.push('--category=SNP');
    safeLog(`auto-sync: npx ${args.join(' ')}`);
    const p = spawn('npx', args, { stdio: 'inherit' });
    p.on('exit', (code) => resolve(code ?? 1));
    p.on('error', () => resolve(1));
  });
}

function pickLatestSnpPlan(): string | null {
  let entries: string[];
  try {
    entries = readdirSync(AUDIT_OUT_DIR);
  } catch {
    return null;
  }
  const matches = entries.filter((f) => f.startsWith('snp-plan-') && f.endsWith('.json')).sort().reverse();
  return matches.length === 0 ? null : join(AUDIT_OUT_DIR, matches[0]);
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  if (!flags.source) {
    process.stderr.write('upload-snp-assets: --source <dir> is required.\n');
    process.exit(2);
  }

  const { accepted, rejected } = stage(flags.source, flags.allow_png);
  safeLog(`upload-snp-assets: ${accepted.length} accepted, ${rejected.length} rejected from ${flags.source}`);

  if (rejected.length > 0) {
    safeLog('---- rejected files ----');
    for (const r of rejected) safeLog(`  ${r.local_path}: ${r.reason}`);
  }

  if (accepted.length === 0) {
    safeLog('upload-snp-assets: nothing to upload; exiting cleanly.');
    return;
  }

  safeLog('---- upload plan ----');
  for (const f of accepted) {
    safeLog(`  ${f.relative_path.padEnd(40)}  ${Math.round(f.size_bytes / 1024)}KB  ${f.mime_type}`);
  }

  if (!flags.apply) {
    safeLog(`upload-snp-assets: DRY RUN; ${accepted.length} uploads would happen. Re-run with --apply to upload.`);
    return;
  }

  if (flags.overwrite) {
    safeLog('WARNING: --overwrite is active. Existing objects in the Products bucket will be replaced. Every overwrite is logged.');
  }

  const sb = getServiceRoleClient();
  const results: UploadResult[] = [];
  for (const f of accepted) {
    const res = await uploadOne(sb, f, flags.overwrite);
    const tone = res.outcome === 'uploaded' || res.outcome === 'overwritten' ? 'ok' : res.outcome === 'skipped_exists' ? 'skip' : 'err';
    safeLog(`  [${tone}] ${res.bucket_key.padEnd(40)} ${res.outcome}${res.error ? `: ${res.error}` : ''}`);
    results.push(res);
  }

  const log = {
    generated_at: new Date().toISOString(),
    bucket: PHOTO_BUCKET,
    source: flags.source,
    overwrite_used: flags.overwrite,
    counts: {
      accepted: accepted.length,
      rejected: rejected.length,
      uploaded: results.filter((r) => r.outcome === 'uploaded').length,
      overwritten: results.filter((r) => r.outcome === 'overwritten').length,
      skipped_exists: results.filter((r) => r.outcome === 'skipped_exists').length,
      error: results.filter((r) => r.outcome === 'error').length,
    },
    accepted,
    rejected,
    results,
  };
  mkdirSync(AUDIT_OUT_DIR, { recursive: true });
  const logOut = join(AUDIT_OUT_DIR, `snp-upload-log-${nowIsoForFilename()}.json`);
  writeFileSync(logOut, JSON.stringify(log, null, 2));
  safeLog(`upload-snp-assets: wrote ${logOut}`);

  const errorCount = results.filter((r) => r.outcome === 'error').length;
  if (errorCount > 0) {
    process.stderr.write(`upload-snp-assets: ${errorCount} uploads errored; auto-sync skipped. Inspect the log.\n`);
    process.exit(3);
  }

  if (!flags.auto_sync) {
    safeLog('upload-snp-assets: --no-auto-sync set; run the sync manually when ready.');
    return;
  }

  // Re-run reality-check + mapping before sync so the plan reflects the
  // freshly-uploaded assets. The mapping script emits snp-plan-*.json
  // which feeds into sync via --plan-file.
  safeLog('auto-sync: regenerating reality-check + mapping plan...');
  const rc = await new Promise<number>((resolve) => {
    const p = spawn('npx', ['tsx', 'scripts/audit/snp-bucket-reality-check.ts'], { stdio: 'inherit' });
    p.on('exit', (code) => resolve(code ?? 1));
  });
  if (rc !== 0) {
    process.stderr.write('auto-sync: reality-check failed; not proceeding to mapping/sync.\n');
    process.exit(4);
  }
  const mc = await new Promise<number>((resolve) => {
    const p = spawn('npx', ['tsx', 'scripts/audit/snp-filename-mapping.ts'], { stdio: 'inherit' });
    p.on('exit', (code) => resolve(code ?? 1));
  });
  if (mc !== 0) {
    process.stderr.write('auto-sync: mapping failed; not proceeding to sync.\n');
    process.exit(5);
  }

  const planFile = pickLatestSnpPlan();
  const syncCode = await autoSync(planFile);
  if (syncCode !== 0) {
    process.stderr.write(`auto-sync: sync exited ${syncCode}; review the audit table and rerun if needed.\n`);
    process.exit(syncCode);
  }
  safeLog('upload-snp-assets: upload + auto-sync complete.');
}

main().catch((e: unknown) => {
  process.stderr.write(`upload-snp-assets failed: ${(e as Error).message}\n`);
  process.exit(2);
});
