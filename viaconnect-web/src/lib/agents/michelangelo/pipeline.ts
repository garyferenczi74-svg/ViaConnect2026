// lib/agents/michelangelo/pipeline.ts
import { executeBrainstorm } from './brainstorm';
import { createTaskPlan } from './planner';
import { executeTDDCycle } from './tdd-engine';
import { executeReview } from './reviewer';
import { AgentTask } from '@/types/agents';

export interface PipelineResult {
  taskId: string;
  status: 'success' | 'failed' | 'escalated';
  brainstormDuration: number;
  planningDuration: number;
  tddDuration: number;
  reviewDuration: number;
  totalDuration: number;
  microTasksCompleted: number;
  microTasksFailed: number;
  overallScore: number;
}

export async function runMichelangeloPipeline(
  task: AgentTask
): Promise<PipelineResult> {
  const start = Date.now();
  let brainstormDuration = 0;
  let planningDuration = 0;
  let tddDuration = 0;
  let reviewDuration = 0;
  let completed = 0;
  let failed = 0;
  let totalScore = 0;

  console.log(`\n[Michelangelo] ========================================`);
  console.log(`[Michelangelo] PIPELINE START: ${task.description}`);
  console.log(`[Michelangelo] ========================================\n`);

  // ===== PILLAR 1: BRAINSTORM =====
  const brainstormStart = Date.now();
  console.log(`[Michelangelo] PILLAR 1: Brainstorm-First Architecture`);
  const brainstorm = await executeBrainstorm(task);
  brainstormDuration = Date.now() - brainstormStart;
  console.log(`[Michelangelo] Brainstorm complete (${brainstormDuration}ms)`);
  console.log(`[Michelangelo] Selected: ${brainstorm.approachSummary}\n`);

  // ===== PILLAR 2: MICRO-TASK PLANNING =====
  const planStart = Date.now();
  console.log(`[Michelangelo] PILLAR 2: Micro-Task Planning`);
  const plan = await createTaskPlan(brainstorm.phase);
  planningDuration = Date.now() - planStart;
  console.log(
    `[Michelangelo] Plan complete: ${plan.microTasks.length} tasks, ` +
    `${plan.executionOrder.length} batches (${planningDuration}ms)\n`
  );

  // ===== PILLARS 3 + 4: TDD + REVIEW (per micro-task) =====
  for (const batch of plan.executionOrder) {
    // Execute batch in parallel (Obra superpower)
    const batchPromises = batch.map(async (taskId) => {
      const microTask = plan.microTasks.find((t) => t.id === taskId);
      if (!microTask) return;

      try {
        // PILLAR 3: TDD
        const tddStart = Date.now();
        console.log(`[Michelangelo] PILLAR 3 (TDD): ${microTask.title}`);
        const cycle = await executeTDDCycle(microTask, plan);
        tddDuration += Date.now() - tddStart;

        // PILLAR 4: CODE REVIEW
        const reviewStart = Date.now();
        console.log(`[Michelangelo] PILLAR 4 (Review): ${microTask.title}`);
        const review = await executeReview(cycle, microTask);
        reviewDuration += Date.now() - reviewStart;

        if (review.passed) {
          completed++;
          totalScore += review.score;
          microTask.status = 'complete';
        } else {
          // Re-enter TDD with review feedback (self-healing loop)
          console.log(
            `[Michelangelo] Review failed. Re-entering TDD with feedback...`
          );
          const retryCycle = await executeTDDCycle(microTask, plan);
          const retryReview = await executeReview(retryCycle, microTask);

          if (retryReview.passed) {
            completed++;
            totalScore += retryReview.score;
            microTask.status = 'complete';
          } else {
            failed++;
            microTask.status = 'failed';
          }
        }
      } catch (error) {
        failed++;
        microTask.status = 'failed';
        console.error(
          `[Michelangelo] FAILED: ${microTask.title} — ${error}`
        );
      }
    });

    await Promise.all(batchPromises);
  }

  const totalDuration = Date.now() - start;
  const overallScore = completed > 0
    ? Math.round(totalScore / completed)
    : 0;

  const result: PipelineResult = {
    taskId: task.id,
    status: failed === 0 ? 'success' : completed > 0 ? 'escalated' : 'failed',
    brainstormDuration,
    planningDuration,
    tddDuration,
    reviewDuration,
    totalDuration,
    microTasksCompleted: completed,
    microTasksFailed: failed,
    overallScore,
  };

  console.log(`\n[Michelangelo] ========================================`);
  console.log(`[Michelangelo] PIPELINE ${result.status.toUpperCase()}`);
  console.log(`[Michelangelo] Completed: ${completed}/${completed + failed}`);
  console.log(`[Michelangelo] Score: ${overallScore}/100`);
  console.log(`[Michelangelo] Duration: ${totalDuration}ms`);
  console.log(`[Michelangelo] ========================================\n`);

  // Final broadcast to Jeffery
  await notifyJeffery(result);

  return result;
}

async function notifyJeffery(result: PipelineResult): Promise<void> {
  console.log(
    `[Michelangelo] Notifying Jeffery: Pipeline ${result.status}. ` +
    `Score: ${result.overallScore}/100.`
  );
}
