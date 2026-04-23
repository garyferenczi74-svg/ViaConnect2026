/**
 * Marshall dictionary: FTC-compliant material-connection disclosure markers.
 * Practitioner-authored social content promoting a FarmCeutica product must
 * contain at least one of these strings (case-insensitive substring match).
 * Maintained here so Steve Rica can see the list in code.
 */

export const DISCLOSURE_MARKERS: readonly string[] = [
  // Hashtag style
  "#ad",
  "#sponsored",
  "#partner",
  "#paidpartnership",
  "#paid partnership",
  "#affiliate",
  "#brandpartner",
  "#brandambassador",

  // Plain-English
  "paid partnership",
  "sponsored by",
  "in partnership with",
  "i am a practitioner for",
  "i work with farmceutica",
  "i am a farmceutica",
  "farmceutica sent me",
  "affiliate link",
  "compensated",
  "material connection",
  "received product",
  "received this product",
  "received as a gift",
  "gifted product",

  // Platform-specific native labels
  "paid promotion",
  "includes paid promotion",
  "#eureka",
] as const;

export function hasDisclosure(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return DISCLOSURE_MARKERS.some((m) => lower.includes(m));
}

export const BRAND_TERMS: readonly string[] = [
  "farmceutica",
  "viaconnect",
  "viacura",
  "via cura",
  "genex360",
  "gene x360",
  "helix rewards",
] as const;

export function mentionsFarmceuticaBrand(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BRAND_TERMS.some((b) => lower.includes(b));
}
