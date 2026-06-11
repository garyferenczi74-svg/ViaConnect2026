// Prompt 186: assemble the recorded FDC fixture JSONs into the committed TS
// module the golden-meal regression suite imports. Re-run after adding new
// recordings: node scripts/186/build-fixture-module.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, 'fixtures');
const outPath = join(here, '..', '..', 'src', 'lib', 'nutrition', 'benchmark', 'fdc-recorded-fixtures.ts');

// Keys must match what normalizeQuery produces at lookup time (lowercase,
// whole-string depluralized: "cheerios" becomes "cheerio").
function normalizeKey(s) {
  let v = s.toLowerCase().trim();
  if (/(ses|xes|zes|ches|shes|oes)$/.test(v)) return v.slice(0, -2);
  if (v.endsWith('ies') && v.length > 4) return v.slice(0, -3) + 'y';
  if (v.endsWith('s') && !v.endsWith('ss')) return v.slice(0, -1);
  return v;
}

const searches = {};
const details = {};
for (const file of readdirSync(fixturesDir)) {
  if (!file.endsWith('.json')) continue;
  const data = JSON.parse(readFileSync(join(fixturesDir, file), 'utf8'));
  if (file.startsWith('search-')) {
    const key = normalizeKey(file.replace(/^search-/, '').replace(/\.json$/, '').replace(/-branded$/, '').replace(/-/g, ' '));
    searches[key] = data;
  } else if (file.startsWith('detail-')) {
    if (typeof data.fdcId === 'number') details[data.fdcId] = data;
  }
}

const banner = `// Prompt 186 Phase 4: REAL FoodData Central responses recorded on
// 2026-06-11 (slimmed to the fields the engine reads). The golden-meal
// regression suite routes fetch() through these so the REAL mapping,
// ranking, portion, and scaling code runs with zero live API calls.
// Regenerate with: node tmp/186/build-fixture-module.mjs (records live
// FDC responses; never hand-edit nutrient values).
//
// Searches recorded with dataType Foundation, SR Legacy, Survey (FNDDS),
// pageSize 25. Details via /food/{fdcId}.

/* eslint-disable */
`;

const body = `export const FDC_RECORDED_SEARCHES: Record<string, { totalHits: number; foods: Array<{ fdcId: number; description: string; dataType?: string; score?: number }> }> = ${JSON.stringify(searches, null, 2)};

export const FDC_RECORDED_DETAILS: Record<number, unknown> = ${JSON.stringify(details, null, 2)};
`;

writeFileSync(outPath, banner + body);
console.log('wrote', outPath, 'searches:', Object.keys(searches).join(', '), '| details:', Object.keys(details).join(', '));
