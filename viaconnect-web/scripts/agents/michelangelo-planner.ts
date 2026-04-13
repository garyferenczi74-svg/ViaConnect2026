// scripts/agents/michelangelo-planner.ts
// Michelangelo Gate B — Micro-Task Planning Engine

export interface MicroTask {
  id: number
  title: string
  files: string[]
  acceptanceCriteria: string[]
  estimatedMinutes: number
  dependsOn: number[]
  assignedAgent: string
  testRequired: boolean
  status: 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED'
}

export interface MicroTaskPlan {
  featureName: string
  totalEstimatedHours: number
  tasks: MicroTask[]
  tddSequence: string[]
}

export function createMicroTask(
  id: number,
  title: string,
  files: string[],
  acceptanceCriteria: string[],
  estimatedMinutes: number,
  dependsOn: number[] = [],
  assignedAgent = 'implementation-agent',
  testRequired = true
): MicroTask {
  return {
    id,
    title,
    files,
    acceptanceCriteria,
    estimatedMinutes,
    dependsOn,
    assignedAgent,
    testRequired,
    status: 'PENDING',
  }
}

export function validatePlan(plan: MicroTaskPlan): string[] {
  const errors: string[] = []

  for (const task of plan.tasks) {
    if (task.testRequired && !task.title.toLowerCase().includes('test') && task.dependsOn.length === 0) {
      errors.push(`Task #${task.id} "${task.title}" has no test task dependency, add a "Write failing tests for..." task first`)
    }

    if (task.estimatedMinutes > 30) {
      errors.push(`Task #${task.id} "${task.title}" is ${task.estimatedMinutes}min, exceeds 30min micro-task limit. Decompose further.`)
    }

    for (const dep of task.dependsOn) {
      if (!plan.tasks.find(t => t.id === dep)) {
        errors.push(`Task #${task.id} depends on non-existent task #${dep}`)
      }
    }
  }

  return errors
}

export function formatMicroTaskPlan(plan: MicroTaskPlan): string {
  const lines: string[] = [
    `## Michelangelo, Micro-Task Plan`,
    `**Feature:** ${plan.featureName}`,
    `**Total Estimated Time:** ${plan.totalEstimatedHours}h`,
    `**Gate B Status:** ${validatePlan(plan).length === 0 ? 'APPROVED' : 'ERRORS FOUND'}`,
    '',
    '| # | Task | File(s) | Acceptance Criteria | Est. | Depends | Agent |',
    '|---|------|---------|---------------------|------|---------|-------|',
  ]

  for (const t of plan.tasks) {
    lines.push(
      `| ${t.id} | ${t.title} | ${t.files.join(', ')} | ${t.acceptanceCriteria.join('; ')} | ${t.estimatedMinutes}m | ${t.dependsOn.join(',') || '--'} | ${t.assignedAgent} |`
    )
  }

  const errors = validatePlan(plan)
  if (errors.length > 0) {
    lines.push('', '### Plan Validation Errors', ...errors.map(e => `- ${e}`))
  }

  lines.push(
    '',
    '### TDD Sequence',
    ...plan.tddSequence.map((step, i) => `${i + 1}. ${step}`)
  )

  return lines.join('\n')
}
