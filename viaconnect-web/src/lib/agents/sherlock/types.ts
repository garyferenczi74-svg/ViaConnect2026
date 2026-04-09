// Sherlock — TypeScript types matching the migration schema.

export type SherlockTaskType =
  | 'fetch_sources'
  | 'score_relevance'
  | 'generate_alerts'
  | 'trend_detect'
  | 'deduplicate'
  | 'curate_daily_feed'
  | 'refresh_source_meta';

export type SherlockTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'escalated_to_jeffery';

export type SherlockEscalationType =
  | 'protocol_suggestion'
  | 'interaction_warning'
  | 'cross_engine_update'
  | 'data_conflict'
  | 'safety_flag';

export type SherlockEscalationStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';

export interface SherlockTask {
  id: string;
  user_id: string | null;
  task_type: SherlockTaskType;
  category_id: string | null;
  priority: number;
  status: SherlockTaskStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error_message: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface SherlockActivity {
  id: string;
  task_id: string | null;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  items_processed: number;
  duration_ms: number | null;
  created_at: string;
}

export interface SherlockEscalation {
  id: string;
  task_id: string | null;
  user_id: string | null;
  escalation_type: SherlockEscalationType;
  reason: string;
  payload: Record<string, unknown>;
  jeffery_response: Record<string, unknown> | null;
  status: SherlockEscalationStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface SherlockAgentState {
  id: string;
  is_active: boolean;
  last_heartbeat: string;
  current_task_id: string | null;
  tasks_completed_today: number;
  items_discovered_today: number;
  alerts_generated_today: number;
  escalations_today: number;
  daily_reset_at: string;
  config: SherlockConfig;
}

export interface SherlockConfig {
  fetch_interval_minutes: number;
  max_items_per_fetch: number;
  relevance_alert_threshold: number;
  max_daily_alerts_per_user: number;
  dedup_similarity_threshold: number;
  trend_min_source_count: number;
}

export interface SherlockTrend {
  id: string;
  topic: string;
  topic_keywords: string[];
  source_count: number;
  item_ids: string[];
  first_seen: string;
  last_seen: string;
  trend_score: number;
  is_active: boolean;
  created_at: string;
}

/** Daily summary used by SherlockActivityFeed component. */
export interface SherlockDailySummary {
  items_discovered: number;
  alerts_generated: number;
  trends_detected: number;
  highly_relevant: number;
  last_run_at: string | null;
  is_active: boolean;
  is_running: boolean;
}
