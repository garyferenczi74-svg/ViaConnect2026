// scripts/agents/michelangelo-brainstorm.ts
// Michelangelo Gate O — Observe & Brainstorm Enforcer

export interface BrainstormApproach {
  id: number
  name: string
  description: string
  pros: string[]
  cons: string[]
  complexity: 'Low' | 'Medium' | 'High'
  estimatedHours: number
}

export interface BrainstormReport {
  taskName: string
  timestamp: string
  approaches: BrainstormApproach[]
  selectedApproach: number
  rationale: string
  riskFlags: {
    rlsImpact: boolean
    migrationRequired: boolean
    helixIsolationRisk: boolean
    mobileBreakpointRisk: boolean
    performanceConcern: boolean
  }
  gateStatus: 'OPEN' | 'BLOCKED'
  blockers: string[]
}

export interface StandingRuleCheck {
  rule: string
  violated: boolean
  detail?: string
}

const STANDING_RULES: StandingRuleCheck[] = [
  { rule: 'No Supabase email template changes', violated: false },
  { rule: 'No package.json modifications', violated: false },
  { rule: 'No existing migration alterations (append-only)', violated: false },
  { rule: 'No TypeScript any usage', violated: false },
  { rule: 'No hardcoded client names (use getDisplayName)', violated: false },
  { rule: 'No emojis in UI components', violated: false },
  { rule: 'Lucide icons only (strokeWidth 1.5)', violated: false },
  { rule: 'Semaglutide excluded from all recommendations', violated: false },
  { rule: 'Retatrutide injectable-only, never stacked', violated: false },
  { rule: 'Bioavailability stated as 10-27x only', violated: false },
  { rule: 'Mobile + Desktop developed simultaneously', violated: false },
  { rule: 'Bio Optimization score name (not Vitality)', violated: false },
  { rule: 'Helix Rewards isolated to Consumer portal only', violated: false },
]

export function checkStandingRules(taskDescription: string): StandingRuleCheck[] {
  const violations: StandingRuleCheck[] = []
  const lower = taskDescription.toLowerCase()

  if (lower.includes('email template')) {
    violations.push({ rule: 'No Supabase email template changes', violated: true,
      detail: 'Task references email templates, prohibited' })
  }
  if (lower.includes('package.json')) {
    violations.push({ rule: 'No package.json modifications', violated: true,
      detail: 'Task references package.json, route through CTO Thomas' })
  }
  if (lower.includes('semaglutide')) {
    violations.push({ rule: 'Semaglutide excluded', violated: true,
      detail: 'Semaglutide referenced, remove from all output' })
  }
  if (lower.includes('vitality score')) {
    violations.push({ rule: 'Bio Optimization score name', violated: true,
      detail: 'Use "Bio Optimization Score" not "Vitality Score"' })
  }
  if (lower.includes('helix') && (lower.includes('practitioner') || lower.includes('naturopath'))) {
    violations.push({ rule: 'Helix Rewards isolation', violated: true,
      detail: 'Helix Rewards must never appear in Practitioner or Naturopath portals' })
  }

  return violations
}

export function generateBrainstormReport(
  taskName: string,
  approaches: BrainstormApproach[],
  selectedApproach: number,
  rationale: string,
  riskFlags: BrainstormReport['riskFlags'],
  standingRuleViolations: StandingRuleCheck[]
): BrainstormReport {
  const blockers = standingRuleViolations
    .filter(r => r.violated)
    .map(r => r.detail ?? r.rule)

  return {
    taskName,
    timestamp: new Date().toISOString(),
    approaches,
    selectedApproach,
    rationale,
    riskFlags,
    gateStatus: blockers.length > 0 ? 'BLOCKED' : 'OPEN',
    blockers,
  }
}

export function formatBrainstormReport(report: BrainstormReport): string {
  const lines: string[] = [
    `## Michelangelo, Brainstorm Report`,
    `**Task:** ${report.taskName}`,
    `**Date:** ${report.timestamp}`,
    `**Gate O Status:** ${report.gateStatus === 'OPEN' ? 'OPEN' : 'BLOCKED'}`,
    '',
    '### Approaches Considered',
    '| # | Approach | Pros | Cons | Complexity | Est. Hours |',
    '|---|----------|------|------|------------|------------|',
  ]

  for (const a of report.approaches) {
    lines.push(
      `| ${a.id} | ${a.name} | ${a.pros.join(', ')} | ${a.cons.join(', ')} | ${a.complexity} | ${a.estimatedHours}h |`
    )
  }

  lines.push(
    '',
    `### Selected Approach: #${report.selectedApproach}`,
    `**Rationale:** ${report.rationale}`,
    '',
    '### Risk Flags',
    `- [${report.riskFlags.rlsImpact ? 'x' : ' '}] RLS Impact`,
    `- [${report.riskFlags.migrationRequired ? 'x' : ' '}] Migration Required`,
    `- [${report.riskFlags.helixIsolationRisk ? 'x' : ' '}] Helix Isolation Risk`,
    `- [${report.riskFlags.mobileBreakpointRisk ? 'x' : ' '}] Mobile Breakpoint Risk`,
    `- [${report.riskFlags.performanceConcern ? 'x' : ' '}] Performance Concern`,
  )

  if (report.blockers.length > 0) {
    lines.push('', '### Blockers (Gate O FAILED)', ...report.blockers.map(b => `- ${b}`))
  }

  return lines.join('\n')
}
