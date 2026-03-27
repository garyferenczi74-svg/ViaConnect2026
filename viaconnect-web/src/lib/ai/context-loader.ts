// ============================================================================
// ViaConnect AI Personalization Engine - Context Loader
// Loads all user context for AI prompt injection (server-side only)
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneticVariant {
  gene: string;
  variant: string;
  rs_id: string;
  genotype: string;
  impact: 'high' | 'moderate' | 'low' | 'benign';
  category: string;
  panel: string | null;
  clinical_significance: string | null;
  supplement_recommendations: Record<string, unknown>[];
}

export interface WearableSummary {
  date: string;
  sleep_duration_minutes: number | null;
  sleep_quality_score: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  light_sleep_minutes: number | null;
  awake_minutes: number | null;
  hrv_avg: number | null;
  hrv_max: number | null;
  hrv_min: number | null;
  resting_heart_rate: number | null;
  recovery_score: number | null;
  strain_score: number | null;
  stress_score: number | null;
  steps: number | null;
  calories_burned: number | null;
  active_calories: number | null;
  body_battery: number | null;
  respiratory_rate: number | null;
  spo2: number | null;
  skin_temp: number | null;
  glucose_avg: number | null;
  glucose_min: number | null;
  glucose_max: number | null;
  source_devices: Record<string, unknown>[];
}

export interface BiometricTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  current: number | null;
  average_7d: number | null;
  delta_percent: number | null;
}

export interface DailyAction {
  id: string;
  action_type: string;
  title: string;
  subtitle: string | null;
  scheduled_time: string | null;
  status: string;
  completed_at: string | null;
  tokens_reward: number;
  priority: number;
  rationale: string | null;
  genetic_context: Record<string, unknown>;
  data_source: string | null;
}

export interface SupplementComplianceRecord {
  product_name: string;
  scheduled_date: string;
  scheduled_time: string | null;
  taken: boolean;
  taken_at: string | null;
  skipped_reason: string | null;
}

export interface Medication {
  id: string;
  medication_name: string;
  generic_name: string | null;
  dosage: string | null;
  frequency: string | null;
  prescribing_doctor: string | null;
  start_date: string | null;
  active: boolean;
  rxcui: string | null;
}

export interface PredictiveAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  genetic_context: Record<string, unknown>;
  biometric_evidence: Record<string, unknown>;
  recommended_actions: Record<string, unknown>[];
  acknowledged: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProtocolItem {
  product_name: string;
  dosage: string | null;
  frequency: string | null;
  time_of_day: string | null;
  instructions: string | null;
}

export interface UserProtocol {
  id: string;
  name: string;
  status: string;
  items: ProtocolItem[];
}

export interface UserProfile {
  full_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  sex: string | null;
}

export interface HealthProfile {
  health_goals: string[];
  dietary_preferences: string[];
  activity_level: string | null;
  sleep_preference: string | null;
  supplement_experience: string | null;
  family_history: Record<string, unknown>[];
  existing_conditions: Record<string, unknown>[];
  ai_personality: string;
  notification_preferences: Record<string, unknown>;
  timezone: string;
}

