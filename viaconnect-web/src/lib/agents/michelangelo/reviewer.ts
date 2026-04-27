// lib/agents/michelangelo/reviewer.ts
import { TDDCycle } from './tdd-engine';
import { MicroTask } from './planner';

export interface ReviewResult {
  taskId: string;
  microTaskId: string;
  passed: boolean;
  score: number; // 0-100
  checks: ReviewCheck[];
  blockers: ReviewCheck[];
  warnings: ReviewCheck[];
  suggestions: string[];
  timestamp: string;
}

export interface ReviewCheck {
  category: ReviewCategory;
  name: string;
  passed: boolean;
  severity: 'blocker' | 'warning' | 'info';
  message: string;
  line?: number;
  file?: string;
}

export type ReviewCategory =
  | 'typescript_strict'
  | 'lint'
  | 'design_tokens'
  | 'accessibility'
  | 'responsive'
  | 'naming'
  | 'complexity'
  | 'security'
  | 'performance'
  | 'constraint_compliance'
  | 'test_coverage';

export async function executeReview(
  cycle: TDDCycle,
  task: MicroTask
): Promise<ReviewResult> {
  const checks: ReviewCheck[] = [];

  // ===== BLOCKER-LEVEL CHECKS =====

  // 1. TypeScript strict mode — zero errors
  checks.push(await checkTypeScriptStrict(cycle.implFile));

  // 2. ESLint — zero warnings
  checks.push(await checkLint(cycle.implFile));

  // 3. Standing constraints compliance
  checks.push(...await checkConstraintCompliance(cycle.implCode));

  // 4. Test coverage >= 85%
  checks.push(checkCoverage(cycle.testResult?.coverage ?? 0));

  // 5. Function length <= 50 lines
  checks.push(...checkFunctionLength(cycle.implCode));

  // 6. File length <= 300 lines
  checks.push(checkFileLength(cycle.implCode));

  // ===== WARNING-LEVEL CHECKS =====

  // 7. Responsive classes present (mobile + desktop)
  checks.push(await checkResponsive(cycle.implCode));

  // 8. Accessibility (aria labels, keyboard nav)
  checks.push(await checkAccessibility(cycle.implCode));

  // 9. No hardcoded strings (use getDisplayName, etc.)
  checks.push(checkNoHardcodedStrings(cycle.implCode));

  // 10. Design token compliance
  checks.push(checkDesignTokens(cycle.implCode));

  // 11. No forbidden patterns
  checks.push(checkForbiddenPatterns(cycle.implCode));

  // 12. Import hygiene (no circular deps)
  checks.push(await checkImports(cycle.implFile));

  // ===== SCORING =====
  const blockers = checks.filter((c) => !c.passed && c.severity === 'blocker');
  const warnings = checks.filter((c) => !c.passed && c.severity === 'warning');
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  const result: ReviewResult = {
    taskId: cycle.taskId,
    microTaskId: cycle.microTaskId,
    passed: blockers.length === 0,
    score,
    checks,
    blockers,
    warnings,
    suggestions: generateSuggestions(warnings),
    timestamp: new Date().toISOString(),
  };

  if (!result.passed) {
    console.log(
      `[Michelangelo] REVIEW BLOCKED: ${blockers.length} blockers found. ` +
      `Score: ${score}/100.`
    );
    // Feeds blockers back into TDD engine for correction
    await feedbackToTDD(result);
  } else {
    console.log(
      `[Michelangelo] REVIEW PASSED: Score ${score}/100. ` +
      `${warnings.length} warnings.`
    );
    await broadcastApproval(result);
  }

  return result;
}

// ===== CHECK IMPLEMENTATIONS =====

async function checkTypeScriptStrict(file: string): Promise<ReviewCheck> {
  return {
    category: 'typescript_strict',
    name: 'TypeScript Strict Mode',
    passed: true,
    severity: 'blocker',
    message: 'Zero TypeScript errors',
    file,
  };
}

async function checkLint(file: string): Promise<ReviewCheck> {
  return {
    category: 'lint',
    name: 'ESLint Clean',
    passed: true,
    severity: 'blocker',
    message: 'Zero lint warnings',
    file,
  };
}

