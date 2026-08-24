import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../src");

function src(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Plugins Picasso IA honesty", () => {
  it("keeps /plugins on the apps surface with existing chrome, no new logo", () => {
    const page = src("app/(app)/(consumer)/plugins/page.tsx");
    const surface = src("components/plugins/PluginsAppsSurface.tsx");
    const card = src("components/plugins/PluginAppCard.tsx");
    expect(page).toContain("PluginsAppsSurface");
    expect(surface).toContain("Plugins");
    expect(surface).toContain("PLUGIN_PAGE_SUBTITLE");
    expect(surface).toContain("/body-tracker/connections");
    expect(surface).toContain("Wearables Data");
    expect(surface).not.toContain("Looking for Whoop");
    expect(surface + card).not.toMatch(/ViaCura|Helix Rewards|new palette|FarmCeutica logo/i);
    expect(surface).not.toContain("#224852");
    expect(surface).not.toContain("#4ADE80");
  });

  it("does not list wearable device tiles on /plugins", () => {
    const surface = src("components/plugins/PluginsAppsSurface.tsx");
    const registry = src("lib/integrations/pluginAppRegistry.ts");
    const join = src("lib/integrations/connectionState.ts");
    expect(registry).toContain("PLUGIN_PAGE_EXCLUDED_SLUGS");
    expect(registry).toContain("'whoop'");
    expect(registry).toContain("'oura'");
    expect(registry).toContain("'hume'");
    expect(registry).toContain("'apple_health'");
    expect(join).toContain("isPluginPageApp");
    expect(surface).not.toMatch(/tile-id=.whoop/);
    expect(surface).not.toContain("Apple Health");
    expect(surface).not.toContain("Hume Body Pod");
  });

  it("imports last-sync-state only and does not invent last-sync copy", () => {
    const join = src("lib/integrations/connectionState.ts");
    const card = src("components/plugins/PluginAppCard.tsx");
    const registry = src("lib/integrations/pluginAppRegistry.ts");
    expect(join).toContain("@/lib/body-tracker/last-sync-state");
    expect(card).toContain("@/lib/body-tracker/last-sync-state");
    expect(join + card + registry).not.toContain("Not synced yet");
    expect(join + card + registry).not.toContain("Last sync unknown");
    expect(registry).not.toContain("available:");
    expect(card).toContain("strokeWidth={1.5}");
    expect(join + card + registry).not.toMatch(/Semaglutide/i);
    expect(join).not.toMatch(/\bas any\b/);
    expect(card).not.toMatch(/\bas any\b/);
  });

  it("locks coming-soon copy and Connect only when wired", () => {
    const registry = src("lib/integrations/pluginAppRegistry.ts");
    const card = src("components/plugins/PluginAppCard.tsx");
    expect(registry).toContain(
      "No action yet. We enable Connect when the flow ships.",
    );
    expect(card).toContain("PLUGIN_COMING_SOON_ACTION");
    expect(card).toContain("isPluginConnectWired");
    expect(card).toContain("PLUGIN_STATE_COPY.manage");
    expect(card).toContain("PLUGIN_STATE_COPY.disconnect");
  });

  it("contains no em-dash or en-dash characters on the plugins surface", () => {
    const page = src("app/(app)/(consumer)/plugins/page.tsx");
    const surface = src("components/plugins/PluginsAppsSurface.tsx");
    const card = src("components/plugins/PluginAppCard.tsx");
    const emDash = String.fromCharCode(0x2014);
    const enDash = String.fromCharCode(0x2013);
    expect(page + surface + card).not.toContain(emDash);
    expect(page + surface + card).not.toContain(enDash);
  });
});
