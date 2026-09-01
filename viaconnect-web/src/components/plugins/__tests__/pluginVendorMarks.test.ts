import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PLUGIN_VENDOR_MARK_SLUGS } from '../PluginVendorMark';
import {
  PLUGIN_APP_REGISTRY_FALLBACK,
  PLUGIN_STATE_COPY,
  isPluginPageApp,
} from '@/lib/integrations/pluginAppRegistry';

const root = resolve(__dirname, '../../../');

function src(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('Picasso 21b vendor marks', () => {
  it('covers honesty registry app rows only', () => {
    const pageSlugs = PLUGIN_APP_REGISTRY_FALLBACK.filter(isPluginPageApp).map((r) => r.slug);
    expect(pageSlugs).toEqual(expect.arrayContaining([...PLUGIN_VENDOR_MARK_SLUGS]));
    expect(PLUGIN_VENDOR_MARK_SLUGS).not.toContain('whoop');
    expect(PLUGIN_VENDOR_MARK_SLUGS).not.toContain('oura');
    expect(PLUGIN_VENDOR_MARK_SLUGS).not.toContain('hume');
    expect(PLUGIN_VENDOR_MARK_SLUGS).not.toContain('apple_health');
    expect(PLUGIN_VENDOR_MARK_SLUGS).not.toContain('drinklinc');
    expect(pageSlugs).toContain('drinklinc');
  });

  it('keeps last-sync-state on main only with no second state machine', () => {
    expect(existsSync(resolve(root, 'lib/plugins/last-sync-state.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'lib/integrations/last-sync-state.ts'))).toBe(false);
    const join = src('lib/integrations/connectionState.ts');
    const card = src('components/plugins/PluginAppCard.tsx');
    expect(join).toContain("@/lib/body-tracker/last-sync-state");
    expect(card).toContain("@/lib/body-tracker/last-sync-state");
    expect(join + card).toContain('resolveLastSyncState');
    expect(card).toContain('formatSyncedRelative');
    expect(join + card).not.toContain('Not synced yet');
    expect(join + card).not.toContain('Last sync unknown');
    expect(join + card).not.toMatch(/\bas any\b/);
  });

  it('does not render a Coming soon button and uses locked manage copy', () => {
    expect(PLUGIN_STATE_COPY.manage).toBe('Manage in Wearables Data');
    expect(PLUGIN_STATE_COPY.noActionYet).toBe('No action yet.');
    const card = src('components/plugins/PluginAppCard.tsx');
    expect(card).not.toContain('PLUGIN_STATE_COPY.noActionYet');
    expect(card).toContain('PLUGIN_STATE_COPY.comingSoon');
    expect(card).not.toMatch(/type="button"[^>]*>\s*\{PLUGIN_STATE_COPY.comingSoon\}/);
    expect(card).not.toContain('data-testid={`plugin-coming-soon-');
  });
});
