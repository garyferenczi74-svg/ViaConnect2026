export function subdivisionLabelForCountry(
  code: string,
): "State" | "Province" | "Region or County" {
  const normalized = code.trim().toUpperCase();
  if (normalized === "US" || normalized === "AU") {
    return "State";
  }
  if (normalized === "CA") {
    return "Province";
  }
  return "Region or County";
}
