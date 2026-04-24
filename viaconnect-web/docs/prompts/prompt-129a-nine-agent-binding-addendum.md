# Prompt #129a — Addendum: Nine-Agent Binding

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO & Founder
**Classification:** Addendum / Supersession of Prompt #129 §6 (append-only)
**Parent prompt:** Prompt #129 — External Repository Governance Policy
**Supersedes:** §6.5 of Prompt #129 (amended in §5.4 below); adds §6.6, §6.7, §6.8 to Prompt #129
**Does NOT supersede:** §§1–5, §§7–11 of Prompt #129, which remain in full force
**Status:** Active — binding on all nine currently-defined ViaConnect sub-agents and all future sub-agents
**Bundle ID affected:** com.farmceutica.viaconnect
**Issue reason:** Correction of naming-completeness gap identified during Claude Code session when updating `.claude/agents/*.md` per Prompt #129 §9 item 3

---

## 1. Supersession Clause

Per the append-only discipline established in Prompt #129 §10 ("the original Prompt #129 is never edited"), this addendum does not modify the source text of Prompt #129. Instead, this addendum is a first-class document in the prompt library that (a) expands the enumeration in §6 of Prompt #129 from six named sub-agents to the full nine currently defined under the Jeffery orchestration layer, (b) amends the inheritance language in §6.5 to distinguish "currently-defined" from "future" sub-agents, and (c) resolves a namespace collision between "Hounddog" (the admin content intelligence dashboard product, Prompts #100–102) and "Hounddog" (the sub-agent definition file under `.claude/agents/`).

When Prompt #129 and Prompt #129a disagree at the sentence level, Prompt #129a controls. When they agree, Prompt #129 is the canonical reference.

---

## 2. Scope & Rationale

### 2.1 What triggered this addendum

During the Claude Code session following delivery of Prompt #129, the operator (Claude Code) correctly identified that the `.claude/agents/` directory contains nine sub-agent definition files, not six: Jeffery, Michelangelo, Sherlock, Hannah, Arnold, Gordon, Hounddog, Marshall, LEX. Prompt #129 §6 named only six by section (Jeffery §6.1, Michelangelo §6.2, Sherlock §6.3, Hannah / Arnold / LEX™ grouped in §6.4) and relied on §6.5's "any future sub-agent" language to cover the remainder.

This inheritance-by-implication was adequate in theory — the rule applied to Gordon, Hounddog, and Marshall transitively — but in practice it created two real problems:

1. **Audit defensibility weakness.** A compliance reviewer, regulator, or acquirer reading the prompt library six months or six years from now would see that three agents actively writing to the ViaConnect repository were never named in the policy that binds them. Even though §6.5 covers them in legal substance, the absence of their names in the enforcement section would read as an oversight rather than a deliberate design choice.
2. **Execution risk at the `.claude/agents/*.md` layer.** Claude Code's item-3 task (per Prompt #129 §9) is to add §4 references to each of the nine agent-card files. If three of those nine cards reference a policy that doesn't enumerate them, the cards themselves become self-referentially incoherent. This is exactly the kind of audit-trail fiction Prompt #129 was designed to prevent.

### 2.2 Why this is issued as #129a rather than #130

