// Prompt #170 Phase 1o: NutriVision analyze smoke harness.
//
// POSTs five fixture images to /api/nutrition/photo/analyze and prints the
// returned macro deltas alongside expected ranges per spec §13.3. The script
// is structural; it does NOT require real LogMeal / Gemini / Claude keys to
// run. When the analyze endpoint returns a 401, 502, or 503 we print a
// degraded-mode banner and continue with the next fixture so the harness is
// resilient to misconfigured local environments.
//
// Invocation:
//   NUTRIVISION_SMOKE_URL=http://localhost:3000 \
//     NUTRIVISION_SMOKE_BEARER=<jwt> \
//     npx tsx scripts/smoke/nutrivision/run.ts
//
// NUTRIVISION_SMOKE_BEARER is optional; if absent the harness sends without
// auth and the route will likely return 401, which the harness reports
// rather than crashing.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.NUTRIVISION_SMOKE_URL ?? 'http://localhost:3000';
const BEARER = process.env.NUTRIVISION_SMOKE_BEARER ?? '';
const TIMEOUT_MS = Number(process.env.NUTRIVISION_SMOKE_TIMEOUT_MS ?? 45_000);

interface MacroRange {
  readonly min: number;
  readonly max: number;
}

interface FixtureSpec {
  readonly file: string;
  readonly label: string;
  readonly expectedCalories: MacroRange;
  readonly expectedProteinG: MacroRange;
}

const FIXTURES: ReadonlyArray<FixtureSpec> = [
  {
    file: 'grilled-chicken-plate.jpg',
    label: 'Grilled chicken plate',
    expectedCalories: { min: 400, max: 750 },
    expectedProteinG: { min: 40, max: 80 },
  },
  {
    file: 'mixed-salad-with-dressing.jpg',
    label: 'Mixed salad with dressing',
    expectedCalories: { min: 200, max: 500 },
    expectedProteinG: { min: 5, max: 25 },
  },
  {
    file: 'ramen-bowl.jpg',
    label: 'Ramen bowl',
    expectedCalories: { min: 500, max: 900 },
    expectedProteinG: { min: 20, max: 45 },
  },
  {
    file: 'biryani.jpg',
    label: 'Biryani',
    expectedCalories: { min: 550, max: 950 },
    expectedProteinG: { min: 18, max: 40 },
  },
  {
    file: 'mixed-tapas.jpg',
    label: 'Mixed tapas',
    expectedCalories: { min: 400, max: 800 },
    expectedProteinG: { min: 15, max: 50 },
  },
];

const FIXTURE_DIR = path.resolve(process.cwd(), 'scripts/smoke/nutrivision/fixtures');

// 1x1 PNG (red pixel). Used as a placeholder when a real fixture file is
// missing. The recognition pipeline will return NO_RECOGNITION on these,
// which we tag clearly in the output.
const PLACEHOLDER_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

interface AnalyzeBody {
  readonly job_id?: string;
  readonly meal_draft?: {
    readonly items?: ReadonlyArray<unknown>;
    readonly meal_confidence?: number;
    readonly totals?: {
      readonly calories_kcal?: number;
      readonly protein_g?: number;
      readonly carbs_g?: number;
      readonly fat_g?: number;
    };
    readonly from_cache?: string;
    readonly providers_called?: ReadonlyArray<string>;
  };
  readonly error?: { readonly code?: string; readonly message?: string };
}

async function loadFixture(file: string): Promise<{ buf: Buffer; placeholder: boolean }> {
  const full = path.join(FIXTURE_DIR, file);
  try {
    const buf = await fs.readFile(full);
    if (buf.length < 200) {
      // Tiny on-disk file: treat as placeholder.
      return { buf, placeholder: true };
    }
    return { buf, placeholder: false };
  } catch {
    return { buf: Buffer.from(PLACEHOLDER_BASE64, 'base64'), placeholder: true };
  }
}

function uuidV4(): string {
  // Cheap deterministic-shape v4. Crypto polyfill is preferred when available.
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) out += '-';
    if (i === 12) { out += '4'; continue; }
    if (i === 16) { out += hex[8 + Math.floor(Math.random() * 4)]; continue; }
    out += hex[Math.floor(Math.random() * 16)];
  }
  return out;
}

