# Prompt #138 — ISO 27001 + HIPAA Security Rule Evidence Packet Variant: Multi-Framework Compliance Evidence Architecture

**Platform:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Owner:** FarmCeutica Wellness LLC
**Delivery Mode:** Claude Code — `/effort max`
**Framework:** OBRA (Observe & Brainstorm → Blueprint/Micro-Task → Review → Audit/TDD)
**Prompt Lineage:** Extends #119 (Marshall Compliance Officer), #120 (Hounddog → Marshall Bridge), #121 (Pre-Check), #122 (SOC 2 Evidence Exporter), #123 (Rebuttal Drafter), #124 (Counterfeit-Detection Vision), #125 (Scheduler Bridge), and #126 (Narrator). Respects the Amendment to #119/#120 (April 23, 2026).
**Local Path:** `C:\Users\garyf\ViaConnect2026\viaconnect-web`
**Supabase Project:** `nnhkcufyqjojdbvdrpky` (us-east-2)
**Deployment:** `via-connect2026.vercel.app`

---

## 0. Standing Platform Rules (Non-Negotiable)

Every standing rule from #119 continues to apply. Re-stated for continuity:

- Score name is **"Bio Optimization"** — never "Vitality Score".
- Bioavailability is exactly **10–27×**.
- No Semaglutide. Retatrutide is injectable only, never stacked.
- Lucide React icons only, `strokeWidth={1.5}`. No emojis in any client-facing UI.
- `getDisplayName()` for all client-facing names.
- Helix Rewards: Consumer portal only.
- Desktop + Mobile simultaneously, responsive Tailwind from the first commit.
- **NEVER** touch `package.json`, Supabase email templates, or any previously-applied migration. Migrations are append-only.
- Delivery format: `.md` + `.docx` pair to the Prompt Library with the standard upload link.

Per the **Amendment to #119/#120 (April 23, 2026):** CedarGrowth Organics Solutions LLC and Via Cura Ranch are separate companies and are not referenced, scaffolded, or planned for within ViaConnect compliance work.

---

## 1. Mission Statement

Extend the packet architecture from #122 (SOC 2) into a multi-framework evidence system capable of producing packets for:

- **SOC 2 Type II** — already delivered in #122; treated here as the reference implementation.
- **HIPAA Security Rule** — 45 CFR §§ 164.302–318, including administrative, physical, and technical safeguards, plus organizational requirements and documentation requirements.
- **ISO/IEC 27001:2022** — including the 93 Annex A controls and the Statement of Applicability (SoA).

The architecture must:

