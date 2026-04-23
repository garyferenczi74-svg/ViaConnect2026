/**
 * Pillar 6 — Advertising, Email, SMS (CAN-SPAM, TCPA, GDPR)
 */

import type { EvaluationContext, Finding, Rule } from "../engine/types";
import { generateFindingId, redactExcerpt } from "../engine/types";

const LAST_REVIEWED = "2026-04-23";

function f(
  ruleId: string,
  severity: Finding["severity"],
  message: string,
  citation: string,
  excerpt: string,
  remediation: Finding["remediation"],
  ctx: EvaluationContext,
): Finding {
  return {
    findingId: generateFindingId(ctx.now),
    ruleId,
    severity,
    surface: ctx.surface,
    source: ctx.source,
    location: ctx.location ?? {},
    excerpt,
    message,
    citation,
    remediation,
    createdAt: (ctx.now ?? new Date()).toISOString(),
  };
}

export const CAN_SPAM_UNSUB: Rule<{ subject: string; body: string; hasUnsubLink: boolean; hasPhysicalAddress: boolean }> = {
  id: "MARSHALL.COMMS.CAN_SPAM_UNSUB",
  pillar: "COMMS",
  severity: "P0",
  surfaces: ["email"],
  citation: "CAN-SPAM Act 15 USC 7701",
  description: "Marketing email must include one-click unsubscribe + physical address.",
  evaluate: (input, ctx = defaultCtx()) => {
    const findings: Finding[] = [];
    if (!input.hasUnsubLink) {
      findings.push(
        f(
          "MARSHALL.COMMS.CAN_SPAM_UNSUB",
          "P0",
          'Finding: marketing email missing one-click unsubscribe link.',
          "CAN-SPAM Act",
          input.subject,
          { kind: "manual", summary: "Add unsubscribe link to footer before send.", action: "BLOCK_SEND" },
          ctx,
        ),
      );
    }
    if (!input.hasPhysicalAddress) {
      findings.push(
        f(
          "MARSHALL.COMMS.CAN_SPAM_UNSUB",
          "P0",
          "Finding: marketing email missing physical address in footer.",
          "CAN-SPAM Act",
          input.subject,
          { kind: "manual", summary: "Add physical address to footer before send.", action: "BLOCK_SEND" },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const TCPA_SMS_CONSENT: Rule<{ userId: string; hasOptIn: boolean; doubleOptInRequired: boolean; doubleOptInConfirmed: boolean }> = {
  id: "MARSHALL.COMMS.TCPA_SMS_CONSENT",
  pillar: "COMMS",
  severity: "P0",
  surfaces: ["sms"],
  citation: "TCPA 47 USC 227",
  description: "No SMS without explicit opt-in. EU requires double opt-in.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (!input.hasOptIn) {
      return [
        f(
          "MARSHALL.COMMS.TCPA_SMS_CONSENT",
          "P0",
          `Finding: SMS queued for user ${input.userId} without opt-in record.`,
          "TCPA",
          input.userId,
          { kind: "manual", summary: "Block send. Route user to opt-in flow.", action: "BLOCK_SEND" },
          ctx,
        ),
      ];
    }
    if (input.doubleOptInRequired && !input.doubleOptInConfirmed) {
      return [
        f(
          "MARSHALL.COMMS.TCPA_SMS_CONSENT",
          "P0",
          `Finding: EU user ${input.userId} has single opt-in; double opt-in required.`,
          "TCPA + EU ePrivacy",
          input.userId,
          { kind: "manual", summary: "Block send. Send double opt-in confirmation first.", action: "BLOCK_SEND" },
          ctx,
        ),
      ];
    }
    return [];
  },
  lastReviewed: LAST_REVIEWED,
};

export const MARKETING_CONSENT_LEDGER: Rule<{ userId: string; campaign: string; consentAtSendTime: boolean }> = {
  id: "MARSHALL.COMMS.MARKETING_CONSENT_LEDGER",
  pillar: "COMMS",
  severity: "P1",
  surfaces: ["email", "sms"],
  citation: "Consent-at-send-time best practice",
  description: "Consent verified at send-time, not campaign-create time.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.consentAtSendTime) return [];
    return [
      f(
        "MARSHALL.COMMS.MARKETING_CONSENT_LEDGER",
        "P1",
        `Finding: consent not verified at send-time for user ${input.userId} (campaign ${input.campaign}).`,
        "Platform policy",
        `${input.userId}/${input.campaign}`,
        { kind: "manual", summary: "Re-query consent_ledger right before enqueuing.", action: "BLOCK_SEND" },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const AD_DISCLOSURE: Rule<{ practitionerId: string; platform: string; postText: string; hasDisclosure: boolean }> = {
  id: "MARSHALL.COMMS.AD_DISCLOSURE",
  pillar: "COMMS",
  severity: "P1",
  surfaces: ["marketing_page"],
  citation: "FTC Endorsement Guides 2023",
  description: "Practitioner endorsements on external platforms require material-connection disclosure.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.hasDisclosure) return [];
    if (!/farmceutica|viaconnect|genex360/i.test(input.postText)) return [];
    return [
      f(
        "MARSHALL.COMMS.AD_DISCLOSURE",
        "P1",
        `Finding: practitioner ${input.practitionerId} post on ${input.platform} mentions FarmCeutica without disclosure.`,
        "FTC Endorsement Guides",
        redactExcerpt(input.postText, 0, 160),
        { kind: "manual", summary: "Flag post; practitioner must add #ad or equivalent disclosure." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

function defaultCtx(): EvaluationContext {
  return { surface: "email", source: "runtime", now: new Date() };
}

export const commsRules: Rule[] = [CAN_SPAM_UNSUB, TCPA_SMS_CONSENT, MARKETING_CONSENT_LEDGER, AD_DISCLOSURE];
