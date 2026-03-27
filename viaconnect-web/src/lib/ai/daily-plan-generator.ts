/**
 * Adaptive Daily Plan Generator
 * ViaConnect AI — Genetically-informed daily action planning
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyAction {
  action_type:
    | 'supplement'
    | 'activity'
    | 'lab'
    | 'predictive_alert'
    | 'streak_milestone';
  title: string;
  subtitle: string;
  scheduled_time: string; // ISO-8601 or HH:mm
  status: 'pending' | 'completed' | 'skipped' | 'snoozed';
  tokens_reward: number;
  priority: number; // higher = more important
  rationale: string;
  genetic_context?: string;
  data_source?: string;
}

// ---------------------------------------------------------------------------
// Data-loading helpers
// ---------------------------------------------------------------------------

interface PlanInputs {
  protocol: any[];
  medications: any[];
  geneticVariants: Record<string, any>;
  sleepScore: number;
  stressLevel: string;
  recoveryScore: number;
  pendingLabs: any[];
  newLabResults: any[];
  alerts: any[];
  complianceStreak: number;
}

export async function loadPlanInputs(
  userId: string,
  supabase: any,
): Promise<PlanInputs> {
  // Run independent queries in parallel
  const [
    protocolRes,
    medsRes,
    geneticsRes,
    biometricsRes,
    labsPendingRes,
    labsResultsRes,
    alertsRes,
  ] = await Promise.all([
    supabase
      .from('user_protocols')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('user_medications')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('genetic_profiles')
      .select('gene, variant, phenotype, metaboliser_status')
      .eq('user_id', userId),
    supabase
      .from('biometrics')
      .select('sleep_score, stress_level, recovery_score')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1),
    supabase
      .from('lab_orders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending'),
    supabase
      .from('lab_results')
      .select('*')
      .eq('user_id', userId)
      .eq('reviewed', false),
    supabase
      .from('predictive_alerts')
      .select('*')
      .eq('user_id', userId)
      .in('severity', ['warning', 'critical'])
      .eq('dismissed', false),
  ]);

  // Build a variant map keyed by gene name
  const geneticVariants: Record<string, any> = {};
  if (geneticsRes.data) {
    for (const g of geneticsRes.data) {
      geneticVariants[g.gene] = g;
    }
  }

  const bio = biometricsRes.data?.[0] ?? {};

  const complianceStreak = await computeComplianceStreak(userId, supabase);

  return {
    protocol: protocolRes.data ?? [],
    medications: medsRes.data ?? [],
    geneticVariants,
    sleepScore: bio.sleep_score ?? 75,
    stressLevel: bio.stress_level ?? 'normal',
    recoveryScore: bio.recovery_score ?? 75,
    pendingLabs: labsPendingRes.data ?? [],
    newLabResults: labsResultsRes.data ?? [],
    alerts: alertsRes.data ?? [],
    complianceStreak,
  };
}

export async function computeComplianceStreak(
  userId: string,
  supabase: any,
): Promise<number> {
  // Fetch recent daily compliance records ordered newest-first
  const { data: records, error } = await supabase
    .from('daily_compliance')
    .select('date, fully_compliant')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(365);

  if (error || !records || records.length === 0) return 0;

  let streak = 0;
  for (const record of records) {
    if (record.fully_compliant) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Plan Generator
// ---------------------------------------------------------------------------

export async function generateDailyPlan(
  userId: string,
  supabase: any,
): Promise<DailyAction[]> {
  const inputs = await loadPlanInputs(userId, supabase);
  const actions: DailyAction[] = [];

  // -----------------------------------------------------------------------
  // 1. SUPPLEMENT ACTIONS
  // -----------------------------------------------------------------------
  for (const item of inputs.protocol) {
    let scheduledTime: string = item.scheduled_time ?? '08:00';
    let priority = 3;
    let rationale = `Take ${item.supplement_name} as part of your personalised protocol.`;
    let geneticContext: string | undefined;

    const supplementName: string = item.supplement_name ?? '';

    // Adaptive timing: poor sleep + COMT variant → move NAD+ to morning
    if (
      inputs.sleepScore < 60 &&
      inputs.geneticVariants['COMT'] &&
      supplementName === 'NAD+'
    ) {
      scheduledTime = '07:00';
      geneticContext =
        'Your COMT variant slows catecholamine clearance. With last night\'s low sleep score, early-morning NAD+ supports energy without disrupting tonight\'s sleep.';
      rationale =
        'Moved to early morning due to low sleep score and your COMT genetic profile.';
      priority = 4;
    }

    // Adaptive priority: high stress + MAOA variant → elevate RELAX+/CALM+
    if (
      (inputs.stressLevel === 'high' || inputs.stressLevel === 'very_high') &&
      inputs.geneticVariants['MAOA'] &&
      (supplementName === 'RELAX+' || supplementName === 'CALM+')
    ) {
      priority = 5;
      geneticContext =
        'Your MAOA variant affects serotonin/norepinephrine turnover. During high-stress periods this supplement is especially important for neurochemical balance.';
      rationale =
        'Priority elevated due to high stress level and your MAOA genetic variant.';
    }

    // Adaptive note: low recovery + CREATINE HCL+
    if (inputs.recoveryScore < 50 && supplementName === 'CREATINE HCL+') {
      rationale +=
        ' Recovery is low — increase water intake to at least 3L today to maximise creatine uptake and support muscle repair.';
      priority = Math.max(priority, 4);
    }

    actions.push({
      action_type: 'supplement',
      title: supplementName,
      subtitle: item.dosage ? `${item.dosage} — ${item.form ?? 'capsule'}` : 'As directed',
      scheduled_time: scheduledTime,
      status: 'pending',
      tokens_reward: 5,
      priority,
      rationale,
      genetic_context: geneticContext,
      data_source: 'user_protocols',
    });
  }

  // -----------------------------------------------------------------------
  // 2. ACTIVITY ACTIONS
  // -----------------------------------------------------------------------
  const actn3Variant = inputs.geneticVariants['ACTN3'];

  if (inputs.recoveryScore >= 80) {
    let geneticContext: string | undefined;
    if (actn3Variant) {
      geneticContext = actn3Variant.variant === 'RR'
        ? 'Your ACTN3 R/R genotype favours explosive power — consider sprints or heavy lifts today.'
        : actn3Variant.variant === 'XX'
          ? 'Your ACTN3 X/X genotype favours endurance — consider longer cardio or tempo runs.'
          : `Your ACTN3 ${actn3Variant.variant} genotype supports a mix of power and endurance activities.`;
    }

    actions.push({
      action_type: 'activity',
      title: 'High-intensity workout recommended',
      subtitle: 'Recovery score is excellent — push your limits today.',
      scheduled_time: '17:00',
      status: 'pending',
      tokens_reward: 15,
      priority: 3,
      rationale: `Recovery score ${inputs.recoveryScore}/100 indicates your body is ready for high-intensity training.`,
      genetic_context: geneticContext,
      data_source: 'biometrics',
    });
  } else if (inputs.recoveryScore >= 50) {
    actions.push({
      action_type: 'activity',
      title: 'Moderate activity recommended',
      subtitle: 'Steady-state cardio, yoga, or a brisk walk.',
      scheduled_time: '17:00',
      status: 'pending',
      tokens_reward: 10,
      priority: 2,
      rationale: `Recovery score ${inputs.recoveryScore}/100 suggests moderate effort is optimal today.`,
      data_source: 'biometrics',
    });
  } else {
    actions.push({
      action_type: 'activity',
      title: 'Rest day recommended',
      subtitle: 'Light stretching or a short walk only.',
      scheduled_time: '17:00',
      status: 'pending',
      tokens_reward: 10,
      priority: 1,
      rationale: `Recovery score ${inputs.recoveryScore}/100 is low — active rest will accelerate recovery.`,
      data_source: 'biometrics',
    });
  }

  // -----------------------------------------------------------------------
  // 3. LAB ACTIONS
  // -----------------------------------------------------------------------
  for (const lab of inputs.pendingLabs) {
    actions.push({
      action_type: 'lab',
      title: `Complete lab order: ${lab.test_name ?? 'Pending lab'}`,
      subtitle: lab.lab_provider
        ? `At ${lab.lab_provider}`
        : 'Visit your designated lab provider.',
      scheduled_time: '09:00',
      status: 'pending',
      tokens_reward: 20,
      priority: 4,
      rationale: 'Pending lab work is required to update your biomarker dashboard and refine your protocol.',
      data_source: 'lab_orders',
    });
  }

  for (const result of inputs.newLabResults) {
    actions.push({
      action_type: 'lab',
      title: `Review new lab result: ${result.test_name ?? 'Lab result'}`,
      subtitle: 'Tap to see your results and AI analysis.',
      scheduled_time: '10:00',
      status: 'pending',
      tokens_reward: 10,
      priority: 4,
      rationale: 'New lab results are available. Reviewing them helps you track progress and adjust your protocol.',
      data_source: 'lab_results',
    });
  }

  // -----------------------------------------------------------------------
  // 4. PREDICTIVE ALERT ACTIONS
  // -----------------------------------------------------------------------
  for (const alert of inputs.alerts) {
    const isCritical = alert.severity === 'critical';
    actions.push({
      action_type: 'predictive_alert',
      title: alert.title ?? 'Health alert',
      subtitle: alert.summary ?? 'Review this alert for important health information.',
      scheduled_time: '08:00',
      status: 'pending',
      tokens_reward: 0,
      priority: isCritical ? 6 : 5,
      rationale: alert.rationale ?? 'AI-generated predictive alert based on your recent data trends.',
      genetic_context: alert.genetic_context,
      data_source: 'predictive_alerts',
    });
  }

  // -----------------------------------------------------------------------
  // 5. STREAK MILESTONES
  // -----------------------------------------------------------------------
  if (inputs.complianceStreak > 0 && inputs.complianceStreak % 7 === 0) {
    const weeks = inputs.complianceStreak / 7;
    actions.push({
      action_type: 'streak_milestone',
      title: `${weeks}-week streak achieved!`,
      subtitle: `${inputs.complianceStreak} consecutive days of 100% compliance.`,
      scheduled_time: '09:00',
      status: 'pending',
      tokens_reward: 25 * weeks,
      priority: 2,
      rationale: `Consistency is the strongest predictor of outcomes. ${weeks} weeks of perfect compliance is outstanding.`,
      data_source: 'daily_compliance',
    });
  }

  // -----------------------------------------------------------------------
  // 6. Sort: priority descending, then scheduled_time ascending
  // -----------------------------------------------------------------------
  actions.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.scheduled_time.localeCompare(b.scheduled_time);
  });

  return actions;
}
