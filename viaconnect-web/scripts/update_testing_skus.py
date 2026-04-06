"""
One-shot updater for the 8 Testing & Diagnostics entries in
farmceutica_master_skus.json (Prompt #49g).

- Renames to prompt-defined names (with ™)
- Updates MSRP where the user provided new pricing
- Recalculates Wholesale, Distributor, DTCMargin, WSMargin, DistMargin, COGSRatio
  based on existing (real) COGS values
- Preserves the file's BOM and "two spaces after colon" formatting

Run: python scripts/update_testing_skus.py
"""

import json
import re
from pathlib import Path

JSON_PATH = Path(__file__).parent.parent / "src" / "data" / "farmceutica_master_skus.json"

# SKU -> (new_name, new_msrp)
UPDATES = {
    "57": ("GeneX-M™ Methylation Panel", 288.88),
    "58": ("NutrigenDX™ Genetic Nutrition Panel", 388.88),
    "59": ("HormoneIQ™ Genetic Hormone Panel", 388.88),
    "60": ("EpigenHQ™ Epigenetic Aging Panel", 458.88),
    "61": ("GeneX360™ Complete Genetic Panel", 988.88),
    "62": ("30-Day Custom Vitamin Package", 198.88),
    "67": ("PeptideIQ™ Genetic Peptide Response Panel", 488.88),
    "68": ("CannabisIQ™ Genetic Cannabinoid Panel", 198.88),
}


def recalc(entry: dict, new_msrp: float) -> None:
    cogs = float(entry["COGS"])
    wholesale = round(new_msrp * 0.5, 2)
    distributor = round(new_msrp * 0.3, 2)
    entry["MSRP"] = new_msrp
    entry["Wholesale"] = wholesale
    entry["Distributor"] = distributor
    entry["DTCMargin"] = round((new_msrp - cogs) / new_msrp * 100, 1)
    entry["WSMargin"] = round((wholesale - cogs) / wholesale * 100, 1)
    entry["DistMargin"] = round((distributor - cogs) / distributor * 100, 1)
    entry["COGSRatio"] = round(cogs / new_msrp * 100, 1)


def main() -> None:
    with JSON_PATH.open(encoding="utf-8-sig") as f:
        data = json.load(f)

    touched = 0
    for entry in data:
        sku = entry.get("SKU")
        if sku in UPDATES:
            new_name, new_msrp = UPDATES[sku]
            entry["Name"] = new_name
            recalc(entry, new_msrp)
            touched += 1

    if touched != len(UPDATES):
        raise SystemExit(f"Expected {len(UPDATES)} updates, applied {touched}")

    # Serialize with 4-space indent
    text = json.dumps(data, indent=4, ensure_ascii=False)
    # Match the file's quirky "two spaces after colon" formatting
    text = re.sub(r'":\s', '":  ', text)

    # Write with UTF-8 BOM (matches existing file)
    with JSON_PATH.open("w", encoding="utf-8-sig") as f:
        f.write(text)

    print(f"Updated {touched} testing SKUs in {JSON_PATH.name}")


if __name__ == "__main__":
    main()
