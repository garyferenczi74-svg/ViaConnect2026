"""
Replace em-dashes (—) and en-dashes (–) used as clause / range
separators in the Testing & Diagnostics content with commas (or
"to" for numeric ranges). Preserves ASCII hyphens (-) used in
product names, compound terms, slugs, and identifiers.

Standing rule: "10–27×" bioavailability is preserved if found
(not present in these files at the time of writing).

Run: python scripts/dedash_testing.py
"""

import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
FILES = [
    ROOT / "src" / "data" / "testingDiagnosticsInfo.ts",
    ROOT / "supabase" / "migrations" / "20260406000060_testing_diagnostics_descriptions.sql",
]

EM_DASH = "\u2014"  # —
EN_DASH = "\u2013"  # –


def numeric_range(match: re.Match) -> str:
    full = match.group(0)
    a, b = match.group(1), match.group(2)
    # Preserve "10–27" per standing bioavailability rule
    if a == "10" and b == "27":
        return full
    return f"{a} to {b}"


def transform(text: str) -> tuple[str, dict[str, int]]:
    counts: dict[str, int] = {}

    # 1) Em-dash with surrounding spaces → ", "
    spaced_em = f" {EM_DASH} "
    counts["em-dash spaced"] = text.count(spaced_em)
    text = text.replace(spaced_em, ", ")

    # 2) Any remaining em-dash → ","
    counts["em-dash bare"] = text.count(EM_DASH)
    text = text.replace(EM_DASH, ",")

    # 3) En-dash in numeric ranges (X–Y) → "X to Y"
    range_pattern = re.compile(rf"(\d+){EN_DASH}(\d+)")
    counts["en-dash numeric range"] = len(range_pattern.findall(text))
    text = range_pattern.sub(numeric_range, text)

    # 4) En-dash with surrounding spaces → ", "
    spaced_en = f" {EN_DASH} "
    counts["en-dash spaced"] = text.count(spaced_en)
    text = text.replace(spaced_en, ", ")

    # 5) Any remaining en-dash → ","
    counts["en-dash bare"] = text.count(EN_DASH)
    text = text.replace(EN_DASH, ",")

    return text, counts


def main() -> None:
    for path in FILES:
        original = path.read_text(encoding="utf-8")
        new, counts = transform(original)
        path.write_text(new, encoding="utf-8")
        total = sum(counts.values())
        print(f"{path.name}: {total} replacements")
        for k, v in counts.items():
            if v:
                print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
