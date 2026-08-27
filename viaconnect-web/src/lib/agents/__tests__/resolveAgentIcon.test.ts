/**
 * ACC seat icons must be named Lucide imports, not a lucide-react namespace import.
 * optimizePackageImports empties the namespace in the production client bundle.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AGENT_REGISTRY, orderedRegistry } from "../registry";
import { resolveAgentIcon } from "../resolveAgentIcon";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function isRenderableIcon(Icon: unknown): boolean {
  try {
    const html = renderToStaticMarkup(createElement(Icon as Parameters<typeof createElement>[0], { strokeWidth: 1.5 }));
    return html.includes("<svg") || html.length > 0;
  } catch {
    return false;
  }
}

describe("resolveAgentIcon", () => {
  it("returns a renderable component for every ACC seat icon_name", () => {
    for (const row of orderedRegistry()) {
      expect(isRenderableIcon(resolveAgentIcon(row.icon_name))).toBe(true);
    }
    expect(Object.keys(AGENT_REGISTRY)).toHaveLength(17);
  });

  it("fails open to Circle when the name is missing or unknown", () => {
    const fallback = resolveAgentIcon(undefined);
    expect(isRenderableIcon(fallback)).toBe(true);
    expect(resolveAgentIcon("")).toBe(fallback);
    expect(resolveAgentIcon("NotARealLucideIcon")).toBe(fallback);
  });

  it("chip trigger and header do not namespace-import lucide-react", () => {
    const trigger = read("src/components/admin/jeffery/agents/AgentTabTrigger.tsx");
    const header = read("src/components/admin/jeffery/agents/AgentHeader.tsx");
    const resolver = read("src/lib/agents/resolveAgentIcon.ts");
    expect(trigger).not.toMatch(/import\s+\*\s+as\s+Icons\s+from\s+["']lucide-react["']/);
    expect(header).not.toMatch(/import\s+\*\s+as\s+Icons\s+from\s+["']lucide-react["']/);
    expect(resolver).not.toMatch(/^import\s+\*\s+as\s+/m);
    expect(trigger).toContain("resolveAgentIcon");
    expect(header).toContain("resolveAgentIcon");
    expect(resolver).toContain("optimizePackageImports");
  });
});
