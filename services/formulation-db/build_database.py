#!/usr/bin/env python3
"""
FarmCeutica Ingredient & Formulation Database Builder
Builds and populates a SQLite database from the 56-SKU formulation JSON.
"""

import json
import sqlite3
import csv
import re
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "farmceutica_formulations.db")
JSON_PATH = os.path.join(os.path.dirname(__file__), "formulation_data.json")
EXPORT_DIR = os.path.join(os.path.dirname(__file__), "exports")

# ── Known branded ingredients ──────────────────────────────────────────────
BRANDED_MAP = {
    "BioPerine®": "BioPerine",
    "BioPerine® (Black Pepper Extract)": "BioPerine",
    "BioPerine® Black Pepper Extract": "BioPerine",
    "CarnoSyn®": "CarnoSyn",
    "CarnoSyn® Beta-Alanine": "CarnoSyn",
    "PepZin GI®": "PepZin GI",
    "PepZin GI® (Zinc L-Carnosine)": "PepZin GI",
    "Quatrefolic®": "Quatrefolic",
    "Quatrefolic® (5-MTHF)": "Quatrefolic",
    "Quatrefolic® 5-MTHF": "Quatrefolic",
    "NNB DILEUCINE DL 185™": "NNB Dileucine",
    "NNB DILEUCINE DL 185": "NNB Dileucine",
    "Fatty15": "Fatty15",
    "Fatty15™": "Fatty15",
    "Fatty15 (C15:0)": "Fatty15",
    "Fatty15™ (C15:0)": "Fatty15",
    "Suntheanine®": "Suntheanine",
    "Suntheanine® L-Theanine": "Suntheanine",
    "MegaNatural®-BP": "MegaNatural-BP",
    "MegaNatural®-BP Grape Seed Extract": "MegaNatural-BP",
    "Kaneka Ubiquinol™": "Kaneka Ubiquinol",
    "Kaneka Ubiquinol": "Kaneka Ubiquinol",
    "AstaReal®": "AstaReal",
    "AstaReal® Astaxanthin": "AstaReal",
    "Albion®": "Albion",
    "KSM-66®": "KSM-66",
    "KSM-66® Ashwagandha": "KSM-66",
    "Magtein®": "Magtein",
    "Magtein® (Magnesium L-Threonate)": "Magtein",
    "Cognizin®": "Cognizin",
    "Cognizin® Citicoline": "Cognizin",
    "Setria®": "Setria",
    "Setria® Glutathione": "Setria",
    "TheraCurmin®": "TheraCurmin",
    "TheraCurmin® HP": "TheraCurmin",
    "Meriva®": "Meriva",
    "Meriva® Curcumin Phytosome": "Meriva",
}

# ── Category classification rules ─────────────────────────────────────────
VITAMIN_KEYWORDS = [
    "vitamin", "b1", "b2", "b3", "b6", "b12", "b5", "b7", "b9",
    "thiamine", "riboflavin", "niacin", "niacinamide", "pantothenic",
    "pyridoxine", "pyridoxal", "methylcobalamin", "adenosylcobalamin",
    "hydroxocobalamin", "cobalamin", "folate", "folic", "5-mthf",
    "mthf", "biotin", "ascorbic", "tocopherol", "tocotrienol",
    "retinol", "cholecalciferol", "ergocalciferol", "menaquinone",
    "phylloquinone", "quatrefolic", "inositol",
]

MINERAL_KEYWORDS = [
    "magnesium", "zinc", "selenium", "iron", "calcium", "potassium",
    "chromium", "copper", "manganese", "molybdenum", "iodine", "boron",
    "vanadium", "strontium", "lithium", "silica", "phosphorus",
    "pepzin gi", "magtein",
]

AMINO_ACID_KEYWORDS = [
    "l-theanine", "l-tyrosine", "l-glutamine", "l-carnitine", "l-tryptophan",
    "l-arginine", "l-citrulline", "l-lysine", "l-methionine", "l-serine",
    "l-glycine", "glycine", "taurine", "n-acetyl cysteine", "nac",
    "n-acetylcysteine", "beta-alanine", "carnosyn", "creatine",
    "betaine", "trimethylglycine", "tmg", "sam-e", "s-adenosyl",
    "acetyl-l-carnitine", "alcar", "theanine", "suntheanine",
    "glutathione", "setria", "homocysteine", "dileucine",
    "l-ornithine", "ornithine", "citrulline", "arginine",
]

