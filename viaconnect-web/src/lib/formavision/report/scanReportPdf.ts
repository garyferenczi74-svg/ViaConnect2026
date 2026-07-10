// Prompt 211a Workstream 3 - doctor-ready scan report PDF renderer.
//
// Pure function: renderScanReportPdf(input) -> Uint8Array via pdf-lib. NO new
// engine is added (Section 8 ban): pdf-lib v1.17.1 is already installed and
// this mirrors the board-pack renderer pattern
// (src/lib/executiveReporting/rendering/boardPackPdfRenderer.ts): a single-pass
// title / sections / rows build, a forbidden-token guardrail re-applied before
// emission, and a footer on every page.
//
// Honesty contract (Section 4 + the RULE 9 UNKNOWN discipline that runs through
// the whole body-tracker read path):
//   - Identity (name, dates) is user-controlled and PASSED IN. Never fabricated.
//   - The avatar snapshot is an optional PNG byte param. Absent -> omitted
//     gracefully. Never fabricated.
//   - Each of the 12 circumferences renders with its confidence marker
//     (Measured / Good estimate / Estimated via confidenceBodyLabel). A null
//     confidence (UNKNOWN, not measured) renders the literal "UNKNOWN" and the
//     value renders "UNKNOWN" too. UNKNOWN is NEVER shown as 0 and a confidence
//     is NEVER upgraded.
//   - Composition shows lean_mass_kg / fat_mass_kg / body_fat_pct as given.
//   - Trend since the first scan is latest minus first, with the correct sign.
//   - A NON-DISMISSIBLE AI-estimate disclaimer line is always drawn.
//
// Brand + legal: legal entity line is "FarmCeutica Wellness LLC" (Gary's
// 2026-07-08 decision; the 211a prompt says Ltd but LLC governs). "Via Cura" is
// the product brand. ZERO Helix / gamification / streak / token data anywhere
// (Section 8): a guardrail scan enforces this over every drawn string.
//
// Encoding: pdf-lib's StandardFonts Helvetica uses WinAnsi, which cannot encode
// em / en dashes anyway. We use hyphens only and assert (throw) if any em / en
// dash reaches a draw call, so the rendered document is dash-clean by
// construction.
//
// Standing rules honored: no em dashes, no en dashes, no emojis, zero any.

import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import type { ConfidenceLevel } from '@/lib/arnold/scanning/types';
import { confidenceBodyLabel } from '@/lib/arnold/scanning/accuracy/confidenceDisplay';

// ---------------------------------------------------------------------------
// Input contract (all values pre-resolved + honest; the renderer fabricates
// nothing). confidence is a ConfidenceLevel or null (null === UNKNOWN).
// ---------------------------------------------------------------------------

export interface ScanReportCircumference {
  /** stable key (e.g. 'neck', 'left_upper_arm'); used only for ordering / debug. */
  key: string;
  /** human label drawn in the row (e.g. 'Neck', 'L. Upper Arm'). */
  label: string;
  /** measurement in cm, or null when UNKNOWN (RULE 9: null, never 0). */
  valueCm: number | null;
  /** per-measurement confidence, or null when UNKNOWN (never upgraded). */
  confidence: ConfidenceLevel | null;
}

export interface ScanReportComposition {
  /** total body fat percent, or null when unknown. */
  bodyFatPct: number | null;
  /** lean mass in kg, or null when unknown. */
  leanMassKg: number | null;
  /** fat mass in kg, or null when unknown. */
  fatMassKg: number | null;
}

export interface ScanReportTrend {
  /** body fat percent at the genuine first scan, or null when there is none. */
  firstBodyFatPct: number | null;
  /** body fat percent at the latest scan, or null when unknown. */
  latestBodyFatPct: number | null;
}

export interface ScanReportInput {
  /** user-controlled display name (passed in; never fabricated). */
  displayName: string;
  /** ISO date (yyyy-mm-dd) of the latest scan. */
  latestScanDate: string | null;
  /** ISO date (yyyy-mm-dd) of the genuine first scan, or null (single scan). */
  firstScanDate: string | null;
  /** optional avatar snapshot PNG bytes. Absent (null) -> section omitted. */
  avatarPng: Uint8Array | null;
  /** the 12 circumference rows, each with its own honest confidence. */
  circumferences: readonly ScanReportCircumference[];
  /** body composition (kg + pct). */
  composition: ScanReportComposition;
  /** trend inputs (latest vs first). */
  trend: ScanReportTrend;
}

