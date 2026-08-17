/**
 * Prompt 221 Phase 2 C1: deterministic facts-only label extraction from
 * competitive product page text / markdown. Never invents doses; UNKNOWN when
 * unparseable. No LLM (budget-safe, fail-closed).
 */

export interface CompetitiveIngredientRow {
  ingredient_name: string;
  canonical_ingredient_id: string | null;
  dose_amount: number | null;
  dose_unit: string | null;
  form: string | null;
  dose_confidence: number;
  note?: string;
}

export interface CompetitiveLabelFacts {
  ingredient_rows: CompetitiveIngredientRow[];
  serving_size: string | null;
  servings_per_container: number | null;
  list_price: number | null;
  currency: string;
  price_per_serving: number | null;
  label_claims: string[];
  delivery_technology:
    | "liposomal"
    | "micellar"
    | "standard"
    | "softgel"
    | "powder"
    | "gummy"
    | "sublingual"
    | "other"
    | null;
  availability_note: string | null;
  /** 0-100 overall extraction confidence for the product shell. */
  extraction_confidence: number;
  parse_notes: string[];
}

const UNIT_PATTERN =
  "(mg|mcg|µg|ug|g|iu|IU|ml|mL|%\\s*DV|%DV|CFU|cfu)";

const DOSE_TAIL = new RegExp(
  `\\b(\\d{1,5}(?:\\.\\d{1,3})?)\\s*(${UNIT_PATTERN.replace(/%\\s*DV|%DV/g, "%\\s?DV")})\\b`,
  "i"
);

