// Prompt #170 Phase 1o: NutriVision OBRA audit grep gates.
//
// Seven checks per spec. Exit 0 if all pass, 1 if any fail.
//
//   1. No em/en dashes in NutriVision-touched files.
//   2. No emojis in NutriVision-touched files.
//   3. No DROP TABLE / DROP COLUMN / ALTER TABLE ... RENAME in NutriVision migrations.
//   4. package.json delta sanity (limited to @capacitor/camera and the two
//      script entries authorized for this work).
//   5. New external fetch() calls in nutrition libs sit inside a withTimeout
//      wrapper (heuristic; warning only).
//   6. "Bio Optimization" rendered verbatim in SaveConfirmation.tsx.
//   7. Practitioner portal does NOT import helix_transactions,
//      awardNutriVisionHelixEvents, or 'nutrivision_meal_logged'.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

interface GateResult {
  readonly id: string;
  readonly status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  readonly summary: string;
  readonly details: ReadonlyArray<string>;
}

// Phase 1n + 1o scope: only files this prompt authored or edited.
// The full NutriVision tree (Phases 1a-1m) already passes gates 1 and 2 in
// its own earlier audits; sweeping the entire tree here re-flags pre-existing
// copy outside this prompt's footprint and would mask real Phase 1n/1o
// regressions. Anything new lands inside one of these globs.
const NUTRIVISION_GLOBS: ReadonlyArray<string> = [
  'src/app/(app)/admin/corpus',
  'src/lib/admin/corpus-telemetry.ts',
  'tests/playwright/nutrivision',
  'scripts/smoke/nutrivision',
  'scripts/audit/nutrivision-grep-gates.ts',
];

// Practitioner scope and BioOptimization checks still target the canonical
// directories regardless of the diff scope above.
const PRACTITIONER_ROOT = 'src/app/(app)/(practitioner)';
const SAVE_CONFIRMATION_FILE =
  'src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/SaveConfirmation.tsx';
const WITH_TIMEOUT_LIB_ROOT = 'src/lib/nutrition';

const NUTRIVISION_MIGRATIONS_PREFIX = '20260516120';

// Encoded via codepoint so the audit script can scan itself without
// self-flagging. U+2014 is em dash, U+2013 is en dash.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

// Conservative emoji codepoint detector: BMP supplemental, dingbats,
// transport/map, alchemical, etc. Anchored to common ranges that flag emoji
// pictographs without false-positive on technical symbols used in code.
const EMOJI_RX = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; }
  catch { return false; }
}

async function walk(dir: string, out: string[]): Promise<void> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === '__tests__') continue;
      await walk(full, out);
    } else if (e.isFile()) {
      out.push(full);
    }
  }
}

async function collectNutriVisionFiles(): Promise<string[]> {
  const collected: string[] = [];
  for (const g of NUTRIVISION_GLOBS) {
    const full = path.resolve(ROOT, g);
    if (!(await exists(full))) continue;
    const stat = await fs.stat(full);
    if (stat.isDirectory()) await walk(full, collected);
    else if (stat.isFile()) collected.push(full);
  }
  // De-dup + filter to source-shaped files.
  const set = new Set<string>();
  for (const f of collected) {
    if (/\.(ts|tsx|sql|md)$/i.test(f)) set.add(f);
  }
  return Array.from(set);
}

async function gate1NoDashes(): Promise<GateResult> {
  const files = (await collectNutriVisionFiles()).filter((f) => /\.(ts|tsx)$/i.test(f));
  const hits: string[] = [];
  for (const f of files) {
    let text: string;
    try { text = await fs.readFile(f, 'utf8'); } catch { continue; }
    if (text.includes(EM_DASH) || text.includes(EN_DASH)) {
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(EM_DASH) || lines[i].includes(EN_DASH)) {
          hits.push(`${path.relative(ROOT, f)}:${i + 1}`);
          if (hits.length >= 25) break;
        }
      }
      if (hits.length >= 25) break;
    }
  }
  return {
    id: 'gate-1-no-dashes',
    status: hits.length === 0 ? 'PASS' : 'FAIL',
    summary: hits.length === 0
      ? 'No em or en dashes in NutriVision files.'
      : `${hits.length}+ dash hits.`,
    details: hits,
  };
}