export interface AIAgentContext {
  userId: string;
  portal: string;
  profile: UserProfile | null;
  healthProfile: HealthProfile | null;
  geneticVariants: GeneticVariant[];
  keyVariants: GeneticVariant[];
  todayBiometrics: WearableSummary | null;
  biometricTrends: BiometricTrend[];
  protocols: UserProtocol[];
  supplementCompliance: SupplementComplianceRecord[];
  complianceRate: number;
  medications: Medication[];
  todayActions: DailyAction[];
  conversationHistory: ConversationMessage[];
  activeAlerts: PredictiveAlert[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function sevenDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

/**
 * Compute the directional trend for a numeric biometric field across 7-day
 * wearable summary rows. Returns 'improving', 'declining', or 'stable'.
 */
function computeTrendDirection(
  values: (number | null)[]
): 'improving' | 'declining' | 'stable' {
  const nums = values.filter((v): v is number => v !== null && v !== undefined);
  if (nums.length < 2) return 'stable';

  const firstHalf = nums.slice(0, Math.floor(nums.length / 2));
  const secondHalf = nums.slice(Math.floor(nums.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const delta = ((avgSecond - avgFirst) / (avgFirst || 1)) * 100;

  if (Math.abs(delta) < 3) return 'stable';
  return delta > 0 ? 'improving' : 'declining';
}

function buildBiometricTrends(
  weekData: WearableSummary[],
  todayData: WearableSummary | null
): BiometricTrend[] {
  const metrics: { key: keyof WearableSummary; label: string }[] = [
    { key: 'hrv_avg', label: 'HRV' },
    { key: 'resting_heart_rate', label: 'Resting Heart Rate' },
    { key: 'sleep_quality_score', label: 'Sleep Quality' },
    { key: 'sleep_duration_minutes', label: 'Sleep Duration' },
    { key: 'deep_sleep_minutes', label: 'Deep Sleep' },
    { key: 'recovery_score', label: 'Recovery' },
    { key: 'strain_score', label: 'Strain' },
    { key: 'stress_score', label: 'Stress' },
    { key: 'steps', label: 'Steps' },
    { key: 'body_battery', label: 'Body Battery' },
    { key: 'respiratory_rate', label: 'Respiratory Rate' },
    { key: 'spo2', label: 'SpO2' },
    { key: 'skin_temp', label: 'Skin Temperature' },
    { key: 'glucose_avg', label: 'Average Glucose' },
  ];

  return metrics.map(({ key, label }) => {
    const values = weekData.map((d) => d[key] as number | null);
    const nums = values.filter((v): v is number => v !== null);
    const avg7d = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    const current = todayData ? (todayData[key] as number | null) : null;
    const deltaPct =
      current !== null && avg7d !== null && avg7d !== 0
        ? Math.round(((current - avg7d) / avg7d) * 1000) / 10
        : null;

    return {
      metric: label,
      direction: computeTrendDirection(values),
      current,
      average_7d: avg7d !== null ? Math.round(avg7d * 100) / 100 : null,
      delta_percent: deltaPct,
    };
  });
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

export async function loadAIContext(
  userId: string,
  portal: string
): Promise<AIAgentContext> {
  const supabase = getSupabaseAdmin();
  const today = todayISO();
  const sevenDaysAgo = sevenDaysAgoISO();

  // Parallel queries ----------------------------------------------------------
  const [
    profileRes,
    geneticRes,
    todayWearableRes,
    weekWearableRes,
    protocolsRes,
    complianceRes,
    medicationsRes,
    actionsRes,
    conversationsRes,
    alertsRes,
    healthProfileRes,
  ] = await Promise.all([
    // 1. User profile
    supabase
      .from('profiles')
      .select('full_name, email, date_of_birth, sex')
      .eq('id', userId)
      .maybeSingle(),

    // 2. Genetic profiles
    supabase
      .from('genetic_profiles')
      .select('gene, variant, rs_id, genotype, impact, category, panel, clinical_significance, supplement_recommendations')
      .eq('user_id', userId),

    // 3. Today's wearable summary
    supabase
      .from('wearable_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle(),

    // 4. 7-day wearable summaries
    supabase
      .from('wearable_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true }),

    // 5. User protocols with items
    supabase
      .from('user_protocols')
      .select('id, name, status, user_protocol_items(product_name, dosage, frequency, time_of_day, instructions)')
      .eq('user_id', userId)
      .eq('status', 'active'),

    // 6. Supplement compliance (7 days)
    supabase
      .from('supplement_compliance')
      .select('product_name, scheduled_date, scheduled_time, taken, taken_at, skipped_reason')
      .eq('user_id', userId)
      .gte('scheduled_date', sevenDaysAgo)
      .order('scheduled_date', { ascending: false }),

    // 7. Active medications
    supabase
      .from('user_medications')
      .select('id, medication_name, generic_name, dosage, frequency, prescribing_doctor, start_date, active, rxcui')
      .eq('user_id', userId)
      .eq('active', true),

    // 8. Today's daily actions
    supabase
      .from('daily_actions')
      .select('id, action_type, title, subtitle, scheduled_time, status, completed_at, tokens_reward, priority, rationale, genetic_context, data_source')
      .eq('user_id', userId)
      .eq('date', today)
      .order('priority', { ascending: false }),

    // 9. Last 20 conversation messages
    supabase
      .from('ai_conversations')
      .select('role, content, metadata, created_at')
      .eq('user_id', userId)
      .eq('portal', portal)
      .order('created_at', { ascending: false })
      .limit(20),

    // 10. Unacknowledged predictive alerts
    supabase
      .from('predictive_alerts')
      .select('id, alert_type, severity, title, description, genetic_context, biometric_evidence, recommended_actions, acknowledged, expires_at, created_at')
      .eq('user_id', userId)
      .eq('acknowledged', false)
      .order('severity', { ascending: true }),

    // 11. User health profile
    supabase
      .from('user_health_profile')
      .select('health_goals, dietary_preferences, activity_level, sleep_preference, supplement_experience, family_history, existing_conditions, ai_personality, notification_preferences, timezone')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  // Parse results -------------------------------------------------------------
  const profile = (profileRes.data as UserProfile) ?? null;
  const geneticVariants = (geneticRes.data as GeneticVariant[]) ?? [];
  const todayBiometrics = (todayWearableRes.data as WearableSummary) ?? null;
  const weekWearables = (weekWearableRes.data as WearableSummary[]) ?? [];
  const complianceRecords = (complianceRes.data as SupplementComplianceRecord[]) ?? [];
  const medications = (medicationsRes.data as Medication[]) ?? [];
  const todayActions = (actionsRes.data as DailyAction[]) ?? [];
  const conversationHistory = ((conversationsRes.data as ConversationMessage[]) ?? []).reverse();
  const activeAlerts = (alertsRes.data as PredictiveAlert[]) ?? [];
  const healthProfile = (healthProfileRes.data as HealthProfile) ?? null;

  // Map protocols + nested items
  const protocols: UserProtocol[] = ((protocolsRes.data as any[]) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    items: (p.user_protocol_items ?? []) as ProtocolItem[],
  }));

  // Computed fields -----------------------------------------------------------

  // Key variants: top 10 by impact (high first, then moderate)
  const impactOrder: Record<string, number> = { high: 0, moderate: 1, low: 2, benign: 3 };
  const keyVariants = [...geneticVariants]
    .sort((a, b) => (impactOrder[a.impact] ?? 99) - (impactOrder[b.impact] ?? 99))
    .slice(0, 10);

  // Compliance rate
  const totalScheduled = complianceRecords.length;
  const totalTaken = complianceRecords.filter((r) => r.taken).length;
  const complianceRate =
    totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 1000) / 10 : 0;

  // Biometric trends
  const biometricTrends = buildBiometricTrends(weekWearables, todayBiometrics);

  // Assemble context ----------------------------------------------------------
  return {
    userId,
    portal,
    profile,
    healthProfile,
    geneticVariants,
    keyVariants,
    todayBiometrics,
    biometricTrends,
    protocols,
    supplementCompliance: complianceRecords,
    complianceRate,
    medications,
    todayActions,
    conversationHistory,
    activeAlerts,
  };
}