/** Common noise lines that are not ingredients. */
const SKIP_LINE =
  /^(supplement facts|amount per serving|daily value|% daily value|other ingredients|contains|directions|suggested use|warning|keep out|storage|manufactured|distributed|these statements|fda|serving size|servings per|calories|total fat|sodium|protein|carbohydrate|free shipping|add to cart|buy now|subscribe|reviews?|rating|sku:|item #|net wt|net weight|fl oz|shipping|promo|coupon|save \d)/i;

const SKIP_NAME =
  /^(net wt|net weight|fl oz|fluid ounce|calories?|total (fat|carb)|trans fat|cholesterol|dietary fiber|added sugars?|softgels? per serving|capsules? per serving|tablets? per serving|level teaspoons?|approx\.?|serving|several professional|source of dha)$/i;

const FORM_FROM_TEXT: Array<{ re: RegExp; form: string }> = [
  { re: /\bliposomal\b/i, form: "liposomal" },
  { re: /\bmicellar\b/i, form: "micellar" },
  { re: /\bsoftgels?\b/i, form: "softgel" },
  { re: /\bgummies\b|\bgummy\b/i, form: "gummy" },
  { re: /\bsublingual\b/i, form: "sublingual" },
  { re: /\bpowder\b/i, form: "powder" },
  { re: /\bcapsules?\b/i, form: "capsule" },
  { re: /\btablets?\b/i, form: "tablet" },
  { re: /\bliquid\b/i, form: "liquid" },
];

const DELIVERY_FROM_TEXT: Array<{
  re: RegExp;
  tech: CompetitiveLabelFacts["delivery_technology"];
}> = [
  { re: /\bliposomal\b/i, tech: "liposomal" },
  { re: /\bmicellar\b/i, tech: "micellar" },
  { re: /\bsoftgels?\b/i, tech: "softgel" },
  { re: /\bgummies\b|\bgummy\b/i, tech: "gummy" },
  { re: /\bsublingual\b/i, tech: "sublingual" },
  { re: /\bpowder\b/i, tech: "powder" },
];

function normalizeDashes(s: string): string {
  return s.replace(/[\u2013\u2014\u2010\u2011]/g, "-");
}

function formFromText(text: string): string | null {
  for (const { re, form } of FORM_FROM_TEXT) {
    if (re.test(text)) return form;
  }
  return null;
}

function deliveryFromText(
  text: string
): CompetitiveLabelFacts["delivery_technology"] {
  for (const { re, tech } of DELIVERY_FROM_TEXT) {
    if (re.test(text)) return tech;
  }
  return null;
}

function parseServingSize(text: string): string | null {
  const m = text.match(
    /serving size[:\s]+([^\n|]{2,60})/i
  );
  if (!m?.[1]) return null;
  return normalizeDashes(m[1]).replace(/\s+/g, " ").trim().slice(0, 80);
}

function parseServingsPerContainer(text: string): number | null {
  const m = text.match(
    /servings per (?:container|bottle|package)[:\s]+(\d{1,4})/i
  );
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function parsePrice(text: string): { list_price: number; currency: string } | null {
  // Prefer explicit USD / $ amounts near price labels
  const labeled = text.match(
    /(?:price|msrp|list price|our price)[:\s]*\$?\s*(\d{1,4}(?:\.\d{2})?)/i
  );
  if (labeled?.[1]) {
    const n = Number(labeled[1]);
    if (Number.isFinite(n) && n > 0 && n < 5000) {
      return { list_price: n, currency: "USD" };
    }
  }
  const dollar = text.match(/\$\s*(\d{1,4}\.\d{2})\b/);
  if (dollar?.[1]) {
    const n = Number(dollar[1]);
    if (Number.isFinite(n) && n > 0 && n < 5000) {
      return { list_price: n, currency: "USD" };
    }
  }
  return null;
}

function parseLabelClaims(text: string): string[] {
  const claims: string[] = [];
  const patterns = [
    /non[- ]?gmo/i,
    /gluten[- ]?free/i,
    /dairy[- ]?free/i,
    /soy[- ]?free/i,
    /vegan\b/i,
    /vegetarian\b/i,
    /third[- ]?party tested/i,
    /nsf certified/i,
    /usp verified/i,
    /organic\b/i,
    /kosher\b/i,
    /halal\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[0]) {
      const c = m[0].replace(/\s+/g, " ").trim().slice(0, 40);
      if (!claims.some((x) => x.toLowerCase() === c.toLowerCase())) {
        claims.push(c);
      }
    }
  }
  return claims.slice(0, 12);
}

function parseAvailability(text: string): string | null {
  if (/\bout of stock\b/i.test(text)) return "out_of_stock";
  if (/\bin stock\b/i.test(text)) return "in_stock";
  if (/\bpre[- ]?order\b/i.test(text)) return "preorder";
  if (/\bdiscontinued\b/i.test(text)) return "discontinued";
  return null;
}

/**
 * Parse a single line that looks like an ingredient + dose.
 * Examples:
 *   Vitamin D3 (as Cholecalciferol) 125 mcg
 *   Magnesium 200 mg
 *   Curcumin|500mg
 *   - Omega-3 Fatty Acids .... 650 mg
 */
export function parseIngredientLine(line: string): CompetitiveIngredientRow | null {
  const raw = normalizeDashes(line)
    // Strip markdown image / link wrappers: ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\|/g, " ")
    .replace(/\.{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (raw.length < 4 || raw.length > 200) return null;
  if (SKIP_LINE.test(raw)) return null;
  if (/^https?:\/\//i.test(raw)) return null;
  if (/\b(add to cart|buy now|subscribe|free shipping)\b/i.test(raw)) return null;

  // Require a dose somewhere on the line (facts-only; no bare names alone)
  const doseMatch = raw.match(DOSE_TAIL);
  if (!doseMatch) return null;

  const dose_amount = Number(doseMatch[1]);
  if (!Number.isFinite(dose_amount) || dose_amount <= 0 || dose_amount > 1_000_000) {
    return null;
  }
  let dose_unit = doseMatch[2].replace(/\s+/g, "").toLowerCase();
  if (dose_unit === "µg" || dose_unit === "ug") dose_unit = "mcg";
  if (dose_unit === "%dv" || dose_unit === "%dailyvalue") dose_unit = "%DV";
  if (dose_unit === "iu") dose_unit = "IU";
  if (dose_unit === "ml") dose_unit = "mL";
  if (dose_unit === "cfu") dose_unit = "CFU";

  const before = raw.slice(0, doseMatch.index ?? 0).trim();
  let name = before
    .replace(/^[-*•·!#]+\s*/, "")
    .replace(/^\[+|\]+$/g, "")
    .replace(/\s*[:\-]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!name || name.length < 2) return null;
  if (/^\d+$/.test(name)) return null;
  if (/^(amount|serving|daily|value|total|provides?|add)$/i.test(name)) return null;

  name = name
    .replace(/\b(best|miracle|cure|guaranteed|#1)\b/gi, "")
    .replace(/^\[+|\]+$/g, "")
    .replace(/^!+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  if (name.length < 2) return null;
  if (SKIP_NAME.test(name)) return null;
  if (/net\s*wt|fl\.?\s*oz|fluid ounce/i.test(raw)) return null;
  if (/calories?/i.test(name) && dose_unit === "g") return null;
  if (/teaspoons?|tablespoons?|per serving|approx/i.test(name) && !/\b(vitamin|mineral|magnesium|calcium|omega|curcumin|folate|b\d|zinc|iron|epa|dha)\b/i.test(name)) {
    return null;
  }
  if (/\b(suggest|providing approximately|professional groups|recommended daily|daily intake|serv\.?\s*size|serving size)\b/i.test(name)) {
    return null;
  }
  // Marketing / PDP prose mistaken for ingredients
  if (/\b(also available|travel[- ]friendly|supercharged|brain function|by adding|free shipping|add to|shop now|learn more|double strength)\b/i.test(name + " " + raw)) {
    return null;
  }
  if (/^serv\.?\s*size/i.test(name)) return null;
  if (/^provides?\b/i.test(name)) return null;
  // Commerce / cross-sell chrome: "Add L-Arginine 500 mg"
  if (/^add\s+/i.test(name)) return null;
  if (/per serving/i.test(name) && name.split(/\s+/).length <= 4) return null;
  if (/^[a-z]\s/i.test(name) && name.length < 50) return null;
  // Fragment start after OCR/scrape glitch ("ve supercharged...")
  if (/^[a-z]{1,3}\s/i.test(name) && !/^(epa|dha|coq|b\d|l-)/i.test(name)) {
    return null;
  }
  if (/\b(supplement|softgels?|capsules?|tablets?)\b/i.test(name) && name.split(/\s+/).length >= 3) {
    return null;
  }
  // Prefer nutrient-like names (at least one known token or short chemical form)
  if (
    !/\b(vitamin|vit\.?|magnesium|calcium|zinc|iron|copper|selenium|iodine|folate|folic|methyl|b\d{1,2}|epa|dha|omega|curcumin|turmeric|glutathione|ascorbate|bisglycinate|glycinate|citrate|picolinate|threonate|carnitine|arginine|bioflavonoid|choline|phosphatidyl|reishi|lion|mushroom|creatine|coenzyme|coq10|niacin|riboflavin|thiamin|cobalamin|biotin|pantothenic|potassium|sodium|chloride|fiber|protein|collagen|probiotic|lactobacillus)\b/i.test(
      name
    ) &&
    name.split(/\s+/).length >= 4
  ) {
    return null;
  }
  const letters = (name.match(/[A-Za-z]/g) || []).length;
  if (letters < 3) return null;
  if (name.length > 80) return null;

  let dose_confidence = 70;
  if (/\bas\s+[A-Za-z]/.test(name) || /\([^)]+\)/.test(name)) {
    dose_confidence = 85;
  }
  if (/supplement facts/i.test(line)) {
    dose_confidence = Math.max(dose_confidence, 80);
  }
  if (dose_unit === "%DV") dose_confidence = Math.min(dose_confidence, 55);
  if (dose_unit === "mL" && /oz|net|bottle|serv/i.test(raw)) {
    return null;
  }
  // Serving size expressed as volume is not an ingredient
  if (dose_unit === "mL" && /serv/i.test(name)) {
    return null;
  }

  return {
    ingredient_name: name,
    canonical_ingredient_id: null,
    dose_amount,
    dose_unit,
    form: formFromText(raw),
    dose_confidence,
  };
}

function extractSupplementFactsBlock(text: string): string {
  const t = normalizeDashes(text);
  const start = t.search(/supplement\s*facts/i);
  if (start < 0) return t;
  // Prefer the facts block region for ingredient lines
  return t.slice(start, start + 3500);
}

/**
 * Extract competitive label facts from scraped page text / markdown.
 * Facts-only: ingredients without a parseable dose are omitted (not invented).
 */
export function parseCompetitiveLabelText(
  text: string,
  opts?: { title?: string }
): CompetitiveLabelFacts {
  const notes: string[] = [];
  const full = normalizeDashes(text || "");
  const title = opts?.title ?? "";
  const combined = `${title}\n${full}`;

  if (!full.trim()) {
    return {
      ingredient_rows: [
        {
          ingredient_name: "UNKNOWN",
          canonical_ingredient_id: null,
          dose_amount: null,
          dose_unit: null,
          form: null,
          dose_confidence: 0,
          note: "No label text available",
        },
      ],
      serving_size: null,
      servings_per_container: null,
      list_price: null,
      currency: "USD",
      price_per_serving: null,
      label_claims: [],
      delivery_technology: deliveryFromText(title) ?? null,
      availability_note: null,
      extraction_confidence: 40,
      parse_notes: ["empty_text"],
    };
  }

  const factsBlock = extractSupplementFactsBlock(full);
  const lines = factsBlock
    .split(/\r?\n|\\n|\|/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Flatten markdown emphasis / table cells into plain lines
  const flattened = full
    .replace(/\*\*|__/g, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\t/g, " ");

  const extraLines: string[] = [];
  for (const l of [...lines, ...flattened.split(/\r?\n/)]) {
    // Split glued "Name 100 mg Name2 50 mg" and "EPA 650 mg / DHA 450 mg"
    const multi = l.match(
      new RegExp(
        `([A-Za-z][A-Za-z0-9\\s\\-\\(\\),%/]{2,80}?\\s+\\d{1,5}(?:\\.\\d{1,3})?\\s*${UNIT_PATTERN})`,
        "gi"
      )
    );
    if (multi && multi.length >= 1) {
      extraLines.push(...multi);
    }
    // "Name .... 100 mg" leader dots from Supplement Facts PDFs
    const dotted = l.match(
      new RegExp(
        `^(.+?)\\s*[\\.·•]{2,}\\s*(\\d{1,5}(?:\\.\\d{1,3})?)\\s*(${UNIT_PATTERN.replace(/%\\s*DV|%DV/g, "%\\s?DV")})\\s*$`,
        "i"
      )
    );
    if (dotted) {
      extraLines.push(`${dotted[1]} ${dotted[2]} ${dotted[3]}`);
    }
  }

  const candidateLines = [...lines, ...extraLines];
  const seen = new Set<string>();
  const ingredient_rows: CompetitiveIngredientRow[] = [];

  for (const line of candidateLines) {
    const row = parseIngredientLine(line);
    if (!row) continue;
    const key = `${row.ingredient_name.toLowerCase()}|${row.dose_amount}|${row.dose_unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ingredient_rows.push(row);
    if (ingredient_rows.length >= 40) break;
  }

  if (ingredient_rows.length === 0) {
    notes.push("no_dose_lines");
    // Title-only heuristic: single ingredient product names with dose in title
    const fromTitle = parseIngredientLine(title);
    if (fromTitle) {
      ingredient_rows.push(fromTitle);
      notes.push("title_dose");
    }
  }

  if (ingredient_rows.length === 0) {
    ingredient_rows.push({
      ingredient_name: "UNKNOWN",
      canonical_ingredient_id: null,
      dose_amount: null,
      dose_unit: null,
      form: formFromText(combined),
      dose_confidence: 0,
      note: "No parseable dose lines on page excerpt",
    });
    notes.push("unknown_placeholder");
  }

  const serving_size = parseServingSize(full);
  const servings_per_container = parseServingsPerContainer(full);
  const price = parsePrice(full);
  const label_claims = parseLabelClaims(full);
  const delivery_technology =
    deliveryFromText(combined) ??
    (formFromText(combined) === "softgel"
      ? "softgel"
      : formFromText(combined) === "powder"
        ? "powder"
        : formFromText(combined) === "gummy"
          ? "gummy"
          : formFromText(combined) === "sublingual"
            ? "sublingual"
            : null);
  const availability_note = parseAvailability(full);

  let price_per_serving: number | null = null;
  if (
    price &&
    servings_per_container &&
    servings_per_container > 0
  ) {
    price_per_serving =
      Math.round((price.list_price / servings_per_container) * 1000) / 1000;
  }

  // Confidence: base from ingredients + bonuses for shell fields
  const knownIngredients = ingredient_rows.filter(
    (r) => r.ingredient_name !== "UNKNOWN" && r.dose_amount != null
  );
  let extraction_confidence = 50;
  if (knownIngredients.length >= 1) extraction_confidence = 72;
  if (knownIngredients.length >= 3) extraction_confidence = 82;
  if (knownIngredients.length >= 6) extraction_confidence = 88;
  if (serving_size) extraction_confidence = Math.min(95, extraction_confidence + 3);
  if (price) extraction_confidence = Math.min(95, extraction_confidence + 2);
  if (label_claims.length > 0) {
    extraction_confidence = Math.min(95, extraction_confidence + 1);
  }
  if (knownIngredients.length === 0) extraction_confidence = 45;

  return {
    ingredient_rows,
    serving_size,
    servings_per_container,
    list_price: price?.list_price ?? null,
    currency: price?.currency ?? "USD",
    price_per_serving,
    label_claims,
    delivery_technology,
    availability_note,
    extraction_confidence,
    parse_notes: notes,
  };
}

export function hasUnknownOnlyIngredients(
  rows: CompetitiveIngredientRow[] | null | undefined
): boolean {
  if (!rows?.length) return true;
  return rows.every(
    (r) =>
      !r.ingredient_name ||
      r.ingredient_name === "UNKNOWN" ||
      r.dose_amount == null
  );
}