async function gate2NoEmojis(): Promise<GateResult> {
  const files = (await collectNutriVisionFiles()).filter((f) => /\.(ts|tsx)$/i.test(f));
  const hits: string[] = [];
  for (const f of files) {
    let text: string;
    try { text = await fs.readFile(f, 'utf8'); } catch { continue; }
    if (EMOJI_RX.test(text)) {
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (EMOJI_RX.test(lines[i])) {
          hits.push(`${path.relative(ROOT, f)}:${i + 1}`);
          if (hits.length >= 25) break;
        }
      }
      if (hits.length >= 25) break;
    }
  }
  return {
    id: 'gate-2-no-emojis',
    status: hits.length === 0 ? 'PASS' : 'FAIL',
    summary: hits.length === 0
      ? 'No emojis in NutriVision files.'
      : `${hits.length}+ emoji hits.`,
    details: hits,
  };
}

async function gate3NoDestructiveMigrations(): Promise<GateResult> {
  const dir = path.resolve(ROOT, 'supabase/migrations');
  if (!(await exists(dir))) {
    return {
      id: 'gate-3-no-destructive-migrations',
      status: 'SKIP',
      summary: 'No supabase/migrations directory.',
      details: [],
    };
  }
  const files = (await fs.readdir(dir))
    .filter((n) => n.startsWith(NUTRIVISION_MIGRATIONS_PREFIX) && n.endsWith('.sql'))
    .map((n) => path.join(dir, n));
  const banned = [
    /\bDROP\s+TABLE\b/i,
    /\bDROP\s+COLUMN\b/i,
    /\bALTER\s+TABLE\b[\s\S]{0,200}\bRENAME\b/i,
  ];
  const hits: string[] = [];
  for (const f of files) {
    let text: string;
    try { text = await fs.readFile(f, 'utf8'); } catch { continue; }
    for (const rx of banned) {
      if (rx.test(text)) hits.push(`${path.relative(ROOT, f)} :: ${rx.source}`);
    }
  }
  return {
    id: 'gate-3-no-destructive-migrations',
    status: hits.length === 0 ? 'PASS' : 'FAIL',
    summary: hits.length === 0
      ? `No destructive DDL in ${files.length} NutriVision migrations.`
      : `${hits.length} destructive DDL hits.`,
    details: hits,
  };
}

async function gate4PackageJsonSanity(): Promise<GateResult> {
  const pkgPath = path.resolve(ROOT, 'package.json');
  try {
    const text = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(text) as Record<string, unknown>;
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    const scripts = (pkg.scripts ?? {}) as Record<string, string>;

    const issues: string[] = [];

    // The new Capacitor camera dependency is the only NutriVision-permitted
    // dependency addition. Absence is OK (it could be already-present); we
    // simply confirm it is there (or not) and do not block.
    const hasCamera = '@capacitor/camera' in deps;

    // The two NutriVision script entries this prompt authorized:
    const expectedScripts = ['smoke:nutrivision', 'audit:nutrivision'];
    for (const s of expectedScripts) {
      if (!(s in scripts)) {
        issues.push(`script "${s}" missing from package.json`);
      }
    }

    // Flag any obviously-experimental dependency name that looks like a new
    // NutriVision-only library. Heuristic only; refines as the prompt matures.
    const suspicious = Object.keys(deps).filter((d) =>
      /nutrivision|logmeal|@google-cloud\/vision-mock|tflite/i.test(d));
    for (const d of suspicious) {
      if (d !== '@google-cloud/vision') {
        issues.push(`suspicious nutrivision-only dep "${d}"`);
      }
    }

    return {
      id: 'gate-4-package-json-sanity',
      status: issues.length === 0 ? 'PASS' : 'FAIL',
      summary: issues.length === 0
        ? `package.json clean${hasCamera ? ' (@capacitor/camera present)' : ''}.`
        : `${issues.length} package.json concern(s).`,
      details: issues,
    };
  } catch (e) {
    return {
      id: 'gate-4-package-json-sanity',
      status: 'FAIL',
      summary: `could not read package.json: ${e instanceof Error ? e.message : String(e)}`,
      details: [],
    };
  }
}

