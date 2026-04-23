# Amendment to Prompts #119 and #120 — Scope Correction

**Issued:** 2026-04-23
**Issued by:** Gary Ferenczi (CEO, FarmCeutica Wellness LLC)
**Applies to:** Prompt #119 (Marshall Compliance Officer Agent) and Prompt #120 (Hounddog to Marshall Bridge)
**Status:** Binding correction. Supersedes the affected sections of both prompts.

---

## 1. Summary

Prompts #119 and #120 incorrectly referenced **CedarGrowth Organics Solutions LLC** and **Via Cura Ranch** in their respective "Out of Scope" sections as candidates for future Marshall-related compliance work.

Those references are withdrawn.

CedarGrowth Organics Solutions LLC and Via Cura Ranch are **separate companies**. They have separate legal entities, ownership structures, codebases, databases, compliance surfaces, and roadmaps. They are not part of FarmCeutica Wellness LLC or the ViaConnect GeneX360 platform. They will never share Marshall's rule registry, compliance_findings ledger, audit chain, Hounddog collectors, practitioner registry, or any other ViaConnect infrastructure.

Any compliance, regulatory, or technology work for those companies is a separate engagement outside the scope of the ViaConnect Claude Code Prompt Library.

---

## 2. Text removed

### From Prompt #119, Section 18 "Out of Scope"
Both bullets removed:

- Prompt #121 (CedarGrowth cannabis compliance, METRC, NY OCM, MARSHALL.CANNABIS.* namespace).
- Prompt #123 (Via Cura Ranch Alberta/Canada psychedelic-therapy compliance module).

### From Prompt #120, Section 20 "Out of Scope"
Bullet removed:

- Prompt #122 (CedarGrowth parallel Hounddog module, MARSHALL.CANNABIS.* rule namespace).

---

## 3. Replacement text

### Prompt #119, corrected Section 18

> **18. Out of Scope (Reserved for Next Prompts)**
>
> - Prompt #120: Marshall integration with Hounddog social intelligence. **Delivered.**
> - Prompt #121: Jeffery proactive pre-check. Practitioner submits a draft post and receives a pre-publish Marshall scan. Pairs with a browser extension.
> - Prompt #122: SOC 2 evidence auto-exporter. Quarterly packet generation in Drata/Vanta-compatible format.
> - Prompt #123: Automated rebuttal drafter. Marshall generates a recommended practitioner response to false-positive appeals for Steve Rica's one-click approval.
> - Prompt #124: Counterfeit-detection vision model fine-tune (packaging authenticity, product-photo verification). Requires BAA-covered vision provider.

### Prompt #120, corrected Section 20

> **20. Out of Scope (Reserved for Next Prompts)**
>
> - Prompt #121: Jeffery proactive pre-check. Draft-post Marshall scan plus browser extension.
> - Prompt #122: SOC 2 evidence auto-exporter. Quarterly Drata/Vanta-compatible packet generation.
> - Prompt #123: Automated rebuttal drafter. Marshall-suggested practitioner responses for appeal review.
> - Prompt #124: Counterfeit-detection vision model. Packaging authenticity verification with BAA-covered vision provider.

---

## 4. Consolidated forward roadmap

After this amendment, the canonical forward-looking Marshall and Hounddog roadmap across both prompts is unified as follows.

| Prompt # | Title | Status |
| --- | --- | --- |
| 119 | Marshall Compliance Officer Agent: Runtime + Claude Code Integration | Delivered |
| 120 | Hounddog to Marshall Bridge: Social Intelligence Auto-Findings | Delivered |
| 121 | Jeffery Proactive Pre-Check: draft-post Marshall scan + browser extension | Planned |
| 122 | SOC 2 Evidence Auto-Exporter: quarterly Drata/Vanta-compatible packet generation | Planned |
| 123 | Automated Rebuttal Drafter: Marshall-suggested practitioner responses for appeal review | Planned |
| 124 | Counterfeit-Detection Vision Model: packaging authenticity verification, BAA-covered vision provider | Planned |

Any future prompt concerning a separate company will carry its own independent numbering scheme, its own repository, and its own prompt library. Explicitly outside the ViaConnect Prompt Library.

---

## 5. Implementation directive for Claude Code

This amendment is authoritative. When executing any Claude Code work derived from #119 or #120:

