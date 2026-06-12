// Prompt 186: record real FDC responses as slim fixtures for the golden-meal
// regression harness. Run once with: node scripts/186/fetch-fixtures.mjs
// DEMO_KEY is rate limited (30/hr); this script makes 9 calls with delays.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
const BASE = 'https://api.nal.usda.gov/fdc/v1';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slimSearch(json) {
  return {
    totalHits: json.totalHits,
    foods: (json.foods ?? []).map((f) => ({
      fdcId: f.fdcId,
      description: f.description,
      dataType: f.dataType,
      score: f.score,
    })),
  };
}

function slimDetail(json) {
  return {
    fdcId: json.fdcId,
    description: json.description,
    dataType: json.dataType,
    servingSize: json.servingSize,
    servingSizeUnit: json.servingSizeUnit,
    householdServingFullText: json.householdServingFullText,
    brandOwner: json.brandOwner,
    labelNutrients: json.labelNutrients,
    foodNutrients: (json.foodNutrients ?? [])
      .filter((n) => n?.nutrient?.id != null && typeof n.amount === 'number')
      .map((n) => ({
        nutrient: { id: n.nutrient.id, name: n.nutrient.name, unitName: n.nutrient.unitName },
        amount: n.amount,
      })),
    foodPortions: (json.foodPortions ?? []).map((p) => ({
      amount: p.amount,
      gramWeight: p.gramWeight,
      modifier: p.modifier,
      portionDescription: p.portionDescription,
      measureUnit: p.measureUnit ? { name: p.measureUnit.name } : undefined,
    })),
  };
}

async function get(path, name, slim) {
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FAIL ${name}: ${res.status}`);
    return null;
  }
  const json = await res.json();
  const out = slim(json);
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(out, null, 2));
  console.log(`OK ${name}`);
  return out;
}

const DT = 'dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)';

const searches = [
  [`/foods/search?query=avocado&${DT}&pageSize=25`, 'search-avocado'],
  [`/foods/search?query=apple&${DT}&pageSize=25`, 'search-apple'],
  [`/foods/search?query=egg&${DT}&pageSize=25`, 'search-egg'],
  [`/foods/search?query=sourdough%20bread&${DT}&pageSize=25`, 'search-sourdough-bread'],
  ['/foods/search?query=cheerios&dataType=Branded&pageSize=5', 'search-cheerios-branded'],
];

const run = async () => {
  const found = {};
  for (const [path, name] of searches) {
    found[name] = await get(path, name, slimSearch);
    await sleep(1200);
  }
  // Details: picked from the search lists where possible, else known stable ids.
  const eggWhole = found['search-egg']?.foods?.find((f) => /egg, whole, raw/i.test(f.description));
  const avocadoRaw = found['search-avocado']?.foods?.find((f) => /^avocados, raw/i.test(f.description));
  const appleRaw = found['search-apple']?.foods?.find((f) => /^apples, raw, with skin/i.test(f.description))
    ?? found['search-apple']?.foods?.find((f) => /^apples?, (red delicious|gala|fuji|honeycrisp|granny)/i.test(f.description));
  const cheerios = found['search-cheerios-branded']?.foods?.[0];
  const details = [
    [eggWhole?.fdcId ?? 748967, 'detail-egg-whole-raw'],
    [avocadoRaw?.fdcId ?? 171705, 'detail-avocado-raw'],
    [appleRaw?.fdcId ?? 171688, 'detail-apple-raw'],
    [cheerios?.fdcId, 'detail-cheerios-branded'],
  ];
  for (const [id, name] of details) {
    if (!id) { console.error(`SKIP ${name}: no id`); continue; }
    await get(`/food/${id}`, name, slimDetail);
    await sleep(1200);
  }
};

run().catch((e) => { console.error(e); process.exit(1); });
