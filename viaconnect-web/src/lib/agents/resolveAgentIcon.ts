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
 *
 * Turbopack / optimizePackageImports can still wrap a named import as
 * `{ default: Component }`. Unwrap before render. Circle is the last resort.
 */

import { createElement, type SVGProps } from "react";
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

const AGENT_ICON_BY_NAME: Record<string, unknown> = {
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

function CircleFallback(props: SVGProps<SVGSVGElement>) {
  return createElement(
    "svg",
    { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", ...props },
    createElement("circle", { cx: 12, cy: 12, r: 10 }),
  );
}

export function asLucideIcon(mod: unknown): IconType | null {
  if (typeof mod === "function") return mod as IconType;
  if (mod && typeof mod === "object") {
    const inner = (mod as { default?: unknown }).default;
    if (typeof inner === "function") return inner as IconType;
  }
  return null;
}

function circleFallback(): IconType {
  return asLucideIcon(Circle) ?? (CircleFallback as IconType);
}

export function resolveAgentIcon(iconName: string | null | undefined): IconType {
  const fallback = circleFallback();
  if (typeof iconName !== "string" || iconName.length === 0) return fallback;
  return asLucideIcon(AGENT_ICON_BY_NAME[iconName]) ?? fallback;
}
