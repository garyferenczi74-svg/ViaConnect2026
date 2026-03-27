// ============================================================================
// ViaConnect AI Personalization Engine - Prompt Builder
// Builds the full system prompt for Claude with all injected user context.
// ============================================================================

import type {
  AIAgentContext,
  GeneticVariant,
  BiometricTrend,
  DailyAction,
  Medication,
  PredictiveAlert,
  UserProtocol,
  SupplementComplianceRecord,
} from './context-loader';

// ---------------------------------------------------------------------------
// Portal persona definitions
// ---------------------------------------------------------------------------

const PORTAL_PERSONAS: Record<string, string> = {
  consumer: `You are Via, a warm and supportive health coach inside the ViaConnect app. You speak in a friendly, encouraging tone — like a knowledgeable best friend who happens to have deep expertise in nutrigenomics, wearable biometrics, and supplement science. You celebrate wins, gently nudge when compliance drifts, and always explain the "why" behind recommendations in plain language. Use first names when available. Keep responses concise but caring.`,

  practitioner: `You are Via Clinical, an evidence-based clinical assistant for healthcare practitioners using ViaConnect. You communicate in precise, professional language with appropriate medical terminology. You cite genetic variants by rs_id and gene, reference clinical significance, and flag drug-nutrient interactions proactively. Present data in structured formats. Always distinguish between established evidence and emerging research. Support clinical decision-making without overstepping scope.`,

  naturopath: `You are Via Holistic, a holistic health guide for naturopathic practitioners on ViaConnect. You blend traditional naturopathic principles with modern nutrigenomic data. You speak with warmth but clinical depth, referencing both conventional biomarkers and holistic frameworks. You consider the whole person — mind, body, and lifestyle — and frame genetic insights within naturopathic treatment hierarchies (remove obstacles to cure, stimulate vital force, support weakened systems).`,
};

// ---------------------------------------------------------------------------
// Safety rules
// ---------------------------------------------------------------------------

const SAFETY_RULES = `
## SAFETY RULES — MANDATORY COMPLIANCE

1. NEVER diagnose medical conditions. You may identify patterns and correlations but must always recommend professional consultation for diagnosis.
2. NEVER recommend stopping or changing prescription medications. Always defer to the prescribing physician and flag concerns for practitioner review.
3. NEVER provide dosage recommendations that exceed established safe upper limits. When uncertain, recommend the conservative end of the range.
4. ALWAYS flag potential drug-nutrient and drug-supplement interactions when detected in the user's medication list. Classify severity as critical, moderate, or minor.
5. NEVER claim genetic variants guarantee health outcomes. Use probabilistic language ("associated with", "may influence", "research suggests") — never deterministic language.
6. ALWAYS include a disclaimer when discussing genetic-based recommendations: genetic information is one factor among many and should be interpreted alongside clinical evaluation.
7. NEVER store, repeat, or reference other users' data. Each conversation is scoped exclusively to the authenticated user.
8. ALWAYS recommend professional lab work or clinical follow-up when biometric trends show concerning patterns (e.g., sustained HRV decline, SpO2 anomalies, glucose spikes).
9. NEVER provide mental health diagnoses or crisis intervention. If a user expresses distress, provide empathetic acknowledgment and direct them to appropriate professional resources.
10. ALWAYS respect user autonomy. Present recommendations as options, not mandates. Explain rationale and let the user decide.
`;

// ---------------------------------------------------------------------------
// Action capability tags
// ---------------------------------------------------------------------------

const ACTION_CAPABILITIES = `
## ACTION CAPABILITIES

You have the following action capabilities. When appropriate, include structured action tags in your response to trigger platform actions:

- [ACTION:adjust_plan] — Modify the user's daily action plan (add, remove, reschedule items)
- [ACTION:add_action] — Add a new action item to today's or a future day's plan
- [ACTION:recommend_supplement] — Recommend a specific supplement with dosage, timing, and genetic rationale
- [ACTION:recommend_lab] — Recommend specific lab tests based on genetic profile or biometric trends
- [ACTION:flag_interaction] — Flag a drug-nutrient or supplement-supplement interaction for review
- [ACTION:notify_practitioner] — Send an alert to the user's linked practitioner about a concerning finding

When using action tags, include a JSON payload with the action details. Example:
[ACTION:recommend_supplement]{"product":"Methylfolate","dosage":"400mcg","timing":"morning","rationale":"MTHFR C677T heterozygous variant detected"}[/ACTION]
`;

// ---------------------------------------------------------------------------
// Context section formatters
// ---------------------------------------------------------------------------

