/**
 * Centralized display-name resolver. Every client-facing render of an agent
 * or internal person name should flow through this function so copy stays
 * consistent and Marshall's BRAND.GETDISPLAYNAME_REQUIRED rule can verify.
 */

const NAME_MAP: Readonly<Record<string, string>> = {
  jeffery: "Jeffery",
  aria: "ARIA",
  hannah: "Hannah",
  // gordon is the canonical slug. 'gordan' was a historical misspelling;
  // no live rows carry it (verified 2026-06-12), but the alias stays as
  // cheap insurance so any stray legacy value still renders the real name.
  gordon: "Gordon",
  gordan: "Gordon",
  arnold: "Arnold",
  hounddog: "Hound Dog",
  hound_dog: "Hound Dog",
  marshall_hounddog: "Hound Dog Bridge",
  sherlock: "Sherlock",
  michelangelo: "Michelangelo",
  marshall: "Marshall",
  // Prompt 214a: historical slug only; live roster has no Kelsey seat.
  kelsey: "Kelsey",
  lex: "Lex",
  security_advisor: "Security Advisor",
  performance_advisor: "Performance Advisor",
  security: "Security Advisor",
  performance: "Performance Advisor",
  marshall_precheck: "Marshall Pre-Check",
  marshall_extension: "Marshall Pre-Check Extension",
  // Prompt 214c
  thanos: "Thanos",
  elysium: "Elysium",
  my_genetics: "Elysium",
  peptide_education: "Thanos",
  // Humans
  gary: "Gary",
  steve_rica: "Steve Rica",
  domenic: "Domenic Romeo",
  fadi: "Dr. Fadi Dagher",
  thomas: "Thomas",
};

export function getDisplayName(slug: string): string {
  const key = slug.trim().toLowerCase();
  return NAME_MAP[key] ?? slug;
}

export function isKnownSlug(slug: string): boolean {
  return NAME_MAP[slug.trim().toLowerCase()] !== undefined;
}