// ---------------------------------------------------------------------------
// Constants: brand, legal, copy. The disclaimer is a fixed non-dismissible line.
// ---------------------------------------------------------------------------

const LEGAL_ENTITY = 'FarmCeutica Wellness LLC';
const PRODUCT_BRAND = 'Via Cura';
const UNKNOWN = 'UNKNOWN';

// Non-dismissible AI-estimate disclaimer. Plain ASCII, hyphens only.
const DISCLAIMER_LINES: readonly string[] = [
  'These figures are AI generated estimates from a photo based body scan.',
  'They are not a medical diagnosis and are not a substitute for professional',
  'medical advice. Confidence markers reflect the model estimate for each',
  'measurement; UNKNOWN means the value could not be measured (never zero).',
];

// Forbidden tokens: Section 8 bars any Helix / gamification / streak / token
// data from the doctor-facing report. Scanned (lowercased) over every drawn
// string. Kept local to this file so the report surface owns its own contract.
const FORBIDDEN_REPORT_TOKENS: readonly string[] = [
  'helix',
  'streak',
  'viatoken',
  'token',
  'gamif',
  'leaderboard',
  'multiplier',
  'challenge',
];

// ---------------------------------------------------------------------------
// Pure formatting helpers.
// ---------------------------------------------------------------------------

/** Round to 1 decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Confidence marker for a row. A null confidence is UNKNOWN and returns the
 * literal UNKNOWN string. A present confidence returns its body label
 * (Measured / Good estimate / Estimated) verbatim; it is never upgraded.
 */
function markerFor(confidence: ConfidenceLevel | null): string {
  if (confidence === null) return UNKNOWN;
  return confidenceBodyLabel(confidence) ?? UNKNOWN;
}

/**
 * Rendered value cell for a circumference. UNKNOWN when valueCm is null
 * (RULE 9: never 0). Otherwise "NN.N cm".
 */
function valueCell(valueCm: number | null): string {
  if (valueCm === null) return UNKNOWN;
  return `${round1(valueCm)} cm`;
}

/** Rendered composition value: "NN.N <unit>" or UNKNOWN. */
function compCell(value: number | null, unit: string): string {
  if (value === null) return UNKNOWN;
  return `${round1(value)} ${unit}`;
}

/**
 * The trend delta string, or null when it cannot be honestly computed (either
 * endpoint missing). Sign is latest minus first: a drop is negative, a gain is
 * positive. Zero renders as "+0.0 points" (no change, still honest).
 */
export function formatTrendDelta(first: number | null, latest: number | null): string | null {
  if (first === null || latest === null) return null;
  const delta = round1(latest - first);
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '+';
  return `${sign}${Math.abs(delta)} points`;
}

// Month names built explicitly so the human date carries NO locale-injected
// punctuation (some locales render dates with en dashes, which the guardrail
// would reject). ASCII-only, hyphen-free by construction.
const MONTH_NAMES: readonly string[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Human-readable date for the doctor report, e.g. "July 1, 2026". Deterministic
 * and locale-free: the ISO yyyy-mm-dd is parsed by hand and the string is built
 * explicitly, so no locale can inject an em / en dash. Falls back to UNKNOWN when
 * absent, and to the raw string when the input is not a clean ISO date (never throws).
 */
function fmtDate(iso: string | null): string {
  if (!iso) return UNKNOWN;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31) return iso;
  return `${MONTH_NAMES[monthIdx]} ${day}, ${year}`;
}

// ---------------------------------------------------------------------------
// Guardrail: throw if any drawn string carries a forbidden token or a dash.
// ---------------------------------------------------------------------------

function assertClean(strings: readonly string[]): void {
  for (const s of strings) {
    const lower = s.toLowerCase();
    for (const token of FORBIDDEN_REPORT_TOKENS) {
      if (lower.includes(token)) {
        throw new Error(`RENDER_FORBIDDEN_CONTENT: scan report string contains forbidden token "${token}"`);
      }
    }
    // Reject em (U+2014) and en (U+2013) dashes. Referenced via char code so
    // this guard source stays ASCII-clean and does not itself trip the rule.
    if (s.includes(String.fromCharCode(0x2014)) || s.includes(String.fromCharCode(0x2013))) {
      throw new Error('RENDER_FORBIDDEN_CONTENT: scan report string contains an em or en dash');
    }
  }
}