Numbering conventions in the ViaConnect prompt library reserve integer increments for substantively new work and use letter suffixes (e.g., #15a, #15h, #17b, #60a–60d) for amendments, extensions, and clarifications of a parent prompt that remain topically contiguous with it. This addendum is not new policy — it is a completeness correction to Prompt #129's existing policy. Therefore it takes the 129a designation, preserving #130 for the next substantively new deliverable (the most likely candidate being Prompt #130 — Sherlock External-Repository Evaluation Template, operationalizing item 7 of Prompt #129 §9).

### 2.3 Why this is issued before Claude Code executes item 3

Prompt #129 §9 item 3 directs Claude Code to update the nine `.claude/agents/*.md` files to reference §4 of Prompt #129. If Claude Code executes item 3 against Prompt #129 as originally written, three of those nine commits will reference a policy that does not enumerate the agent being committed. Issuing #129a first means Claude Code's commit can reference the complete binding (Prompt #129 plus Prompt #129a), and every agent-card file lands with a provenance trail that matches the policy text.

---

## 3. The Nine-Agent Roster (Definitive Enumeration)

The following nine sub-agents are currently defined under the Jeffery orchestration layer and are bound by Prompt #129 as amended by this addendum. This enumeration is authoritative as of the date of this prompt.

| # | Agent | Role (as known to policy) | Bound under |
|---|-------|---------------------------|-------------|
| 1 | Jeffery | Orchestrator; gatekeeper for external repository references; dispatcher to domain agents | §6.1 of #129 |
| 2 | Michelangelo | TDD/dev; enforces OBRA (Observe → Blueprint → Review → Audit); 13-point code review; verbatim-match Audit scan | §6.2 of #129 |
| 3 | Sherlock | Research; exclusive producer of external-repository research artifacts; tier-classification recommender | §6.3 of #129 |
| 4 | Hannah | UX / tutorial; Ultrathink™ reasoning layer; Tavus CVI avatar (Prompt #88) | §6.4 of #129 |
| 5 | Arnold | Body Tracker ecosystem owner; Reconciliation Layer; recommendation engine; A/B testing | §6.4 of #129 |
| 6 | LEX™ | Appellate litigator; Litigation Case Management System (Prompt #116); PACER, e-filing, docket tracking, discovery, IOLTA, MAP enforcement escalation | §6.4 of #129 |
| 7 | Gordon | Role descriptor pending Gary's confirmation | §6.6 (new, this addendum) |
| 8 | Hounddog (agent) | Role descriptor pending Gary's confirmation — not to be confused with the Hounddog Admin Content Intelligence Dashboard (Prompts #100–102); see §4 of this addendum for disambiguation | §6.7 (new, this addendum) |
| 9 | Marshall | Role descriptor pending Gary's confirmation | §6.8 (new, this addendum) |

Role descriptors for Gordon, Hounddog (agent), and Marshall are deliberately marked "pending Gary's confirmation" rather than inferred. A minor amendment (Prompt #129b) may be issued later to populate these fields once their role definitions are formally documented; the binding established in §§6.6–6.8 below operates independently of the descriptors and is effective immediately.

---

## 4. Hounddog Disambiguation

### 4.1 The collision

The name "Hounddog" now refers to two distinct entities in the ViaConnect namespace:

1. **Hounddog (product):** The admin content intelligence dashboard introduced in Prompts #100–102, gated behind `gary@farmceuticawellness.com`, covering MAP pricing enforcement monitoring, social listening, practitioner waiver surface, and VIP exemption administration.
2. **Hounddog (agent):** A sub-agent definition file at `.claude/agents/hounddog.md` (or similar path) operating under the Jeffery orchestration layer and now bound under §6.7 of Prompt #129 as amended.

Left unresolved, this collision creates ambiguity in future prompts, agent-card files, commit messages, migration comments, and any downstream documentation that refers to "Hounddog" without qualification.

### 4.2 Required disambiguation convention

Effective immediately, all ViaConnect-adjacent writing must disambiguate Hounddog references using one of the following forms:

- **"Hounddog Admin Dashboard"** or **"Hounddog (admin dashboard)"** — when referring to the Prompts #100–102 product
- **"Hounddog agent"** or **"Hounddog (agent)"** — when referring to the `.claude/agents/` sub-agent

A bare "Hounddog" with no qualifier is permitted only where context makes the referent unambiguous (e.g., within a prompt that has already established which Hounddog is under discussion in its opening paragraph). In any cross-prompt reference, metadata field, agent-card header, or governance artifact, the qualifier is mandatory.

### 4.3 Retroactive compatibility

Prompts #100–102 are not edited. They continue to refer to "Hounddog" as the admin dashboard, and that usage is understood in context. Future prompts that reference #100–102 should say "the Hounddog Admin Dashboard as defined in Prompts #100–102" rather than bare "Hounddog," to preserve clarity at the boundary.

### 4.4 Optional future rename

If Gary prefers to eliminate the collision entirely rather than maintain the disambiguation discipline, a follow-on prompt may rename one of the two entities. The lower-cost rename is the agent (renaming a single `.claude/agents/*.md` file and updating references), not the product (which would require data-layer and UI changes). This decision is deferred to Gary and is not mandated by this addendum.

---

## 5. Amendments to §6 of Prompt #129

The following subsections are to be read as if inserted directly into §6 of Prompt #129 in the positions indicated.

### 5.1 New §6.6 — Gordon

Insert after §6.4 and before §6.5 of Prompt #129:

> **§6.6 Gordon.** Gordon is a domain-specialist sub-agent operating under the Jeffery orchestration layer. Gordon's role descriptor is pending formal documentation and will be populated by a subsequent amendment (tentatively Prompt #129b). Regardless of role descriptor, Gordon inherits all constraints imposed by §§6.1–6.4 of Prompt #129, §5 of Prompt #129 (OBRA integration points), and §3 of Prompt #129 (protected paths). Gordon may not bypass OBRA by pulling in external code directly. Gordon may not add dependencies to `package.json` or create files in any protected path under §3 except through the Jeffery → Michelangelo chain with a Prompt-level evaluation artifact on file and explicit Gary approval. Any Tier D action attempted by Gordon constitutes a blocker-level OBRA gate failure and halts the prompt.

### 5.2 New §6.7 — Hounddog (agent)

Insert after §6.6:

> **§6.7 Hounddog (agent).** Hounddog (agent) is a domain-specialist sub-agent operating under the Jeffery orchestration layer. Hounddog (agent) is distinct from the Hounddog Admin Content Intelligence Dashboard defined in Prompts #100–102; see §4 of Prompt #129a for the disambiguation convention. Hounddog (agent)'s role descriptor is pending formal documentation and will be populated by a subsequent amendment (tentatively Prompt #129b). Regardless of role descriptor, Hounddog (agent) inherits all constraints imposed by §§6.1–6.4 of Prompt #129, §5 of Prompt #129 (OBRA integration points), and §3 of Prompt #129 (protected paths). Hounddog (agent) may not bypass OBRA by pulling in external code directly, may not add dependencies to `package.json`, and may not create files in any protected path under §3 except through the Jeffery → Michelangelo chain with a Prompt-level evaluation artifact on file and explicit Gary approval. Any Tier D action attempted by Hounddog (agent) constitutes a blocker-level OBRA gate failure and halts the prompt.
>
> **Special note on Hounddog (agent) interactions with the Hounddog Admin Dashboard.** Because the agent shares a name with a production surface it may plausibly interact with, any prompt in which Hounddog (agent) touches Hounddog Admin Dashboard data (MAP enforcement queues, social monitoring feeds, practitioner waiver records, VIP exemption tables) must use the full qualified names in the prompt text and in all file headers, commit messages, and log entries, to prevent ambiguity in the audit trail.

### 5.3 New §6.8 — Marshall

Insert after §6.7:

> **§6.8 Marshall.** Marshall is a domain-specialist sub-agent operating under the Jeffery orchestration layer. Marshall's role descriptor is pending formal documentation and will be populated by a subsequent amendment (tentatively Prompt #129b). Regardless of role descriptor, Marshall inherits all constraints imposed by §§6.1–6.4 of Prompt #129, §5 of Prompt #129 (OBRA integration points), and §3 of Prompt #129 (protected paths). Marshall may not bypass OBRA by pulling in external code directly, may not add dependencies to `package.json`, and may not create files in any protected path under §3 except through the Jeffery → Michelangelo chain with a Prompt-level evaluation artifact on file and explicit Gary approval. Any Tier D action attempted by Marshall constitutes a blocker-level OBRA gate failure and halts the prompt.

### 5.4 Amended §6.5 — All Future Sub-Agents (Clarified)

Replace §6.5 of Prompt #129 in its entirety with the following clarified text:

> **§6.5 All Future Sub-Agents.** Beyond the nine sub-agents named in §§6.1, 6.2, 6.3, 6.4, 6.6, 6.7, and 6.8 (Jeffery, Michelangelo, Sherlock, Hannah, Arnold, LEX™, Gordon, Hounddog (agent), Marshall), any new sub-agent subsequently created under the Jeffery orchestration layer inherits this policy by default, effective from the moment its definition file is placed in `.claude/agents/` or any successor directory. The onboarding prompt for any new sub-agent must reference both Prompt #129 and Prompt #129a (and any subsequent amendments) in its standing-rule block. A new sub-agent is "created" for purposes of this clause at the earlier of (a) the commit that adds its definition file, or (b) its first invocation by Jeffery, whichever comes first. There is no grace period: the policy binds from creation.

The prior §6.5 text ("Any future sub-agent created under the Jeffery orchestration layer inherits this policy by default. The onboarding prompt for any new sub-agent must reference Prompt #129 in its standing-rule block.") is superseded by the above and is preserved only for historical reference in the original Prompt #129 source document, which remains unedited per Prompt #129 §10.

---

## 6. Audit Trail & Backwards Compatibility

### 6.1 What auditors will see

A reviewer reading the prompt library in sequence will encounter:

1. Prompt #129 naming six agents explicitly and covering the remainder via inheritance
2. Prompt #129a (this addendum) naming all nine agents explicitly and clarifying the inheritance language
3. Optionally, a future Prompt #129b populating role descriptors for Gordon, Hounddog (agent), and Marshall

This sequence is append-only, internally consistent, and each document cites its predecessors. No earlier document is rewritten. The audit trail is preserved.

### 6.2 Commits predating this addendum

Any `.claude/agents/*.md` file, code comment, or migration header authored between the issuance of Prompt #129 and the issuance of Prompt #129a that references only Prompt #129 is not retroactively invalid. Those references are understood to incorporate Prompt #129 as subsequently amended, a standard construction in governance documents. However, any new authorship after the issuance of Prompt #129a must reference both prompts where the nine-agent binding is material.

### 6.3 Relationship to Prompt #129 §9 Implementation Checklist

The nine-agent binding does not change the item count in Prompt #129 §9. However, item 5 of that checklist ("Update Hannah's, Arnold's, and LEX™'s onboarding prompts to reference Prompt #129") is now understood to extend to Gordon, Hounddog (agent), and Marshall as well. Claude Code's execution of item 3 (updating the nine `.claude/agents/*.md` files) should reference "Prompt #129 as amended by Prompt #129a" in each of the nine commits, not merely "Prompt #129."

---

## 7. Implementation Note for Claude Code's Pending Item 3

This section exists to give Claude Code (or Gary operating manually) a concrete template for the `.claude/agents/*.md` updates that were pending at the moment this addendum was issued.

### 7.1 Header block for each of the nine agent-card files

Each `.claude/agents/*.md` file should gain (or update) a "Governance" section near the top with the following structure. Do not copy external examples of agent-card governance blocks; this template is re-derived for ViaConnect per Prompt #129 §4 Tier C.

````markdown
## Governance

This agent operates under the ViaConnect multi-agent architecture and is bound by:

- **Prompt #129 — External Repository Governance Policy** (§§3, 5, 6, and this agent's specific §6.X subsection)
- **Prompt #129a — Addendum: Nine-Agent Binding** (§§3, 5.1–5.4, and 6.X as applicable)
- All ViaConnect permanent standing rules: #1 (Supabase email templates no-touch), #2 (`package.json` no-touch without approval), #3 (append-only applied migrations), **#4 (external repository content is reference material, never source material)**

External repositories may be referenced only under the Tier A–D framework in Prompt #129 §4. Tier D actions are unconditionally prohibited.
````

### 7.2 Agent-specific §6 reference

| Agent | Reference in Governance section |
|-------|---------------------------------|
| Jeffery | §6.1 of Prompt #129 |
| Michelangelo | §6.2 of Prompt #129 (including the 13-point code review extension in §5.3) |
| Sherlock | §6.3 of Prompt #129 |
| Hannah | §6.4 of Prompt #129 |
| Arnold | §6.4 of Prompt #129 |
| LEX™ | §6.4 of Prompt #129 |
| Gordon | §6.6 of Prompt #129 as added by §5.1 of Prompt #129a |
| Hounddog (agent) | §6.7 of Prompt #129 as added by §5.2 of Prompt #129a |
| Marshall | §6.8 of Prompt #129 as added by §5.3 of Prompt #129a |

### 7.3 Recommended commit message

A single commit covering all nine agent-card files is acceptable and preferable to nine separate commits for traceability. Suggested message:

> `chore(governance): bind all nine sub-agents to Prompt #129 + #129a`
>
> Applies Standing Rule #4 (External Repository Governance) to each of the nine sub-agent definition files under `.claude/agents/`. References both Prompt #129 (parent policy) and Prompt #129a (nine-agent binding addendum) in the Governance section of each card. Per Prompt #129 §3, agent-card files are protected-path and this commit was authored under explicit Gary approval in the prompt thread accompanying Prompt #129a.
>
> Refs: Prompt #129 §9 item 3, Prompt #129a §7

---

## 8. Review & Revision

This addendum inherits the review cadence of Prompt #129 (§10 of that document): quarterly review by Gary, with the next scheduled review in Q3 2026. Amendments to this addendum (e.g., Prompt #129b populating role descriptors) are issued as new prompts and do not edit this addendum's source text.

---

## 9. Acknowledgment

By merging this addendum into the ViaConnect prompt library and updating the nine `.claude/agents/*.md` files per §7 above, the founder and all nine currently-defined sub-agents acknowledge the completed nine-agent binding under Prompt #129 as amended by Prompt #129a, the Hounddog disambiguation convention, and the append-only supersession discipline that preserves the integrity of the prompt-library audit trail.

---

## Document Control

| Field | Value |
|-------|-------|
| Prompt number | 129a |
| Title | Addendum: Nine-Agent Binding |
| Parent | Prompt #129 — External Repository Governance Policy |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-24 |
| Delivery formats | `.md`, `.docx` |
| Destination | ViaConnect Prompt Library (Google Drive) |
| Supersedes | §6.5 of Prompt #129 (amended in §5.4); adds §§6.6, 6.7, 6.8 |
| Does NOT supersede | §§1–5, §§7–11 of Prompt #129 |
| Successor(s) anticipated | Prompt #129b (role descriptors for Gordon, Hounddog agent, Marshall) |
| Classification | Addendum — append-only, blocker-level where it binds |