BOTANICAL_KEYWORDS = [
    "curcumin", "ashwagandha", "berberine", "quercetin", "resveratrol",
    "grape seed", "green tea", "egcg", "turmeric", "ginger", "garlic",
    "rhodiola", "bacopa", "ginkgo", "milk thistle", "silymarin",
    "saw palmetto", "astragalus", "echinacea", "elderberry",
    "lion's mane", "reishi", "cordyceps", "chaga", "maitake",
    "turkey tail", "shiitake", "mushroom", "mycelium",
    "black seed", "nigella", "olive leaf", "oregano", "thyme",
    "cinnamon", "fenugreek", "tribulus", "tongkat ali",
    "holy basil", "tulsi", "schisandra", "passionflower",
    "valerian", "lemon balm", "chamomile", "lavender",
    "artichoke", "dandelion", "burdock", "nettle",
    "hawthorn", "pine bark", "pycnogenol", "boswellia",
    "cat's claw", "devil's claw", "black cohosh",
    "dong quai", "maca", "tribulus", "muira puama",
    "broccoli", "sulforaphane", "dim", "indole",
    "lutein", "zeaxanthin", "lycopene", "beta-carotene",
    "carotenoid", "meganatural", "theracurmin", "meriva",
    "ksm-66", "sensoril", "shoden",
    "pomegranate", "cranberry", "blueberry", "acai",
    "chlorella", "spirulina", "wheatgrass", "barley grass",
    "aloe", "neem", "moringa", "andrographis",
    "apigenin", "luteolin", "kaempferol", "rutin",
    "hesperidin", "naringenin", "ellagic acid",
    "pterostilbene", "fisetin", "dihydromyricetin",
    "honokiol", "magnolia",
]

ENZYME_KEYWORDS = [
    "enzyme", "bromelain", "papain", "serrapeptase", "nattokinase",
    "lipase", "protease", "amylase", "cellulase", "lactase",
    "dpp-iv", "catalase", "superoxide dismutase", "sod",
    "dao", "diamine oxidase",
]

PROBIOTIC_KEYWORDS = [
    "probiotic", "lactobacillus", "bifidobacterium", "saccharomyces",
    "bacillus", "streptococcus", "cfu", "spore",
]

COFACTOR_KEYWORDS = [
    "coq10", "ubiquinol", "ubiquinone", "pqq", "pyrroloquinoline",
    "nad+", "nad", "nadh", "nmn", "nicotinamide mononucleotide",
    "nicotinamide riboside", "nr", "alpha-lipoic", "r-lipoic",
    "lipoic acid", "fad", "fmn", "tetrahydrobiopterin", "bh4",
    "thiamine pyrophosphate", "methyltetrahydrofolate",
    "kaneka", "cognizin", "citicoline", "cdp-choline",
]

LIPID_KEYWORDS = [
    "omega-3", "omega-6", "dha", "epa", "fish oil",
    "phosphatidylcholine", "phosphatidylserine", "phospholipid",
    "lecithin", "krill", "fatty15", "c15:0", "pentadecanoic",
    "fatty acid", "cla", "gla", "mct", "medium-chain",
    "ceramide", "sphingolipid",
]

PEPTIDE_KEYWORDS = [
    "bpc-157", "bpc157", "peptide", "collagen peptide",
    "tb-500", "thymosin", "ghrp", "ipamorelin",
    "dihexa", "semax", "selank", "epithalon",
]


def classify_category(name: str) -> str:
    """Classify an ingredient into its category based on name keywords."""
    lower = name.lower()

    # Check in order of specificity
    for kw in PEPTIDE_KEYWORDS:
        if kw in lower:
            return "peptide"
    for kw in PROBIOTIC_KEYWORDS:
        if kw in lower:
            return "probiotic"
    for kw in ENZYME_KEYWORDS:
        if kw in lower:
            return "enzyme"
    for kw in COFACTOR_KEYWORDS:
        if kw in lower:
            return "cofactor"
    for kw in LIPID_KEYWORDS:
        if kw in lower:
            return "lipid"
    for kw in AMINO_ACID_KEYWORDS:
        if kw in lower:
            return "amino_acid"
    for kw in MINERAL_KEYWORDS:
        if kw in lower:
            return "mineral"
    for kw in VITAMIN_KEYWORDS:
        if kw in lower:
            return "vitamin"
    for kw in BOTANICAL_KEYWORDS:
        if kw in lower:
            return "botanical"

    return "other"


