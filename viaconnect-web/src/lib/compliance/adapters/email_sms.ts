/**
 * Email + SMS adapter — pre-send hook. Blocks a send if any P0/P1 hits.
 * Every outbound queue writer must pass through preSendCheck().
 */

import { ViolationDetector } from "../engine/ViolationDetector";
import type { Finding } from "../engine/types";

export interface EmailMessage {
  to: string;
  userId?: string;
  subject: string;
  body: string;
  hasUnsubLink: boolean;
  hasPhysicalAddress: boolean;
  kind: "marketing" | "transactional";
}

export interface SmsMessage {
  to: string;
  userId?: string;
  body: string;
  hasOptIn: boolean;
  doubleOptInRequired: boolean;
  doubleOptInConfirmed: boolean;
  kind: "marketing" | "transactional";
}

export interface PreSendResult {
  allow: boolean;
  findings: Finding[];
  blockReason?: string;
}

export async function preSendEmail(msg: EmailMessage): Promise<PreSendResult> {
  if (msg.kind === "transactional") {
    return { allow: true, findings: [] };
  }
  const detector = new ViolationDetector();
  const res = await detector.detect({
    surface: "email",
    source: "runtime",
    email: {
      subject: msg.subject,
      body: msg.body,
      hasUnsubLink: msg.hasUnsubLink,
      hasPhysicalAddress: msg.hasPhysicalAddress,
    },
    content: `${msg.subject}\n\n${msg.body}`,
    location: { userId: msg.userId },
  });
  return {
    allow: !res.blocked,
    findings: res.findings,
    blockReason: res.blocked ? res.findings.find((f) => f.severity === "P0")?.message : undefined,
  };
}

export async function preSendSms(msg: SmsMessage): Promise<PreSendResult> {
  if (msg.kind === "transactional") {
    return { allow: true, findings: [] };
  }
  const detector = new ViolationDetector();
  const res = await detector.detect({
    surface: "sms",
    source: "runtime",
    content: msg.body,
    location: { userId: msg.userId },
  });
  return {
    allow: !res.blocked,
    findings: res.findings,
    blockReason: res.blocked ? res.findings.find((f) => f.severity === "P0")?.message : undefined,
  };
}
