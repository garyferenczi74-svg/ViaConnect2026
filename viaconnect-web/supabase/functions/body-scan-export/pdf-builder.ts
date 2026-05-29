// body-scan-export/pdf-builder.ts
// PDF rendering logic for the Body Scan Export report.
// Builds a single-page letter-size (612 x 792 pt) portrait PDF via pdf-lib.
//
// Phase 2 TODO: replace CHART_PLACEHOLDER with an actual sparkline chart
// using a canvas-to-png render pipeline once a Deno-compatible chart lib is
// available. The stub string is intentional for Phase 1.

import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
  RGB,
} from 'https://esm.sh/pdf-lib@1.17.1';

import {
  TAGLINE,
  REPORT_SUBTITLE,
  COMPANY_NAME,
  BOS_LABEL,
  BOS_DEFAULT_DRIVER,
  DISCLAIMER_WELLNESS,
  DISCLAIMER_AI,
  CHART_PLACEHOLDER,
  AVATAR_PLACEHOLDER,
  MEASUREMENT_LABELS,
  MEASUREMENT_KEYS,
} from './copy.ts';

// Letter size in points (1 pt = 1/72 inch).
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 48;
const COL_W  = PAGE_W - MARGIN * 2;

// Avatar image area dimensions in points.
const AVATAR_AREA_W = 144; // approx 2.9 inches
const AVATAR_AREA_H = 200; // approx 4 inches at 50 pt/inch

// Teal brand color (hex #0d9488 -> r:13/255, g:148/255, b:136/255).
const TEAL: RGB = rgb(0.051, 0.580, 0.533);
const BLACK: RGB = rgb(0, 0, 0);
const DARK_GREY: RGB = rgb(0.25, 0.25, 0.25);
const MID_GREY: RGB = rgb(0.55, 0.55, 0.55);
const LIGHT_GREY: RGB = rgb(0.88, 0.88, 0.88);
const WHITE: RGB = rgb(1, 1, 1);

// CM to inches conversion.
function cmToIn(cm: number): number {
  return cm / 2.54;
}

function fmtCmIn(cm: number | null | undefined): string {
  if (cm === null || cm === undefined) return 'N/A';
  return `${Number(cm).toFixed(1)} cm / ${cmToIn(Number(cm)).toFixed(1)} in`;
}

function fmtKgLbs(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return 'N/A';
  const lbs = Number(kg) * 2.20462;
  return `${Number(kg).toFixed(1)} kg (${lbs.toFixed(1)} lbs)`;
}

function fmtNum(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined) return 'N/A';
  return Number(v).toFixed(decimals);
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'N/A';
  return `${Number(v).toFixed(1)}%`;
}

// Format BOS delta with explicit sign.
function fmtDelta(delta: number | null): string {
  if (delta === null) return 'N/A';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}

// Format session_date (ISO date string "YYYY-MM-DD") -> "May 16, 2026".
function fmtDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts.map(Number);
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const mName = MONTHS[month - 1] ?? '';
  return `${mName} ${day}, ${year}`;
}

