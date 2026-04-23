/**
 * Centralized display-name resolver. Every client-facing render of an agent
 * or internal person name should flow through this function so copy stays
 * consistent and Marshall's BRAND.GETDISPLAYNAME_REQUIRED rule can verify.
 */

const NAME_MAP: Readonly<Record<string, string>> = {
  jeffery: "Jeffery",
  hannah: "Hannah",
  gordan: "Gordan",
  arnold: "Arnold",
  hounddog: "Hounddog",
  marshall_hounddog: "Hounddog Bridge",
  sherlock: "Sherlock",
  michelangelo: "Michelangelo",
  marshall: "Marshall",
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