async function postAnalyze(
  fixture: FixtureSpec,
  buf: Buffer,
  placeholder: boolean,
): Promise<void> {
  const form = new FormData();
  const ext = fixture.file.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  form.append(
    'image',
    new Blob([new Uint8Array(buf)], { type: mime }),
    fixture.file,
  );
  form.append('captured_at', new Date().toISOString());
  form.append('client_id', uuidV4());
  form.append('device_class', 'web');
  form.append('month_spend_usd_so_far', '0');

  const url = `${BASE_URL.replace(/\/$/, '')}/api/nutrition/photo/analyze`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {};
  if (BEARER) headers.Authorization = `Bearer ${BEARER}`;

  const startedAt = Date.now();
  let status = 0;
  let parsed: AnalyzeBody | null = null;
  let networkError: string | null = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers,
      signal: controller.signal,
    });
    status = res.status;
    parsed = (await res.json().catch(() => null)) as AnalyzeBody | null;
  } catch (e) {
    networkError = e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(timer);
  }

  const latency = Date.now() - startedAt;
  const placeholderTag = placeholder ? ' [PLACEHOLDER]' : '';
  const banner = `[${fixture.label}]${placeholderTag} latency=${latency}ms status=${status}`;

  if (networkError !== null) {
    process.stdout.write(`${banner} NETWORK_ERROR ${networkError}\n`);
    return;
  }
  if (status === 0 || parsed === null) {
    process.stdout.write(`${banner} NO_BODY\n`);
    return;
  }
  if (status === 401 || status === 403) {
    process.stdout.write(`${banner} DEGRADED auth missing; set NUTRIVISION_SMOKE_BEARER\n`);
    return;
  }
  if (status >= 500 || parsed.error) {
    const code = parsed.error?.code ?? 'UNKNOWN';
    const msg = parsed.error?.message ?? 'no message';
    process.stdout.write(`${banner} DEGRADED ${code} ${msg}\n`);
    return;
  }

  const draft = parsed.meal_draft;
  if (!draft) {
    process.stdout.write(`${banner} NO_DRAFT\n`);
    return;
  }
  const items = Array.isArray(draft.items) ? draft.items.length : 0;
  const confidence = typeof draft.meal_confidence === 'number'
    ? draft.meal_confidence.toFixed(2)
    : 'NA';
  const totals = draft.totals;
  const cal = typeof totals?.calories_kcal === 'number' ? totals.calories_kcal : 0;
  const protein = typeof totals?.protein_g === 'number' ? totals.protein_g : 0;
  const carbs = typeof totals?.carbs_g === 'number' ? totals.carbs_g : 0;
  const fat = typeof totals?.fat_g === 'number' ? totals.fat_g : 0;

  const calInBand = cal >= fixture.expectedCalories.min && cal <= fixture.expectedCalories.max;
  const proInBand = protein >= fixture.expectedProteinG.min && protein <= fixture.expectedProteinG.max;
  const calBand = `${fixture.expectedCalories.min}..${fixture.expectedCalories.max}`;
  const proBand = `${fixture.expectedProteinG.min}..${fixture.expectedProteinG.max}`;

  const calMark = placeholder ? 'SKIP' : (calInBand ? 'PASS' : 'WARN');
  const proMark = placeholder ? 'SKIP' : (proInBand ? 'PASS' : 'WARN');

  process.stdout.write(
    `${banner} items=${items} conf=${confidence} ` +
    `cal=${cal}kcal[${calBand}]:${calMark} ` +
    `protein=${protein}g[${proBand}]:${proMark} ` +
    `carbs=${carbs}g fat=${fat}g ` +
    `cache=${draft.from_cache ?? 'na'} providers=${(draft.providers_called ?? []).join(',')}\n`,
  );
}

async function main(): Promise<void> {
  process.stdout.write(`NutriVision smoke harness\n`);
  process.stdout.write(`Base URL:   ${BASE_URL}\n`);
  process.stdout.write(`Bearer:     ${BEARER ? 'set' : 'unset'}\n`);
  process.stdout.write(`Timeout:    ${TIMEOUT_MS}ms\n`);
  process.stdout.write(`Fixtures:   ${FIXTURES.length}\n`);
  process.stdout.write(`Fixture dir ${FIXTURE_DIR}\n\n`);

  for (const fixture of FIXTURES) {
    const { buf, placeholder } = await loadFixture(fixture.file);
    await postAnalyze(fixture, buf, placeholder);
  }
  process.stdout.write(`\nSmoke complete.\n`);
}

void main().catch((e) => {
  process.stderr.write(`Smoke harness crashed: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(2);
});
