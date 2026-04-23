// Prompt #113 — Stage 1 disease-claim detector orchestrator.
// Deterministic, fast (<10 ms p95 target). Uses normalized text + tokenizer
// + sentence splitter, then scans each sentence for (disease term × action
// verb) pairs within ±6 tokens, plus superiority patterns against drug
// classes. Scores each flag and returns total_score.
//
// total_score >= 3.0 means Stage 2 (Kelsey LLM) is invoked.

import { normalize, splitSentences, tokenize } from "./normalizer";
import { loadDiseaseLexicon, type DiseaseEntry } from "./lexicon-loader";
import { isActionVerb, getVerbStrength, SUPERIORITY_REGEXES } from "./regex-layer";
import type { DetectorFlag, DetectorResult } from "../types";

const STAGE2_THRESHOLD = 3.0;
const PROXIMITY_WINDOW = 6;

function buildDiseaseIndex(lex: DiseaseEntry[]): Map<string, DiseaseEntry> {
  const m = new Map<string, DiseaseEntry>();
  for (const e of lex) m.set(e.term.toLowerCase(), e);
  return m;
}

function scanSentence(
  sentence: string,
  diseaseIndex: Map<string, DiseaseEntry>,
  offset: number,
): DetectorFlag[] {
  const tokens = tokenize(normalize(sentence));
  const flags: DetectorFlag[] = [];

  // Token-level sweep: at each disease hit, check ±PROXIMITY_WINDOW tokens for an action verb.
  for (let i = 0; i < tokens.length; i++) {
    // Check 1-, 2-, 3-gram starting at i to catch multi-word disease terms like "type 2 diabetes".
    for (let n = 3; n >= 1; n--) {
      if (i + n > tokens.length) continue;
      const gram = tokens.slice(i, i + n).join(" ");
      const entry = diseaseIndex.get(gram);
      if (!entry) continue;
      const lo = Math.max(0, i - PROXIMITY_WINDOW);
      const hi = Math.min(tokens.length, i + n + PROXIMITY_WINDOW);
      for (let j = lo; j < hi; j++) {
        if (j >= i && j < i + n) continue; // skip the disease span itself
        if (isActionVerb(tokens[j])) {
          const proximity = Math.abs(j - i) + 1;
          const proxWeight = 1 / Math.sqrt(proximity);
          const verbStrength = getVerbStrength(tokens[j]);
          const score = entry.severity_level * proxWeight * verbStrength;
          flags.push({
            rule: "disease_x_action_verb",
            match: `${gram} … ${tokens[j]}`,
            position: offset + i,
            severity: entry.severity_level,
            variant_group: entry.variant_group ?? undefined,
          });
          // one flag per (disease × verb) pair per sentence is enough
          return flags.concat(scanSuperiority(sentence, offset));
        }
      }
      break; // matched n-gram, stop trying smaller grams at this position
    }
  }

  return flags.concat(scanSuperiority(sentence, offset));
}

function scanSuperiority(sentence: string, offset: number): DetectorFlag[] {
  const flags: DetectorFlag[] = [];
  for (const { rule, re } of SUPERIORITY_REGEXES) {
    const m = sentence.match(re);
    if (m) {
      flags.push({
        rule,
        match: m[0],
        position: offset + (m.index ?? 0),
        severity: 5,
      });
    }
  }
  return flags;
}

export async function detectDiseaseClaim(text: string): Promise<DetectorResult> {
  if (!text || text.trim().length === 0) {
    return { flagged: false, flags: [], total_score: 0, requires_stage2: false };
  }
  const lex = await loadDiseaseLexicon();
  const idx = buildDiseaseIndex(lex);
  const sentences = splitSentences(text);
  const allFlags: DetectorFlag[] = [];
  let offset = 0;
  for (const s of sentences) {
    allFlags.push(...scanSentence(s, idx, offset));
    offset += s.length + 1;
  }
  let score = 0;
  for (const f of allFlags) score += f.severity;
  return {
    flagged: allFlags.length > 0,
    flags: allFlags,
    total_score: score,
    requires_stage2: score >= STAGE2_THRESHOLD,
  };
}

export { STAGE2_THRESHOLD, PROXIMITY_WINDOW };
