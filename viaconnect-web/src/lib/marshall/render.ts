/**
 * Marshall render helpers — used by server components that want to scan
 * arbitrary text during SSR and degrade gracefully if the 50ms budget is hit.
 */

import { scanContent } from "@/lib/compliance/adapters/content";
import { scanAiOutput } from "@/lib/compliance/adapters/ai_output";
import type { Finding } from "@/lib/compliance/engine/types";

const RENDER_BUDGET_MS = 50;

export async function scanRenderedContent(text: string): Promise<{ findings: Finding[]; timedOut: boolean }> {
  const start = Date.now();
  const timeoutPromise = new Promise<{ findings: Finding[]; timedOut: true }>((resolve) =>
    setTimeout(() => resolve({ findings: [], timedOut: true }), RENDER_BUDGET_MS),
  );
  const scan = scanContent({ text, surface: "content_cms" }).then((res) => ({
    findings: res.findings,
    timedOut: false as const,
  }));
  const result = await Promise.race([scan, timeoutPromise]);
  void start;
  return result;
}

export async function scanRenderedAi(agent: string, text: string, userRole?: string) {
  const start = Date.now();
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), RENDER_BUDGET_MS));
  const scan = scanAiOutput({ agent, text, userRole });
  const result = await Promise.race([scan, timeout]);
  void start;
  return result ?? { cleanedText: text, findings: [], blocked: false, autoApplied: [] };
}
