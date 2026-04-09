// Sherlock — default configuration values.
// These mirror the JSONB defaults in the migration.

import type { SherlockConfig } from './types';

export const DEFAULT_SHERLOCK_CONFIG: SherlockConfig = {
  fetch_interval_minutes: 360, // 6 hours
  max_items_per_fetch: 50,
  relevance_alert_threshold: 90,
  max_daily_alerts_per_user: 10,
  dedup_similarity_threshold: 0.85,
  trend_min_source_count: 3,
};

// Activity log action labels (kept centralized so UI strings stay consistent)
export const SHERLOCK_ACTIONS = {
  FETCHED_CONTENT: 'fetched_content',
  SCORED_ITEM: 'scored_item',
  GENERATED_ALERT: 'generated_alert',
  DEDUPED: 'deduped',
  TREND_DETECTED: 'trend_detected',
  ESCALATED: 'escalated',
  CURATED_FEED: 'curated_feed',
  HEARTBEAT: 'heartbeat',
  CYCLE_START: 'cycle_start',
  CYCLE_END: 'cycle_end',
} as const;

export const SHERLOCK_AGENT_NAME = 'sherlock_research_hub';
