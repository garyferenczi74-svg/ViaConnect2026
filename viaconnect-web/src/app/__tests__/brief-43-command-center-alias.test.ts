import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACC_SEAT_COUNT, AGENT_IDS } from "@/lib/agents/types";

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

const NEXT_CONFIG = src("next.config.mjs");
const APP_CATCH_ALL = src("src/app/(app)/[...notFound]/page.tsx");
const JEFFERY_PAGE = src("src/app/(app)/admin/jeffery/page.tsx");
const SIDEBAR = src("src/components/layout/Sidebar.tsx");
const ROOT_VERCEL = readFileSync(path.join(root, "..", "vercel.json"), "utf8");
const WEB_VERCEL = src("vercel.json");

function redirectBlock(source: string): string {
  const idx = NEXT_CONFIG.indexOf(`source: "${source}"`);
  expect(idx, `missing redirect source ${source}`).toBeGreaterThan(-1);
  return NEXT_CONFIG.slice(idx, idx + 180);
}

describe("Brief 43 alias /admin/command-center to Jeffery", () => {
  it("308-redirects /admin/command-center to canonical /admin/jeffery", () => {
    const block = redirectBlock("/admin/command-center");
    expect(block).toContain('destination: "/admin/jeffery"');
    expect(block).toContain("permanent: true");
    expect(NEXT_CONFIG).not.toContain('source: "/admin/cc"');
    expect(NEXT_CONFIG).not.toContain('source: "/command-center"');
    expect(NEXT_CONFIG).not.toContain('source: "/admin/commandcenter"');
  });

  it("does not add a second Command Center page or copy JefferyClient", () => {
    const commandCenterDir = path.join(root, "src/app/(app)/admin/command-center");
    expect(existsSync(commandCenterDir)).toBe(false);

    const jefferyClients = walkFiles(path.join(root, "src")).filter((file) =>
      file.endsWith("JefferyClient.tsx"),
    );
    expect(jefferyClients).toHaveLength(1);
    expect(jefferyClients[0]).toContain(`${path.sep}admin${path.sep}jeffery${path.sep}JefferyClient.tsx`);

    expect(JEFFERY_PAGE).toContain('from "./JefferyClient"');
    expect(JEFFERY_PAGE).toContain("<JefferyClient");
    expect(JEFFERY_PAGE).not.toMatch(/\bas any\b/);
    expect(NEXT_CONFIG).not.toMatch(/\bas any\b/);
    expect(APP_CATCH_ALL).not.toMatch(/\bas any\b/);
  });

  it("keeps /admin/jeffery as the sidebar Command Center href", () => {
    expect(SIDEBAR).toContain('href: "/admin/jeffery"');
    expect(SIDEBAR).toContain("Jeffery™ Command Center");
    expect(SIDEBAR).not.toContain('href: "/admin/command-center"');
  });

  it("leaves signed-in 404 chrome for unknown admin paths", () => {
    expect(APP_CATCH_ALL).toContain("notFound()");
    expect(APP_CATCH_ALL).toContain("/admin/command-center");
    expect(APP_CATCH_ALL).toContain("/admin/jeffery");
    expect(ROOT_VERCEL).not.toMatch(/command-center/);
    expect(WEB_VERCEL).not.toMatch(/command-center/);
    expect(WEB_VERCEL).not.toContain('"rewrites"');
    expect(ROOT_VERCEL).not.toContain('"rewrites"');
  });

  it("leaves ACC 17 as the Jeffery seat lock", () => {
    expect(ACC_SEAT_COUNT).toBe(17);
    expect(AGENT_IDS).toHaveLength(17);
  });
});
