# Prompt 215: Shop sweep and five-tab product model

## Phase 1 sweep matrix (consumer SKUs)

**Source of truth for catalog structure:** `MASTER_FORMULATIONS` (60 products).  
**Runtime catalog:** Supabase `products` (peptide-excluding queries already enforced).  
**Excluded:** all peptide commercial surfaces per 214d (`/shop/peptides` retired).

| Section | Status across catalog |
| :------ | :-------------------- |
| Full Description | Present as `marketingDescription` / `products.description` (migrated approved unless `isDraft`) |
| Ingredient Breakdown | Present as ingredient arrays (migrated approved) |
| Who Benefits and What Makes This Different? | **Missing as dedicated section** on most PDPs; backfilled PENDING |
| Formulation | Present as ingredients + delivery form (migrated approved) |
| Genetic Compatibility | **New** (computed; not static long-scroll) |

**Draft formulations (18 GENEX360 SNP support):** `isDraft: true` in master file; full_description / formulation / ingredients gate as **pending** until founder review.

**Lexicon findings:**
- Master copy used `10–28×` and em dashes; normalizer rewrites to `10x to 28x` and ASCII hyphens.
- FarmCeutica references in formulation marketing rewritten to Via Cura for consumer copy seed.
- Balance+ gut product slug in master: `balance-gut-repair` (URL alias `balance-plus-gut-repair` supported in loaders).

### Sample matrix rows (representative)

| Product slug | Desc | Ingredients | Who benefits | Formulation | Genetics |
| :----------- | :--- | :---------- | :----------- | :---------- | :------- |
| methylb-complete-b-complex | approved | approved | pending | approved | live score |
| balance-gut-repair | approved | approved | pending | approved | live score |
| mthfr-folate-metabolism (draft) | pending | pending | pending | pending | live score |
| lions-mane-mushroom | approved | approved | pending | approved | live score |

Full 60 slugs: see `seededProductSlugs()` / masterFormulations.

## Threshold logic (Elysium)

See comments in `src/lib/shop/productTabs/compatibility.ts`.

- positive strong/moderate → green weight 2/1  
- mixed/coverage/emerging → yellow weight 1  
- caution → red weight 2  
- red if redWeight > 0 and redWeight >= greenWeight  
- green if greenWeight >= 2 and greenWeight > yellowWeight  
- else yellow if any signal or coverage-only  

## Approved framing vocabulary (Gary sign-off)

| Band | Phrase |
| :--- | :----- |
| Green | strong genetic relevance for you |
| Yellow | moderate or partial relevance |
| Red | lower relevance for your genetics |
| Red caution | lower relevance for your genetics based on a flagged association in our mapping |
| Disclaimer | Educational information based on genetic relevance research, not medical advice. Consult a healthcare provider before making supplement decisions. |

## ingredient_snp_relevance seed summary

15 mapping rows: methyl-folate, methylcobalamin, magnesium, omega-3, curcumin, glutathione-nac, coq10-nad, iron (caution), caffeine-related, comt-support, probiotic-gut, collagen-joint.  
Evidence grades: strong, moderate, emerging, unknown.  
Variants: MTHFR, MTRR, VDR, FADS1, IL6, TNF, GSTP1, CYP1A2, HFE, COMT, TLR4, COL1A1.

## Migrations

- `20260812070000_prompt_215_product_tabs.sql`

## Backfill gate breakdown (seed)

| Gate | Approx count |
| :--- | :----------- |
| approved | full_description + ingredient_breakdown + formulation for non-draft (~42 x 3) + genetic shells (60) |
| pending | who_benefits for all 60 + draft product tabs for 18 SNP drafts |

## Performance Advisor note

Product page now loads tab content (seed/local first) + optional Supabase product_content and score inputs. Fail-open timeouts remain on shop product fetch. Score is per-user, not shared-cache.

## Gary rulings

1. Approve PENDING who_benefits drafts for live render.  
2. Confirm draft SNP formulation data for 18 GENEX360 support products.  
3. Sign off framing vocabulary table above.  
4. Confirm iron caution mapping remains Marshall-approved for red band.  
