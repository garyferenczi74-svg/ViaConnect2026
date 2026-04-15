// Shared slot classification + slug helpers for the daily supplement protocol.
// Used by Dashboard TodaysProtocol and the Supplement Protocol page so both
// read/write the same `protocol_adherence_log` rows (same product_slug +
// time_of_day key).

import type { DashboardSupplement } from '@/hooks/useUserDashboardData';

export type ProtocolSlot = 'morning' | 'afternoon' | 'evening' | 'asNeeded';

export function supplementToSlot(s: DashboardSupplement): ProtocolSlot {
  const freq = (s.frequency || '').toLowerCase();
  const cat = (s.category || '').toLowerCase();
  if (freq.includes('needed') || freq.includes('prn')) return 'asNeeded';
  if (
    freq.includes('bedtime') ||
    freq.includes('night') ||
    freq.includes('evening') ||
    cat.includes('sleep')
  )
    return 'evening';
  if (freq.includes('midday') || freq.includes('afternoon') || freq.includes('lunch'))
    return 'afternoon';
  return 'morning';
}

export function supplementSlug(s: DashboardSupplement): string {
  return (s.product_name || s.supplement_name || s.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function adherenceKey(slug: string, slot: ProtocolSlot): string {
  return `${slug}:${slot}`;
}