// ---------------------------------------------------------------------------
// Page context + layout helpers (mirrors the board-pack renderer).
// ---------------------------------------------------------------------------

interface PageCtx {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  width: number;
  height: number;
}

function newPage(doc: PDFDocument, font: PDFFont, bold: PDFFont): PageCtx {
  const page = doc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();
  return { doc, page, font, bold, y: height - 60, width, height };
}

function drawFooter(ctx: PageCtx): void {
  // Legal entity + brand footer on every page. Drawn small and gray.
  ctx.page.drawText(`${LEGAL_ENTITY}   ${PRODUCT_BRAND} body scan report`, {
    x: 50, y: 30, size: 7, font: ctx.font, color: rgb(0.45, 0.45, 0.45),
  });
}

function ensureRoom(ctx: PageCtx, needed: number): PageCtx {
  if (ctx.y - needed > 60) return ctx;
  drawFooter(ctx);
  return newPage(ctx.doc, ctx.font, ctx.bold);
}

// ---------------------------------------------------------------------------
// renderScanReportPdf - the pure entry point.
// ---------------------------------------------------------------------------

export async function renderScanReportPdf(input: ScanReportInput): Promise<Uint8Array> {
  // 1. Assemble every string that will be drawn, then guardrail the whole set
  //    BEFORE any drawing. This is the belt-and-suspenders Section 8 defense:
  //    a forbidden token or dash anywhere throws and no bytes are emitted.
  const identityStrings = [input.displayName, fmtDate(input.latestScanDate), fmtDate(input.firstScanDate)];
  const rowStrings: string[] = [];
  for (const c of input.circumferences) {
    rowStrings.push(c.label, valueCell(c.valueCm), markerFor(c.confidence));
  }
  const compStrings = [
    compCell(input.composition.bodyFatPct, '%'),
    compCell(input.composition.leanMassKg, 'kg'),
    compCell(input.composition.fatMassKg, 'kg'),
  ];
  const trendDelta = formatTrendDelta(input.trend.firstBodyFatPct, input.trend.latestBodyFatPct);
  const trendStrings = trendDelta ? [trendDelta] : [];

  assertClean([
    LEGAL_ENTITY,
    PRODUCT_BRAND,
    ...DISCLAIMER_LINES,
    ...identityStrings,
    ...rowStrings,
    ...compStrings,
    ...trendStrings,
  ]);

  // 2. Build the document. Compression is disabled so the drawn text stays
  //    inspectable (both by our tests and by any downstream PDF text reader).
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Optional avatar snapshot. Embedded only when PNG bytes are provided; a
  // malformed PNG must not sink the whole report, so embedding is guarded.
  let avatar: PDFImage | null = null;
  if (input.avatarPng && input.avatarPng.byteLength > 0) {
    try {
      avatar = await doc.embedPng(input.avatarPng);
    } catch {
      avatar = null; // omit gracefully; never fabricate
    }
  }

  let ctx = newPage(doc, font, bold);

  // --- Identity header ------------------------------------------------------
  ctx.page.drawText(`${PRODUCT_BRAND} Body Scan Report`, {
    x: 50, y: ctx.y, size: 20, font: bold, color: rgb(0, 0, 0),
  });
  ctx.y -= 26;
  ctx.page.drawText(`Prepared for: ${input.displayName}`, { x: 50, y: ctx.y, size: 11, font });
  ctx.y -= 15;
  ctx.page.drawText(`Scan date: ${fmtDate(input.latestScanDate)}`, { x: 50, y: ctx.y, size: 10, font });
  ctx.y -= 14;
  if (input.firstScanDate) {
    ctx.page.drawText(`First scan on record: ${fmtDate(input.firstScanDate)}`, { x: 50, y: ctx.y, size: 10, font });
    ctx.y -= 14;
  }
  ctx.y -= 6;

  // --- Avatar snapshot (optional) -------------------------------------------
  if (avatar) {
    const maxW = 140;
    const scale = maxW / avatar.width;
    const drawW = maxW;
    const drawH = avatar.height * scale;
    ctx = ensureRoom(ctx, drawH + 12);
    ctx.page.drawImage(avatar, { x: 50, y: ctx.y - drawH, width: drawW, height: drawH });
    ctx.y -= drawH + 12;
  }

  // --- Circumference measurements table -------------------------------------
  ctx = ensureRoom(ctx, 40);
  ctx.page.drawText('Circumference measurements', { x: 50, y: ctx.y, size: 13, font: bold });
  ctx.y -= 20;

  ctx.page.drawText('Measurement', { x: 50, y: ctx.y, size: 9, font: bold });
  ctx.page.drawText('Value', { x: 260, y: ctx.y, size: 9, font: bold });
  ctx.page.drawText('Confidence', { x: 400, y: ctx.y, size: 9, font: bold });
  ctx.y -= 4;
  ctx.page.drawLine({
    start: { x: 50, y: ctx.y }, end: { x: 562, y: ctx.y },
    thickness: 0.5, color: rgb(0.6, 0.6, 0.6),
  });
  ctx.y -= 12;

  for (const c of input.circumferences) {
    ctx = ensureRoom(ctx, 16);
    ctx.page.drawText(c.label.slice(0, 34), { x: 50, y: ctx.y, size: 9, font });
    ctx.page.drawText(valueCell(c.valueCm), { x: 260, y: ctx.y, size: 9, font });
    ctx.page.drawText(markerFor(c.confidence), { x: 400, y: ctx.y, size: 9, font });
    ctx.y -= 14;
  }
  ctx.y -= 8;

  // --- Body fat + composition ----------------------------------------------
  ctx = ensureRoom(ctx, 40);
  ctx.page.drawText('Body fat and composition', { x: 50, y: ctx.y, size: 13, font: bold });
  ctx.y -= 18;
  ctx.page.drawText(`Body fat: ${compCell(input.composition.bodyFatPct, '%')}`, { x: 50, y: ctx.y, size: 10, font });
  ctx.y -= 14;
  ctx.page.drawText(`Lean mass: ${compCell(input.composition.leanMassKg, 'kg')}`, { x: 50, y: ctx.y, size: 10, font });
  ctx.y -= 14;
  ctx.page.drawText(`Fat mass: ${compCell(input.composition.fatMassKg, 'kg')}`, { x: 50, y: ctx.y, size: 10, font });
  ctx.y -= 18;

  // --- Trend since first scan ----------------------------------------------
  ctx = ensureRoom(ctx, 40);
  ctx.page.drawText('Trend since first scan', { x: 50, y: ctx.y, size: 13, font: bold });
  ctx.y -= 18;
  if (trendDelta && input.trend.firstBodyFatPct !== null && input.trend.latestBodyFatPct !== null) {
    ctx.page.drawText(
      `Body fat change: ${trendDelta} (from ${round1(input.trend.firstBodyFatPct)}% to ${round1(input.trend.latestBodyFatPct)}%)`,
      { x: 50, y: ctx.y, size: 10, font },
    );
    ctx.y -= 14;
  } else {
    ctx.page.drawText('Not enough scans yet to show a trend. Come back after your next scan.', {
      x: 50, y: ctx.y, size: 10, font, color: rgb(0.35, 0.35, 0.35),
    });
    ctx.y -= 14;
  }
  ctx.y -= 10;

  // --- Non-dismissible AI-estimate disclaimer -------------------------------
  ctx = ensureRoom(ctx, 20 + DISCLAIMER_LINES.length * 12);
  ctx.page.drawText('Important', { x: 50, y: ctx.y, size: 10, font: bold, color: rgb(0.55, 0.2, 0.0) });
  ctx.y -= 14;
  for (const line of DISCLAIMER_LINES) {
    ctx = ensureRoom(ctx, 12);
    ctx.page.drawText(line, { x: 50, y: ctx.y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
    ctx.y -= 12;
  }

  // Footer on the final page.
  drawFooter(ctx);

  // useObjectStreams false keeps the content stream uncompressed so the drawn
  // text is inspectable (tests + downstream extractors read it directly).
  return doc.save({ useObjectStreams: false });
}
