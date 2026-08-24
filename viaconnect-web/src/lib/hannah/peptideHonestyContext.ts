/**
 * Prompt 225a: Hannah peptide honesty-layer context (fail-closed).
 * Loads stored honesty_layer + ICTRP coverage disclosure only.
 * Never invents trial counts. Never includes dose / protocol amounts.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { WAVE1_COMPOUNDS } from '@/lib/thanos/wave1Compounds';
import { safeLog } from '@/lib/utils/safe-log';

export const PEPTIDE_HONESTY_MARKER = 'PEPTIDE EVIDENCE HONESTY';

export const PEPTIDE_HONESTY_MODEL_RULES =
  'PEPTIDE EVIDENCE RULES: Use only the PEPTIDE EVIDENCE HONESTY counts and statements below. ' +
  'Do not invent trials, publications, or results. Do not restate protocol dose amounts, ' +
  'titration, reconstitution, or injection instructions from registries or papers. ' +
  'If ICTRP is pending_access, disclose that global registry coverage may be incomplete. ' +
  'Registration is not completion. Completion is not publication. Publication is not a positive result.';

export interface HonestyLayerShape {
  trials_registered?: number;
  trials_completed?: number;
  trials_terminated_or_withdrawn?: number;
  trials_with_results_posted?: number;
  publications_human?: number;
  publications_animal?: number;
  systematic_reviews?: number;
  terminated_for_safety?: boolean;
  evidence_gap_statement?: string;
  coverage_note?: string;
}

export interface PeptideHonestyRow {
  slug: string;
  displayName: string;
  honesty: HonestyLayerShape;
  /** Prompt 226h: tissue_extract | synthetic_defined | not_applicable */
  preparationClass?: string;
  provenanceDisclosure?: string;
}

export interface IctrpCoverage {
  status: string;
  coverageNote: string;
  reason: string;
}

/** Exported for tests: normalize match haystack. */
export function normalizeMatchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[^a-z0-9\s\-./]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Offline Wave 1 term → slug map (plus hyphenless variants). */
export function buildWave1TermIndex(): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of WAVE1_COMPOUNDS) {
    map.set(normalizeMatchText(c.slug), c.slug);
    map.set(normalizeMatchText(c.display), c.slug);
    for (const t of c.terms) {
      const n = normalizeMatchText(t.term);
      if (n.length >= 3) map.set(n, c.slug);
      const compact = n.replace(/[\s\-./]/g, '');
      if (compact.length >= 3) map.set(compact, c.slug);
    }
  }
  return map;
}

const WAVE1_TERM_INDEX = buildWave1TermIndex();

/**
 * Match Wave 1 compounds mentioned in the question (longest terms first).
 */
export function matchWave1Slugs(question: string): string[] {
  const q = normalizeMatchText(question);
  const qCompact = q.replace(/[\s\-./]/g, '');
  const hits = new Set<string>();
  const terms = [...WAVE1_TERM_INDEX.keys()].sort((a, b) => b.length - a.length);
  for (const term of terms) {
    if (term.length < 3) continue;
    const compact = term.replace(/[\s\-./]/g, '');
    if (q.includes(term) || (compact.length >= 4 && qCompact.includes(compact))) {
      hits.add(WAVE1_TERM_INDEX.get(term)!);
    }
  }
  return [...hits];
}

/** True when the question is plausibly about peptide education / evidence. */
export function looksLikePeptideQuestion(question: string): boolean {
  if (matchWave1Slugs(question).length > 0) return true;
  const q = question.toLowerCase();
  return (
    /\bpeptide/.test(q) ||
    /\bnct\s*\d{6,8}\b/i.test(question) ||
    /\b(bpc-?157|tb-?500|ss-?31|ghk-?cu|semax|selank|ipamorelin|cjc|retatrutide|semaglutide|liraglutide)\b/i.test(
      question,
    )
  );
}

/**
 * Pure formatter for unit tests. Emits stored numbers only; never invents.
 * Returns empty string when there is nothing safe to disclose.
 */
