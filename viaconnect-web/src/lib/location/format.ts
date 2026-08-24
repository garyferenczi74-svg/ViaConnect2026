import type { StructuredLocation } from "./types";

function displaySubdivision(loc: StructuredLocation): string | null {
  const code = loc.subdivisionCode?.trim() ?? "";
  if (code.length > 0) {
    const hyphen = code.lastIndexOf("-");
    if (hyphen >= 0 && hyphen < code.length - 1) {
      return code.slice(hyphen + 1);
    }
    return code;
  }
  const name = loc.subdivisionName?.trim() ?? "";
  return name.length > 0 ? name : null;
}

export function formatStructuredLocation(
  loc: StructuredLocation | null,
): string {
  if (!loc) {
    return "";
  }

  const parts: string[] = [];
  const city = loc.city.trim();
  if (city.length > 0) {
    parts.push(city);
  }

  const subdivision = displaySubdivision(loc);
  if (subdivision) {
    parts.push(subdivision);
  }

  const country = loc.countryName.trim();
  if (country.length > 0) {
    parts.push(country);
  }

  return parts.join(", ");
}