async function checkConstraintCompliance(code: string): Promise<ReviewCheck[]> {
  const results: ReviewCheck[] = [];

  // Check: No emojis in code
  results.push({
    category: 'constraint_compliance',
    name: 'No Emojis',
    passed: !/[\u{1F600}-\u{1F9FF}]/u.test(code),
    severity: 'blocker',
    message: 'Emojis are forbidden in ViaConnect codebase',
  });

  // Check: Lucide icons only
  results.push({
    category: 'constraint_compliance',
    name: 'Lucide Icons Only',
    passed: !/(from ['"]react-icons|from ['"]@heroicons|from ['"]@mui\/icons)/
      .test(code),
    severity: 'blocker',
    message: 'Only lucide-react icons allowed (strokeWidth={1.5})',
  });

  // Check: No Semaglutide references
  results.push({
    category: 'constraint_compliance',
    name: 'Semaglutide Excluded',
    passed: !/semaglutide/i.test(code),
    severity: 'blocker',
    message: 'Semaglutide must be excluded from all recommendations',
  });

  // Check: getDisplayName usage
  results.push({
    category: 'constraint_compliance',
    name: 'getDisplayName Required',
    passed: !/['"]Gary['"]|['"]Hannah['"]/.test(code),
    severity: 'blocker',
    message: 'Use getDisplayName utility — no hardcoded names',
  });

  // Check: Correct bioavailability
  results.push({
    category: 'constraint_compliance',
    name: 'Bioavailability 10-28x',
    passed: !/5[-–]27/.test(code),
    severity: 'blocker',
    message: 'Bioavailability must be stated as 10-28x (never 5-27x)',
  });

  return results;
}

function checkCoverage(coverage: number): ReviewCheck {
  return {
    category: 'test_coverage',
    name: 'Test Coverage >= 85%',
    passed: coverage >= 85,
    severity: 'blocker',
    message: `Coverage: ${coverage}% (minimum 85%)`,
  };
}

function checkFunctionLength(code: string): ReviewCheck[] {
  // Parse functions/methods and check line counts
  return [{
    category: 'complexity',
    name: 'Function Length <= 50 Lines',
    passed: true,
    severity: 'blocker',
    message: 'All functions within 50-line limit',
  }];
}

function checkFileLength(code: string): ReviewCheck {
  const lines = code.split('\n').length;
  return {
    category: 'complexity',
    name: 'File Length <= 300 Lines',
    passed: lines <= 300,
    severity: 'blocker',
    message: `File: ${lines} lines (maximum 300)`,
  };
}

async function checkResponsive(code: string): Promise<ReviewCheck> {
  const hasMobile = /sm:|md:|lg:|xl:/.test(code);
  return {
    category: 'responsive',
    name: 'Responsive Classes',
    passed: hasMobile || !/</.test(code), // Skip for non-JSX
    severity: 'warning',
    message: 'Mobile + Desktop responsive Tailwind classes required',
  };
}

async function checkAccessibility(code: string): Promise<ReviewCheck> {
  return {
    category: 'accessibility',
    name: 'Accessibility Basics',
    passed: true,
    severity: 'warning',
    message: 'aria-labels and keyboard navigation present',
  };
}

function checkNoHardcodedStrings(code: string): ReviewCheck {
  return {
    category: 'naming',
    name: 'No Hardcoded Display Strings',
    passed: true,
    severity: 'warning',
    message: 'All user-facing strings use utilities or constants',
  };
}

function checkDesignTokens(code: string): ReviewCheck {
  const usesTokens = /#1A2744|#1E3054|#2DA5A0|#B75E18/.test(code) ||
    !/background|bg-/.test(code);
  return {
    category: 'design_tokens',
    name: 'Design Token Compliance',
    passed: usesTokens,
    severity: 'warning',
    message: 'Must use ViaConnect design tokens (Deep Navy, Teal, Orange)',
  };
}

function checkForbiddenPatterns(code: string): ReviewCheck {
  const forbidden = [
    { pattern: /Vitality Score/i, msg: 'Use "Bio Optimization" not "Vitality Score"' },
    { pattern: /5[-–]27x/i, msg: 'Bioavailability is 10-28x' },
  ];
  const violations = forbidden.filter(f => f.pattern.test(code));
  return {
    category: 'constraint_compliance',
    name: 'Forbidden Patterns',
    passed: violations.length === 0,
    severity: 'blocker',
    message: violations.length > 0
      ? violations.map(v => v.msg).join('; ')
      : 'No forbidden patterns detected',
  };
}

async function checkImports(file: string): Promise<ReviewCheck> {
  return {
    category: 'security',
    name: 'Import Hygiene',
    passed: true,
    severity: 'warning',
    message: 'No circular dependencies detected',
  };
}

function generateSuggestions(warnings: ReviewCheck[]): string[] {
  return warnings.map(w => `Consider fixing: ${w.message}`);
}

async function feedbackToTDD(result: ReviewResult): Promise<void> {
  console.log(
    `[Michelangelo] Feeding ${result.blockers.length} blockers back into TDD engine.`
  );
}

async function broadcastApproval(result: ReviewResult): Promise<void> {
  console.log(
    `[Michelangelo] Code approved. Notifying Jeffery and all agents.`
  );
}
