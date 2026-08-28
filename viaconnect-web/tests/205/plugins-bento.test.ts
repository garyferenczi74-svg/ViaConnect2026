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
    expect(registry).not.toMatch(/^\s*available:/m);
    expect(registry).not.toContain("Available");
    expect(card + src("components/plugins/PluginVendorMark.tsx") + src("components/plugins/PluginsAppsSurface.tsx")).toContain(
      "strokeWidth={1.5}",
    );
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
    expect(registry).toContain("Manage in Wearables Data");
    expect(registry).toContain("noActionYet: 'No action yet.'");
    expect(card).toContain("PLUGIN_COMING_SOON_ACTION");
    expect(card).toContain("isPluginConnectWired");
    expect(card).toContain("PLUGIN_STATE_COPY.manage");
    expect(card).toContain("PLUGIN_STATE_COPY.disconnect");
    expect(card).not.toContain("PLUGIN_STATE_COPY.noActionYet");
    expect(card).toContain("PLUGIN_STATE_COPY.comingSoon");
    expect(card).not.toMatch(/Coming soon<\/button/i);
    expect(card).not.toMatch(/type="button"[^>]*>[\s\S]*PLUGIN_STATE_COPY.comingSoon/);
  });

  it("locks 390 vendor-mark anatomy and Connections 3-column IA", () => {
    const card = src("components/plugins/PluginAppCard.tsx");
    const surface = src("components/plugins/PluginsAppsSurface.tsx");
    const mark = src("components/plugins/PluginVendorMark.tsx");
    expect(card).toContain("PluginVendorMark");
    expect(card).toContain("formatSyncedRelative");
    expect(card).not.toContain("HeartPulse");
    expect(card).not.toContain("grid-cols-");
    expect(surface).toContain("flex flex-col gap-3");
    expect(surface).toContain("grid-cols-1");
    expect(surface).toContain("min-[900px]:grid-cols-2");
    expect(surface).toContain("min-[1280px]:grid-cols-[1fr_1.2fr_1fr]");
    expect(surface).not.toContain("sm:grid-cols-2");
    expect(surface).not.toContain("min-[1280px]:grid-cols-3");
    expect(surface).toContain("PluginAppDetailPanel");
    expect(surface).toContain("PluginsSummaryPanel");
    expect(mark).toContain("google_health");
    expect(mark).toContain("myfitnesspal");
    expect(mark).toContain("cronometer");
    expect(mark).toContain("strava");
    expect(mark).toContain("peloton");
    expect(mark).toContain("headspace");
    expect(mark).toContain("calm");
    expect(mark).not.toContain("whoop");
    expect(mark).not.toContain("oura");
    expect(mark).not.toContain("hume");
    expect(mark).not.toContain("apple_health");
    expect(mark).toContain("strokeWidth={1.5}");
  });

  it("matches Connections WearableTileCard chrome without wearable dropzone", () => {
    const card = src("components/plugins/PluginAppCard.tsx");
    const chrome = src("components/plugins/pluginTileChrome.ts");
    const tile = src("components/body-tracker/connections/WearableTileCard.tsx");
    expect(tile).toContain(
      "relative rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md",
    );
    expect(tile).toContain(
      "relative rounded-[24px] border border-[rgba(74,144,217,0.25)] bg-[rgba(74,144,217,0.10)] p-4 pl-6 backdrop-blur-[16px]",
    );
    expect(chrome).toContain(
      "relative rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md",
    );
    expect(chrome).toContain(
      "relative rounded-[24px] border border-[rgba(74,144,217,0.25)] bg-[rgba(74,144,217,0.10)] p-4 pl-6 backdrop-blur-[16px]",
    );
    expect(card).toContain("pluginTileCardChrome");
    expect(card).toContain("resolveLastSyncState");
    expect(card).toContain("@/lib/body-tracker/last-sync-state");
    expect(card).toContain("PLUGIN_STATE_COPY.comingSoon");
    expect(card).toContain("isPluginConnectWired");
    expect(card).toContain("data-last-sync-state");
    expect(card).not.toContain("bg-[#1E3054]");
    expect(card).not.toContain("onDragOver");
    expect(card).not.toContain("onDropXml");
    expect(card).not.toContain("Upload XML");
    expect(card).not.toContain("UNKNOWN");
    expect(card).not.toContain("whoop");
    expect(card).not.toContain("oura");
    expect(card).not.toContain("hume");
    expect(card).not.toContain("apple_health");
    expect(card).not.toMatch(/type="button"[^>]*>\s*\{PLUGIN_STATE_COPY.comingSoon\}/);
    expect(card).not.toMatch(/Coming soon<\/button/i);
  });

  it("contains no em-dash or en-dash characters on the plugins surface", () => {
    const page = src("app/(app)/(consumer)/plugins/page.tsx");
    const surface = src("components/plugins/PluginsAppsSurface.tsx");
    const shell = src("components/plugins/PluginsHeroShell.tsx");
    const card = src("components/plugins/PluginAppCard.tsx");
    const detail = src("components/plugins/PluginAppDetailPanel.tsx");
    const summary = src("components/plugins/PluginsSummaryPanel.tsx");
    const emDash = String.fromCharCode(0x2014);
    const enDash = String.fromCharCode(0x2013);
    expect(page + surface + shell + card + detail + summary).not.toContain(emDash);
    expect(page + surface + shell + card + detail + summary).not.toContain(enDash);
  });
});
