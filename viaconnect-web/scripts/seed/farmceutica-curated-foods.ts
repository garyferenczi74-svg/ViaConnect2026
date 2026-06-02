// Prompt 170b Workstream A: farmceutica_curated_foods seed script.
//
// Reads data/seed/farmceutica_curated_foods.csv (Gordon-authored, ~200
// rows across 9 cuisine buckets per spec section 3.2) and upserts each
// row into the live Supabase project. Idempotent on (name, cuisine_tag)
// via the unique index from migration 20260601000060.
//
// Run with:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/seed/farmceutica-curated-foods.ts
//
// Per Gary 2026-06-01 Prompt 170b Ask #1 ratification: no papaparse dep;
// the hand-rolled parseCSV lives at scripts/seed/lib/csv-parse.ts.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCSV } from './lib/csv-parse';

const SEED_PATH = path.resolve('data/seed/farmceutica_curated_foods.csv');

const REQUIRED_HEADERS = [
  'name',
  'cuisine_tag',
  'density_g_per_ml',
  'per_100g_kcal',
  'per_100g_protein_g',
  'per_100g_carbs_g',
  'per_100g_fat_g',
  'per_100g_fiber_g',
  'per_100g_sugar_g',
  'per_100g_sodium_mg',
  'per_100g_cholesterol_mg',
  'micronutrients_per_100g_json',
  'notes',
] as const;

interface CuratedFoodPayload {
  name: string;
  cuisine_tag: string;
  density_g_per_ml: number | null;
  per_100g_kcal: number;
  per_100g_protein_g: number;
  per_100g_carbs_g: number;
  per_100g_fat_g: number;
  per_100g_fiber_g: number;
  per_100g_sugar_g: number;
  per_100g_sodium_mg: number;
  per_100g_cholesterol_mg: number;
  micronutrients_per_100g_json: Record<string, number>;
  notes: string;
}

function num(v: string, field: string, rowName: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid number for ${field} on row "${rowName}": ${JSON.stringify(v)}`);
  }
  return n;
}

function optNum(v: string): number | null {
  if (v === '' || v.toLowerCase() === 'null') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) not set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');

  const csv = readFileSync(SEED_PATH, 'utf8');
  const { headers, rows } = parseCSV(csv);

  for (const r of REQUIRED_HEADERS) {
    if (!headers.includes(r)) {
      throw new Error(`Missing required header in CSV: ${r}`);
    }
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let inserted = 0;
  let failed = 0;

  for (const row of rows) {
    const name = (row.name ?? '').trim();
    const cuisine_tag = (row.cuisine_tag ?? '').trim();
    if (name.length === 0 || cuisine_tag.length === 0) {
      // eslint-disable-next-line no-console
      console.error(`Row missing name or cuisine_tag; skipping: ${JSON.stringify(row)}`);
      failed++;
      continue;
    }
    try {
      const payload: CuratedFoodPayload = {
        name,
        cuisine_tag,
        density_g_per_ml: optNum(row.density_g_per_ml ?? ''),
        per_100g_kcal: num(row.per_100g_kcal ?? '', 'per_100g_kcal', name),
        per_100g_protein_g: num(row.per_100g_protein_g ?? '', 'per_100g_protein_g', name),
        per_100g_carbs_g: num(row.per_100g_carbs_g ?? '', 'per_100g_carbs_g', name),
        per_100g_fat_g: num(row.per_100g_fat_g ?? '', 'per_100g_fat_g', name),
        per_100g_fiber_g: num(row.per_100g_fiber_g ?? '', 'per_100g_fiber_g', name),
        per_100g_sugar_g: num(row.per_100g_sugar_g ?? '', 'per_100g_sugar_g', name),
        per_100g_sodium_mg: num(row.per_100g_sodium_mg ?? '', 'per_100g_sodium_mg', name),
        per_100g_cholesterol_mg: num(row.per_100g_cholesterol_mg ?? '', 'per_100g_cholesterol_mg', name),
        micronutrients_per_100g_json: JSON.parse(row.micronutrients_per_100g_json || '{}'),
        notes: (row.notes ?? '').trim(),
      };
      const { error } = await supabase
        .from('farmceutica_curated_foods')
        .upsert(payload, { onConflict: 'name,cuisine_tag' });
      if (error) {
        // eslint-disable-next-line no-console
        console.error(`Upsert failed for "${name}" / ${cuisine_tag}: ${error.message}`);
        failed++;
      } else {
        inserted++;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Row failed for "${name}": ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${inserted} curated foods. ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error:', err);
  process.exit(1);
});
