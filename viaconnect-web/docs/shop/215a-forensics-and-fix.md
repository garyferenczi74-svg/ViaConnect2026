# Prompt 215a: Forensics and corrective fix

## Phase 0: What 215 actually did

**Commit:** `c14713c5` feat(215): shop product five-tab model and genetic compatibility

### Files changed (215)
- Added `ProductTabs.tsx` (tab-strip UI, NOT Accordion)
- Added `productTabs/*` seed, scoring, lexicon, loaders
- Migration `20260812070000_prompt_215_product_tabs.sql` (not required for seed fallback)
- Mounted ProductTabs on product page only when `variant === 'supplement' && tabContent.length > 0`
- **Removed** Accordion Full Description + Formulation from `PdpRightRail`

### Why live Clean+ only showed two sections
1. **Production was not on 215:** deploy alias still pointed at pre-215 builds (17h+ older). Live HTML had Formulation in meta/marketing strings but no `data-accordion` / `product-tabs`.
2. **Pre-215 pattern:** `PdpRightRail` Accordion only ever had **two** sections: Full Description + Formulation (#152p). Ingredient Breakdown, Who Benefits, Genetic Compatibility were never mounted on the PDP.
3. **215 pattern mismatch:** Built tabs (ProductTabs) while Gary/product pattern is Accordion; even if 215 deployed, slug miss could yield `tabContent.length === 0` so ProductTabs never rendered:
   - Live slug example: `clean-plus-detox-and-liver-health`
   - Master slug: `clean-detox-liver-health`
   - Weak alias resolver returned `[]` for many shop URLs

### Content loss assessment
- **Not deleted from git:** masterFormulations marketing + ingredients intact.
- **Not migrated as four long-scroll sections:** pre-215 `/full` page only had Description + Formulation list. Structured Balance+ "four sections" lived as long markdown in product.description when present; 215 seed put narrative in Full Description and generated Who Benefits as PENDING drafts.
- **No P0 content purge:** recover = keep seed + prefer product.description when richer + fix slug resolve + always mount five headers.

### Failure mode of the false completion claim
| Failure | Detail |
| :------ | :----- |
| Wrong surface tested | Completeness tests on seed arrays, not rendered PDP |
| Wrong pattern | Tabs built; product uses Accordion |
| Conditional mount | `tabContent.length > 0` allowed zero sections |
| Slug drift | Shop URL ≠ master slug → empty seed |
| No live verification | No production fetch; no screenshot gate |
| Deploy lag unreported | Claimed complete without confirming production commit |

## 215a corrective actions
1. Shared `ProductAccordions` using `Accordion` (five headers exact labels).
2. Always `buildFiveSections(product)` for supplements; never empty.
3. Robust `resolveFormulationBySlug` for Clean+/Balance+/ACHY+.
4. Genetic Compatibility always present (scoring + empty states).
5. Catalog-wide completeness tests that fail CI if any master product lacks five keys.
6. Direct push main; production fetch verification after deploy.
