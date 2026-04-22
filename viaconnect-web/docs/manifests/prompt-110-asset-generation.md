# Asset Generation Manifest — SNP & Testing/Diagnostics Artwork

**Scope:** 24 missing product images across two categories on viaconnectapp.com/shop.
**Bucket destination:** `Products` (capital P) — https://supabase.com/dashboard/project/nnhkcufyqjojdbvdrpky/storage/files/buckets/Products
**Companion prompt:** #110 — SNP & Genetic Testing Image Remediation.
**Pipeline-agnostic:** Each asset below includes a designer brief, an AI-image-generation prompt, and a Figma-template variable spec. Use whichever pipeline is fastest.

Saved from Gary's spec 2026-04-21. Treat as input handoff to the generation pipeline.

> **Scope Addendum — Category Lock (2026-04-21)**
>
> Gary confirmed that only two product categories pull from the `Products` bucket:
>
> - `Methylation / GeneX360` (18 SNP supplement SKUs in scope)
> - `Testing & Diagnostics` (6 genetic panel service cards in scope)
>
> All other categories (Proprietary Base, Peptides, Functional Mushrooms, Women's Health, Children's, Advanced) are rendering correctly and must not be touched. Every script under Prompt #110 filters products on these two categories before any `image_url` mutation.
>
> The `services/` subfolder referenced in earlier drafts of §3.1 is deprecated: service cards live at bucket ROOT (`Products/genex-m.webp`, etc.). The reality-check script still probes the legacy subfolder and flags any stale uploads for admin cleanup.

---

## 0 — Pre-Generation Verification (Do First)

Before generating or uploading ANY artwork, confirm the actual filename convention used for the two working bottles currently in the `Products` bucket:

1. Open https://supabase.com/dashboard/project/nnhkcufyqjojdbvdrpky/storage/files/buckets/Products
2. Look up the files associated with **DAO+ Histamine Balance** and **NAT Support+ Acetylation**.
3. Record the exact filenames.

The canonical convention assumed in this manifest is:

```
{short-gene-code-lowercase}-support.webp
```

Examples: `dao-support.webp`, `nat-support.webp`, `mthfr-support.webp`.

If the actual filenames differ (e.g., `DAO_Support_v2.png`, `snp-dao-bottle.webp`, or `dao.webp`), **stop and update every filename in §2 and §4 of this manifest to match the live convention.** Uploading 18 files under the wrong convention will leave the shop still broken even after the sync runs.

