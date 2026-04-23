// Prompt #113 — Stage 1 deterministic disease-claim detector.
// Pharmaceutical action verbs within ±6 tokens of a disease term is a
// flag. Superiority patterns against drug classes flag separately.

export const DISEASE_ACTION_VERBS: readonly string[] = [
  "treat", "treats", "treated", "treating", "treatment",
  "cure", "cures", "cured", "curing",
  "prevent", "prevents", "prevented", "preventing", "prevention",
  "mitigate", "mitigates", "mitigated", "mitigating",
  "diagnose", "diagnoses", "diagnosed", "diagnosing", "diagnosis",
  "remedy", "remedies", "remedied", "remedying",
  "heal", "heals", "healed", "healing",
  "reverse", "reverses", "reversed", "reversing",
  "eliminate", "eliminates", "eliminated", "eliminating",
  "eradicate", "eradicates", "eradicated", "eradicating",
  "fix", "fixes", "fixed", "fixing",
  "stop", "stops", "stopped", "stopping",
];

// Superiority patterns. Sherlock review expanded to catch "as effective as"
// and "no need for <Rx>" in addition to the original three patterns.
export const SUPERIORITY_REGEXES: readonly { rule: string; re: RegExp }[] = [
  { rule: "superiority_better_than_drug",      re: /\b(better|stronger|more\s+effective)\s+than\s+(statin|metformin|ozempic|semaglutide|insulin|lisinopril|prozac|zoloft|xanax|adderall|warfarin|antibiotic|antidepressant|ssri|nsaid)/i },
  { rule: "superiority_as_effective_as_drug",  re: /\bas\s+effective\s+as\s+(statin|metformin|ozempic|semaglutide|insulin|lisinopril|prozac|zoloft|xanax|adderall|warfarin|antibiotic|antidepressant|ssri|nsaid)/i },
  { rule: "superiority_replaces_drug",         re: /\b(replaces?|replacing)\s+(your\s+|the\s+)?(statin|metformin|ozempic|semaglutide|insulin|lisinopril|prozac|zoloft|xanax|adderall|warfarin|antibiotic|antidepressant|ssri|nsaid)/i },
  { rule: "superiority_eliminates_need",       re: /\b(eliminates?|eliminating)\s+(the\s+)?need\s+for\s+(medication|drug|statin|insulin|ssri|antidepressant)/i },
  { rule: "superiority_no_need_for_rx",        re: /\bno\s+(more\s+)?need\s+for\s+(your\s+)?(prescription|medication|statin|insulin|ssri|antidepressant)/i },
];

export const VERB_STRENGTH: Record<string, number> = {
  cure: 5, cures: 5, cured: 5, curing: 5,
  treat: 4, treats: 4, treated: 4, treating: 4, treatment: 4,
  prevent: 4, prevents: 4, prevented: 4, preventing: 4, prevention: 4,
  mitigate: 3, mitigates: 3, mitigated: 3, mitigating: 3,
  diagnose: 3, diagnoses: 3, diagnosed: 3, diagnosing: 3, diagnosis: 3,
  remedy: 3, remedies: 3,
  heal: 3, heals: 3, healed: 3, healing: 3,
  reverse: 4, reverses: 4, reversed: 4, reversing: 4,
  eliminate: 4, eliminates: 4, eliminated: 4, eliminating: 4,
  eradicate: 5, eradicates: 5, eradicated: 5, eradicating: 5,
  fix: 3, fixes: 3, fixed: 3, fixing: 3,
  stop: 3, stops: 3, stopped: 3, stopping: 3,
};

export function isActionVerb(token: string): boolean {
  return DISEASE_ACTION_VERBS.includes(token);
}

export function getVerbStrength(token: string): number {
  return VERB_STRENGTH[token] ?? 2;
}
