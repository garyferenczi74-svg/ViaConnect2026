export type ParsedLegacyLocation =
  | { kind: "city_st"; city: string; st: string }
  | { kind: "plain"; city: string }
  | { kind: "empty" };

const CITY_ST = /^(.*),\s*([A-Za-z]{2,3})$/;

export function parseLegacyLocation(raw: string): ParsedLegacyLocation {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { kind: "empty" };
  }

  const match = CITY_ST.exec(trimmed);
  const cityPart = match?.[1];
  const stPart = match?.[2];
  if (cityPart && stPart) {
    const city = cityPart.trim();
    const st = stPart.toUpperCase();
    if (city.length > 0) {
      return { kind: "city_st", city, st };
    }
  }

  return { kind: "plain", city: trimmed };
}
