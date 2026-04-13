// lib/agents/michelangelo/planner.ts
import { BrainstormPhase, ApproachOption } from './brainstorm';

export interface MicroTask {
  id: string;
  parentTaskId: string;
  title: string;
  description: string;
  type: 'test' | 'implementation' | 'refactor' | 'migration' | 'config';
  filePath: string;
  estimatedLines: number;
  dependencies: string[]; // other MicroTask IDs
  acceptanceCriteria: string[];
  status: 'pending' | 'in_progress' | 'complete' | 'failed' | 'blocked';
  order: number;
}

export interface TaskPlan {
  taskId: string;
  approach: ApproachOption;
  microTasks: MicroTask[];
  executionOrder: string[][]; // Grouped by parallelizable batches
  totalEstimatedLines: number;
  criticalPath: string[];
  timestamp: string;
}

export async function createTaskPlan(
  brainstorm: BrainstormPhase
): Promise<TaskPlan> {
  const approach = brainstorm.selectedApproach!;

  // Step 1: Decompose into atomic units (max 50 lines each)
  const microTasks = decompose(brainstorm.taskId, approach);

  // Step 2: Validate atomicity — no task > 50 lines
  validateAtomicity(microTasks);

  // Step 3: Build dependency graph
  const executionOrder = buildExecutionGraph(microTasks);

  // Step 4: Identify critical path
  const criticalPath = findCriticalPath(microTasks, executionOrder);

  // Step 5: Prepend test tasks (TDD — tests come first)
  const withTests = prependTestTasks(microTasks);

  const plan: TaskPlan = {
    taskId: brainstorm.taskId,
    approach,
    microTasks: withTests,
    executionOrder,
    totalEstimatedLines: withTests.reduce((sum, t) => sum + t.estimatedLines, 0),
    criticalPath,
    timestamp: new Date().toISOString(),
  };

  // Broadcast plan to Jeffery for approval
  await broadcastPlan(plan);

  return plan;
}

function decompose(taskId: string, approach: ApproachOption): MicroTask[] {
  // Breaks approach into atomic units where each:
  //  - Touches exactly ONE file (or creates one new file)
  //  - Has clear acceptance criteria
  //  - Is independently testable
  //  - Is <= 50 lines of code
  return [];
}

function validateAtomicity(tasks: MicroTask[]): void {
  for (const task of tasks) {
    if (task.estimatedLines > 50) {
      throw new Error(
        `PLAN BLOCKED: Task "${task.title}" exceeds 50-line limit ` +
        `(${task.estimatedLines} lines). Decompose further.`
      );
    }
    if (task.acceptanceCriteria.length === 0) {
      throw new Error(
        `PLAN BLOCKED: Task "${task.title}" has no acceptance criteria.`
      );
    }
  }
}

function buildExecutionGraph(tasks: MicroTask[]): string[][] {
  // Groups tasks into parallelizable batches
  // Tasks with no dependencies run in batch 0
  // Tasks depending on batch 0 run in batch 1, etc.
  return [];
}

function findCriticalPath(
  tasks: MicroTask[],
  order: string[][]
): string[] {
  // Longest path through the dependency graph
  return [];
}

function prependTestTasks(tasks: MicroTask[]): MicroTask[] {
  // For every implementation task, creates a corresponding test task
  // that is ordered BEFORE the implementation (TDD)
  const withTests: MicroTask[] = [];
  for (const task of tasks) {
    if (task.type === 'implementation') {
      withTests.push({
        ...task,
        id: `test-${task.id}`,
        title: `[TEST] ${task.title}`,
        type: 'test',
        filePath: task.filePath.replace(/\.ts$/, '.test.ts').replace(/\.tsx$/, '.test.tsx'),
        dependencies: task.dependencies,
        order: task.order - 0.5,
        status: 'pending',
      });
    }
    withTests.push(task);
  }
  return withTests.sort((a, b) => a.order - b.order);
}

async function broadcastPlan(plan: TaskPlan): Promise<void> {
  console.log(
    `[Michelangelo] Task plan ready: ${plan.microTasks.length} micro-tasks, ` +
    `${plan.executionOrder.length} execution batches.`
  );
}