def parse_delivery_form(name: str) -> tuple[str, str]:
    """Extract delivery form prefix and canonical name."""
    prefixes = [
        ("Liposomal ", "liposomal"),
        ("Micellar ", "micellar"),
        ("Methylated ", "methylated"),
        ("Metylated ", "methylated"),  # handle typo in source data
    ]
    for prefix, form in prefixes:
        if name.startswith(prefix):
            canonical = name[len(prefix):]
            return form, canonical
    return "standard", name


def detect_branded(name: str) -> tuple[bool, str | None]:
    """Detect if an ingredient is a branded ingredient."""
    # Check exact matches first
    for pattern, brand in BRANDED_MAP.items():
        if pattern.lower() in name.lower() or name.lower() in pattern.lower():
            return True, brand

    # Check for ® or ™ symbols
    if "®" in name or "™" in name:
        # Extract brand name from before the symbol
        match = re.match(r"^([^®™]+)[®™]", name)
        if match:
            return True, match.group(1).strip()
        return True, name.split("®")[0].split("™")[0].strip()

    return False, None


# ── Gene target parsing ───────────────────────────────────────────────────
GENE_TARGETS = [
    "MTHFR", "COMT", "CBS", "DAO", "GST", "GSTM1", "GSTP1",
    "MAOA", "MAO-A", "MTR", "MTRR", "NAT", "NAT1", "NAT2",
    "NOS", "NOS3", "eNOS", "RFC1", "SHMT", "SHMT1",
    "SOD", "SOD2", "SUOX", "TCN2", "VDR", "ACAT",
    "ACHY", "ADO", "BHMT", "PEMT",
]


def parse_target_gene(product_name: str) -> str | None:
    """Extract gene target from genetic-targeted product name."""
    upper_name = product_name.upper()
    for gene in GENE_TARGETS:
        # Check if gene appears in the product name
        # Use word boundary matching
        pattern = r'\b' + re.escape(gene.upper()) + r'\b'
        if re.search(pattern, upper_name):
            # Normalize: strip suffixes, uppercase
            base = gene.upper().replace("MAO-A", "MAOA")
            return base
    # Some products have gene in the first part before ™ or +
    # e.g., "MTHFR+™ ..."
    match = re.match(r'^([A-Z0-9-]+)\+?[™®]?\s', product_name)
    if match:
        candidate = match.group(1).upper()
        if candidate in [g.upper() for g in GENE_TARGETS]:
            return candidate
    return None


def classify_delivery(delivery_str: str) -> int:
    """Map delivery string to classification ID."""
    d = delivery_str.lower()
    if "dual" in d or ("liposomal" in d and "micellar" in d):
        return 2  # Dual-Delivery
    if "phospholipid" in d or "liposomal" in d:
        return 3  # Phospholipid Encapsulation
    if "micellar" in d:
        return 4  # Micellar Transport
    return 1  # Standard


# Entries to filter out from formulas
FILTER_ENTRIES = {
    "TOTAL ACTIVE INGREDIENTS",
    "TOTAL FILL WEIGHT",
    "Total Active Ingredients",
    "Total Fill Weight",
}


