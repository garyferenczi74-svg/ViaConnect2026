'use client';

/**
 * Right column for /plugins: honest connection-state summary.
 * Never a Bio Optimization Score, BOS dial, or PlasmaGauge.
 * Empty buckets are omitted, not counted as zero.
 */

import type { PluginAppCardModel } from '@/lib/integrations/connectionState';
import { summarizePluginConnectionState } from '@/lib/integrations/connectionState';
import { PLUGIN_PANEL_GLASS } from '@/components/plugins/pluginTileChrome';

export interface PluginsSummaryPanelProps {
  cards: PluginAppCardModel[];
}

export function PluginsSummaryPanel({ cards }: PluginsSummaryPanelProps) {
  const buckets = summarizePluginConnectionState(cards);

  return (
    <section
      data-testid="plugins-summary"
      aria-labelledby="plugins-summary-title"
      className={PLUGIN_PANEL_GLASS}
    >
      <h2 id="plugins-summary-title" className="text-lg font-bold text-white">
        Plugins summary
      </h2>
      <p className="mt-1 text-sm text-white/50">
        Connection state for apps on this page. Missing apps are left out.
      </p>

      {buckets.length === 0 ? (
        <p data-testid="plugins-summary-empty" className="mt-4 text-sm text-white/50">
          No apps to summarize yet.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {buckets.map((bucket) => (
            <div
              key={bucket.state}
              data-testid={`plugins-summary-${bucket.state}`}
              data-summary-state={bucket.state}
              className="rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.06)] p-3"
            >
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-white/45">
                {bucket.label}
              </h3>
              <ul className="mt-2 space-y-1">
                {bucket.names.map((name, index) => (
                  <li
                    key={bucket.slugs[index] ?? name}
                    className="text-sm text-white/80"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default PluginsSummaryPanel;
