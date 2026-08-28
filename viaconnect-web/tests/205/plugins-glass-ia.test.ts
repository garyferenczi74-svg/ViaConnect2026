import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../src");

function src(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Plugins glass 3-column IA", () => {
  it("keeps /plugins on PluginsAppsSurface and lists app integrations only", () => {
    const page = src("app/(app)/(consumer)/plugins/page.tsx");
    const surface = src("components/plugins/PluginsAppsSurface.tsx");
    const registry = src("lib/integrations/pluginAppRegistry.ts");
    expect(page).toContain("PluginsAppsSurface");
    expect(surface).toContain("usePluginAppCards");
    expect(surface).toContain("pluginAppRegistry");
    expect(surface).toContain("isPluginConnectWired");
    expect(surface).toContain("Wearables Data");
    expect(surface).toContain("/body-tracker/connections");
    expect(surface).not.toContain("Apple Health");
    expect(surface).not.toContain("Hume Body Pod");
    expect(surface).not.toContain("Whoop");
    expect(surface).not.toContain("Garmin");
    expect(registry).toContain("PLUGIN_PAGE_EXCLUDED_SLUGS");
    expect(registry).toContain("'whoop'");
    expect(registry).toContain("'oura'");
    expect(registry).toContain("'apple_health'");
  });

  it("uses Connections 390 stack / 1280 three-column glass IA", () => {
    const surface = src("components/plugins/PluginsAppsSurface.tsx");
    expect(surface).toContain("data-testid=\"plugins-ia\"");
    expect(surface).toContain("grid-cols-1");
    expect(surface).toContain("min-[900px]:grid-cols-2");
    expect(surface).toContain("min-[1280px]:grid-cols-[1fr_1.2fr_1fr]");
    expect(surface).toContain("PluginAppDetailPanel");
    expect(surface).toContain("PluginsSummaryPanel");
    expect(surface).toContain('role="listbox"');
    expect(surface).toContain('aria-label="Plugin apps"');
    expect(surface).toContain("plugins-state-unavailable");
    expect(surface).toContain("PLUGIN_STATE_COPY.retry");
  });

  it("never mounts BOS, PlasmaGauge, or wearable XML import on /plugins", () => {
    const surface = src("components/plugins/PluginsAppsSurface.tsx");
    const detail = src("components/plugins/PluginAppDetailPanel.tsx");
    const summary = src("components/plugins/PluginsSummaryPanel.tsx");
    const card = src("components/plugins/PluginAppCard.tsx");
    const joined = surface + detail + summary + card;
    expect(joined).not.toContain("ConnectionsBosDial");
    expect(joined).not.toContain("Bio Optimization Score");
    expect(joined).not.toContain("PlasmaGauge");
    expect(joined).not.toContain("data-bos-card");
    expect(joined).not.toContain("useHealthXmlImport");
    expect(joined).not.toContain("Upload XML");
    expect(surface).not.toContain("WearableTileCard");
    expect(detail).not.toContain("WearableTileCard");
    expect(summary).not.toContain("WearableTileCard");
    expect(detail).toContain("bg-[rgba(255,255,255,0.03)]");
    expect(detail).not.toContain("bg-[rgba(255,255,255,0.06)]");
    expect(summary).toContain("bg-[rgba(255,255,255,0.03)]");
    expect(summary).not.toContain("bg-[rgba(255,255,255,0.06)]");
    expect(joined).not.toContain("ConnectionsSurface");
    expect(joined).not.toMatch(/\bas any\b/);
  });

  it("uses Athlete 29 as a fixed cover hero behind the glass IA", () => {
    const page = src("app/(app)/(consumer)/plugins/page.tsx");
    const apps = src("app/(app)/(consumer)/plugins/apps/page.tsx");
    const shell = src("components/plugins/PluginsHeroShell.tsx");
    const layout = src("app/(app)/(consumer)/plugins/layout.tsx");
    const surface = src("components/plugins/PluginsAppsSurface.tsx");
    expect(page).toContain("PluginsHeroShell");
    expect(apps).toContain("PluginsHeroShell");
    expect(page).toContain("PluginsAppsSurface");
    expect(shell).toContain(
      "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%2029.png",
    );
    expect(shell).toContain("fixed");
    expect(shell).toContain("inset-0");
    expect(shell).toContain("objectFit: 'cover'");
    expect(shell).toContain("pointer-events-none");
    expect(shell).toContain("rgba(13, 21, 32, 0.38)");
    expect(shell).toContain("rgba(26, 39, 68, 0.28)");
    expect(shell).toContain("rgba(45, 165, 160, 0.12)");
    expect(shell).not.toContain("0.72");
    expect(shell).not.toContain("0.58");
    expect(shell).not.toContain("backdrop-blur");
    expect(shell).not.toContain("Mobile%20Hero");
    expect(shell).not.toContain("FlaskConical");
    expect(shell).not.toContain("ShareProtocolButton");
    expect(shell).not.toMatch(/\bas any\b/);
    expect(layout).toContain("isHeroRoute");
    expect(layout).toContain("transparent");
    expect(surface).toContain("PLUGIN_PAGE_SUBTITLE");
    expect(surface).toContain("min-[1280px]:grid-cols-[1fr_1.2fr_1fr]");
    expect(surface).not.toContain("WearableTileCard");
  });

  it("keeps Lucide 1.5 and file_import only as that plugin path", () => {
    const surface = src("components/plugins/PluginsAppsSurface.tsx");
    const detail = src("components/plugins/PluginAppDetailPanel.tsx");
    const card = src("components/plugins/PluginAppCard.tsx");
    expect(surface + detail + src("components/plugins/PluginVendorMark.tsx")).toContain(
      "strokeWidth={1.5}",
    );
    expect(detail).toContain("file_import");
    expect(detail).toContain("Open import");
    expect(detail).not.toContain("Export All Health Data");
    expect(card).toContain("isPluginConnectWired");
    expect(surface).toContain("connectionType === 'file_import'");
  });
});
