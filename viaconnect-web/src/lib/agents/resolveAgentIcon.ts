/**
 * Named Lucide map for ACC seat chips / headers.
 *
 * Do not `import * as Icons from "lucide-react"` here. next.config.mjs sets
 * experimental.optimizePackageImports for lucide-react, which rewrites the
 * barrel. A namespace import becomes an empty/incomplete object in the
 * production client bundle, so Icons[registry.icon_name] and even
 * Icons.Circle are undefined. Rendering that as <Icon /> throws
 * "Element type is invalid" and trips AdminPanelErrorBoundary on the
 * Agents tab (chip bar first paint). Named imports stay real components.
 */

import {
  BookOpen,
  Brain,
  Circle,
  CircleDot,
  Code2,
  Dna,
  Dumbbell,
  FileText,
  FlaskConical,
  Heart,
  MessageCircle,
  Palette,
  Radar,
  Scale,
  ScrollText,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { IconType } from "@/types/icon";

const AGENT_ICON_BY_NAME: Record<string, IconType> = {
  BookOpen,
  Brain,
  Circle,
  CircleDot,
  Code2,
  Dna,
  Dumbbell,
  FileText,
  FlaskConical,
  Heart,
  MessageCircle,
  Palette,
  Radar,
  Scale,
  ScrollText,
  Search,
  Send,
  ShieldCheck,
};

export function resolveAgentIcon(iconName: string | null | undefined): IconType {
  if (typeof iconName !== "string" || iconName.length === 0) return Circle;
  return AGENT_ICON_BY_NAME[iconName] ?? Circle;
}
