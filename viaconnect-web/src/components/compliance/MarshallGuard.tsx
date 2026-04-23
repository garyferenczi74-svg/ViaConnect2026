/**
 * MarshallGuard — generic content guard for CMS-authored copy.
 * Wraps any server-rendered content that originated from the CMS or from user
 * input. Lower latency budget than the AI guard because it only runs the
 * claims + brand rules.
 */

import { scanContent } from "@/lib/compliance/adapters/content";
import MarshallNotice from "./MarshallNotice";
import type { Surface } from "@/lib/compliance/engine/types";

export interface MarshallGuardProps {
  text: string;
  surface: Extract<Surface, "content_cms" | "user_content" | "marketing_page">;
  userRole?: string;
  children: React.ReactNode;
}

export default async function MarshallGuard(props: MarshallGuardProps) {
  const scan = await scanContent({
    text: props.text,
    surface: props.surface,
    userRole: props.userRole,
  });

  const blocker = scan.findings.find((f) => f.severity === "P0");
  if (blocker) {
    return <MarshallNotice finding={blocker} title="Content held by Marshall" />;
  }

  return <>{props.children}</>;
}
