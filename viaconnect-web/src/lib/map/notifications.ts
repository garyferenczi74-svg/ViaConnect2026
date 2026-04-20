// Prompt #100 MAP Enforcement — notification channel routing.
//
// Severity dictates which channels fire. Pure routing logic so the
// notify edge function + any dashboard preview can share it.

import type { MAPSeverity } from './types';

export type NotificationChannel = 'in_app' | 'email' | 'sms';

export interface NotificationSLA {
  /** Max hours between detection and notification. */
  notificationSlaHours: number;
  channels: readonly NotificationChannel[];
}

const MATRIX: Record<MAPSeverity, NotificationSLA> = {
  yellow: { notificationSlaHours: 168, channels: ['in_app'] },
  orange: { notificationSlaHours: 24,  channels: ['in_app', 'email'] },
  red:    { notificationSlaHours: 4,   channels: ['in_app', 'email', 'sms'] },
  black:  { notificationSlaHours: 1,   channels: ['in_app', 'email', 'sms'] },
};

/** Pure: channel list for a given severity. */
export function channelsFor(severity: MAPSeverity): readonly NotificationChannel[] {
  return MATRIX[severity].channels;
}

/** Pure: notification SLA for a given severity. */
export function notificationSlaHours(severity: MAPSeverity): number {
  return MATRIX[severity].notificationSlaHours;
}

/** Pure: whether SMS is required for this severity. */
export function requiresSMS(severity: MAPSeverity): boolean {
  return channelsFor(severity).includes('sms');
}
