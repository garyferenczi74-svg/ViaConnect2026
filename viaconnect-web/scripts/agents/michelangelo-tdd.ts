// scripts/agents/michelangelo-tdd.ts
// Michelangelo Gate A — TDD Enforcement & Coverage Audit

export interface TestAuditResult {
  taskName: string
  timestamp: string
  lineCoverage: number
  branchCoverage: number
  criticalPathCoverage: number
  e2eFlows: { name: string; passed: boolean }[]
  rlsPolicyTests: { name: string; passed: boolean }[]
  overallStatus: 'CLEARED' | 'BLOCKED'
  failingTests: string[]
}

export const TDD_TARGETS = {
  lineCoverage: 80,
  branchCoverage: 75,
  criticalPathCoverage: 100,
} as const

export const CRITICAL_PATHS = [
  'auth/',
  'rls/',
  'payment/',
  'health-data/',
  'supabase/middleware',
  'api/webhooks',
  'portal/consumer/helix',
]

export function isCriticalPath(filePath: string): boolean {
  return CRITICAL_PATHS.some(cp => filePath.includes(cp))
}

export function validateTDDSequence(
  testFileExists: boolean,
  implementationFileExists: boolean,
  testFileModifiedBefore: boolean
): { valid: boolean; message: string } {
  if (!testFileExists && implementationFileExists) {
    return {
      valid: false,
      message: 'Implementation file exists but no test file found, tests must be written FIRST (Red phase)'
    }
  }
  if (testFileExists && implementationFileExists && !testFileModifiedBefore) {
    return {
      valid: false,
      message: 'Test file modification timestamp is AFTER implementation, tests must precede code (Red then Green order)'
    }
  }
  return { valid: true, message: 'TDD sequence valid, tests precede implementation' }
}

export function generateTestAuditReport(result: TestAuditResult): string {
  const lineStatus = result.lineCoverage >= TDD_TARGETS.lineCoverage ? 'PASS' : 'FAIL'
  const branchStatus = result.branchCoverage >= TDD_TARGETS.branchCoverage ? 'PASS' : 'FAIL'
  const criticalStatus = result.criticalPathCoverage >= TDD_TARGETS.criticalPathCoverage ? 'PASS' : 'FAIL'
  const e2ePass = result.e2eFlows.filter(f => f.passed).length
  const rlsPass = result.rlsPolicyTests.filter(t => t.passed).length

  const lines: string[] = [
    `## Michelangelo, Test Audit Report`,
    `**Task:** ${result.taskName}`,
    `**Coverage Run:** ${result.timestamp}`,
    `**Tool:** Vitest + Playwright`,
    '',
    '| Metric | Target | Actual | Status |',
    '|--------|--------|--------|--------|',
    `| Line Coverage | >=${TDD_TARGETS.lineCoverage}% | ${result.lineCoverage}% | ${lineStatus} |`,
    `| Branch Coverage | >=${TDD_TARGETS.branchCoverage}% | ${result.branchCoverage}% | ${branchStatus} |`,
    `| Critical Path Coverage | ${TDD_TARGETS.criticalPathCoverage}% | ${result.criticalPathCoverage}% | ${criticalStatus} |`,
    `| E2E Flows | All green | ${e2ePass}/${result.e2eFlows.length} | ${e2ePass === result.e2eFlows.length ? 'PASS' : 'FAIL'} |`,
    `| RLS Policy Tests | All green | ${rlsPass}/${result.rlsPolicyTests.length} | ${rlsPass === result.rlsPolicyTests.length ? 'PASS' : 'FAIL'} |`,
    '',
    `**Cleared to merge:** ${result.overallStatus === 'CLEARED' ? 'YES' : 'NO'}`,
  ]

  if (result.failingTests.length > 0) {
    lines.push('', '### Failing Tests', ...result.failingTests.map(t => `- ${t}`))
  }

  return lines.join('\n')
}

export const VITEST_COVERAGE_CONFIG = `
// Add to vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: ${TDD_TARGETS.lineCoverage},
        branches: ${TDD_TARGETS.branchCoverage},
      },
      perFile: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.stories.{ts,tsx}', 'src/**/*.d.ts'],
    },
  },
})
`
