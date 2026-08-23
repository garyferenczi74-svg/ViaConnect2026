/**
 * src/lib/genetics/lifemetricsDemoGuard.ts
 *
 * Demo Client 4634 / demo@genemetrics.com is LifeMetrics sample data.
 * Never import those genotypes onto any ViaConnect user_id, including an
 * arbitrary member that happens to resolve from a webhook or pull.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import type { LifemetricsIdentityHints } from './lifemetricsIdentity';
import {
  emptyMappedImport,
  type LifemetricsMappedImport,
} from './lifemetricsImport';

export const LIFEMETRICS_DEMO_CLIENT_ID = '4634';
export const LIFEMETRICS_DEMO_EMAIL = 'demo@genemetrics.com';

export type LifemetricsDemoSource = {
  clientId?: string | number | null;
  email?: string | null;
};

export function normalizeLifemetricsClientId(
  value: string | number | null | undefined,
): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const compact = trimmed.replace(/^#/, '').replace(/^client[:\s_-]*/i, '');
  return compact.length > 0 ? compact : null;
}

export function isLifemetricsDemoSource(source: LifemetricsDemoSource): boolean {
  const clientId = normalizeLifemetricsClientId(source.clientId);
  if (clientId === LIFEMETRICS_DEMO_CLIENT_ID) return true;
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
  return email === LIFEMETRICS_DEMO_EMAIL;
}

export function isLifemetricsDemoHints(hints: LifemetricsIdentityHints): boolean {
  return isLifemetricsDemoSource({
    clientId: hints.clientId ?? null,
    email: hints.email ?? null,
  });
}

export interface LifemetricsWritePlan {
  targetUserId: string;
  blocked: boolean;
  reason: 'demo_client_blocked' | null;
  mapped: LifemetricsMappedImport;
}

/**
 * Plan writes for a mapped LifeMetrics payload.
 * Demo Client 4634 / demo@genemetrics.com always returns empty writes,
 * even when targetUserId is a real (or arbitrary) member.
 */
export function planLifemetricsPersist(input: {
  source: LifemetricsDemoSource;
  targetUserId: string;
  mapped: LifemetricsMappedImport;
}): LifemetricsWritePlan {
  if (isLifemetricsDemoSource(input.source)) {
    return {
      targetUserId: input.targetUserId,
      blocked: true,
      reason: 'demo_client_blocked',
      mapped: emptyMappedImport({
        eventId: input.mapped.eventId,
        eventType: input.mapped.eventType,
        tenantId: input.mapped.tenantId,
        metadataOnly: true,
        unknownReason: 'demo_client_blocked',
      }),
    };
  }
  return {
    targetUserId: input.targetUserId,
    blocked: false,
    reason: null,
    mapped: input.mapped,
  };
}
