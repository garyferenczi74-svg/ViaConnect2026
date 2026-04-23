/**
 * Content adapter — scans markdown / HTML / plain strings against every rule
 * that applies to the given surface. Returns findings; does not block.
 */

import { ViolationDetector } from "../engine/ViolationDetector";
import type { FindingLocation, Surface } from "../engine/types";

export async function scanContent(opts: {
  text: string;
  surface: Extract<Surface, "content_cms" | "user_content" | "marketing_page">;
  location?: FindingLocation;
  userRole?: string;
}) {
  const detector = new ViolationDetector();
  return detector.detect({
    surface: opts.surface,
    source: "runtime",
    content: stripHtml(opts.text),
    location: opts.location,
    userRole: opts.userRole,
  });
}

// Tight HTML stripper: strips tags, decodes common entities, keeps text flow.
function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
