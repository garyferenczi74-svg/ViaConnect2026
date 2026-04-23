/**
 * Marshall escalation ladder and routing.
 * Clinical incidents (Pillars 1/2/3) also notify Dr. Fadi Dagher.
 */

import type { EscalationTarget, Pillar, Severity } from "../engine/types";

export interface EscalationRule {
  severity: Severity;
  to: EscalationTarget[];
  slaMinutes: number;
}

export const ESCALATION_LADDER: Readonly<Record<Severity, EscalationRule>> = {
  P0: { severity: "P0", to: ["steve_rica", "gary"], slaMinutes: 15 },
  P1: { severity: "P1", to: ["steve_rica"], slaMinutes: 240 },
  P2: { severity: "P2", to: ["steve_rica"], slaMinutes: 24 * 60 },
  P3: { severity: "P3", to: ["steve_rica"], slaMinutes: 7 * 24 * 60 },
  ADVISORY: { severity: "ADVISORY", to: [], slaMinutes: 0 },
};

const CLINICAL_PILLARS: ReadonlySet<Pillar> = new Set(["CLAIMS", "PEPTIDE", "GENETIC"]);

export function resolveEscalation(severity: Severity, pillar: Pillar): EscalationRule {
  const base = ESCALATION_LADDER[severity];
  if (CLINICAL_PILLARS.has(pillar) && (severity === "P0" || severity === "P1")) {
    const to = Array.from(new Set<EscalationTarget>([...base.to, "fadi"]));
    return { ...base, to };
  }
  return base;
}

// VIP MAP waivers require CFO (Domenic) approval per Prompt #102.
export function requiresCfoApproval(pillar: Pillar, waiverReason: string): boolean {
  return pillar === "MAP" && /vip/i.test(waiverReason);
}

// Clinical waivers require Medical Director (Fadi) co-sign.
export function requiresMedicalCosign(pillar: Pillar): boolean {
  return CLINICAL_PILLARS.has(pillar);
}