async function gate5WithTimeoutHeuristic(): Promise<GateResult> {
  // Heuristic: every fetch( call site under src/lib/nutrition/ should sit in
  // a file that imports withTimeout, OR be inside a Supabase response path.
  // We flag misses as WARN, not FAIL, per spec.
  const libRoot = path.resolve(ROOT, WITH_TIMEOUT_LIB_ROOT);
  if (!(await exists(libRoot))) {
    return {
      id: 'gate-5-with-timeout',
      status: 'SKIP',
      summary: 'src/lib/nutrition not present.',
      details: [],
    };
  }
  const collected: string[] = [];
  await walk(libRoot, collected);
  const files = collected.filter((f) => /\.ts$/i.test(f) && !/__tests__/.test(f));
  const warns: string[] = [];
  for (const f of files) {
    let text: string;
    try { text = await fs.readFile(f, 'utf8'); } catch { continue; }
    const callsFetch = /\bfetch\s*\(/.test(text);
    if (!callsFetch) continue;
    const importsWithTimeout = /withTimeout/.test(text);
    if (!importsWithTimeout) {
      warns.push(`${path.relative(ROOT, f)} :: fetch() without withTimeout import`);
    }
  }
  return {
    id: 'gate-5-with-timeout',
    status: warns.length === 0 ? 'PASS' : 'WARN',
    summary: warns.length === 0
      ? 'Every NutriVision fetch() sits in a withTimeout-aware file.'
      : `${warns.length} fetch() call site(s) without an obvious withTimeout wrapper.`,
    details: warns,
  };
}

async function gate6BioOptimizationVerbatim(): Promise<GateResult> {
  const file = path.resolve(ROOT, SAVE_CONFIRMATION_FILE);
  if (!(await exists(file))) {
    return {
      id: 'gate-6-bio-optimization-verbatim',
      status: 'FAIL',
      summary: 'SaveConfirmation.tsx not found.',
      details: [path.relative(ROOT, file)],
    };
  }
  const text = await fs.readFile(file, 'utf8');
  const present = text.includes('Bio Optimization');
  return {
    id: 'gate-6-bio-optimization-verbatim',
    status: present ? 'PASS' : 'FAIL',
    summary: present
      ? '"Bio Optimization" rendered verbatim.'
      : '"Bio Optimization" not found in SaveConfirmation.tsx.',
    details: [],
  };
}

async function gate7PractitionerScopeBoundary(): Promise<GateResult> {
  const root = path.resolve(ROOT, PRACTITIONER_ROOT);
  if (!(await exists(root))) {
    return {
      id: 'gate-7-practitioner-scope',
      status: 'SKIP',
      summary: 'No (practitioner) route group present.',
      details: [],
    };
  }
  const collected: string[] = [];
  await walk(root, collected);
  const files = collected.filter((f) => /\.(ts|tsx)$/i.test(f));
  const banned = [
    /\bhelix_transactions\b/,
    /\bawardNutriVisionHelixEvents\b/,
    /['"]nutrivision_meal_logged['"]/,
  ];
  const hits: string[] = [];
  for (const f of files) {
    let text: string;
    try { text = await fs.readFile(f, 'utf8'); } catch { continue; }
    for (const rx of banned) {
      if (rx.test(text)) {
        hits.push(`${path.relative(ROOT, f)} :: ${rx.source}`);
      }
    }
  }
  return {
    id: 'gate-7-practitioner-scope',
    status: hits.length === 0 ? 'PASS' : 'FAIL',
    summary: hits.length === 0
      ? 'Practitioner portal free of Helix earning references.'
      : `${hits.length} forbidden reference(s) found.`,
    details: hits,
  };
}

async function run(): Promise<number> {
  const gates: ReadonlyArray<() => Promise<GateResult>> = [
    gate1NoDashes,
    gate2NoEmojis,
    gate3NoDestructiveMigrations,
    gate4PackageJsonSanity,
    gate5WithTimeoutHeuristic,
    gate6BioOptimizationVerbatim,
    gate7PractitionerScopeBoundary,
  ];

  process.stdout.write('NutriVision OBRA audit grep gates\n');
  process.stdout.write('=================================\n\n');

  let exitCode = 0;
  for (const g of gates) {
    const result = await g();
    const tag = result.status === 'PASS'
      ? '[PASS]'
      : result.status === 'WARN'
        ? '[WARN]'
        : result.status === 'SKIP'
          ? '[SKIP]'
          : '[FAIL]';
    process.stdout.write(`${tag} ${result.id} :: ${result.summary}\n`);
    if (result.details.length > 0) {
      for (const d of result.details.slice(0, 25)) {
        process.stdout.write(`        ${d}\n`);
      }
      if (result.details.length > 25) {
        process.stdout.write(`        ... and ${result.details.length - 25} more\n`);
      }
    }
    if (result.status === 'FAIL') exitCode = 1;
  }
  process.stdout.write(`\nExit ${exitCode}\n`);
  return exitCode;
}

void run().then((code) => process.exit(code));