export function formatPeptideHonestyForHannahContext(opts: {
  peptides: PeptideHonestyRow[];
  ictrp?: IctrpCoverage | null;
}): string {
  const lines: string[] = [];
  const peptides = opts.peptides.slice(0, 5);

  for (const p of peptides) {
    const h = p.honesty ?? {};
    const hasCounts =
      typeof h.trials_registered === 'number' ||
      typeof h.publications_human === 'number' ||
      Boolean(h.evidence_gap_statement?.trim());

    if (!hasCounts) continue;

    const label = p.displayName || p.slug;
    lines.push(`${label} (${p.slug}):`);
    if (p.preparationClass && p.preparationClass !== 'not_applicable') {
      lines.push(`  preparation_class=${p.preparationClass}`);
    }
    if (typeof h.trials_registered === 'number') {
      lines.push(
        `  trials_registered=${h.trials_registered}; completed=${h.trials_completed ?? 0}; ` +
          `results_posted=${h.trials_with_results_posted ?? 0}; ` +
          `terminated_or_withdrawn=${h.trials_terminated_or_withdrawn ?? 0}`,
      );
    }
    if (typeof h.publications_human === 'number') {
      lines.push(
        `  publications_human=${h.publications_human}; animal=${h.publications_animal ?? 0}; ` +
          `systematic_reviews=${h.systematic_reviews ?? 0}`,
      );
    }
    if (h.terminated_for_safety === true) {
      lines.push('  terminated_for_safety=true');
    }
    if (h.evidence_gap_statement?.trim()) {
      lines.push(`  evidence_gap_statement: ${h.evidence_gap_statement.trim()}`);
    }
    if (h.coverage_note?.trim()) {
      lines.push(`  coverage_note: ${h.coverage_note.trim()}`);
    }
    if (p.provenanceDisclosure?.trim()) {
      lines.push(`  provenance_disclosure: ${p.provenanceDisclosure.trim()}`);
    }
  }

  const ictrp = opts.ictrp;
  if (ictrp && (peptides.length > 0 || lines.length > 0)) {
    lines.push(
      `ICTRP source_status=${ictrp.status}. ${ictrp.coverageNote || ictrp.reason}`.trim(),
    );
    if (ictrp.status === 'pending_access') {
      lines.push(
        'Global registry coverage may be incomplete until ICTRP credentials land. Do not present ICTRP as live.',
      );
    }
  }

  if (lines.length === 0) return '';

  // Fail-closed: never ship dose-like quantities into the model context.
  const joined = lines.join('\n');
  if (
    /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|iu)\b/i.test(joined) ||
    /\breconstitut|bacteriostatic|titration schedule|inject\b/i.test(joined)
  ) {
    safeLog.warn('hannah.peptideHonesty', 'blocked dose-like honesty text');
    return '';
  }

  return `${PEPTIDE_HONESTY_MARKER} (stored counts only; do not invent):\n${joined}`;
}

function asHonesty(raw: unknown): HonestyLayerShape {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as HonestyLayerShape;
}

/**
 * Build honesty context for a user question. Fail-open empty on errors.
 */
export async function buildPeptideHonestyContext(
  question: string,
): Promise<string> {
  try {
    if (!looksLikePeptideQuestion(question)) return '';

    const wave1Slugs = matchWave1Slugs(question);
    const admin = createAdminClient();

    let peptides: PeptideHonestyRow[] = [];

    if (wave1Slugs.length > 0) {
      const { data, error } = await admin
        .from('kb_peptides')
        .select(
          'slug, display_name, honesty_layer, consumer_safe, exclusion_tier, preparation_class, provenance_disclosure',
        )
        .in('slug', wave1Slugs)
        .eq('consumer_safe', true)
        .eq('exclusion_tier', 'educational');
      if (error) {
        safeLog.warn('hannah.peptideHonesty', 'wave1 load failed', {
          error: error.message,
        });
      } else {
        peptides = (data ?? []).map((r) => ({
          slug: String(r.slug),
          displayName: String(r.display_name ?? r.slug),
          honesty: asHonesty(r.honesty_layer),
          preparationClass: String(r.preparation_class ?? 'not_applicable'),
          provenanceDisclosure: String(r.provenance_disclosure ?? ''),
        }));
      }
    }

    // Broader name match when Wave 1 miss but question still peptide-flavored.
    if (peptides.length === 0) {
      const { data, error } = await admin
        .from('kb_peptides')
        .select(
          'slug, display_name, canonical_name, honesty_layer, preparation_class, provenance_disclosure',
        )
        .eq('consumer_safe', true)
        .eq('exclusion_tier', 'educational')
        .limit(200);
      if (!error && data) {
        const q = normalizeMatchText(question);
        const qCompact = q.replace(/[\s\-./]/g, '');
        for (const r of data) {
          const names = [r.slug, r.display_name, r.canonical_name]
            .filter(Boolean)
            .map((n) => normalizeMatchText(String(n)));
          const hit = names.some((n) => {
            if (n.length < 3) return false;
            const compact = n.replace(/[\s\-./]/g, '');
            return q.includes(n) || (compact.length >= 4 && qCompact.includes(compact));
          });
          if (hit) {
            peptides.push({
              slug: String(r.slug),
              displayName: String(r.display_name ?? r.slug),
              honesty: asHonesty(r.honesty_layer),
              preparationClass: String(r.preparation_class ?? 'not_applicable'),
              provenanceDisclosure: String(r.provenance_disclosure ?? ''),
            });
          }
          if (peptides.length >= 5) break;
        }
      }
    }

    if (peptides.length === 0) return '';

    let ictrp: IctrpCoverage | null = null;
    const { data: src } = await admin
      .from('kb_ingest_source_status')
      .select('status, coverage_note, reason')
      .eq('source_system', 'ictrp')
      .maybeSingle();
    if (src) {
      ictrp = {
        status: String(src.status ?? 'pending_access'),
        coverageNote: String(src.coverage_note ?? ''),
        reason: String(src.reason ?? ''),
      };
    } else {
      ictrp = {
        status: 'pending_access',
        coverageNote:
          'Global registry coverage may be incomplete until ICTRP credentials land.',
        reason: 'ICTRP status row missing; fail-closed pending_access disclosure.',
      };
    }

    return formatPeptideHonestyForHannahContext({ peptides, ictrp });
  } catch (err) {
    safeLog.warn('hannah.peptideHonesty', 'fail-open empty', {
      error: err instanceof Error ? err.message : String(err),
    });
    return '';
  }
}