1. Treat the removed bullets as non-existent. Do not scaffold directories, rule namespaces, tables, or portals for CedarGrowth or Via Cura Ranch as part of ViaConnect work.
2. Do not create a `MARSHALL.CANNABIS.*` rule namespace in the ViaConnect codebase. No cannabis-compliance surface belongs in ViaConnect.
3. Do not create any module referencing Alberta/Canada psychedelic-therapy regulation in the ViaConnect codebase.
4. If any prior work in the ViaConnect codebase (files, migrations, schema, config, documentation) already contains references to CedarGrowth, Via Cura Ranch, cannabis compliance, METRC, NY OCM, or psychedelic therapy, flag those references for Gary's review. Do not remove them silently; an audit trail is required.
5. The renumbered forward roadmap in Section 4 of this amendment is the canonical sequence. Any conflicting numbering in prior drafts is superseded.

---

## 6. Already-uploaded Prompt Library files

- This amendment file (`amendment-119-120-scope-correction.md` plus the .docx counterpart) is to be uploaded alongside the originals.
- The original Prompt #119 and #120 files may remain in place. The amendment supersedes the named sections without requiring the originals to be deleted or rewritten.
- Any downstream document (PRDs, internal roadmaps, investor decks) that repeated the withdrawn bullets must be updated before next distribution.

---

## 7. Standing directive

From this point forward, no ViaConnect or FarmCeutica Claude Code prompt will reference CedarGrowth Organics or Via Cura Ranch in scope, out-of-scope, future roadmap, comparative architecture, or illustrative example, unless Gary explicitly directs otherwise in the prompt request itself.

This directive is memorialized in Claude's persistent memory and applies to all future work in the ViaConnect Prompt Library.

---

## 8. Implementation record

### Codebase changes made under this amendment (2026-04-23)

| Change | File | Why |
| --- | --- | --- |
| Removed `"viacura"` and `"via cura"` from `BRAND_TERMS` | `src/lib/compliance/dictionaries/disclosure_markers.ts` | Via Cura Ranch is a separate legal entity; its name cannot live in FarmCeutica's brand-protection dictionary, which feeds `MARSHALL.SOCIAL.DMCA_TRADEMARK_MISUSE`. Inline comment in the file documents the reason. |
| Added feedback-type persistent memory | `~/.claude/.../memory/feedback_separate_entities_scope.md` | Future Claude Code sessions honor the scope lock without relitigation. |

### Pre-existing references flagged to Gary, not silently removed (per Section 5.4)

| File | Content | Disposition |
| --- | --- | --- |
| `src/data/testingDiagnosticsInfo.ts` | `CannabisIQ` pharmacogenomic panel (CB1/CB2 receptor density, THC metabolism, COMT anxiety sensitivity) | Appears to be a legitimate FarmCeutica genetic-testing product line, not cannabis compliance. Awaiting Gary's review. |
| `src/types/custom-formulations.ts` | Comment "CBD / cannabis derivatives" on a formulation type | Formulation categorization; appears in-scope. Awaiting Gary's review. |
| `src/components/media-sources/tagColors.ts` and `sourceData.ts` | Research-journal categorization including "Cannabis and Cannabinoid Research" plus "Medical Cannabis" / "Cannabis Science" tag colors | Research source catalog for ingestion pipeline; appears in-scope. Awaiting Gary's review. |

No cannabis-compliance infrastructure, no `MARSHALL.CANNABIS.*` namespace, no CedarGrowth or Via Cura Ranch references were found in #119 or #120 deliverable code other than the `viacura` brand-term violation already corrected above.

### Commits

| Hash | Subject |
| --- | --- |
| `b400197` | feat(marshall): Prompt #119, Compliance Officer Agent runtime |
| `f48d95f` | feat(marshall): Prompt #120, Hounddog to Marshall bridge |
| `aa92ce0` | fix(marshall): scope correction per #119/#120 amendment |

---

## 9. Acknowledgement

The inclusion of CedarGrowth Organics and Via Cura Ranch in #119 Section 18 and #120 Section 20 was a scoping error. The prior standing rules distinguishing those companies as separate ventures were clear and should have been respected. This amendment formally withdraws the error and re-establishes the scope boundary.

Every other section of Prompt #119 and Prompt #120 remains in force and unaltered.

**Marshall, Compliance Officer, ViaConnect. Cite. Remediate. Document.**