1. **Refactor without breaking #122.** Every SOC 2 packet already signed stays verifiable; the existing quarterly workflow continues unchanged.
2. **Share evidence collection across frameworks.** A single control-execution event (e.g., a quarterly access review) should feed SOC 2 CC6, HIPAA § 164.308(a)(4), and ISO 27001 A.5.15 — collected once, cited three times.
3. **Honor each framework's specific requirements.** HIPAA's Required vs. Addressable safeguard distinction, ISO 27001's Statement of Applicability, SOC 2's Trust Services Criteria — each gets its own scoping, narrative conventions, and attestation semantics.
4. **Preserve the attestation chain.** Each packet is signed by its framework-appropriate attestor: SOC 2 packets by the Compliance Officer (Steve Rica); HIPAA packets by Steve as the designated Security Officer (a role explicit in HIPAA); ISO 27001 packets by the ISMS Manager (which may be Steve or a separately-designated role).
5. **Reuse Narrator (#126) across frameworks.** The narrator generates grounded prose for any control in any framework; control crosswalk tables specify which evidence grounds which control in which framework.

The end state: one evidence-collection pipeline, three (or more) attestation-ready outputs, with clear traceability between a single piece of evidence and every framework requirement it satisfies.

---

## 2. Why This Matters — The Multi-Framework Reality

FarmCeutica's compliance posture touches three frameworks at once:

- **SOC 2** supports enterprise customer trust (practitioners and large institutions).
- **HIPAA Security Rule** is statutorily required because FarmCeutica handles PHI (practitioner notes, genetic data, wellness CAQ responses).
- **ISO 27001** supports international expansion (EU practitioners, Canadian practitioners, future LATAM rollout) where ISO certification often unlocks enterprise procurement that SOC 2 alone doesn't.

Without #138, each framework would require:

- A separate evidence-collection pipeline.
- A separate narrator workflow.
- A separate auditor portal.
- A separate attestation calendar.
- A separate "when a control fails, which framework noticed first" incident-response path.

That's three times the work, three times the surface for drift between frameworks, and three times the opportunity for auditors to find inconsistencies between what FarmCeutica told SOC 2 auditors vs. HIPAA auditors vs. ISO auditors. Inconsistent attestations across frameworks is a specific audit finding category that carries real weight — it implies the evidence isn't trustworthy.

The refactor centers on a **control-framework-registry** that maps every control point in every framework to (a) the evidence sources that satisfy it, (b) the narrator conventions that describe it, and (c) the attestor who signs for it. A single collector run feeds all three frameworks simultaneously.

### 2.1 What Doesn't Change

- #122's SOC 2 packet format continues to work exactly as before.
- Existing signed SOC 2 packets remain valid; their signatures still verify.
- Steve's SOC 2 signing workflow is unchanged.
- The auditor portal for SOC 2 auditors continues to serve them packets in the same shape.

### 2.2 What Does Change

- #122's internal architecture is refactored to consume a framework-agnostic control map.
- New packet types (HIPAA, ISO 27001) are added via config, not code duplication.
- The packet generation cron from #122 now runs per framework per cadence.
- The Narrator (#126) gains framework-aware system prompts and output schemas.
- The auditor portal is extended with framework-selector navigation.

---

## 3. Framework Comparison — What's the Same, What's Different

A clean architecture requires honest confrontation of the differences. This section pins down what's shared and what isn't.

### 3.1 Control Model Differences

| Concern | SOC 2 | HIPAA Security Rule | ISO 27001:2022 |
|---|---|---|---|
| Scope declaration | Trust Services Criteria selected by management | Covered entities + business associates; safeguards per § 164 | Statement of Applicability (SoA) naming applicable Annex A controls |
| Control granularity | ~40 points (CC1–CC9, A1, C1, PI1, P) | ~54 specification points across § 164.308, 310, 312, 314, 316 | 93 Annex A controls + ISMS clauses 4–10 |
| Required vs. optional | All selected TSC are required | Required vs. Addressable safeguards explicitly distinguished | SoA justifies inclusion/exclusion of each Annex A control |
| Attestation type | Type I (point-in-time) or Type II (period) | No formal "attestation"; OCR audits and self-assessment | Certification audit (Stage 1 + Stage 2) then surveillance |
| Attestor | Management + independent auditor | Security Officer (required role per § 164.308(a)(2)) | ISMS Manager + certifying body |
| Cadence | Annual Type II with quarterly packets | Continuous with annual risk analysis (§ 164.308(a)(1)(ii)(A)) | Annual surveillance, 3-year recertification |
| Deviation handling | Exceptions documented in Management's Response | Corrective action plans; potential breach notification obligation | Nonconformities logged, corrected, verified |
| Special artifacts | Bridge letter between Type II reports | Risk Analysis, Sanction Policy, Contingency Plan | SoA, Risk Treatment Plan, Internal Audit Reports, Management Review |

### 3.2 Shared Infrastructure

Despite the differences, the vast majority of evidence is shared:

- **Access reviews** — satisfies SOC 2 CC6.1, HIPAA § 164.308(a)(4) Information Access Management, ISO 27001 A.5.15/A.5.18.
- **Encryption inventory** — satisfies SOC 2 C1.1, HIPAA § 164.312(a)(2)(iv) + § 164.312(e)(2)(ii), ISO 27001 A.8.24.
- **Incident records** — SOC 2 CC7.3, HIPAA § 164.308(a)(6) Security Incident Procedures, ISO 27001 A.5.24–A.5.26.
- **Vendor/BAA tracking** — SOC 2 CC9.2, HIPAA § 164.308(b)(1) Business Associate Contracts, ISO 27001 A.5.19–A.5.22.
- **Audit logging** — SOC 2 CC4.1, HIPAA § 164.312(b) Audit Controls, ISO 27001 A.8.15.
- **Change management** — SOC 2 CC8, HIPAA (implicit in § 164.308(a)(5) Security Awareness and Training), ISO 27001 A.8.32.
- **Risk assessment** — SOC 2 CC3, HIPAA § 164.308(a)(1)(ii)(A) Risk Analysis, ISO 27001 Clauses 6.1.2/6.1.3.

The evidence doesn't change; only the citation context does.

### 3.3 Framework-Specific Artifacts

Some artifacts are specific to one framework and cannot be synthesized from SOC 2 evidence:

**HIPAA-specific:**

- Risk Analysis document per § 164.308(a)(1)(ii)(A) with methodology and scope.
- Sanction Policy per § 164.308(a)(1)(ii)(C).
- Contingency Plan with Data Backup Plan, Disaster Recovery Plan, Emergency Mode Operation Plan per § 164.308(a)(7).
- Facility Security Plan per § 164.310(a)(2)(ii).
- Device and Media Controls documentation per § 164.310(d).
- Breach Notification records per § 164.400–414 (if applicable).
- Business Associate Agreement inventory per § 164.308(b)(3).

**ISO 27001-specific:**

- Statement of Applicability (SoA) — the defining ISO 27001 artifact.
- Risk Treatment Plan.
- Internal Audit Program + reports.
- Management Review records (Clause 9.3).
- ISMS Scope Statement (Clause 4.3).
- Information Security Policy (Clause 5.2).

These are typically manually-produced documents that live in Steve's manual evidence vault (extended from #122 §6).

---

## 4. Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                CONTROL FRAMEWORK REGISTRY (new)                                 │
│  JSON-backed registry describing every control point:                         │
│    • Framework: soc2 | hipaa_security | iso_27001_2022                       │
│    • Control ID: CC4.1 | 164.308(a)(1)(ii)(A) | A.8.15                       │
│    • Control name, description, framework-specific metadata                   │
│    • Required vs. Addressable (HIPAA)                                         │
│    • Applicability flag (ISO SoA)                                             │
│    • Evidence sources: which collectors satisfy this control                  │
│    • Narrator conventions: voice, structure, required sections                │
│    • Attestation role: compliance_officer | security_officer | isms_manager  │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                EVIDENCE COLLECTION LAYER (extended from #122)                   │
│  • Shared collectors from #122 continue to run                                │
│  • New HIPAA-specific collectors (risk analysis, sanctions, breach log)       │
│  • New ISO-specific collectors (SoA, internal audits, management review)      │
│  • Every collector declares which framework control points it satisfies      │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                PACKET ASSEMBLER (refactored)                                    │
│  • Accepts: framework + period + scope declaration                            │
│  • Pulls evidence by framework control map (not by hardcoded TSC)             │
│  • Produces framework-appropriate packet structure                            │
│    - SOC 2: existing structure from #122 §4                                   │
│    - HIPAA: § 164 administrative/physical/technical sections                  │
│    - ISO 27001: Annex A control groups + ISMS clause sections + SoA           │
│  • Framework-specific manifest keys + signing                                 │
│  • Control-to-control crosswalk file for auditor clarity                      │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                NARRATOR (#126) — FRAMEWORK-AWARE                                │
│  • System prompt receives framework-specific voice rules                      │
│  • Output schema adapted per framework:                                       │
│    - SOC 2: Control Description | Operation Summary | Management's Response   │
│    - HIPAA: Safeguard Description | Implementation Summary | Compliance Status│
│    - ISO: Control Objective | Implementation Evidence | Effectiveness         │
│  • Grounding verifier re-uses #126's verification pipeline                    │
│  • Attestor matched to framework role                                          │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                AUDITOR PORTAL (extended from #122 §12)                          │
│  • Framework-selector at top of portal                                        │
│  • Separate grants per framework (an auditor may see SOC 2 but not HIPAA)     │
│  • Framework-appropriate terminology everywhere                               │
│  • Cross-framework evidence references:                                       │
│    "This access-review evidence satisfies SOC 2 CC6.1, HIPAA § 164.308(a)(4),│
│     and ISO 27001 A.5.15."                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Design Principles

1. **Registry is the source of truth.** No framework logic is hardcoded in collectors, assemblers, or narrator prompts. Adding a framework means adding a registry entry.
2. **Evidence is written once, cited many times.** The collectors from #122 emit evidence files; the framework crosswalk maps those files to multiple control points across multiple frameworks.
3. **Framework-specific artifacts live in manual evidence.** HIPAA's Risk Analysis document and ISO's SoA are Steve-uploaded artifacts; the system tracks their freshness and attestation requirements but does not auto-generate them.
4. **Backward compatibility is a feature, not an afterthought.** The #122 SOC 2 workflow continues to produce identical packets to those auditors have already reviewed.
5. **Attestor separation is explicit.** A single Steve Rica may wear three hats (Compliance Officer, Security Officer, ISMS Manager) — the signing flow names which hat at attestation time, and the audit log distinguishes the three capacities.
6. **Framework drift is detectable.** A cross-framework consistency check runs when any packet is generated; if the same evidence is cited as "compliant" in one framework and "deviation" in another, the packet is flagged for Steve's review before signing.

---

## 5. Control Framework Registry

### 5.1 Registry Schema

```typescript
// lib/compliance/frameworks/registry.ts
export type FrameworkId = 'soc2' | 'hipaa_security' | 'iso_27001_2022';

export interface FrameworkDefinition {
  id: FrameworkId;
  version: string;                           // e.g., 'soc2-2017' (TSC revision year)
  displayName: string;
  attestationType: 'type_i' | 'type_ii' | 'continuous_with_annual_risk_analysis' | 'certification_audit';
  attestorRole: 'compliance_officer' | 'security_officer' | 'isms_manager';
  attestationLanguage: string;               // framework-appropriate attestation statement
  controlPoints: ControlPoint[];
  specialArtifacts: SpecialArtifactRequirement[];
  scopeDeclaration: ScopeDeclarationSchema;
}

export interface ControlPoint {
  id: string;                                // framework-native (e.g., 'CC4.1', '164.308(a)(1)(ii)(A)', 'A.8.15')
  framework: FrameworkId;
  category: string;                          // e.g., 'Common Criteria', 'Administrative Safeguards', 'Organizational Controls'
  name: string;
  description: string;
  required_or_addressable?: 'required' | 'addressable';   // HIPAA
  default_applicability?: 'applicable' | 'excluded';      // ISO SoA default
  evidence_sources: string[];                // collector IDs that satisfy this control
  narrator_sections: NarratorSectionSpec[];
  cross_framework_references?: Array<{ framework: FrameworkId; control_id: string; relationship: 'equivalent' | 'overlapping' | 'partial' }>;
}

export interface NarratorSectionSpec {
  kind: string;                              // framework-specific: 'control_description' | 'safeguard_description' | 'control_objective' | etc.
  required: boolean;
  carryover_allowed: boolean;                // carryover from prior packet
  generator_tone: 'declarative' | 'procedural' | 'outcome_based';
}

export interface SpecialArtifactRequirement {
  id: string;                                // e.g., 'hipaa_risk_analysis', 'iso_soa'
  display_name: string;
  required: boolean;
  evidence_source: 'manual_vault' | 'automated_collector';
  max_age_days: number;                      // freshness requirement
  attestation_required: boolean;
}
```

### 5.2 SOC 2 Registry (Reference Implementation)

The existing #122 scope declaration is re-expressed in registry form:

- `controlPoints` covers CC1.1 through P8.something (~40 points).
- `specialArtifacts` includes things like the annual risk assessment PDF and committee meeting minutes.
- `narrator_sections` matches #126's `control_description | control_operation_summary | managements_response` structure.
- `attestationLanguage` is the existing attestation text Steve signs.

This is a refactor, not a change in behavior. A test verifies that generating a SOC 2 packet post-refactor produces byte-identical output to pre-refactor (modulo signing timestamps).

### 5.3 HIPAA Security Rule Registry

Control points mirror the § 164 structure:

- **Administrative Safeguards (§ 164.308):**
  - `164.308(a)(1)(i)` — Security Management Process
  - `164.308(a)(1)(ii)(A)` — Risk Analysis (required)
  - `164.308(a)(1)(ii)(B)` — Risk Management (required)
  - `164.308(a)(1)(ii)(C)` — Sanction Policy (required)
  - `164.308(a)(1)(ii)(D)` — Information System Activity Review (required)
  - `164.308(a)(2)` — Assigned Security Responsibility (required)
  - `164.308(a)(3)(i)` — Workforce Security
  - `164.308(a)(3)(ii)(A)` — Authorization and/or Supervision (addressable)
  - ...through `164.308(a)(8)` — Evaluation (required).
- **Physical Safeguards (§ 164.310):**
  - `164.310(a)(1)` — Facility Access Controls
  - ...through `164.310(d)(2)(iv)` — Data Backup and Storage (addressable).
- **Technical Safeguards (§ 164.312):**
  - `164.312(a)(1)` — Access Control
  - `164.312(b)` — Audit Controls
  - ...through `164.312(e)(2)(ii)` — Encryption (addressable).
- **Organizational Requirements (§ 164.314 + § 164.316):**
  - Business Associate Contracts, Requirements for Group Health Plans, Policies and Procedures, Documentation.

Each control point has:

- `required_or_addressable` explicitly set per the regulation.
- `evidence_sources` listing collector IDs.
- `narrator_sections` specifying the HIPAA-appropriate sections:
  - `safeguard_description` — what the safeguard is.
  - `implementation_summary` — how it was implemented during the period.
  - `compliance_status` — current compliance posture + any corrective action.
- `cross_framework_references` pointing to equivalent SOC 2 and ISO controls.

### 5.4 ISO 27001:2022 Registry

- **Annex A Controls (93 total):**
  - A.5 Organizational controls (37 controls including A.5.1 Information security policies, A.5.15 Access control, etc.)
  - A.6 People controls (8 controls)
  - A.7 Physical controls (14 controls)
  - A.8 Technological controls (34 controls including A.8.15 Logging, A.8.24 Use of cryptography)
- **ISMS Clauses (4–10 of the main standard):**
  - Clause 4 Context of the organization
  - Clause 5 Leadership
  - Clause 6 Planning (including 6.1.2 Risk assessment, 6.1.3 Risk treatment)
  - Clause 7 Support
  - Clause 8 Operation
  - Clause 9 Performance evaluation (9.2 Internal audit, 9.3 Management review)
  - Clause 10 Improvement

Each Annex A control has:

- `default_applicability` — applicable for most; excluded only where the SoA justifies exclusion.
- `evidence_sources` — collector IDs.
- `narrator_sections`:
  - `control_objective` — what the control aims to achieve.
  - `implementation_evidence` — how we implemented it.
  - `effectiveness` — assessment of effectiveness during the period.
- `cross_framework_references` to SOC 2 and HIPAA.

### 5.5 Registry Governance

The registry is code — `lib/compliance/frameworks/*.ts` — not database rows. Changes flow through normal PR review:

- Adding a control requires Michelangelo authorship + Steve signoff.
- Updating narrator conventions requires Michelangelo authorship + Steve signoff.
- Changing attestation language requires legal counsel sign-off.

Every registry version is tagged and pinned in every generated packet, so an auditor reviewing a 2027 packet can identify exactly which registry version produced it.

---

## 6. Packet Structures

### 6.1 SOC 2 Packet Structure

Unchanged from #122. Re-stated for reference — the existing directory layout stays the same.

### 6.2 HIPAA Security Rule Packet Structure

```
hipaa-evidence-2026-Q1-{packet-uuid}.zip
│
├── manifest.json
├── scope.json                             Covered entity, applicable safeguards
├── attestations/
│   ├── security-officer-attestation.pdf   Steve Rica as Security Officer
│   ├── collector-attestation.json
│   └── manual-evidence-attestation.json
│
├── administrative-safeguards/
│   ├── 164-308-a-1-security-management/
│   │   ├── README.md
│   │   ├── risk-analysis.pdf              Required — manual vault
│   │   ├── risk-management-plan.pdf        Required
│   │   ├── sanction-policy.pdf             Required
│   │   └── information-system-activity-review.csv
│   ├── 164-308-a-2-assigned-security-responsibility/
│   │   └── security-officer-designation.pdf
│   ├── 164-308-a-3-workforce-security/
│   │   └── ...
│   ├── 164-308-a-4-information-access-management/
│   │   ├── access-review-summary.csv      (shared with SOC 2 CC6)
│   │   └── role-authorization-log.csv
│   ├── 164-308-a-5-security-awareness-training/
│   │   ├── training-completion.csv
│   │   └── monthly-security-reminders.csv
│   ├── 164-308-a-6-security-incident-procedures/
│   │   ├── incident-response-procedures.pdf
│   │   └── incidents.csv                   (shared with SOC 2 CC7)
│   ├── 164-308-a-7-contingency-plan/
│   │   ├── data-backup-plan.pdf
│   │   ├── disaster-recovery-plan.pdf
│   │   ├── emergency-mode-operation-plan.pdf
│   │   └── contingency-plan-tests.csv
│   ├── 164-308-a-8-evaluation/
│   │   └── annual-security-evaluation.pdf
│   └── 164-308-b-business-associate-contracts/
│       └── baa-inventory.csv               (shared with SOC 2)
│
├── physical-safeguards/
│   ├── 164-310-a-facility-access-controls/
│   │   └── facility-security-plan.pdf
│   ├── 164-310-b-workstation-use/
│   │   └── ...
│   ├── 164-310-c-workstation-security/
│   │   └── ...
│   └── 164-310-d-device-and-media-controls/
│       ├── disposal-log.csv
│       ├── media-reuse-log.csv
│       ├── accountability.csv
│       └── data-backup-storage.csv
│
├── technical-safeguards/
│   ├── 164-312-a-access-control/
│   │   ├── unique-user-identification.csv
│   │   ├── emergency-access-procedure.pdf
│   │   ├── automatic-logoff-config.json
│   │   └── encryption-at-rest-inventory.csv
│   ├── 164-312-b-audit-controls/
│   │   └── audit-log-chain-verification.json   (shared with SOC 2)
│   ├── 164-312-c-integrity/
│   │   └── ...
│   ├── 164-312-d-person-or-entity-authentication/
│   │   └── mfa-enforcement.csv             (shared with SOC 2)
│   └── 164-312-e-transmission-security/
│       ├── integrity-controls.json
│       └── encryption-in-transit-inventory.csv
│
├── organizational-requirements/
│   ├── 164-314-business-associate-contracts/
│   └── 164-316-policies-procedures-documentation/
│
├── breach-records/
│   ├── README.md                           Empty if no breaches
│   ├── breach-determinations.csv
│   └── breach-notifications/               Per-breach folders if any
│
├── narratives/
│   ├── {safeguard-id}/
│   │   ├── safeguard-description.md
│   │   ├── implementation-summary.md
│   │   └── compliance-status.md
│   └── ... (one folder per safeguard)
│
├── crosswalks/
│   └── hipaa-to-soc2-to-iso.csv
│
├── methodology/
│   └── evidence-collection-methodology.md
│
└── raw-proofs/
    ├── signing-pubkey.pem
    └── framework-registry-version.json
```

### 6.3 ISO 27001:2022 Packet Structure

```
iso27001-evidence-2026-Q1-{packet-uuid}.zip
│
├── manifest.json
├── scope.json                             ISMS scope per Clause 4.3
├── statement-of-applicability.csv         REQUIRED — every Annex A control with applicability + justification
├── risk-treatment-plan.pdf                REQUIRED
├── attestations/
│   ├── isms-manager-attestation.pdf       Steve Rica as ISMS Manager
│   ├── collector-attestation.json
│   └── manual-evidence-attestation.json
│
├── isms-clauses/
│   ├── clause-4-context/
│   ├── clause-5-leadership/
│   ├── clause-6-planning/
│   │   ├── 6-1-2-risk-assessment.pdf
│   │   └── 6-1-3-risk-treatment.pdf
│   ├── clause-7-support/
│   ├── clause-8-operation/
│   ├── clause-9-performance-evaluation/
│   │   ├── internal-audit-report.pdf
│   │   └── management-review-records.pdf
│   └── clause-10-improvement/
│       └── corrective-actions-log.csv
│
├── annex-a-controls/
│   ├── A-5-organizational/
│   │   ├── A-5-1-information-security-policies/
│   │   ├── A-5-15-access-control/
│   │   │   └── access-review-summary.csv   (shared with SOC 2, HIPAA)
│   │   ├── A-5-19-supplier-relationships/
│   │   └── ... (37 controls)
│   ├── A-6-people/
│   │   └── ... (8 controls)
│   ├── A-7-physical/
│   │   └── ... (14 controls)
│   └── A-8-technological/
│       ├── A-8-15-logging/
│       │   └── audit-log-chain-verification.json   (shared with SOC 2, HIPAA)
│       ├── A-8-24-use-of-cryptography/
│       └── ... (34 controls)
│
├── narratives/
│   └── ... (one folder per Annex A control + per ISMS clause)
│
├── crosswalks/
│   └── iso-to-soc2-to-hipaa.csv
│
├── methodology/
│   └── evidence-collection-methodology.md
│
└── raw-proofs/
    └── framework-registry-version.json
```

### 6.4 Shared Artifact Pointers

Where the same evidence file satisfies multiple frameworks, the packet avoids duplicating bytes. The HIPAA packet's `access-review-summary.csv` is cryptographically identical to the SOC 2 packet's version. The manifest records the shared SHA-256, and the crosswalk file makes the cross-reference explicit:

```
source_file,soc2_control,hipaa_control,iso_27001_control
CC6-logical-access/access-review-quarterly.csv,CC6.1,§ 164.308(a)(4),A.5.15
CC6-logical-access/mfa-enforcement.csv,CC6.1,§ 164.312(d),A.5.17
```

This gives auditors across frameworks confidence that they're all looking at the same operational reality.

---

## 7. Framework-Specific Collectors

### 7.1 Existing Collectors from #122

All ~24 collectors from #122 §5.1 declare their framework support via a metadata field:

```typescript
// lib/soc2/collectors/types.ts (refactored)
export interface EvidenceCollector {
  id: string;
  version: string;
  dataSource: string;
  framework_support: Array<{
    framework: FrameworkId;
    controls: string[];                    // control IDs this collector satisfies in that framework
  }>;
  collect(period: Period, ctx: CollectorCtx): Promise<CollectorOutput>;
}
```

Existing collectors are updated to declare all three frameworks where applicable. For example, `marshall-findings-collector`:

```typescript
framework_support: [
  { framework: 'soc2', controls: ['CC4.1', 'CC4.2', 'CC7.2'] },
  { framework: 'hipaa_security', controls: ['164.308(a)(1)(ii)(D)', '164.312(b)'] },
  { framework: 'iso_27001_2022', controls: ['A.5.24', 'A.8.15', 'A.8.16'] },
]
```

### 7.2 New HIPAA-Specific Collectors

Collectors that produce evidence specific to HIPAA requirements and not already covered by SOC 2 collectors:

- `hipaa-breach-determinations-collector` — reads `breach_determinations` table (new, see §9); emits per-incident breach-risk assessments.
- `hipaa-workforce-training-collector` — reads existing `training_completion` table; emits per-workforce-member training status (pseudonymized).
- `hipaa-contingency-plan-test-collector` — reads DR test records; emits test date, scope, findings, corrective actions.
- `hipaa-emergency-access-collector` — reads emergency-access procedure invocations.
- `hipaa-device-media-control-collector` — reads device inventory + disposal/reuse logs.

### 7.3 New ISO 27001-Specific Collectors

- `iso-soa-collector` — reads `statement_of_applicability` table (new, see §9); emits the full SoA as CSV.
- `iso-risk-treatment-collector` — reads risk register + treatment decisions.
- `iso-internal-audit-collector` — reads internal audit schedule + findings.
- `iso-management-review-collector` — reads management review records.
- `iso-nonconformity-collector` — reads nonconformity register.

### 7.4 Shared Collector Determinism

All collectors retain the determinism invariant from #122: same period + same inputs + same collector version → byte-identical output. This means a collector satisfying SOC 2 CC6.1, HIPAA § 164.308(a)(4), and ISO A.5.15 produces one file that all three packets share, with identical hashes.

---

## 8. Narrator Extensions (Framework-Aware)

### 8.1 Framework-Specific System Prompts

The Narrator (#126) receives an additional `framework-context` input. For each framework, the base system prompt gets a framework-specific addendum:

**SOC 2 (existing from #126):**
Unchanged — "plain-English draft prose describing how a specific control operated during a specific attestation period" in the voice of management.

**HIPAA addendum:**

> You are producing draft language for a HIPAA Security Rule compliance evidence packet. Your output will be reviewed by the designated Security Officer. Use regulatory citation format: § 164.xxx(y)(z). Distinguish clearly between Required and Addressable safeguards: Required safeguards must be implemented as stated; Addressable safeguards may be implemented, implemented with equivalent measures, or documented as not reasonable and appropriate with justification. When describing Addressable safeguards, state explicitly which of those three paths was taken. Avoid legal conclusions ("compliant", "non-compliant"); describe implementation state factually and let the Security Officer characterize compliance.

**ISO 27001 addendum:**

> You are producing draft language for an ISO 27001:2022 compliance evidence packet. Your output will be reviewed by the designated ISMS Manager. Use ISO citation format: Annex A controls as A.x.y, ISMS clauses as Clause N.N. For each Annex A control, describe the control objective, the implementation mechanism, and the evidence of effectiveness separately. Respect the Statement of Applicability: if a control is marked as excluded, the narrative must explain the exclusion justification rather than describe implementation. Avoid certification-outcome language ("certified", "audited"); describe implementation and effectiveness factually.

### 8.2 Framework-Specific Section Kinds

The Narrator's output schema from #126 §5.2 gains framework-aware section kinds:

```typescript
export type NarrativeSectionKind =
  // SOC 2 (existing)
  | 'control_description'
  | 'control_operation_summary'
  | 'managements_response'
  // HIPAA (new)
  | 'safeguard_description'
  | 'implementation_summary'
  | 'compliance_status'
  | 'addressable_safeguard_determination'
  // ISO 27001 (new)
  | 'control_objective'
  | 'implementation_evidence'
  | 'effectiveness'
  | 'soa_exclusion_justification';
```

The Narrator generates the section kinds appropriate to the packet's framework. Each kind has its own generation rules, verification rules, and editor UX.

### 8.3 Verification Carries Over

#126's verification pipeline — schema, citations, numbers, hallucinations, self-scan — applies unchanged to all frameworks. Grounded generation invariants are framework-agnostic.

### 8.4 Per-Framework Attestation Language

When Steve signs a narrative, the attestation language matches the framework:

- **SOC 2** (existing): "I, [Steve Rica], Compliance Officer of FarmCeutica Wellness LLC, attest..."
- **HIPAA:** "I, [Steve Rica], Security Officer of FarmCeutica Wellness LLC as designated under 45 CFR § 164.308(a)(2), attest that the foregoing safeguard descriptions accurately describe FarmCeutica's implementation of the identified HIPAA Security Rule safeguards during the period [start]–[end]."
- **ISO 27001:** "I, [Steve Rica], ISMS Manager of FarmCeutica Wellness LLC, attest that the foregoing descriptions accurately describe FarmCeutica's implementation and effectiveness of the identified ISO/IEC 27001:2022 controls during the period [start]–[end]."

The attestation text is pinned in the Framework Registry per §5.1. Legal counsel reviews each attestation statement before release.

### 8.5 Carryover Across Frameworks Is Prohibited

Carryover (#126 §7.1) allows Control Description reuse from a prior packet in the same framework. Carryover across frameworks is explicitly prohibited — a SOC 2 Control Description text cannot be silently carried into a HIPAA Safeguard Description, even when they describe the same underlying control. Each framework's narrative is authored freshly or carried from its own lineage.

### 8.6 Cross-Framework Consistency Check

A new consistency check runs at packet sign time:

- For every piece of shared evidence, identify all frameworks that cite it.
- Compare the narrative claims about that evidence across the frameworks.
- Flag any semantic inconsistency (e.g., SOC 2 narrative says "quarterly reviews completed" and HIPAA narrative says "monthly reviews completed" — one is wrong).

Inconsistencies are never auto-reconciled — always surfaced for Steve's review.

---

## 9. Database Schema — Append-Only Migration

New migration: `supabase/migrations/20260423_multi_framework_evidence.sql`

```sql
-- ============================================================================
-- MULTI-FRAMEWORK EVIDENCE — HIPAA + ISO 27001 Extension
-- Migration: 20260423_multi_framework_evidence.sql
-- ============================================================================

-- Framework metadata + registry version tracking
create table if not exists compliance_frameworks (
  id text primary key check (id in ('soc2','hipaa_security','iso_27001_2022')),
  display_name text not null,
  registry_version text not null,
  attestation_language text not null,
  attestor_role text not null,
  active boolean not null default true,
  first_introduced_at timestamptz not null default now()
);

insert into compliance_frameworks (id, display_name, registry_version, attestation_language, attestor_role) values
  ('soc2', 'SOC 2 Type II', 'v1.0.0', '[from registry]', 'compliance_officer'),
  ('hipaa_security', 'HIPAA Security Rule', 'v1.0.0', '[from registry]', 'security_officer'),
  ('iso_27001_2022', 'ISO/IEC 27001:2022', 'v1.0.0', '[from registry]', 'isms_manager')
on conflict (id) do nothing;

-- Refactor soc2_packets into framework_packets (additive; existing soc2_packets table stays for backward compat)
create table if not exists framework_packets (
  id uuid primary key default gen_random_uuid(),
  framework_id text not null references compliance_frameworks(id),
  packet_uuid text not null unique,
  period_start timestamptz not null,
  period_end timestamptz not null,
  scope_declaration jsonb not null,           -- framework-specific scope
  generated_at timestamptz not null default now(),
  generated_by text not null,
  framework_registry_version text not null,
  root_hash text not null,
  signing_key_id text not null,
  signature_jwt text not null,
  storage_key text not null,
  storage_sha256 text not null,
  size_bytes bigint not null,
  legal_hold boolean not null default false,
  retention_until date not null,
  status text not null default 'generating'
    check (status in ('generating','generated','published','superseded','retired')),
  superseded_by uuid references framework_packets(id),
  legacy_soc2_packet_id uuid references soc2_packets(id)   -- link to #122 packet if pre-refactor
);

create index idx_framework_packets_framework_period on framework_packets(framework_id, period_start, period_end);
create index idx_framework_packets_status on framework_packets(status);

-- HIPAA-specific tables
create table if not exists hipaa_risk_analyses (
  id uuid primary key default gen_random_uuid(),
  version int not null,
  storage_key text not null,
  sha256 text not null,
  valid_from date not null,
  valid_until date,
  scope_summary text not null,
  methodology_summary text not null,
  uploaded_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (version)
);

create table if not exists hipaa_sanction_policies (
  id uuid primary key default gen_random_uuid(),
  version int not null,
  storage_key text not null,
  sha256 text not null,
  effective_from date not null,
  effective_until date,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (version)
);

create table if not exists hipaa_sanction_actions (
  id uuid primary key default gen_random_uuid(),
  workforce_member_pseudonym text not null,  -- pseudonymized workforce ID
  action_kind text not null check (action_kind in (
    'verbal_warning','written_warning','retraining','suspension','termination','other'
  )),
  triggering_incident_id uuid references compliance_incidents(id),
  action_date date not null,
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now()
);

create table if not exists hipaa_contingency_plan_tests (
  id uuid primary key default gen_random_uuid(),
  test_date date not null,
  scope text not null,
  test_kind text not null check (test_kind in (
    'data_backup_test','disaster_recovery_test',
    'emergency_mode_test','full_tabletop_exercise','live_drill'
  )),
  outcome_summary text not null,
  storage_key text,                           -- PDF report if attached
  corrective_actions jsonb,
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now()
);

create table if not exists hipaa_emergency_access_invocations (
  id uuid primary key default gen_random_uuid(),
  invoked_at timestamptz not null,
  invoked_by uuid not null references auth.users(id),
  justification text not null,
  scope_of_access text not null,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  closed_at timestamptz,
  recorded_at timestamptz not null default now()
);

create table if not exists hipaa_device_media_events (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  event_kind text not null check (event_kind in (
    'received','reissued','disposed','sanitized','reused','moved','lost','stolen'
  )),
  event_date date not null,
  responsible_party uuid references auth.users(id),
  method text,                                -- e.g., 'NIST SP 800-88 Clear', 'Physical Destruction'
  notes text,
  recorded_at timestamptz not null default now()
);

create table if not exists hipaa_breach_determinations (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references compliance_incidents(id),
  assessment_date date not null,
  breach_risk_factors jsonb not null,         -- the four-factor assessment per § 164.402
  determination text not null check (determination in (
    'breach_confirmed','low_probability_of_compromise','not_applicable'
  )),
  rationale text not null,
  assessed_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  notification_required boolean not null default false,
  individuals_affected_count int,
  notification_sent_at timestamptz,
  ocr_notification_sent_at timestamptz,
  media_notification_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ISO 27001-specific tables
create table if not exists iso_statement_of_applicability (
  id uuid primary key default gen_random_uuid(),
  version int not null,
  effective_from date not null,
  effective_until date,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (version)
);

create table if not exists iso_soa_entries (
  id uuid primary key default gen_random_uuid(),
  soa_id uuid not null references iso_statement_of_applicability(id) on delete cascade,
  control_id text not null,                   -- e.g., 'A.5.15'
  applicable boolean not null,
  implementation_status text not null check (implementation_status in (
    'implemented','partially_implemented','planned','not_applicable'
  )),
  justification text not null,
  implementation_reference text,              -- link to policy / procedure
  unique (soa_id, control_id)
);

create table if not exists iso_risk_register (
  id uuid primary key default gen_random_uuid(),
  risk_code text not null unique,
  description text not null,
  asset_category text,
  inherent_likelihood text check (inherent_likelihood in ('rare','unlikely','possible','likely','almost_certain')),
  inherent_impact text check (inherent_impact in ('insignificant','minor','moderate','major','severe')),
  treatment_decision text check (treatment_decision in ('treat','tolerate','transfer','terminate')),
  treatment_plan text,
  residual_likelihood text,
  residual_impact text,
  owner uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists iso_internal_audits (
  id uuid primary key default gen_random_uuid(),
  audit_reference text not null unique,
  scope text not null,
  period_start date not null,
  period_end date not null,
  lead_auditor_ref text,                      -- reference to audit firm or internal auditor
  findings_count int not null default 0,
  nonconformities_count int not null default 0,
  observations_count int not null default 0,
  report_storage_key text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists iso_management_reviews (
  id uuid primary key default gen_random_uuid(),
  review_date date not null,
  agenda jsonb not null,                      -- structured per Clause 9.3.2
  attendees jsonb not null,
  outputs jsonb not null,                     -- decisions per Clause 9.3.3
  report_storage_key text,
  created_at timestamptz not null default now()
);

create table if not exists iso_nonconformities (
  id uuid primary key default gen_random_uuid(),
  nonconformity_code text not null unique,
  source text not null check (source in (
    'internal_audit','external_audit','management_review','incident','other'
  )),
  source_reference text,
  description text not null,
  severity text not null check (severity in ('minor','major')),
  raised_date date not null,
  corrective_action_plan text,
  target_closure_date date,
  closed_date date,
  verification_evidence text,
  status text not null default 'open' check (status in ('open','in_remediation','closed','reopened')),
  created_at timestamptz not null default now()
);

-- Framework-scoped auditor grants (extends #122's auditor_grants)
create table if not exists framework_auditor_grants (
  id uuid primary key default gen_random_uuid(),
  auditor_email text not null,
  auditor_firm text not null,
  framework_id text not null references compliance_frameworks(id),
  packet_ids uuid[] not null,
  granted_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked boolean not null default false,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  access_count int not null default 0
);

create index idx_framework_grants_framework on framework_auditor_grants(framework_id);
create index idx_framework_grants_email on framework_auditor_grants(auditor_email);

-- Cross-framework inconsistency flags detected during packet generation
create table if not exists framework_consistency_flags (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references framework_packets(id) on delete cascade,
  other_packet_id uuid references framework_packets(id),
  shared_evidence_path text not null,
  inconsistency_kind text not null check (inconsistency_kind in (
    'narrative_contradiction','count_mismatch','date_mismatch',
    'outcome_characterization_mismatch','other'
  )),
  description text not null,
  severity text not null check (severity in ('info','warning','critical')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now()
);

create index idx_consistency_packet_resolved on framework_consistency_flags(packet_id)
  where resolved_at is null;

-- RLS — follow #122 patterns
alter table compliance_frameworks                enable row level security;
alter table framework_packets                    enable row level security;
alter table hipaa_risk_analyses                  enable row level security;
alter table hipaa_sanction_policies              enable row level security;
alter table hipaa_sanction_actions               enable row level security;
alter table hipaa_contingency_plan_tests         enable row level security;
alter table hipaa_emergency_access_invocations   enable row level security;
alter table hipaa_device_media_events            enable row level security;
alter table hipaa_breach_determinations          enable row level security;
alter table iso_statement_of_applicability       enable row level security;
alter table iso_soa_entries                      enable row level security;
alter table iso_risk_register                    enable row level security;
alter table iso_internal_audits                  enable row level security;
alter table iso_management_reviews               enable row level security;
alter table iso_nonconformities                  enable row level security;
alter table framework_auditor_grants             enable row level security;
alter table framework_consistency_flags          enable row level security;

-- Compliance admin + superadmin access
create policy frameworks_admin_read on compliance_frameworks
  for select to authenticated
  using (auth.jwt()->>'role' in ('compliance_admin','admin','superadmin'));

create policy packets_admin_rw on framework_packets
  for all to authenticated
  using (auth.jwt()->>'role' in ('compliance_admin','admin','superadmin'))
  with check (auth.jwt()->>'role' in ('compliance_admin','admin','superadmin'));

-- HIPAA tables: admin access only; workforce pseudonyms never resolvable via RLS
create policy hipaa_admin_rw on hipaa_risk_analyses
  for all to authenticated
  using (auth.jwt()->>'role' in ('compliance_admin','admin','superadmin'))
  with check (auth.jwt()->>'role' in ('compliance_admin','admin','superadmin'));
-- (similar policies on every HIPAA table)

-- ISO tables: admin access
create policy iso_admin_rw on iso_statement_of_applicability
  for all to authenticated
  using (auth.jwt()->>'role' in ('compliance_admin','admin','superadmin'))
  with check (auth.jwt()->>'role' in ('compliance_admin','admin','superadmin'));
-- (similar policies on every ISO table)

-- Framework-scoped auditor access
create policy framework_packet_auditor_read on framework_packets
  for select to authenticated
  using (
    id in (
      select unnest(packet_ids) from framework_auditor_grants
      where auditor_email = auth.jwt()->>'email'
        and revoked = false
        and expires_at > now()
        and framework_id = framework_packets.framework_id
    )
  );
```

---

## 10. Core Services

### 10.1 `lib/compliance/frameworks/registry.ts`

Exports the registry interface and the three framework definitions (SOC 2, HIPAA, ISO 27001). Pure data with typed validation.

### 10.2 `lib/compliance/frameworks/definitions/soc2.ts`

Re-expression of #122's existing TSC scope as a `FrameworkDefinition`. Functionally identical to pre-refactor behavior.

### 10.3 `lib/compliance/frameworks/definitions/hipaa.ts`

Full HIPAA Security Rule control points with regulatory citations, Required/Addressable flags, and cross-references to SOC 2 and ISO.

### 10.4 `lib/compliance/frameworks/definitions/iso27001.ts`

Annex A controls + ISMS clauses with cross-references to SOC 2 and HIPAA.

### 10.5 `lib/compliance/frameworks/crosswalk.ts`

Pure function `crosswalk(collectorId, fromFramework, toFramework): string[]` — given a collector's output and a framework, returns the control IDs it satisfies.

### 10.6 `lib/compliance/frameworks/consistency.ts`

Cross-framework consistency checker. Invoked at packet sign time. Compares narrative claims across frameworks for shared evidence.

### 10.7 `lib/soc2/assemble/*` (refactored)

The existing assembler from #122 is refactored to:

- Accept a `framework_id` parameter.
- Read framework-specific scope from `FrameworkDefinition`.
- Produce packet structure per §6.
- Apply framework-specific attestation language.

Behavior is backward-compatible — `framework_id = 'soc2'` produces identical output to pre-refactor.

### 10.8 `lib/hipaa/*`

HIPAA-specific services:

- `hipaa/collectors/breach.ts` — breach determination collector.
- `hipaa/collectors/workforce.ts` — workforce training collector.
- `hipaa/collectors/contingency.ts` — contingency plan test collector.
- `hipaa/collectors/emergencyAccess.ts` — emergency access invocation collector.
- `hipaa/collectors/deviceMedia.ts` — device/media event collector.
- `hipaa/riskAnalysis.ts` — freshness tracking + attestation readiness.
- `hipaa/sanctions.ts` — sanction action logging.
- `hipaa/breachAssessment.ts` — the four-factor assessment workflow.

### 10.9 `lib/iso27001/*`

ISO 27001-specific services:

- `iso27001/collectors/soa.ts` — SoA emission.
- `iso27001/collectors/riskTreatment.ts`
- `iso27001/collectors/internalAudit.ts`
- `iso27001/collectors/managementReview.ts`
- `iso27001/collectors/nonconformity.ts`
- `iso27001/soaManager.ts` — SoA versioning, approval, effective-date tracking.
- `iso27001/riskRegister.ts` — risk entry + treatment management.

### 10.10 `lib/marshall/narrator/framework.ts`

Extends #126's narrator with framework-aware system prompts and output schemas. Pure wrapper; does not duplicate generation logic.

### 10.11 `lib/compliance/frameworks/scheduler.ts`

Multi-framework packet generation scheduler. Extends #122's quarterly cron to run per-framework with appropriate cadence:

- SOC 2 — quarterly (unchanged).
- HIPAA — continuous with annual full-packet + monthly interim packets.
- ISO 27001 — annual surveillance packet + ad hoc certification-preparation packet.

---

## 11. Admin UI Extensions

### 11.1 Routes

Existing `/admin/soc2/*` routes preserved unchanged.

New framework-scoped routes:

```
/admin/frameworks                                           (multi-framework dashboard)
/admin/frameworks/[framework]                              (framework-specific dashboard)
/admin/frameworks/[framework]/packets                      (packet list)
/admin/frameworks/[framework]/packets/[id]                 (packet detail)
/admin/frameworks/[framework]/packets/[id]/verify
/admin/frameworks/[framework]/packets/[id]/narratives      (narrator review, framework-scoped)
/admin/frameworks/[framework]/packets/[id]/sign            (framework-appropriate attestation)
/admin/frameworks/[framework]/generate                     (on-demand)
/admin/frameworks/[framework]/schedule
/admin/frameworks/[framework]/collectors                   (framework-specific collector health)
/admin/frameworks/[framework]/auditors

/admin/frameworks/hipaa/risk-analysis                      (Risk Analysis upload/tracking)
/admin/frameworks/hipaa/sanctions                          (sanction actions log)
/admin/frameworks/hipaa/breaches                           (breach determinations)
/admin/frameworks/hipaa/contingency                        (contingency plan test log)
/admin/frameworks/hipaa/emergency-access                   (emergency access log)
/admin/frameworks/hipaa/device-media                       (device/media events)

/admin/frameworks/iso/soa                                  (SoA manager)
/admin/frameworks/iso/risk-register                        (risk register)
/admin/frameworks/iso/internal-audits                      (internal audit log)
/admin/frameworks/iso/management-reviews                   (management review records)
/admin/frameworks/iso/nonconformities                      (nonconformity register)

/admin/frameworks/consistency                              (cross-framework consistency dashboard)
/admin/frameworks/crosswalk                                (control crosswalk viewer)
/admin/frameworks/registry                                 (registry version history)
```

### 11.2 Multi-Framework Dashboard

Central dashboard showing:

- Per-framework status (next scheduled packet, last packet signed, open consistency flags).
- Cross-framework coverage map — for any evidence source, which frameworks cite it.
- Upcoming obligations — "HIPAA annual risk analysis due in 47 days", "ISO surveillance audit in 112 days", "SOC 2 Q2 packet generation in 68 days".
- Open nonconformities (ISO) + open corrective action plans (HIPAA) + open SOC 2 exceptions in a single roll-up.

### 11.3 Consistency Flag Review

When the consistency checker surfaces a flag, it lands in `/admin/frameworks/consistency`. Steve reviews:

- Which packets are affected.
- What shared evidence is at issue.
- The specific narrative claims that disagree.
- Resolution options: edit one narrative, edit both, mark as distinction (different frameworks may characterize the same evidence differently in ways that aren't inconsistent).

No packet can be signed while it has an unresolved consistency flag.

### 11.4 Crosswalk Viewer

For any control in any framework:

- The control's definition.
- The evidence sources that satisfy it.
- The equivalent controls in the other two frameworks.
- The signed narratives for that control across packet history.

This gives Steve (and auditors, for those with cross-framework grants) a single view of how FarmCeutica operates a given capability.

### 11.5 UI Constraints

- Lucide icons at `strokeWidth={1.5}`, zero emojis.
- `getDisplayName()` for every client-facing name including framework labels and attestor roles.
- Desktop + mobile parity.
- Framework context always visible in navigation breadcrumbs.
- WCAG AA accessibility.

---

## 12. Auditor Portal Extensions

### 12.1 Framework-Scoped Grants

An auditor grant specifies one framework. An auditor engaged for HIPAA review has a HIPAA-scoped grant; a SOC 2 auditor has a SOC 2-scoped grant. Cross-framework grants are possible but require explicit dual-framework specification.

RLS enforces scope: a HIPAA grant cannot read SOC 2 packets and vice versa.

### 12.2 Framework Selector

The auditor's landing page (after grant-gated authentication) shows only the frameworks their grant covers. Internal navigation is scoped to that framework.

### 12.3 Framework-Appropriate Terminology

The auditor UI uses the terminology of the framework being reviewed:

- SOC 2: "control", "trust services criterion", "attestation period".
- HIPAA: "safeguard", "specification", "documentation".
- ISO 27001: "control", "clause", "Annex A", "Statement of Applicability", "nonconformity".

No framework leaks terminology into another's UI.

### 12.4 Cross-Framework Crosswalk (Restricted)

Auditors with cross-framework grants can see the crosswalk viewer; single-framework auditors cannot. This respects engagement scope.

---

## 13. Security, Privacy, Authority Preservation

### 13.1 Authority Chain

Each framework has a distinct attestor role. At signing time:

- The system checks that Steve's current role assignment includes the framework-appropriate attestor role.
- If Steve is acting as Security Officer (HIPAA) vs. Compliance Officer (SOC 2) vs. ISMS Manager (ISO), the signing record captures which capacity.
- A single signing event cannot cover multiple frameworks — each framework's packet is signed in a separate action with its specific attestation language.

### 13.2 Separation of Duties Across Frameworks

If FarmCeutica grows and the three roles are separated across multiple people, the architecture already supports that:

- `attestor_role` per framework in the registry.
- Per-role grants via existing role-based access from #119.
- Signing flow binds to role, not to user ID.

### 13.3 HIPAA-Specific Privacy Protections

HIPAA evidence touches workforce information (training records, sanction actions, emergency access invocations) that is itself sensitive. Per §9 schema:

- Workforce members are referenced by pseudonyms per the de-pseudonymization policy from #122 §7.
- Sanction actions record pseudonyms, not names.
- De-pseudonymization for a HIPAA-specific request requires Steve + Thomas dual approval, same as #122.

HIPAA evidence involving patients (which is almost never actually in a SOC 2 evidence packet — patient PHI is its own category) uses the same pseudonymization; if a specific OCR audit request requires patient-level re-identification, that flow goes through legal counsel additionally.

### 13.4 ISO 27001 Privacy Protections

ISO evidence is primarily operational (internal audits, management reviews, nonconformities). No patient data; minimal workforce identification. Pseudonymization still applies where relevant.

### 13.5 Breach Notification Privacy

HIPAA breach records (§ 9 `hipaa_breach_determinations`) contain the four-factor assessment, which may reference affected individuals. The assessment references patient-count aggregates, not individual identities. Individual-level data stays in an encrypted separate store (existing PHI database), accessed only for required notifications.

### 13.6 Cross-Framework Evidence Integrity

Shared evidence files are byte-identical across packets. The consistency checker confirms this; any divergence (e.g., a collector being run with different inputs for different packets) is flagged.

### 13.7 Registry Change Auditability

Registry changes are code changes, tracked in git. Every packet pins its registry version. An auditor can reconstruct exactly what rules and definitions were in effect when a packet was generated.

### 13.8 Kill-Switches

- `FRAMEWORK_PACKET_GENERATION`: `active` / `paused` / `off` per framework.
- `FRAMEWORK_CONSISTENCY_CHECK`: `active` / `advisory_only` (flags not blocking) / `off`.
- Global `off` on any framework requires two-person approval (Steve + framework-appropriate second approver: Thomas for technical, Gary for executive).

### 13.9 Legal Review Checkpoints

Three distinct legal review checkpoints:

1. **HIPAA attestation language** — must be reviewed by counsel with HIPAA expertise.
2. **ISO 27001 attestation language** — reviewed by counsel familiar with international standards.
3. **Breach notification determinations** — § 164.400-series determinations may trigger OCR notification obligations; legal counsel must be notified on any `breach_confirmed` determination within 24 hours of assessment completion.

---

## 14. OBRA Four Gates

### Gate 1 — Observe & Brainstorm

- Enumerate every control point in SOC 2, HIPAA Security Rule, and ISO 27001:2022.
- Build the full cross-framework crosswalk (approximately 200 crosswalk entries).
- Identify every evidence source and map it to its frameworks.
- Identify framework-specific artifacts requiring manual upload.
- Legal review items: HIPAA and ISO attestation language, Security Officer designation document, ISMS Manager designation document, breach notification procedures.

### Gate 2 — Blueprint / Micro-Task Decomposition

1. Migration `20260423_multi_framework_evidence.sql`.
2. `lib/compliance/frameworks/registry.ts` + types.
3. `lib/compliance/frameworks/definitions/soc2.ts` — refactor #122 into registry form.
4. `lib/compliance/frameworks/definitions/hipaa.ts`.
5. `lib/compliance/frameworks/definitions/iso27001.ts`.
6. `lib/compliance/frameworks/crosswalk.ts` + tests.
7. Refactor `lib/soc2/assemble/*` into framework-agnostic assembler.
8. Backward-compat test: SOC 2 packet post-refactor byte-matches pre-refactor.
9. HIPAA-specific collectors (5).
10. HIPAA-specific services (risk analysis, sanctions, breach assessment).
11. ISO-specific collectors (5).
12. ISO-specific services (SoA manager, risk register).
13. Narrator framework extensions (system prompts, section kinds, attestation language).
14. Cross-framework consistency checker + tests.
15. Admin UI — multi-framework dashboard, HIPAA + ISO subsections, consistency flag review, crosswalk viewer.
16. Auditor portal — framework-scoped grants + selector + terminology.
17. Scheduler — per-framework cadence.
18. Methodology docs for HIPAA and ISO packets.
19. End-to-end integration tests for each framework.
20. Consistency-violation red-team corpus.
21. Marshall self-scan of PR.

### Gate 3 — Review

- SOC 2 backward compatibility verified byte-for-byte.
- Every registry entry cross-referenced correctly against others.
- Framework-scoped auditor RLS prevents cross-framework access without explicit grant.
- Each framework's attestation language reviewed by legal counsel.
- HIPAA Required/Addressable distinctions present and correct.
- ISO SoA structure valid.
- Consistency checker catches synthetic inconsistencies in the red-team corpus.
- All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()`.
- Desktop + mobile parity.
- No reference to "Vitality Score" / "5–27×" / "Semaglutide" (non-guardrail).
- No reference to CedarGrowth / Via Cura / cannabis / METRC / NY OCM / psychedelic therapy.
- `package.json`, email templates, applied migrations untouched.

### Gate 4 — Audit / TDD

- ≥ 90% coverage on `lib/compliance/frameworks/*`, `lib/hipaa/*`, `lib/iso27001/*`.
- End-to-end tests:
  - SOC 2 packet generated → signed → packet structure matches pre-refactor.
  - HIPAA packet generated → safeguards narrated → signed by Security Officer → audit log captures role capacity.
  - ISO 27001 packet generated → SoA included → narrated by ISMS Manager capacity.
  - Shared evidence file cited across all three packets → byte-identical SHA-256 → crosswalk file accurate.
  - Consistency violation injected (narrative count mismatch across frameworks) → flagged → signing blocked.
  - Registry version change between packets → new packet pins the new version.
  - Framework-scoped auditor grant → cannot read out-of-scope packets.
  - HIPAA breach determination with `breach_confirmed` → legal notification hook fires.
  - Backward compatibility: existing signed #122 SOC 2 packets still verify successfully.
- Determinism test: same period + same registry version + same inputs → byte-identical packets.
- Marshall `marshall-lint` self-scan → zero P0 findings.

---

## 15. TDD — Representative Test Cases

```typescript
// tests/compliance/frameworks/crosswalk.test.ts
describe('Cross-framework crosswalk', () => {
  it('maps access-review collector to SOC 2 CC6.1, HIPAA 164.308(a)(4), ISO A.5.15', () => {
    const result = crosswalk('access-review-quarterly-collector');
    expect(result).toEqual({
      soc2: ['CC6.1'],
      hipaa_security: ['164.308(a)(4)'],
      iso_27001_2022: ['A.5.15','A.5.18'],
    });
  });

  it('returns empty for collector that has no framework mapping', () => {
    const result = crosswalk('dev-only-metrics-collector');
    expect(result.soc2).toEqual([]);
    expect(result.hipaa_security).toEqual([]);
    expect(result.iso_27001_2022).toEqual([]);
  });
});

describe('SOC 2 backward compatibility', () => {
  it('generates byte-identical packet to pre-refactor version', async () => {
    const prePacket = await loadFixtureSoc2PacketPreRefactor();
    const postPacket = await generatePacket('soc2', prePacket.period);
    const preHashes = fileHashMap(prePacket);
    const postHashes = fileHashMap(postPacket);
    // Excluding signature timestamps which are inherently stochastic per time
    expect(excludeTimestamps(preHashes)).toEqual(excludeTimestamps(postHashes));
  });

  it('existing signed SOC 2 packets still verify', async () => {
    const existingPacket = await loadExistingSignedPacket();
    const result = await verifyPacket(existingPacket, fetchJwks());
    expect(result.ok).toBe(true);
  });
});

describe('HIPAA-specific structure', () => {
  it('packet has administrative/physical/technical/organizational sections', async () => {
    const packet = await generatePacket('hipaa_security', q1_2026);
    const paths = packetFilePaths(packet);
    expect(paths).toContainPath('administrative-safeguards/');
    expect(paths).toContainPath('physical-safeguards/');
    expect(paths).toContainPath('technical-safeguards/');
    expect(paths).toContainPath('organizational-requirements/');
  });

  it('Required safeguards have evidence; Addressable safeguards have determination record', async () => {
    const packet = await generatePacket('hipaa_security', q1_2026);
    for (const control of hipaaRegistry.controlPoints) {
      if (control.required_or_addressable === 'required') {
        expect(controlHasEvidence(packet, control.id)).toBe(true);
      } else {
        expect(controlHasDeterminationRecord(packet, control.id)).toBe(true);
      }
    }
  });

  it('Security Officer attestation language used', async () => {
    const packet = await generatePacket('hipaa_security', q1_2026);
    const attestation = getAttestation(packet);
    expect(attestation.role).toBe('security_officer');
    expect(attestation.language).toContain('45 CFR § 164.308(a)(2)');
  });
});

describe('ISO 27001-specific structure', () => {
  it('packet has statement-of-applicability.csv', async () => {
    const packet = await generatePacket('iso_27001_2022', q1_2026);
    expect(packetFilePaths(packet)).toContainPath('statement-of-applicability.csv');
  });

  it('SoA lists every Annex A control with applicability', async () => {
    const packet = await generatePacket('iso_27001_2022', q1_2026);
    const soa = parseCsv(packet.file('statement-of-applicability.csv'));
    expect(soa.length).toBe(93);  // All 93 Annex A controls
    for (const row of soa) {
      expect(row.applicable).toMatch(/^(true|false)$/);
      expect(row.justification).toBeTruthy();
    }
  });

  it('ISMS Manager attestation language used', async () => {
    const packet = await generatePacket('iso_27001_2022', q1_2026);
    const attestation = getAttestation(packet);
    expect(attestation.role).toBe('isms_manager');
    expect(attestation.language).toContain('ISO/IEC 27001:2022');
  });
});

describe('Shared evidence byte-identity', () => {
  it('access-review CSV hash identical across SOC 2, HIPAA, ISO packets for same period', async () => {
    const soc2 = await generatePacket('soc2', q1_2026);
    const hipaa = await generatePacket('hipaa_security', q1_2026);
    const iso = await generatePacket('iso_27001_2022', q1_2026);
    const s2 = fileHash(soc2, 'CC6-logical-access/access-review-quarterly.csv');
    const hp = fileHash(hipaa, 'administrative-safeguards/164-308-a-4-.../access-review-summary.csv');
    const is = fileHash(iso, 'annex-a-controls/A-5-organizational/A-5-15-access-control/access-review-summary.csv');
    expect(s2).toBe(hp);
    expect(hp).toBe(is);
  });
});

describe('Cross-framework consistency check', () => {
  it('catches contradictory narrative count claims', async () => {
    const soc2 = await generatePacketWithNarrative('soc2', { findingsCount: 1287 });
    const hipaa = await generatePacketWithNarrative('hipaa_security', { findingsCount: 1340 });
    const flags = await checkConsistency([soc2, hipaa]);
    expect(flags).toContainEqual(expect.objectContaining({
      inconsistency_kind: 'count_mismatch',
      severity: 'critical',
    }));
  });

  it('allows permitted distinctions (different framework characterizations)', async () => {
    // E.g., same incident characterized as "exception" in SOC 2 but "not a breach" in HIPAA
    const soc2 = await generatePacketWithNarrative('soc2', { incidentChar: 'exception_documented' });
    const hipaa = await generatePacketWithNarrative('hipaa_security', { incidentChar: 'not_a_breach' });
    const flags = await checkConsistency([soc2, hipaa]);
    const real = flags.filter(f => f.severity !== 'info');
    expect(real.length).toBe(0);
  });

  it('blocks signing when unresolved critical flag exists', async () => {
    const packet = withUnresolvedCriticalFlag();
    const result = await trySign(packet);
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/unresolved consistency flag/i);
  });
});

describe('Framework-scoped auditor grants', () => {
  it('HIPAA grant cannot read SOC 2 packet', async () => {
    await createAuditorGrant(auditor, [soc2Packet.id], { framework: 'soc2' });
    const r = await fetch(`/auditor/soc2/packets/${soc2Packet.id}`, auditorSession);
    expect(r.status).toBe(200);
    const r2 = await fetch(`/auditor/hipaa/packets/${hipaaPacket.id}`, auditorSession);
    expect(r2.status).toBe(403);
  });
});

describe('HIPAA breach notification hook', () => {
  it('breach_confirmed determination fires legal notification', async () => {
    const hook = spyOn(legalNotifier, 'notify');
    await recordBreachDetermination({ determination: 'breach_confirmed', incident_id: i.id });
    expect(hook).toHaveBeenCalledWith(expect.objectContaining({ determination: 'breach_confirmed' }));
  });

  it('low_probability determination does NOT fire legal notification', async () => {
    const hook = spyOn(legalNotifier, 'notify');
    await recordBreachDetermination({ determination: 'low_probability_of_compromise', incident_id: i.id });
    expect(hook).not.toHaveBeenCalled();
  });
});

describe('Role capacity capture', () => {
  it('signing HIPAA packet captures security_officer capacity', async () => {
    await signPacket(hipaaPacket, steveSession);
    const record = await getSigningRecord(hipaaPacket.id);
    expect(record.signer_role).toBe('security_officer');
  });

  it('same Steve signing SOC 2 captures compliance_officer capacity', async () => {
    await signPacket(soc2Packet, steveSession);
    const record = await getSigningRecord(soc2Packet.id);
    expect(record.signer_role).toBe('compliance_officer');
  });
});

describe('Registry version pinning', () => {
  it('every packet pins the registry version at generation time', async () => {
    const packet = await generatePacket('hipaa_security', q1_2026);
    expect(packet.framework_registry_version).toBeDefined();
    expect(packet.framework_registry_version).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it('registry version change does not invalidate prior packets', async () => {
    const oldPacket = await generatePacket('soc2', q4_2025);
    bumpRegistryVersion();
    const result = await verifyPacket(oldPacket);
    expect(result.ok).toBe(true);
  });
});
```

---

## 16. File Manifest

**New files (create):**

```
supabase/migrations/20260423_multi_framework_evidence.sql

lib/compliance/frameworks/types.ts
lib/compliance/frameworks/registry.ts
lib/compliance/frameworks/crosswalk.ts
lib/compliance/frameworks/consistency.ts
lib/compliance/frameworks/scheduler.ts
lib/compliance/frameworks/definitions/soc2.ts          (refactor of existing scope)
lib/compliance/frameworks/definitions/hipaa.ts
lib/compliance/frameworks/definitions/iso27001.ts

lib/hipaa/types.ts
lib/hipaa/riskAnalysis.ts
lib/hipaa/sanctions.ts
lib/hipaa/breachAssessment.ts
lib/hipaa/collectors/breach.ts
lib/hipaa/collectors/workforce.ts
lib/hipaa/collectors/contingency.ts
lib/hipaa/collectors/emergencyAccess.ts
lib/hipaa/collectors/deviceMedia.ts

lib/iso27001/types.ts
lib/iso27001/soaManager.ts
lib/iso27001/riskRegister.ts
lib/iso27001/collectors/soa.ts
lib/iso27001/collectors/riskTreatment.ts
lib/iso27001/collectors/internalAudit.ts
lib/iso27001/collectors/managementReview.ts
lib/iso27001/collectors/nonconformity.ts

lib/marshall/narrator/framework.ts

app/api/frameworks/[framework]/generate/route.ts
app/api/frameworks/[framework]/packets/[id]/sign/route.ts
app/api/frameworks/[framework]/packets/[id]/download/route.ts
app/api/frameworks/[framework]/collectors/[id]/run/route.ts
app/api/frameworks/[framework]/auditors/grants/route.ts
app/api/frameworks/consistency/resolve/[flagId]/route.ts
app/api/hipaa/risk-analysis/upload/route.ts
app/api/hipaa/sanctions/route.ts
app/api/hipaa/breach-determinations/route.ts
app/api/hipaa/contingency-tests/route.ts
app/api/hipaa/emergency-access/route.ts
app/api/hipaa/device-media/route.ts
app/api/iso/soa/route.ts
app/api/iso/soa/[version]/approve/route.ts
app/api/iso/risk-register/route.ts
app/api/iso/internal-audits/route.ts
app/api/iso/management-reviews/route.ts
app/api/iso/nonconformities/route.ts

components/frameworks-admin/MultiFrameworkDashboard.tsx
components/frameworks-admin/FrameworkSelector.tsx
components/frameworks-admin/FrameworkDashboard.tsx
components/frameworks-admin/CrosswalkViewer.tsx
components/frameworks-admin/ConsistencyFlagList.tsx
components/frameworks-admin/ConsistencyFlagResolver.tsx
components/frameworks-admin/RegistryVersionHistory.tsx
components/frameworks-admin/ObligationsCalendar.tsx

components/hipaa-admin/RiskAnalysisManager.tsx
components/hipaa-admin/SanctionActionsLog.tsx
components/hipaa-admin/BreachDeterminationForm.tsx
components/hipaa-admin/FourFactorAssessment.tsx
components/hipaa-admin/ContingencyTestLog.tsx
components/hipaa-admin/EmergencyAccessLog.tsx
components/hipaa-admin/DeviceMediaLog.tsx

components/iso-admin/SoaManager.tsx
components/iso-admin/SoaEntryEditor.tsx
components/iso-admin/RiskRegisterTable.tsx
components/iso-admin/RiskEntryEditor.tsx
components/iso-admin/InternalAuditLog.tsx
components/iso-admin/ManagementReviewLog.tsx
components/iso-admin/NonconformityRegister.tsx

components/auditor-multi-framework/FrameworkSelector.tsx
components/auditor-multi-framework/FrameworkScopedNav.tsx

app/(admin)/admin/frameworks/page.tsx
app/(admin)/admin/frameworks/[framework]/page.tsx
app/(admin)/admin/frameworks/[framework]/packets/page.tsx
app/(admin)/admin/frameworks/[framework]/packets/[id]/page.tsx
app/(admin)/admin/frameworks/[framework]/packets/[id]/narratives/page.tsx
app/(admin)/admin/frameworks/[framework]/packets/[id]/sign/page.tsx
app/(admin)/admin/frameworks/[framework]/generate/page.tsx
app/(admin)/admin/frameworks/[framework]/schedule/page.tsx
app/(admin)/admin/frameworks/[framework]/collectors/page.tsx
app/(admin)/admin/frameworks/[framework]/auditors/page.tsx
app/(admin)/admin/frameworks/hipaa/risk-analysis/page.tsx
app/(admin)/admin/frameworks/hipaa/sanctions/page.tsx
app/(admin)/admin/frameworks/hipaa/breaches/page.tsx
app/(admin)/admin/frameworks/hipaa/contingency/page.tsx
app/(admin)/admin/frameworks/hipaa/emergency-access/page.tsx
app/(admin)/admin/frameworks/hipaa/device-media/page.tsx
app/(admin)/admin/frameworks/iso/soa/page.tsx
app/(admin)/admin/frameworks/iso/risk-register/page.tsx
app/(admin)/admin/frameworks/iso/internal-audits/page.tsx
app/(admin)/admin/frameworks/iso/management-reviews/page.tsx
app/(admin)/admin/frameworks/iso/nonconformities/page.tsx
app/(admin)/admin/frameworks/consistency/page.tsx
app/(admin)/admin/frameworks/crosswalk/page.tsx
app/(admin)/admin/frameworks/registry/page.tsx

app/(auditor)/auditor/[framework]/packets/page.tsx
app/(auditor)/auditor/[framework]/packets/[id]/page.tsx
app/(auditor)/auditor/[framework]/packets/[id]/files/[...path]/page.tsx
app/(auditor)/auditor/[framework]/packets/[id]/narratives/page.tsx
app/(auditor)/auditor/[framework]/packets/[id]/narratives/[controlId]/page.tsx
app/(auditor)/auditor/[framework]/resolve/page.tsx

tests/compliance/frameworks/**/*.test.ts
tests/hipaa/**/*.test.ts
tests/iso27001/**/*.test.ts
tests/e2e/multi_framework_generation.test.ts
tests/e2e/soc2_backward_compat.test.ts
tests/e2e/hipaa_full_packet.test.ts
tests/e2e/iso27001_full_packet.test.ts
tests/e2e/consistency_flag_resolution.test.ts
tests/fixtures/framework-registry-fixture.ts
```

**Modified files (surgical edits only):**

```
lib/soc2/assemble/manifest.ts                     (accept framework_id parameter)
lib/soc2/assemble/sign.ts                         (framework-specific attestation language)
lib/soc2/collectors/types.ts                      (add framework_support field)
lib/soc2/collectors/[all]                         (add framework_support declarations)
lib/soc2/collectors/runAll.ts                     (framework-aware execution)
lib/marshall/narrator/generate.ts                 (accept framework-aware context)
lib/marshall/narrator/types.ts                    (extend NarrativeSectionKind)
lib/getDisplayName.ts                             (add framework labels, attestor role labels)
app/(admin)/admin/soc2/page.tsx                   (redirect or co-exist with /admin/frameworks/soc2)
app/(auditor)/auditor/soc2/*                      (co-exist with /auditor/soc2/* — existing routes unchanged)
```

**Explicitly NOT modified:**

- `package.json` — all logic uses existing dependencies (Node built-ins, existing Anthropic SDK, existing Supabase SDK). If genuinely necessary, stop and raise to Gary — do not silently add.
- Previously-applied migrations.
- Supabase email templates.
- Any existing signed #122 SOC 2 packet's structure or signature.
- Any existing Marshall, Hounddog, Pre-Check, Rebuttal, Vision, Scheduler Bridge, or Narrator evaluator logic.

---

## 17. Acceptance Criteria

- ✅ Migration applies cleanly on a fresh Supabase branch. RLS enabled on every new table. Every FK indexed.
- ✅ Existing #122 SOC 2 packets continue to verify successfully post-refactor.
- ✅ Post-refactor SOC 2 packet generation byte-matches pre-refactor output (modulo signing timestamps).
- ✅ HIPAA packet structure matches §6.2; every Required safeguard has evidence; every Addressable has a determination.
- ✅ ISO 27001 packet structure matches §6.3; SoA includes all 93 Annex A controls with justifications.
- ✅ Shared evidence files are byte-identical across frameworks (SHA-256 match).
- ✅ Cross-framework consistency checker catches synthetic inconsistencies in the red-team corpus.
- ✅ Signing blocked while unresolved critical consistency flags exist.
- ✅ Framework-scoped auditor RLS prevents cross-framework access without explicit grant.
- ✅ HIPAA attestation by Security Officer capacity; ISO by ISMS Manager capacity; SOC 2 by Compliance Officer capacity — all captured in signing records.
- ✅ HIPAA breach determination `breach_confirmed` triggers legal counsel notification hook.
- ✅ Registry version pinned in every generated packet.
- ✅ Narrator produces framework-appropriate section kinds with framework-appropriate voice.
- ✅ Cross-framework carryover explicitly prohibited; tested.
- ✅ All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()` applied.
- ✅ Desktop + mobile parity on every new page.
- ✅ No reference to "Vitality Score" / "Wellness Score" / "5–27×" / "Semaglutide" in diff (non-guardrail).
- ✅ No reference to CedarGrowth / Via Cura / cannabis compliance / METRC / NY OCM / psychedelic therapy.
- ✅ `package.json`, email templates, applied migrations untouched.
- ✅ `marshall-lint` self-scan produces zero P0 findings.
- ✅ OBRA Gate 1–4 summary in PR description.

---

## 18. Rollout Plan

**Phase A — SOC 2 Refactor (Days 1–14)**

- Registry introduced with SOC 2 as the sole framework.
- Existing SOC 2 packet generation routed through registry.
- Backward-compat tests run continuously.
- No new framework packets yet.

**Phase B — HIPAA Introduction (Days 15–45)**

- HIPAA registry definitions activated.
- HIPAA-specific collectors built and tested in shadow mode.
- Manual evidence vault populated: risk analysis, sanction policy, contingency plans, facility security plan.
- First HIPAA packet generated for internal review; Steve reviews; iterates.
- HIPAA packet goes live after legal counsel signoff on attestation language.

**Phase C — ISO 27001 Introduction (Days 46–90)**

- ISO registry definitions activated.
- SoA drafted by Steve with Michelangelo guidance; legal counsel review.
- Risk register populated.
- First internal audit scheduled.
- ISO packet generated for readiness review; used to prepare for certification audit.

**Phase D — Steady State (Day 91+)**

- All three frameworks run on their respective cadences.
- Cross-framework consistency checker active and passing.
- Auditors onboarded per framework with scoped grants.
- Quarterly retrospective surfaces any drift or inconsistency patterns.

**Kill-Switches**

- `FRAMEWORK_PACKET_GENERATION`: per-framework `active` / `paused` / `off`.
- `FRAMEWORK_CONSISTENCY_CHECK`: `active` / `advisory_only` / `off`.
- Registry version freeze during sensitive windows (e.g., during a live audit): no registry changes without Gary approval.

---

## 19. Out of Scope — Reserved for Next Prompts

Per the forward roadmap:

- **Prompt #128** — Practitioner-facing compliance coach: proactive coaching based on historical patterns.
- **Prompt #129** — Dedicated hologram classifier if inline Claude Vision proves inadequate.
- **Prompt #130** — Authorized-reseller authentication portal.
- **Prompt #131** — Additional scheduler platform support.
- **Prompt #132** — Multi-year trend analysis across SOC 2 packets (longitudinal compliance evidence).
- **Prompt #133** — PCI-DSS evidence variant (if payment processing changes scope).
- **Prompt #134** — NIST CSF 2.0 evidence variant.
- **Prompt #135** — Annual framework retrospective report generator.

**Memorialization note (2026-04-24):** §19's forward roadmap above is preserved as authored. Several of these slots are already occupied in the live prompt library with different content: `#129` is the External Repository Governance Policy; `#131` is the Sherlock Evaluation Template; `#132` is the Agent-Card Rewrite Pack; `#133` is Socket.dev Integration; `#134` is ML Tier B Environment; `#135` is GitHub Actions SHA-Pinning. The roadmap here reflects the author's forward intent at drafting time; the live library is canonical for what actually landed.

No CedarGrowth Organics, Via Cura Ranch, or any unrelated venture appears in this roadmap, per the standing directive in the Amendment to #119/#120.

---

## 20. Marshall's Opening Statement — Multi-Framework Activation

> **M-2026-0423-1701 — Advisory.** The evidence architecture now supports SOC 2, HIPAA Security Rule, and ISO/IEC 27001:2022 simultaneously. A single operational event — an access review, an incident response, an encryption key rotation — becomes evidence for whichever frameworks require it, cited by its framework-native identifier, narrated in framework-appropriate voice, and signed by the framework-appropriate attestor. Cross-framework consistency is enforced: the same evidence cannot tell contradictory stories to different auditors. Every packet pins the framework registry version at generation time, so historical packets remain reproducible as standards evolve. Cite. Remediate. Document.
> — Marshall, Compliance Officer, ViaConnect™.

---

## 21. Execution Command for Claude Code

```
/effort max
Execute Prompt #138 — Multi-Framework Evidence Architecture — per the full
specification. Use OBRA framework. Michelangelo drives TDD. Do not modify
package.json, email templates, or any applied migration. SOC 2 backward
compatibility is non-negotiable — existing signed #122 packets MUST continue
to verify, and post-refactor SOC 2 packet generation MUST produce byte-
identical output to pre-refactor (modulo signing timestamps). Shared evidence
files across frameworks MUST have byte-identical SHA-256. Cross-framework
consistency checker MUST block signing on unresolved critical flags.
Framework-scoped auditor RLS MUST prevent cross-framework access without
explicit grant. HIPAA attestation MUST use Security Officer role capacity;
ISO attestation MUST use ISMS Manager capacity; SOC 2 MUST continue to use
Compliance Officer capacity. HIPAA breach_confirmed determinations MUST fire
legal counsel notification. Registry version MUST be pinned in every generated
packet. Respect the Amendment to #119/#120 — no CedarGrowth or Via Cura Ranch
references. Confirm each Gate 1–4 pass in your completion summary and list
every file touched.
```

---

## Memorialization note

Originally drafted as Prompt #127. Renumbered to Prompt #138 on 2026-04-24 at Gary's direction because the #127 slot is already claimed by the shipped implementation chain — commits `fb792cf` (P1-P4 framework registry + HIPAA schema), `7e063f0` (HIPAA API route handlers), `308e379` (HIPAA admin UI + components), `d0be690` (P5-P8 multi-framework ISO 27001 + crosswalk + Gate A), and `108ff7f` (Gate A polymorphic gate_signoff refactor). Gary also noted that the #136 slot is already allocated elsewhere, and #137 is Marshall Narrator.

Content preserved verbatim from the source, with self-references in the title and §21 Execution Command updated to `#138`. Parent prompt lineage (`#119` through `#126`) preserved as authored; §19 forward-roadmap references preserved with a memorialization footnote flagging that `#129`–`#135` slots are now occupied by the external-repository-governance chain rather than the compliance features originally anticipated.

**Relationship to shipped implementation:** This spec is memorialized *after* substantial implementation has already landed via the concurrent Claude Code engineering session. The spec is now the authoritative source-of-truth doc for what those commits were executing against. Gap analysis — which specific items in §16's file manifest are built vs. pending vs. skipped — is a diagnostic exercise left to a future audit review rather than replayed through another execution pass. The high-level pattern visible from the shipped commits: framework registry + HIPAA schema + HIPAA API + HIPAA admin UI + ISO 27001 + crosswalk + Gate A are on `origin/main`; cross-framework consistency checker, full auditor portal extensions, multi-framework dashboard, and narrator framework extensions may or may not yet be complete.