// Wrap a long string into lines that fit within maxWidth at the given font size.
// pdf-lib does not wrap automatically; we do it manually.
async function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): Promise<string[]> {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(candidate, size);
    if (w > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Draw text right-aligned at (rightEdge, y).
function drawTextRight(
  page: PDFPage,
  text: string,
  rightEdge: number,
  y: number,
  opts: { font: PDFFont; size: number; color: RGB },
): void {
  const w = opts.font.widthOfTextAtSize(text, opts.size);
  page.drawText(text, { x: rightEdge - w, y, size: opts.size, font: opts.font, color: opts.color });
}

// Draw text centered between x1 and x2 at y.
function drawTextCenter(
  page: PDFPage,
  text: string,
  x1: number,
  x2: number,
  y: number,
  opts: { font: PDFFont; size: number; color: RGB },
): void {
  const w = opts.font.widthOfTextAtSize(text, opts.size);
  const cx = x1 + (x2 - x1 - w) / 2;
  page.drawText(text, { x: cx, y, size: opts.size, font: opts.font, color: opts.color });
}

// =========================================================================
// Public builder function.
// =========================================================================

export interface ScanData {
  sessionId: string;
  sessionDate: string | null;
  measurements: Record<string, number | null>;
  composition: {
    body_fat_pct: number | null;
    ci_low_body_fat_pct: number | null;
    ci_high_body_fat_pct: number | null;
    lean_mass_kg: number | null;
    fat_mass_kg: number | null;
    visceral_fat_index: number | null;
    ag_ratio: number | null;
    vs_ratio: number | null;
    fmi: number | null;
    ffmi: number | null;
    bmi: number | null;
    bmr_kcal: number | null;
  } | null;
  bos: {
    score: number | null;
    delta: number | null;
    driver: string | null;
  };
  avatarPngBase64: string | null;
  /**
   * Optional practitioner branding. When present (a practitioner exporting a
   * managed patient's scan) the report adds a "Prepared by" line and a patient
   * identifier line under the subtitle. The footer entity name stays
   * "Farmceutica Wellness Ltd" (COMPANY_NAME) regardless.
   */
  branding?: {
    preparedBy: string | null;
    patientName: string | null;
  } | null;
}

/**
 * Render the full body scan PDF and return the bytes as a Uint8Array.
 * Throws on pdf-lib failure (caller catches and returns HTTP 500).
 */
export async function buildScanPdf(data: ScanData): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);

  // Running y cursor. pdf-lib origin is bottom-left; we work top-down.
  let y = PAGE_H - MARGIN;

  // =========================================================================
  // HEADER
  // =========================================================================

  // Tagline: centered, teal, bold, 18pt.
  drawTextCenter(page, TAGLINE, MARGIN, PAGE_W - MARGIN, y, { font: bold, size: 18, color: TEAL });
  y -= 22;

  // Subtitle: centered, dark grey, 10pt.
  drawTextCenter(page, REPORT_SUBTITLE, MARGIN, PAGE_W - MARGIN, y, { font: regular, size: 10, color: DARK_GREY });

  // Scan date: right-aligned on same line as subtitle.
  const dateStr = fmtDate(data.sessionDate);
  if (dateStr) {
    drawTextRight(page, dateStr, PAGE_W - MARGIN, y, { font: regular, size: 10, color: DARK_GREY });
  }
  y -= 6;

  // Practitioner branding lines (only when a practitioner exports a patient
  // scan). "Prepared by" on the left, patient identifier on the right.
  if (data.branding && (data.branding.preparedBy || data.branding.patientName)) {
    y -= 12;
    if (data.branding.preparedBy) {
      page.drawText(`Prepared by: ${data.branding.preparedBy}`, {
        x: MARGIN, y, size: 9, font: regular, color: DARK_GREY,
      });
    }
    if (data.branding.patientName) {
      drawTextRight(page, `Patient: ${data.branding.patientName}`, PAGE_W - MARGIN, y, {
        font: regular, size: 9, color: DARK_GREY,
      });
    }
    y -= 4;
  }

  // Thin horizontal rule under header.
  page.drawLine({
    start: { x: MARGIN, y },
    end:   { x: PAGE_W - MARGIN, y },
    thickness: 0.75,
    color: LIGHT_GREY,
  });
  y -= 14;

  // =========================================================================
  // BIO OPTIMIZATION SCORE DELTA CARD
  // =========================================================================

  const cardH = 56;
  const cardY = y - cardH;

  // Card background.
  page.drawRectangle({
    x: MARGIN,
    y: cardY,
    width: COL_W,
    height: cardH,
    color: rgb(0.95, 0.99, 0.99),
    borderColor: TEAL,
    borderWidth: 1,
  });

  // Left side: BOS label + score.
  const bosScore = data.bos.score !== null ? String(Math.round(data.bos.score)) : 'N/A';
  page.drawText(BOS_LABEL, { x: MARGIN + 12, y: cardY + cardH - 18, size: 9, font: regular, color: DARK_GREY });
  page.drawText(bosScore,  { x: MARGIN + 12, y: cardY + cardH - 36, size: 22, font: bold, color: TEAL });

  // Right side: delta.
  const deltaLabel = `Change since last scan: ${fmtDelta(data.bos.delta)}`;
  const deltaColor = (data.bos.delta !== null && data.bos.delta < 0) ? rgb(0.75, 0.10, 0.10) : TEAL;
  drawTextRight(page, deltaLabel, PAGE_W - MARGIN - 12, cardY + cardH - 18, { font: regular, size: 9, color: deltaColor });

  // Driver line below delta.
  const driver = data.bos.driver ?? BOS_DEFAULT_DRIVER;
  drawTextRight(page, driver, PAGE_W - MARGIN - 12, cardY + cardH - 34, { font: regular, size: 8, color: DARK_GREY });

  y = cardY - 14;

  // =========================================================================
  // AVATAR
  // =========================================================================

  if (data.avatarPngBase64) {
    try {
      let b64 = data.avatarPngBase64;
      if (b64.startsWith('data:image/png;base64,')) {
        b64 = b64.slice('data:image/png;base64,'.length);
      }
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const img   = await doc.embedPng(bytes);
      const dims  = img.scaleToFit(AVATAR_AREA_W, AVATAR_AREA_H);
      const imgX  = MARGIN + (COL_W - dims.width) / 2;
      page.drawImage(img, { x: imgX, y: y - dims.height, width: dims.width, height: dims.height });
      y -= dims.height + 10;
    } catch {
      // Fall through to placeholder if embed fails.
      page.drawText(AVATAR_PLACEHOLDER, {
        x: MARGIN + (COL_W - regular.widthOfTextAtSize(AVATAR_PLACEHOLDER, 9)) / 2,
        y: y - 14,
        size: 9,
        font: regular,
        color: MID_GREY,
      });
      y -= 24;
    }
  } else {
    page.drawText(AVATAR_PLACEHOLDER, {
      x: MARGIN + (COL_W - regular.widthOfTextAtSize(AVATAR_PLACEHOLDER, 9)) / 2,
      y: y - 14,
      size: 9,
      font: regular,
      color: MID_GREY,
    });
    y -= 24;
  }

  // =========================================================================
  // MEASUREMENTS TABLE + COMPOSITION TABLE (two-column layout)
  // =========================================================================

  const halfW   = (COL_W - 12) / 2;
  const leftX   = MARGIN;
  const rightX  = MARGIN + halfW + 12;
  const rowH    = 13;
  const tableSize = 8;

  // Section heading helper.
  const drawSectionHeading = (text: string, x: number, yPos: number, width: number): number => {
    page.drawRectangle({ x, y: yPos - 2, width, height: 14, color: rgb(0.93, 0.97, 0.97) });
    page.drawText(text, { x: x + 4, y: yPos, size: 9, font: bold, color: TEAL });
    return yPos - rowH - 2;
  };

  // ---- LEFT: Measurements table ----
  let leftY  = y;
  let rightY = y;

  leftY = drawSectionHeading('Circumference Measurements', leftX, leftY, halfW);

  for (let i = 0; i < MEASUREMENT_KEYS.length; i++) {
    const key   = MEASUREMENT_KEYS[i];
    const label = MEASUREMENT_LABELS[key] ?? key;
    const val   = data.measurements[key];
    const valStr = fmtCmIn(val as number | null | undefined);

    // Zebra stripe.
    if (i % 2 === 0) {
      page.drawRectangle({ x: leftX, y: leftY - 2, width: halfW, height: rowH, color: rgb(0.97, 0.97, 0.97) });
    }
    page.drawText(label,  { x: leftX + 4,  y: leftY, size: tableSize, font: regular, color: BLACK });
    drawTextRight(page, valStr, leftX + halfW - 4, leftY, { font: regular, size: tableSize, color: DARK_GREY });
    leftY -= rowH;
  }

  // ---- RIGHT: Composition table ----
  rightY = drawSectionHeading('Body Composition', rightX, rightY, halfW);

  const comp = data.composition;

  interface CompRow { label: string; value: string }
  const compRows: CompRow[] = [];

  // Body fat with CI.
  if (comp?.body_fat_pct !== null && comp?.body_fat_pct !== undefined) {
    const ciPart =
      comp.ci_low_body_fat_pct !== null && comp.ci_high_body_fat_pct !== null
        ? ` +/- ${((Number(comp.ci_high_body_fat_pct) - Number(comp.ci_low_body_fat_pct)) / 2).toFixed(1)}%`
        : '';
    compRows.push({ label: 'Body Fat', value: `${fmtPct(comp.body_fat_pct)}${ciPart}` });
  } else {
    compRows.push({ label: 'Body Fat', value: 'N/A' });
  }

  compRows.push({ label: 'Lean Mass',          value: fmtKgLbs(comp?.lean_mass_kg) });
  compRows.push({ label: 'Fat Mass',            value: fmtKgLbs(comp?.fat_mass_kg) });
  compRows.push({ label: 'Visceral Fat Index',  value: fmtNum(comp?.visceral_fat_index) });
  compRows.push({ label: 'AG Ratio',            value: fmtNum(comp?.ag_ratio) });
  compRows.push({ label: 'VS Ratio',            value: fmtNum(comp?.vs_ratio) });
  compRows.push({ label: 'FMI',                 value: fmtNum(comp?.fmi) });
  compRows.push({ label: 'FFMI',                value: fmtNum(comp?.ffmi) });
  compRows.push({ label: 'BMI',                 value: fmtNum(comp?.bmi) });
  compRows.push({ label: 'BMR',                 value: comp?.bmr_kcal !== null && comp?.bmr_kcal !== undefined ? `${comp.bmr_kcal} kcal` : 'N/A' });

  for (let i = 0; i < compRows.length; i++) {
    const { label, value } = compRows[i];
    if (i % 2 === 0) {
      page.drawRectangle({ x: rightX, y: rightY - 2, width: halfW, height: rowH, color: rgb(0.97, 0.97, 0.97) });
    }
    page.drawText(label, { x: rightX + 4, y: rightY, size: tableSize, font: regular, color: BLACK });
    drawTextRight(page, value, rightX + halfW - 4, rightY, { font: regular, size: tableSize, color: DARK_GREY });
    rightY -= rowH;
  }

  // Advance y past whichever column was taller.
  y = Math.min(leftY, rightY) - 10;

  // =========================================================================
  // LONGITUDINAL CHART PLACEHOLDER
  // Phase 2 will render an actual chart here (canvas-to-png pipeline).
  // =========================================================================

  page.drawText(CHART_PLACEHOLDER, { x: MARGIN, y, size: 8, font: regular, color: MID_GREY });
  y -= 16;

  // Thin rule before disclaimers.
  page.drawLine({
    start: { x: MARGIN, y },
    end:   { x: PAGE_W - MARGIN, y },
    thickness: 0.5,
    color: LIGHT_GREY,
  });
  y -= 10;

  // =========================================================================
  // DISCLAIMERS (small print)
  // =========================================================================

  const disclaimerSize = 7;
  const disclaimerGap  = 10;

  const welLines = await wrapText(DISCLAIMER_WELLNESS, regular, disclaimerSize, COL_W);
  for (const line of welLines) {
    page.drawText(line, { x: MARGIN, y, size: disclaimerSize, font: regular, color: MID_GREY });
    y -= disclaimerGap;
  }
  y -= 4;

  const aiLines = await wrapText(DISCLAIMER_AI, regular, disclaimerSize, COL_W);
  for (const line of aiLines) {
    page.drawText(line, { x: MARGIN, y, size: disclaimerSize, font: regular, color: MID_GREY });
    y -= disclaimerGap;
  }

  // =========================================================================
  // FOOTER
  // =========================================================================

  const footerY = MARGIN - 4;

  // Bottom rule above footer.
  page.drawLine({
    start: { x: MARGIN, y: footerY + 14 },
    end:   { x: PAGE_W - MARGIN, y: footerY + 14 },
    thickness: 0.5,
    color: LIGHT_GREY,
  });

  // Bottom-left: company name.
  page.drawText(COMPANY_NAME, { x: MARGIN, y: footerY, size: 7, font: regular, color: MID_GREY });

  // Bottom-center: page number.
  drawTextCenter(page, '1 of 1', MARGIN, PAGE_W - MARGIN, footerY, { font: regular, size: 7, color: MID_GREY });

  // Bottom-right: scan UUID short form (first 8 chars, formatted XXXX-XXXX).
  const shortId = data.sessionId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const scanRef  = `Scan: ${shortId.slice(0, 4)}-${shortId.slice(4, 8)}`;
  drawTextRight(page, scanRef, PAGE_W - MARGIN, footerY, { font: regular, size: 7, color: MID_GREY });

  return doc.save();
}
