/**
 * Prompt 216d: Hannah's Note composition (compile output).
 * Personal 1 to 2 sentence note from supplier digests; distinct from status read.
 * Marshall-gated welcome templates for pre-compile accounts.
 * Lexicon: no em/en dashes, no medical claim language, structure/function only.
 */

import type { ComposedInsight, SupplierDigest } from './types';

export type HannahNoteKind = 'compiled' | 'welcome';

export interface ComposedHannahNote {
  noteText: string;
  noteKind: HannahNoteKind;
  sourceRefs: string[];
  supplierAgents: string[];
  /** Status-style subtext this note must remain distinct from. */
  readTodaySnapshot: string;
}

/**
 * Marshall-approved welcome set (generic only; no fabricated personal observations).
 * Placeholders: {name} replaced with first name or "there".
 */
export const HANNAH_NOTE_WELCOME_TEMPLATES = [
  '{name}, welcome. This note will start reflecting your own signals once you log a meal, connect a hub, or finish your CAQ.',
  'Good to meet you, {name}. Until your first compile lands, this is a general welcome from me. Nothing here is personalized yet.',
  '{name}, your Bio Optimization picture is just opening. Keep connecting data and I will write to what is actually on file.',
] as const;

export const HANNAH_NOTE_WELCOME_APPROVED_BY = 'marshall' as const;
export const HANNAH_NOTE_PROMPT_VERSION = '216d-v1' as const;

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/** Strip em/en dashes and soft-scrub claim language from generated note text. */
export function applyHannahNoteLexicon(text: string): string {
  let out = text
    .replaceAll(EM_DASH, ', ')
    .replaceAll(EN_DASH, '-')
    .replace(/\s+/g, ' ')
    .trim();

  // Soft medical-claim scrub (structure/function framing only).
  out = out
    .replace(/\b(cure|cures|cured)\b/gi, 'support')
    .replace(/\b(diagnose|diagnoses|diagnosed)\b/gi, 'observe')
    .replace(/\b(treat|treats|treated|treatment of)\b/gi, 'support')
    .replace(/\bdisease\b/gi, 'pattern')
    .replace(/\bcancer\b/gi, 'cellular health topic');

  return out.replace(/\s+/g, ' ').trim();
}

export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distinctness: note must not equal and must not contain the full read-today subtext
 * (and vice versa for near-verbatim paste).
 */
export function isNoteDistinctFromReadToday(note: string, readToday: string): boolean {
  const n = normalizeForCompare(note);
  const r = normalizeForCompare(readToday);
  if (!n || !r) return n !== r;
  if (n === r) return false;
  if (r.length >= 24 && n.includes(r)) return false;
  if (n.length >= 24 && r.includes(n)) return false;
  // Near-verbatim: high token overlap on long phrases
  const rCore = r.slice(0, Math.min(r.length, 80));
  if (rCore.length >= 28 && n.includes(rCore)) return false;
  return true;
}

export function pickWelcomeNote(displayName: string, seed = 0): ComposedHannahNote {
  const name =
    displayName && displayName.trim().length > 0 && displayName !== 'there'
      ? displayName.trim().split(/\s+/)[0]
      : 'there';
  const idx = Math.abs(seed) % HANNAH_NOTE_WELCOME_TEMPLATES.length;
  const raw = HANNAH_NOTE_WELCOME_TEMPLATES[idx].replaceAll('{name}', name);
  const noteText = applyHannahNoteLexicon(raw);
  return {
    noteText,
    noteKind: 'welcome',
    sourceRefs: [`welcome:${HANNAH_NOTE_PROMPT_VERSION}:${idx}`],
    supplierAgents: ['hannah'],
    readTodaySnapshot: '',
  };
}

function firstName(displayName: string): string {
  if (!displayName || !displayName.trim() || displayName === 'there') return 'there';
  return displayName.trim().split(/\s+/)[0];
}

function buildReadTodaySnapshot(
  personalized: {
    analysis: string;
    recommendation: string;
  },
  /** Optional hero-status subtext for extra distinctness against UI stubs. */
  heroReadSubtext?: string,
): string {
  const parts = [personalized.analysis, personalized.recommendation];
  if (heroReadSubtext) parts.push(heroReadSubtext);
  return parts.filter(Boolean).join(' ').trim();
}