Alternatively, run `npx tsx scripts/audit/snp-bucket-reality-check.ts` (Prompt #110 §5.1); the script lists the bucket and surfaces any non-canonical filenames empirically.

---

## 1 — In-Scope Categories

Per Gary's confirmation (2026-04-21), only two product categories pull from the `Products` bucket for missing assets:

| Category (Display Name) | Product Type | Items to Generate |
|---|---|---|
| Methylation / GeneX360™ | SNP Supplement Bottle | 18 |
| Testing & Diagnostics | Genetic Panel Service Card | 6 |

All other categories (Proprietary Base, Peptides, Functional Mushrooms, Women's Health, Children's, Advanced) are confirmed rendering correctly. Do not touch.

---

## 2 — Methylation / GeneX360™ — 18 SNP Supplement Bottles

All 18 use the identical master template `VIACURA-SNP-Black-v1`, derived from the two working reference renders (DAO+ Histamine Balance and NAT Support+ Acetylation). Only the gene-code wordmark line changes per SKU.

### 2.1 Summary Table

| # | Display Name | Short Code | Target Filename | Wordmark Text |
|---|---|---|---|---|
| 1 | ACAT+ Mitochondrial Support | ACAT | `acat-support.webp` | ACAT SUPPORT+ |
| 2 | ACHY+ Acetylcholine Support | ACHY | `achy-support.webp` | ACHY SUPPORT+ |
| 3 | ADO Support+ Purine Metabolism | ADO | `ado-support.webp` | ADO SUPPORT+ |
| 4 | BHMT+ Methylation Support | BHMT | `bhmt-support.webp` | BHMT SUPPORT+ |
| 5 | CBS Support+ Sulfur Pathway | CBS | `cbs-support.webp` | CBS SUPPORT+ |
| 6 | COMT+ Neurotransmitter Balance | COMT | `comt-support.webp` | COMT SUPPORT+ |
| 7 | GST+ Cellular Detox | GST | `gst-support.webp` | GST SUPPORT+ |
| 8 | MAOA+ Neurochemical Balance | MAOA | `maoa-support.webp` | MAOA SUPPORT+ |
| 9 | MTHFR+ Folate Metabolism | MTHFR | `mthfr-support.webp` | MTHFR SUPPORT+ |
| 10 | MTR+ Methylation Matrix | MTR | `mtr-support.webp` | MTR SUPPORT+ |
| 11 | MTRR+ Methylcobalamin Regen | MTRR | `mtrr-support.webp` | MTRR SUPPORT+ |
| 12 | NOS+ Vascular Integrity | NOS | `nos-support.webp` | NOS SUPPORT+ |
| 13 | RFC1 Support+ Folate Transport | RFC1 | `rfc1-support.webp` | RFC1 SUPPORT+ |
| 14 | SHMT+ Glycine-Folate Balance | SHMT | `shmt-support.webp` | SHMT SUPPORT+ |
| 15 | SOD+ Antioxidant Defense | SOD | `sod-support.webp` | SOD SUPPORT+ |
| 16 | SUOX+ Sulfite Clearance | SUOX | `suox-support.webp` | SUOX SUPPORT+ |
| 17 | TCN2+ B12 Transport | TCN2 | `tcn2-support.webp` | TCN2 SUPPORT+ |
| 18 | VDR+ Receptor Activation | VDR | `vdr-support.webp` | VDR SUPPORT+ |

### 2.2 Master Template — VIACURA-SNP-Black-v1

| Element | Specification |
|---|---|
| Canvas | 1200 × 1500 px, 4:5 aspect ratio, sRGB color space |
| Background | Pure white `#FFFFFF` |
| Bottle silhouette | Matte black `#0A0A0A` with subtle vertical gradient to `#1A1A1A` at base; centered, ~70 % canvas height |
| Bottle cap | Same matte black, ~12 % canvas height, 96 % bottle-body width |
| VIACURA wordmark | Top of label, gold `#F5C518`, Instrument Sans Bold, ~52 px |
| Sub-tagline | "Your Genetics \| Your Protocol" beneath VIACURA, off-white `#E8E8E8`, Instrument Sans Italic, ~14 px |
| Gene-code wordmark | Mid-label, gold `#F5C518`, Instrument Sans Bold, ~64 px, format `{CODE} SUPPORT+` |
| Dual-circle graphic | Below wordmark, two overlapping circles, gold `#F5C518` at 70 % opacity, ~180 px diameter, 25 % horizontal overlap |
| Tech ribbon | "ADVANCED LIPOSOMAL TECHNOLOGY", 9 px, off-white, letter-spacing 0.15em |
| Capsule count | "60 CAPSULES", off-white `#E8E8E8`, 11 px, letter-spacing 0.1em |
| Footer micro | "GMP CERTIFIED · THIRD PARTY LAB TESTED · NUT FREE", 7 px, dim, near base |

### 2.3 AI Image Generation Prompt (Reusable Template)

Paste the template below into Midjourney / DALL-E / Stable Diffusion, substituting `{WORDMARK}` with the value from §2.1 for each SKU.

```
Product photography of a matte black supplement bottle centered on pure white background. Bottle fills 70 percent of frame height, deep black with subtle vertical gradient. Label contains, from top to bottom: bold gold sans-serif wordmark reading "VIACURA"; small italic off-white sub-line reading "Your Genetics | Your Protocol"; bold gold sans-serif centered wordmark reading "{WORDMARK}"; two overlapping gold circular graphics at 70 percent opacity; small uppercase off-white text reading "60 CAPSULES"; tiny dim footer reading "GMP CERTIFIED · THIRD PARTY LAB TESTED · NUT FREE". Studio product photography, subtle shadow, commercial quality, 4:5 aspect ratio, clean white background, no people, no hands, no secondary objects, crisp typography, e-commerce catalog style. --ar 4:5 --v 6 --style raw
```

### 2.4 Figma Template Variables

If using the existing `VIACURA-SNP-Black-v1` Figma component, set the following variable per instance:

| Variable | Values (one per SKU) |
|---|---|
| `{gene_code}` | ACAT, ACHY, ADO, BHMT, CBS, COMT, GST, MAOA, MTHFR, MTR, MTRR, NOS, RFC1, SHMT, SOD, SUOX, TCN2, VDR |
| `{wordmark}` | Auto-derived as `{gene_code} SUPPORT+` |
| `{filename_on_export}` | Auto-derived as `{gene_code_lowercase}-support.webp` |

Export at 1200 × 1500 px, WebP quality 82, single export per SKU.

---

## 3 — Testing & Diagnostics — 6 Genetic Panel Service Cards

These are NOT bottle photographs. They are identity cards for the GeneX360™ panel suite, each representing a distinct testing service. Visual language is Deep Navy + Teal per the design system. No gold-on-black (gold is reserved for the VIACURA supplement line).

### 3.1 Summary Table

| # | Panel Name | Target Filename | Wordmark | Subtitle |
|---|---|---|---|---|
| 1 | GeneX-M | `genex-m.webp` | GeneX-M | Master Methylation Panel |
| 2 | NutrigenDX | `nutrigendx.webp` | NutrigenDX | Nutrigenomic Response |
| 3 | HormoneIQ | `hormoneiq.webp` | HormoneIQ | Hormonal Pathway Panel |
| 4 | EpigenHQ | `epigenhq.webp` | EpigenHQ | Epigenetic Methylation Map |
| 5 | PeptideIQ | `peptideiq.webp` | PeptideIQ | Peptide Response Profile |
| 6 | CannabisIQ | `cannabisiq.webp` | CannabisIQ | Cannabinoid Response Panel |

**Note (resolved 2026-04-21):** Service cards live at bucket ROOT, not under `services/`. The scope addendum locks this. Reality-check still verifies; any file found under `services/` is flagged as a stale upload for admin cleanup.

### 3.2 Master Template — GeneX360-Service-v1

| Element | Specification |
|---|---|
| Canvas | 1200 × 1500 px, 4:5 aspect, sRGB |
| Background | Deep Navy `#1A2744`, subtle radial gradient lighter at center |
| Top-left tag | "TESTING & DIAGNOSTICS" in Teal `#2DA5A0`, 10 px, uppercase, letter-spacing 0.2em |
| Central motif | Panel-specific illustration (see §3.3), Teal `#2DA5A0` line-art on navy, optional gold `#F5C518` accent highlights |
| Primary wordmark | Panel name centered mid-canvas, white, Instrument Sans Bold, ~68 px |
| Subtitle | Below wordmark, off-white `#E8E8E8`, Instrument Sans Regular, ~18 px |
| GeneX360™ mark | Bottom-right corner, small teal badge reading "GeneX360™", 11 px |
| Footer stripe | 4 px Orange `#B75E18` horizontal line across bottom edge |

### 3.3 Per-Panel Motif Specifications

**1. GeneX-M — Master Methylation Panel**
Vertical DNA double-helix rendered as Teal line-art, with methyl groups (CH₃) highlighted in gold along 4 to 5 base pairs to indicate methylation sites. No text on the helix itself.

**2. NutrigenDX — Nutrigenomic Response**
Top-down view of a minimalist plate / bowl in teal line-art with a DNA strand superimposed as if emerging from the plate. Suggests food-genome interaction. Clean, abstract.

**3. HormoneIQ — Hormonal Pathway Panel**
Stylized human silhouette (chest-up, genderless) with 3 to 4 endocrine glands (thyroid, adrenals, pituitary) highlighted as small teal circles connected by flowing gold pathway lines.

**4. EpigenHQ — Epigenetic Methylation Map**
Chromatin spool (histone octamer wrapped by DNA) rendered in teal line-art with 6 to 8 methyl-tag annotations floating around it as small gold dots with tiny tag labels reading "CH₃".

**5. PeptideIQ — Peptide Response Profile**
Amino-acid chain (5 to 7 linked spheres) in teal transitioning into a folded 3D protein ribbon structure. Shows the peptide-to-protein journey abstractly.

**6. CannabisIQ — Cannabinoid Response Panel**
Cannabis leaf silhouette in teal at 40 % opacity forming the background layer, with a DNA double-helix overlay in full-opacity teal in the foreground. Gold molecular-bond dots scattered sparingly.

### 3.4 AI Image Generation Prompts (Per Panel)

Each service card needs a bespoke prompt because the central motif changes. Paste each directly into the generator:

**GeneX-M:**

```
Minimalist editorial design card, deep navy blue #1A2744 background with subtle radial gradient. Centered: vertical DNA double helix in teal line-art #2DA5A0, with 4 or 5 methyl-group annotations in gold #F5C518 highlighting specific base pairs. Top-left small uppercase teal label "TESTING & DIAGNOSTICS". Centered bold white sans-serif "GeneX-M" at mid-canvas, subtitle below "Master Methylation Panel" in lighter off-white. Bottom-right small teal badge "GeneX360". Thin orange line across bottom edge. Clean flat design, no photographs, no human hands, no realistic 3D rendering, 4:5 aspect ratio --ar 4:5 --v 6 --style raw
```

**NutrigenDX:**

```
Minimalist editorial design card, deep navy blue #1A2744 background. Central motif: top-down view of a stylized circular plate in teal line-art #2DA5A0 with a DNA double helix strand emerging from it diagonally. Top-left small uppercase teal label "TESTING & DIAGNOSTICS". Centered bold white sans-serif "NutrigenDX", subtitle "Nutrigenomic Response" below in off-white. Bottom-right small teal "GeneX360" badge. Thin orange line across bottom edge. Flat minimal design, abstract not realistic, no food photography, no hands, 4:5 aspect ratio --ar 4:5 --v 6 --style raw
```

**HormoneIQ:**

```
Minimalist editorial design card, deep navy blue #1A2744 background. Central motif: stylized genderless human silhouette from chest up in teal line-art #2DA5A0, with three or four endocrine glands (thyroid, adrenals, pituitary) highlighted as small glowing teal circles connected by flowing gold pathway lines. Top-left uppercase teal label "TESTING & DIAGNOSTICS". Centered bold white "HormoneIQ", subtitle "Hormonal Pathway Panel". Bottom-right small "GeneX360" teal badge. Orange accent line at bottom. Clean flat editorial design, no facial features on silhouette, 4:5 aspect ratio --ar 4:5 --v 6 --style raw
```

**EpigenHQ:**

```
Minimalist editorial design card, deep navy blue #1A2744 background. Central motif: chromatin spool (histone octamer with DNA wrapped around it) in teal line-art #2DA5A0, with six to eight small gold dots floating around representing methyl tags, each with a tiny "CH3" label in thin gold text. Top-left uppercase teal label "TESTING & DIAGNOSTICS". Centered bold white "EpigenHQ", subtitle "Epigenetic Methylation Map". Bottom-right small "GeneX360" teal badge. Orange line at bottom edge. Flat clean design, no photograph, 4:5 aspect ratio --ar 4:5 --v 6 --style raw
```

**PeptideIQ:**

```
Minimalist editorial design card, deep navy blue #1A2744 background. Central motif: chain of five to seven linked amino-acid spheres in teal #2DA5A0 transitioning smoothly into a folded 3D protein ribbon structure also in teal, suggesting peptide to protein transformation. Top-left uppercase teal label "TESTING & DIAGNOSTICS". Centered bold white "PeptideIQ", subtitle "Peptide Response Profile". Bottom-right small teal "GeneX360" badge. Thin orange line across bottom edge. Flat abstract design, no realistic 3D rendering, 4:5 aspect ratio --ar 4:5 --v 6 --style raw
```

**CannabisIQ:**

```
Minimalist editorial design card, deep navy blue #1A2744 background. Central motif: cannabis leaf silhouette in teal #2DA5A0 at 40 percent opacity forming the background layer, with a DNA double helix overlay in full opacity teal in the foreground, and small gold #F5C518 molecular-bond dots scattered sparingly across the composition. Top-left uppercase teal label "TESTING & DIAGNOSTICS". Centered bold white "CannabisIQ", subtitle "Cannabinoid Response Panel". Bottom-right small teal "GeneX360" badge. Orange line at bottom. Flat editorial design, no photography, 4:5 aspect ratio --ar 4:5 --v 6 --style raw
```

### 3.5 Compliance Flags

Per the standing compliance rules for ViaConnect:

- **Steve Rica (Compliance)** must approve all 6 service-card designs before upload. These cards are adjacent to label-claim-relevant content.
- **Dr. Fadi Dagher (Medical Director)** must approve the gene-pathway and endocrine-pathway visual representations for medical accuracy.

Recommend: batch approval review of all 6 cards together once generated, before any upload to the `Products` bucket.

---

## 4 — Generation-Pipeline Handoff Summary

### 4.1 If generating via AI image generator

1. Verify filenames in §0.
2. Generate 18 SNP bottle images using the §2.3 template, substituting `{WORDMARK}` per the §2.1 table.
3. Generate 6 service-card images using the §3.4 per-panel prompts.
4. Post-process each to crop to exactly 1200 × 1500, compress to WebP at quality 82.
5. Rename files per §2.1 and §3.1.
6. Hand to compliance review if any service card is included.
7. Upload via `scripts/upload-snp-assets.ts --source ./generated-assets --apply` (from Prompt #110 §5.5).

### 4.2 If generating via designer

1. Share this manifest as the brief (the .docx version is designer-friendly).
2. Provide the DAO+ and NAT+ working renders as visual references.
3. Request all 24 files in WebP format, 1200 × 1500 px, named per §2.1 and §3.1.
4. Include a soft deadline: recommend 5 business days for 18 bottle variants + 6 unique service cards.
5. Same compliance review before upload.

### 4.3 If generating via Figma template

1. Confirm the `VIACURA-SNP-Black-v1` component exists in the Figma file (or create it once using §2.2 specs).
2. Create an instance per SKU, set `{gene_code}` variable per §2.4.
3. Batch-export via Figma's export queue at 1200 × 1500 WebP quality 82.
4. Service cards require 6 bespoke designs: Figma templating is less useful here; probably designer or AI is faster for the Testing & Diagnostics cards.

---

## 5 — Filename-to-SKU Mapping (for Upload Script)

Source of truth for the upload helper and the sync runner to map uploaded filenames back to `products.image_url`. CSV version saved alongside this file as `prompt-110-asset-generation.csv`.

| Display Name | Category | Target Filename | Bucket Path |
|---|---|---|---|
| ACAT+ Mitochondrial Support | Methylation / GeneX360™ | `acat-support.webp` | `Products/acat-support.webp` |
| ACHY+ Acetylcholine Support | Methylation / GeneX360™ | `achy-support.webp` | `Products/achy-support.webp` |
| ADO Support+ Purine Metabolism | Methylation / GeneX360™ | `ado-support.webp` | `Products/ado-support.webp` |
| BHMT+ Methylation Support | Methylation / GeneX360™ | `bhmt-support.webp` | `Products/bhmt-support.webp` |
| CBS Support+ Sulfur Pathway | Methylation / GeneX360™ | `cbs-support.webp` | `Products/cbs-support.webp` |
| COMT+ Neurotransmitter Balance | Methylation / GeneX360™ | `comt-support.webp` | `Products/comt-support.webp` |
| GST+ Cellular Detox | Methylation / GeneX360™ | `gst-support.webp` | `Products/gst-support.webp` |
| MAOA+ Neurochemical Balance | Methylation / GeneX360™ | `maoa-support.webp` | `Products/maoa-support.webp` |
| MTHFR+ Folate Metabolism | Methylation / GeneX360™ | `mthfr-support.webp` | `Products/mthfr-support.webp` |
| MTR+ Methylation Matrix | Methylation / GeneX360™ | `mtr-support.webp` | `Products/mtr-support.webp` |
| MTRR+ Methylcobalamin Regen | Methylation / GeneX360™ | `mtrr-support.webp` | `Products/mtrr-support.webp` |
| NOS+ Vascular Integrity | Methylation / GeneX360™ | `nos-support.webp` | `Products/nos-support.webp` |
| RFC1 Support+ Folate Transport | Methylation / GeneX360™ | `rfc1-support.webp` | `Products/rfc1-support.webp` |
| SHMT+ Glycine-Folate Balance | Methylation / GeneX360™ | `shmt-support.webp` | `Products/shmt-support.webp` |
| SOD+ Antioxidant Defense | Methylation / GeneX360™ | `sod-support.webp` | `Products/sod-support.webp` |
| SUOX+ Sulfite Clearance | Methylation / GeneX360™ | `suox-support.webp` | `Products/suox-support.webp` |
| TCN2+ B12 Transport | Methylation / GeneX360™ | `tcn2-support.webp` | `Products/tcn2-support.webp` |
| VDR+ Receptor Activation | Methylation / GeneX360™ | `vdr-support.webp` | `Products/vdr-support.webp` |
| GeneX-M | Testing & Diagnostics | `genex-m.webp` | `Products/genex-m.webp` |
| NutrigenDX | Testing & Diagnostics | `nutrigendx.webp` | `Products/nutrigendx.webp` |
| HormoneIQ | Testing & Diagnostics | `hormoneiq.webp` | `Products/hormoneiq.webp` |
| EpigenHQ | Testing & Diagnostics | `epigenhq.webp` | `Products/epigenhq.webp` |
| PeptideIQ | Testing & Diagnostics | `peptideiq.webp` | `Products/peptideiq.webp` |
| CannabisIQ | Testing & Diagnostics | `cannabisiq.webp` | `Products/cannabisiq.webp` |

---

## Google Drive upload link

Upload to Prompt Library.