def build_database():
    """Main database build function."""
    # Remove existing DB
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # ── Step 1: Create Schema ─────────────────────────────────────────
    print("Step 1: Creating schema...")

    cur.executescript("""
        CREATE TABLE delivery_classifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            classification TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            canonical_name TEXT,
            delivery_form TEXT,
            category TEXT,
            is_branded BOOLEAN DEFAULT FALSE,
            brand_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku_number INTEGER NOT NULL UNIQUE,
            product_name TEXT NOT NULL,
            clinical_intent TEXT,
            delivery_classification_id INTEGER REFERENCES delivery_classifications(id),
            product_line TEXT,
            target_gene TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE formulations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL REFERENCES products(id),
            ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
            dose_mg REAL NOT NULL,
            dose_unit TEXT DEFAULT 'mg',
            sort_order INTEGER,
            UNIQUE(product_id, ingredient_id)
        );

        CREATE VIEW ingredient_usage_summary AS
        SELECT
            i.name,
            i.category,
            i.delivery_form,
            COUNT(DISTINCT f.product_id) AS product_count,
            MIN(f.dose_mg) AS min_dose_mg,
            MAX(f.dose_mg) AS max_dose_mg,
            AVG(f.dose_mg) AS avg_dose_mg
        FROM ingredients i
        JOIN formulations f ON f.ingredient_id = i.id
        GROUP BY i.name, i.category, i.delivery_form
        ORDER BY product_count DESC;
    """)
    print("  Schema created successfully.")

    # ── Step 2: Populate Delivery Classifications ─────────────────────
    print("Step 2: Populating delivery classifications...")

    classifications = [
        (1, "Standard (Capsule/Powder)",
         "Capsule-optimized, no encapsulation technology"),
        (2, "Dual-Delivery (Liposomal + Micellar)",
         "Two-phase transport: phospholipid encapsulation + surfactant-stabilized micellar"),
        (3, "Phospholipid Encapsulation (Liposomal)",
         "Single-phase liposomal only"),
        (4, "Micellar Transport (Surfactant-Stabilized)",
         "Single-phase micellar only"),
    ]
    for cid, classification, description in classifications:
        cur.execute(
            "INSERT INTO delivery_classifications (id, classification, description) VALUES (?, ?, ?)",
            (cid, classification, description),
        )
    print("  4 delivery classifications inserted.")

    # ── Step 3: Parse and Insert All Data ─────────────────────────────
    print("Step 3: Parsing and inserting formulation data...")

    with open(JSON_PATH) as f:
        skus = json.load(f)

    print(f"  Loaded {len(skus)} SKUs from JSON.")

    # First pass: collect all unique ingredients
    ingredient_map = {}  # name -> {delivery_form, category, is_branded, brand_name, canonical_name}

    for sku in skus:
        for item in sku.get("formula", []):
            ing_name = item["ing"].strip()

            # Filter out total/fill weight entries
            if any(filt in ing_name for filt in FILTER_ENTRIES):
                continue

            if ing_name not in ingredient_map:
                delivery_form, canonical = parse_delivery_form(ing_name)
                is_branded, brand_name = detect_branded(ing_name)
                category = classify_category(canonical if canonical != ing_name else ing_name)

                ingredient_map[ing_name] = {
                    "delivery_form": delivery_form,
                    "canonical_name": canonical,
                    "category": category,
                    "is_branded": is_branded,
                    "brand_name": brand_name,
                }

    # Insert ingredients
    ingredient_ids = {}
    for name, attrs in sorted(ingredient_map.items()):
        cur.execute(
            """INSERT INTO ingredients (name, canonical_name, delivery_form, category, is_branded, brand_name)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (name, attrs["canonical_name"], attrs["delivery_form"],
             attrs["category"], attrs["is_branded"], attrs["brand_name"]),
        )
        ingredient_ids[name] = cur.lastrowid

    print(f"  {len(ingredient_ids)} unique ingredients inserted.")

    # Insert products and formulations
    product_count = 0
    formulation_count = 0

    for sku in skus:
        sku_num = sku["sku"]
        product_name = sku["name"]
        clinical_intent = sku.get("intent", "")
        delivery = sku.get("delivery", "Standard")
        delivery_class_id = classify_delivery(delivery)

        # Determine product line
        if sku_num <= 35:
            product_line = "core"
        else:
            product_line = "genetic_targeted"

        # Parse target gene for genetic-targeted products
        target_gene = None
        if product_line == "genetic_targeted":
            target_gene = parse_target_gene(product_name)

        cur.execute(
            """INSERT INTO products (sku_number, product_name, clinical_intent,
               delivery_classification_id, product_line, target_gene)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (sku_num, product_name, clinical_intent, delivery_class_id,
             product_line, target_gene),
        )
        product_id = cur.lastrowid
        product_count += 1

        # Insert formulations
        sort_order = 0
        for item in sku.get("formula", []):
            ing_name = item["ing"].strip()

            # Filter out total/fill weight entries
            if any(filt in ing_name for filt in FILTER_ENTRIES):
                continue

            sort_order += 1
            dose_mg = item["mg"]
            ing_id = ingredient_ids[ing_name]

            # Determine dose unit
            dose_unit = "mg"
            lower_name = ing_name.lower()
            if "mcg" in lower_name or dose_mg < 1:
                dose_unit = "mcg"
            if "cfu" in lower_name or "probiotic" in lower_name:
                dose_unit = "billion_cfu"
            if "iu" in lower_name:
                dose_unit = "iu"

            try:
                cur.execute(
                    """INSERT INTO formulations (product_id, ingredient_id, dose_mg, dose_unit, sort_order)
                       VALUES (?, ?, ?, ?, ?)""",
                    (product_id, ing_id, dose_mg, dose_unit, sort_order),
                )
                formulation_count += 1
            except sqlite3.IntegrityError:
                # Duplicate ingredient in same product — skip
                print(f"  Warning: Duplicate {ing_name} in SKU-{sku_num:02d}, skipping.")

    print(f"  {product_count} products inserted.")
    print(f"  {formulation_count} formulation mappings inserted.")

    conn.commit()

    # ── Step 4: Validate ──────────────────────────────────────────────
    print("\nStep 4: Running validation queries...")

    print("\n--- Total Counts ---")
    cur.execute("""
        SELECT 'Products' AS entity, COUNT(*) AS total FROM products
        UNION ALL SELECT 'Unique Ingredients', COUNT(*) FROM ingredients
        UNION ALL SELECT 'Formulation Mappings', COUNT(*) FROM formulations
    """)
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

    print("\n--- Delivery Classification Distribution ---")
    cur.execute("""
        SELECT dc.classification, COUNT(p.id) AS product_count
        FROM delivery_classifications dc
        LEFT JOIN products p ON p.delivery_classification_id = dc.id
        GROUP BY dc.classification
        ORDER BY product_count DESC
    """)
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

    print("\n--- Product Line Distribution ---")
    cur.execute("SELECT product_line, COUNT(*) FROM products GROUP BY product_line")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

    print("\n--- Top 20 Most-Used Ingredients ---")
    cur.execute("""
        SELECT i.name, i.delivery_form, COUNT(f.product_id) AS sku_count,
               MIN(f.dose_mg) AS min_mg, MAX(f.dose_mg) AS max_mg
        FROM ingredients i
        JOIN formulations f ON f.ingredient_id = i.id
        GROUP BY i.name
        ORDER BY sku_count DESC
        LIMIT 20
    """)
    for row in cur.fetchall():
        print(f"  {row[0]} ({row[1]}): {row[2]} SKUs, {row[3]}-{row[4]} mg")

    print("\n--- Ingredient Category Breakdown ---")
    cur.execute("SELECT category, COUNT(*) FROM ingredients GROUP BY category ORDER BY COUNT(*) DESC")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

    print("\n--- Top 10 Most Complex Formulas ---")
    cur.execute("""
        SELECT p.sku_number, p.product_name, COUNT(f.id) AS ingredient_count
        FROM products p
        JOIN formulations f ON f.product_id = p.id
        GROUP BY p.id
        ORDER BY ingredient_count DESC
        LIMIT 10
    """)
    for row in cur.fetchall():
        print(f"  SKU-{row[0]:02d} {row[1]}: {row[2]} ingredients")

    print("\n--- Genetic-Targeted Products and Target Genes ---")
    cur.execute("""
        SELECT sku_number, product_name, target_gene
        FROM products
        WHERE product_line = 'genetic_targeted'
        ORDER BY sku_number
    """)
    for row in cur.fetchall():
        print(f"  SKU-{row[0]:02d}: {row[1]} → {row[2]}")

    print("\n--- Branded Ingredient Inventory ---")
    cur.execute("""
        SELECT i.name, i.brand_name, i.delivery_form, COUNT(*) AS formulation_uses
        FROM ingredients i
        JOIN formulations f ON f.ingredient_id = i.id
        WHERE i.is_branded = TRUE
        GROUP BY i.id
        ORDER BY formulation_uses DESC
    """)
    for row in cur.fetchall():
        print(f"  {row[0]} ({row[1]}, {row[2]}): {row[3]} uses")

    # ── Step 5: Export ────────────────────────────────────────────────
    print("\nStep 5: Exporting files...")

    os.makedirs(EXPORT_DIR, exist_ok=True)

    # Export ingredient_usage_summary CSV
    summary_path = os.path.join(EXPORT_DIR, "ingredient_usage_summary.csv")
    cur.execute("SELECT * FROM ingredient_usage_summary")
    rows = cur.fetchall()
    cols = [desc[0] for desc in cur.description]
    with open(summary_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(cols)
        writer.writerows(rows)
    print(f"  Exported {len(rows)} rows to {summary_path}")

    # Export full formulations CSV
    formulations_path = os.path.join(EXPORT_DIR, "formulations_full.csv")
    cur.execute("""
        SELECT p.sku_number, p.product_name, i.name AS ingredient_name,
               f.dose_mg, i.delivery_form, i.category, f.dose_unit, f.sort_order
        FROM formulations f
        JOIN products p ON p.id = f.product_id
        JOIN ingredients i ON i.id = f.ingredient_id
        ORDER BY p.sku_number, f.sort_order
    """)
    rows = cur.fetchall()
    cols = [desc[0] for desc in cur.description]
    with open(formulations_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(cols)
        writer.writerows(rows)
    print(f"  Exported {len(rows)} rows to {formulations_path}")

    conn.close()
    print(f"\nDatabase saved to: {DB_PATH}")
    print("Build complete!")


if __name__ == "__main__":
    build_database()