function formatGeneticProfile(variants: GeneticVariant[]): string {
  if (variants.length === 0) return 'No genetic data available.';

  const lines = variants.map(
    (v) =>
      `- **${v.gene}** ${v.variant} (${v.rs_id}) | Genotype: ${v.genotype} | Impact: ${v.impact} | ${v.clinical_significance ?? 'No clinical note'}`
  );
  return lines.join('\n');
}

function formatTodayBiometrics(ctx: AIAgentContext): string {
  const b = ctx.todayBiometrics;
  if (!b) return 'No biometric data available for today.';

  const fields: [string, unknown, string?][] = [
    ['Sleep Duration', b.sleep_duration_minutes ? `${b.sleep_duration_minutes} min` : null],
    ['Sleep Quality', b.sleep_quality_score],
    ['Deep Sleep', b.deep_sleep_minutes ? `${b.deep_sleep_minutes} min` : null],
    ['REM Sleep', b.rem_sleep_minutes ? `${b.rem_sleep_minutes} min` : null],
    ['HRV (avg)', b.hrv_avg ? `${b.hrv_avg} ms` : null],
    ['Resting HR', b.resting_heart_rate ? `${b.resting_heart_rate} bpm` : null],
    ['Recovery', b.recovery_score],
    ['Strain', b.strain_score],
    ['Stress', b.stress_score],
    ['Steps', b.steps],
    ['Calories Burned', b.calories_burned],
    ['Body Battery', b.body_battery],
    ['Respiratory Rate', b.respiratory_rate ? `${b.respiratory_rate} br/min` : null],
    ['SpO2', b.spo2 ? `${b.spo2}%` : null],
    ['Skin Temp', b.skin_temp ? `${b.skin_temp}°C` : null],
    ['Glucose (avg)', b.glucose_avg ? `${b.glucose_avg} mg/dL` : null],
  ];

  return fields
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([label, value]) => `- ${label}: ${value}`)
    .join('\n');
}

function formatBiometricTrends(trends: BiometricTrend[]): string {
  const meaningful = trends.filter((t) => t.current !== null || t.average_7d !== null);
  if (meaningful.length === 0) return 'Insufficient data for trend analysis.';

  return meaningful
    .map((t) => {
      const arrow = t.direction === 'improving' ? '↑' : t.direction === 'declining' ? '↓' : '→';
      const delta = t.delta_percent !== null ? ` (${t.delta_percent > 0 ? '+' : ''}${t.delta_percent}%)` : '';
      return `- ${t.metric}: ${arrow} ${t.direction} | Current: ${t.current ?? 'N/A'} | 7d avg: ${t.average_7d ?? 'N/A'}${delta}`;
    })
    .join('\n');
}

function formatProtocolsAndCompliance(
  protocols: UserProtocol[],
  compliance: SupplementComplianceRecord[],
  complianceRate: number
): string {
  if (protocols.length === 0) return 'No active supplement protocols.';

  const protocolLines = protocols.map((p) => {
    const items = p.items
      .map((i) => `  - ${i.product_name} | ${i.dosage ?? 'N/A'} | ${i.frequency ?? 'N/A'} | ${i.time_of_day ?? 'anytime'} | ${i.instructions ?? ''}`)
      .join('\n');
    return `### ${p.name}\n${items}`;
  });

  const complianceNote = `\n**7-Day Compliance Rate: ${complianceRate}%** (${compliance.filter((c) => c.taken).length}/${compliance.length} doses taken)`;

  const recentSkips = compliance
    .filter((c) => !c.taken && c.skipped_reason)
    .slice(0, 5)
    .map((c) => `- ${c.product_name} (${c.scheduled_date}): ${c.skipped_reason}`)
    .join('\n');

  const skipsSection = recentSkips ? `\nRecent skip reasons:\n${recentSkips}` : '';

  return protocolLines.join('\n\n') + complianceNote + skipsSection;
}

function formatMedications(meds: Medication[]): string {
  if (meds.length === 0) return 'No active medications on file.';

  return meds
    .map(
      (m) =>
        `- **${m.medication_name}**${m.generic_name ? ` (${m.generic_name})` : ''} | ${m.dosage ?? 'N/A'} | ${m.frequency ?? 'N/A'}${m.rxcui ? ` | RxCUI: ${m.rxcui}` : ''}`
    )
    .join('\n');
}

function formatAlerts(alerts: PredictiveAlert[]): string {
  if (alerts.length === 0) return 'No active alerts.';

  return alerts
    .map(
      (a) =>
        `- [${a.severity.toUpperCase()}] ${a.title}: ${a.description}${a.recommended_actions.length > 0 ? ` | Recommended: ${JSON.stringify(a.recommended_actions)}` : ''}`
    )
    .join('\n');
}

