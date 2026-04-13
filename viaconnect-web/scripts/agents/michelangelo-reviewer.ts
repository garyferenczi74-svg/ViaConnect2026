// scripts/agents/michelangelo-reviewer.ts
// Michelangelo Gate R — Automated Code Review

export interface ReviewCategory {
  name: string
  status: 'PASS' | 'FAIL' | 'WARN'
  notes: string
}

export interface ReviewReport {
  taskName: string
  timestamp: string
  changedFiles: string[]
  categories: ReviewCategory[]
  overallStatus: 'APPROVED' | 'BLOCKED'
  blockers: string[]
  warnings: string[]
}

export interface FileReviewResult {
  filePath: string
  issues: ReviewIssue[]
}

export interface ReviewIssue {
  line?: number
  severity: 'ERROR' | 'WARN' | 'INFO'
  rule: string
  message: string
}

const REVIEW_PATTERNS: Array<{ pattern: RegExp; rule: string; severity: ReviewIssue['severity']; message: string }> = [
  {
    pattern: /:\s*any\b/g,
    rule: 'no-typescript-any',
    severity: 'ERROR',
    message: 'TypeScript `any` type detected, use explicit typing'
  },
  {
    pattern: /console\.(log|warn|error|info)\(/g,
    rule: 'no-console',
    severity: 'ERROR',
    message: 'console statement detected, use logger or remove'
  },
  {
    pattern: /semaglutide/gi,
    rule: 'no-semaglutide',
    severity: 'ERROR',
    message: 'Semaglutide reference detected, must be removed per standing rules'
  },
  {
    pattern: /vitality\s+score/gi,
    rule: 'score-name',
    severity: 'ERROR',
    message: 'Use "Bio Optimization Score" not "Vitality Score"'
  },
  {
    pattern: /5[–-]27[×x]/gi,
    rule: 'bioavailability-range',
    severity: 'ERROR',
    message: 'Bioavailability must be stated as 10-27x not 5-27x'
  },
  {
    pattern: /strokeWidth(?!\s*=\s*\{1\.5\})/g,
    rule: 'icon-stroke-width',
    severity: 'WARN',
    message: 'Lucide icon strokeWidth should be {1.5}'
  },
  {
    pattern: /helix.*practitioner|practitioner.*helix/gi,
    rule: 'helix-isolation',
    severity: 'ERROR',
    message: 'Helix Rewards must not appear in Practitioner portal'
  },
  {
    pattern: /helix.*naturopath|naturopath.*helix/gi,
    rule: 'helix-isolation',
    severity: 'ERROR',
    message: 'Helix Rewards must not appear in Naturopath portal'
  },
  {
    pattern: /retatrutide.*(oral|stack|nasal|liposomal|micellar)/gi,
    rule: 'retatrutide-form',
    severity: 'ERROR',
    message: 'Retatrutide is injectable-only and must never be stacked'
  },
  {
    pattern: /sm-[\w]+|md-[\w]+/g,
    rule: 'responsive-check',
    severity: 'INFO',
    message: 'Responsive class detected, verify both mobile and desktop layouts'
  },
]

export function reviewFileContent(filePath: string, content: string): FileReviewResult {
  const issues: ReviewIssue[] = []
  const lines = content.split('\n')

  for (const { pattern, rule, severity, message } of REVIEW_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        issues.push({ line: i + 1, severity, rule, message })
      }
      pattern.lastIndex = 0
    }
  }

  return { filePath, issues }
}

export function generateReviewReport(
  taskName: string,
  fileResults: FileReviewResult[]
): ReviewReport {
  const allIssues = fileResults.flatMap(f => f.issues)
  const errors = allIssues.filter(i => i.severity === 'ERROR')
  const warnings = allIssues.filter(i => i.severity === 'WARN')

  const categories: ReviewCategory[] = [
    {
      name: 'TypeScript (zero errors)',
      status: errors.some(e => e.rule === 'no-typescript-any') ? 'FAIL' : 'PASS',
      notes: errors.filter(e => e.rule === 'no-typescript-any').map(e => `L${e.line}`).join(', ') || 'Clean'
    },
    {
      name: 'No console statements',
      status: errors.some(e => e.rule === 'no-console') ? 'FAIL' : 'PASS',
      notes: errors.filter(e => e.rule === 'no-console').map(e => `L${e.line}`).join(', ') || 'Clean'
    },
    {
      name: 'Standing rules compliance',
      status: errors.some(e => ['no-semaglutide', 'score-name', 'bioavailability-range', 'helix-isolation', 'retatrutide-form'].includes(e.rule)) ? 'FAIL' : 'PASS',
      notes: errors.filter(e => ['no-semaglutide','score-name','bioavailability-range','helix-isolation','retatrutide-form'].includes(e.rule)).map(e => e.message).join('; ') || 'Clean'
    },
    {
      name: 'Lucide icon configuration',
      status: warnings.some(e => e.rule === 'icon-stroke-width') ? 'WARN' : 'PASS',
      notes: warnings.filter(e => e.rule === 'icon-stroke-width').length > 0 ? 'Check strokeWidth={1.5}' : 'Clean'
    },
  ]

  const blockers = errors.map(e => `${e.rule} at ${e.message}${e.line ? ` (line ${e.line})` : ''}`)

  return {
    taskName,
    timestamp: new Date().toISOString(),
    changedFiles: fileResults.map(f => f.filePath),
    categories,
    overallStatus: errors.length === 0 ? 'APPROVED' : 'BLOCKED',
    blockers,
    warnings: warnings.map(w => w.message),
  }
}

export function formatReviewReport(report: ReviewReport): string {
  const lines: string[] = [
    `## Michelangelo, Code Review Report`,
    `**Task:** ${report.taskName}`,
    `**Reviewed:** ${report.timestamp}`,
    `**Files:** ${report.changedFiles.join(', ')}`,
    '',
    '| Category | Status | Notes |',
    '|----------|--------|-------|',
  ]

  for (const cat of report.categories) {
    const icon = cat.status === 'PASS' ? 'PASS' : cat.status === 'WARN' ? 'WARN' : 'FAIL'
    lines.push(`| ${cat.name} | ${icon} | ${cat.notes} |`)
  }

  lines.push(
    '',
    `**Overall: ${report.overallStatus === 'APPROVED' ? 'APPROVED, cleared to proceed' : 'BLOCKED, fix all errors before continuing'}**`
  )

  if (report.blockers.length > 0) {
    lines.push('', '### Blockers', ...report.blockers.map(b => `- ${b}`))
  }
  if (report.warnings.length > 0) {
    lines.push('', '### Warnings', ...report.warnings.map(w => `- ${w}`))
  }

  return lines.join('\n')
}
