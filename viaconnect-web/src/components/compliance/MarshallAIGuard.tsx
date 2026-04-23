/**
 * MarshallAIGuard — server component wrapper that scans AI advisor output
 * before it is rendered to the user. Fall-through rendering on clean output;
 * swaps to MarshallNotice + redacted text on any P0 hit.
 *
 * Usage (server component):
 *   <MarshallAIGuard agent="jeffery" userId={userId} userRole={role} text={aiText}>
 *     {(cleanText) => <AdvisorChat text={cleanText} />}
 *   </MarshallAIGuard>
 */

import { scanAiOutput } from "@/lib/compliance/adapters/ai_output";
import MarshallNotice from "./MarshallNotice";
import type { Finding } from "@/lib/compliance/engine/types";

export interface MarshallAIGuardProps {
  agent: string;
  text: string;
  userId?: string;
  userRole?: string;
  recommendedSkus?: string[];
  children: (cleanText: string, findings: Finding[]) => React.ReactNode;
}

export default async function MarshallAIGuard(props: MarshallAIGuardProps) {
  const scan = await scanAiOutput({
    agent: props.agent,
    userId: props.userId,
    userRole: props.userRole,
    text: props.text,
    recommendedSkus: props.recommendedSkus,
  });

  const blockingFinding = scan.findings.find((f) => f.severity === "P0");
  if (blockingFinding && scan.blocked) {
    return (
      <MarshallNotice
        title="Output held by Marshall"
        finding={blockingFinding}
      />
    );
  }

  return <>{props.children(scan.cleanedText, scan.findings)}</>;
}