function formatTodayActions(actions: DailyAction[]): string {
  if (actions.length === 0) return 'No actions scheduled for today.';

  return actions
    .map((a) => {
      const time = a.scheduled_time ?? 'anytime';
      const statusIcon =
        a.status === 'completed' ? '[x]' : a.status === 'skipped' ? '[-]' : '[ ]';
      return `${statusIcon} ${time} — ${a.title}${a.subtitle ? ` (${a.subtitle})` : ''} | ${a.action_type} | Priority: ${a.priority}`;
    })
    .join('\n');
}

function formatHealthGoalsAndConditions(ctx: AIAgentContext): string {
  const hp = ctx.healthProfile;
  if (!hp) return 'No health profile available.';

  const sections: string[] = [];

  if (hp.health_goals && hp.health_goals.length > 0) {
    sections.push(`**Health Goals:** ${hp.health_goals.join(', ')}`);
  }
  if (hp.dietary_preferences && hp.dietary_preferences.length > 0) {
    sections.push(`**Dietary Preferences:** ${hp.dietary_preferences.join(', ')}`);
  }
  if (hp.activity_level) {
    sections.push(`**Activity Level:** ${hp.activity_level.replace(/_/g, ' ')}`);
  }
  if (hp.sleep_preference) {
    sections.push(`**Sleep Preference:** ${hp.sleep_preference.replace(/_/g, ' ')}`);
  }
  if (hp.supplement_experience) {
    sections.push(`**Supplement Experience:** ${hp.supplement_experience}`);
  }
  if (hp.existing_conditions && hp.existing_conditions.length > 0) {
    sections.push(`**Existing Conditions:** ${JSON.stringify(hp.existing_conditions)}`);
  }
  if (hp.family_history && hp.family_history.length > 0) {
    sections.push(`**Family History:** ${JSON.stringify(hp.family_history)}`);
  }

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Main prompt builder
// ---------------------------------------------------------------------------

export function buildSystemPrompt(context: AIAgentContext): string {
  const persona = PORTAL_PERSONAS[context.portal] ?? PORTAL_PERSONAS.consumer;
  const userName = context.profile?.full_name ?? 'there';
  const aiPersonality = context.healthProfile?.ai_personality ?? 'balanced';
  const timezone = context.healthProfile?.timezone ?? 'America/New_York';

  const prompt = `
${persona}

The user's name is ${userName}. Today's date is ${new Date().toISOString().split('T')[0]}. User timezone: ${timezone}.

${SAFETY_RULES}

${ACTION_CAPABILITIES}

## AI PERSONALITY SETTING: ${aiPersonality.toUpperCase()}
${aiPersonality === 'motivational' ? 'Be extra encouraging, celebrate every small win, use positive reinforcement heavily.' : ''}${aiPersonality === 'clinical' ? 'Be precise and data-driven. Minimize small talk. Focus on metrics and evidence.' : ''}${aiPersonality === 'balanced' ? 'Balance warmth with precision. Be friendly but factual.' : ''}${aiPersonality === 'gentle' ? 'Be extra gentle and patient. Avoid pressure. Use soft suggestions rather than directives.' : ''}${aiPersonality === 'direct' ? 'Be concise and straightforward. Get to the point quickly. Minimize pleasantries.' : ''}

---

## GENETIC PROFILE (Key Variants)

${formatGeneticProfile(context.keyVariants)}

---

## TODAY'S BIOMETRICS

${formatTodayBiometrics(context)}

---

## 7-DAY BIOMETRIC TRENDS

${formatBiometricTrends(context.biometricTrends)}

---

## SUPPLEMENT PROTOCOL & COMPLIANCE

${formatProtocolsAndCompliance(context.protocols, context.supplementCompliance, context.complianceRate)}

---

## ACTIVE MEDICATIONS & INTERACTIONS

${formatMedications(context.medications)}

**IMPORTANT:** Cross-reference all supplement recommendations against this medication list for potential interactions. Flag any concerns using [ACTION:flag_interaction].

---

## ACTIVE ALERTS

${formatAlerts(context.activeAlerts)}

---

## TODAY'S ACTION PLAN

${formatTodayActions(context.todayActions)}

---

## HEALTH GOALS & CONDITIONS

${formatHealthGoalsAndConditions(context)}

---

## CONVERSATION CONTEXT

You have access to the last ${context.conversationHistory.length} messages in this conversation for continuity. Refer back to previous topics naturally when relevant.
`.trim();

  return prompt;
}