/**
 * Compose Hannah's personal note from the same digests/insights as the daily read.
 * Voice: addressed by first name, 1 to 2 sentences, personal; not a status headline.
 */
export function composeHannahNote(
  digests: SupplierDigest[],
  insights: ComposedInsight[],
  displayName: string,
  personalized: { analysis: string; recommendation: string },
  options?: { heroReadSubtext?: string },
): ComposedHannahNote {
  const name = firstName(displayName);
  const readTodaySnapshot = buildReadTodaySnapshot(personalized, options?.heroReadSubtext);

  const okSuppliers = digests
    .filter((d) => d.ok && d.items.length > 0)
    .map((d) => d.supplier);
  const sourceRefs: string[] = [];
  for (const d of digests) {
    for (const item of d.items) {
      if (item.refs?.length) sourceRefs.push(...item.refs);
      else sourceRefs.push(item.id);
    }
  }
  for (const ins of insights) {
    sourceRefs.push(...ins.sourceRefs);
  }

  const top = insights[0];
  const sparse =
    insights.length === 0 ||
    insights.every((i) => i.estimatedImpact <= 4) ||
    digests.every((d) => d.skipped || d.items.length === 0);

  let draft: string;

  if (sparse && !top) {
    draft =
      name === 'there'
        ? 'I am watching for your first honest signals. Once Nutrition, Biology, or CAQ land, this note will speak to what is on file rather than a generic start.'
        : `${name}, I am still in early-days mode with you. Log a meal or a composition entry and I will write to what actually shows up, not a placeholder.`;
  } else if (sparse && top) {
    draft =
      name === 'there'
        ? `A quiet start is fine. The clearest next lever on file is around ${top.sourceHub.toLowerCase()}: ${shorten(top.description, 120)}. Small consistent inputs sharpen this note quickly.`
        : `${name}, signals are still light, which is honest. The most useful next lever on file sits in ${top.sourceHub}: ${shorten(top.description, 110)}. I will keep this note tied to what you actually log.`;
  } else if (top) {
    const hub = top.sourceHub;
    const lever = shorten(top.description, 100);
    draft =
      name === 'there'
        ? `Something worth noticing sits in ${hub}: ${lever}. If you pick one focus today, let it be that lever rather than spreading thin.`
        : `${name}, I want you to notice ${hub.toLowerCase()} today. ${lever.charAt(0).toUpperCase()}${lever.slice(1)}. Treat that as your personal lever, not a score chase.`;
  } else {
    draft =
      name === 'there'
        ? 'Your hubs are quiet today. Keep one steady habit so the next compile has something real to speak to.'
        : `${name}, your hubs are quiet today. Keep one steady habit so my next note can point at a real change rather than a blank window.`;
  }

  let noteText = applyHannahNoteLexicon(draft);

  // Ensure distinctness; if collision, rewrite with a fixed personal framing.
  if (!isNoteDistinctFromReadToday(noteText, readTodaySnapshot)) {
    const fallback =
      name === 'there'
        ? 'This note is personal, not a status summary. Pick one lever from your accelerators and give it a clean day of attention.'
        : `${name}, this note is personal, not a status summary. Pick one lever from your accelerators and give it a clean day of attention.`;
    noteText = applyHannahNoteLexicon(fallback);
  }

  // Hard guarantee after fallback
  if (!isNoteDistinctFromReadToday(noteText, readTodaySnapshot) && readTodaySnapshot) {
    noteText = applyHannahNoteLexicon(
      `${name === 'there' ? 'Friend' : name}, I am keeping this note short and personal. Check your accelerators for the working lever; this line stays separate from the status read above.`,
    );
  }

  return {
    noteText,
    noteKind: 'compiled',
    sourceRefs: [...new Set(sourceRefs)].slice(0, 24),
    supplierAgents: okSuppliers.length > 0 ? okSuppliers : ['hannah'],
    readTodaySnapshot,
  };
}

function shorten(s: string, max: number): string {
  const t = applyHannahNoteLexicon(s);
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 3)).trim()}...`;
}
