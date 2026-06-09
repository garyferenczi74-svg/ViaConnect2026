'use client';

// Prompt 182d (2026-06-09): internal gauge gallery.
//
// Mirrors the canonical prototype/app.jsx layout (DesignCanvas,
// DCSection, DCArtboard, GaugeCard) in ViaConnect styling so the
// PlasmaGauge can be compared head to head against the other gauge
// families as they ship.
//
// The route is internal: /admin/gauges. No data access, no auth
// beyond the existing /admin route group gate. Display only.
//
// Each registry entry slots into one of seven families. The Signature
// family is the showpiece Plasma Core in default color mode; the
// "Plasma Core, 12 metallic finishes" family renders the same gauge
// twelve times, once per metal, so the finish palette can be reviewed
// in one place. The other five families ship as placeholder shells
// until their respective component variants land.
//
// House rules: no em or en dashes anywhere (subtitles use commas and
// colons). No emojis. Instrument Sans only.

import { type CSSProperties, type ReactNode } from 'react';
import { PlasmaGauge, MATERIALS, METRIC_FINISH, type GaugeMetric, type MetalFinish } from '@/components/gauges/PlasmaGauge';

// Prompt 182d: metadata cannot ship from a 'use client' page. The
// browser tab title defaults to the parent layout's title; the
// header above the canvas already reads "Gauges Gallery".

// ---------------------------------------------------------------------------
// Canvas primitives. Inline because the gallery is the only consumer; if a
// second design canvas surface ever wants the same shell they will lift.
// ---------------------------------------------------------------------------

function DesignCanvas({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0D1520] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <header className="mb-6 md:mb-8">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2DA5A0]">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#2DA5A0]" />
            Design canvas
          </p>
          <h1 className="mt-1 text-[22px] font-semibold leading-tight text-white md:text-[26px]">Gauges Gallery</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-white/60 md:text-[14px]">
            Every gauge family on one page. Compare composition, depth, finish, and motion side by side. Internal preview, not user facing.
          </p>
        </header>
        <div className="flex flex-col gap-10 md:gap-14">{children}</div>
      </div>
    </div>
  );
}

function DCSection({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-4 md:gap-5">
      <header className="border-b border-white/10 pb-3 md:pb-4">
        <h2 className="text-[16px] font-semibold leading-tight text-white md:text-[18px]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[12px] leading-relaxed text-white/55 md:text-[13px]">{subtitle}</p> : null}
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
    </section>
  );
}

function DCArtboard({
  label,
  width,
  height,
  style,
  children,
}: {
  label: string;
  width: number;
  height: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden border border-white/10"
      style={{ width: '100%', maxWidth: width, minHeight: height, ...style }}
    >
      <div className="flex-1 flex items-center justify-center px-4 py-6">{children}</div>
      <div className="border-t border-white/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.10em] text-white/55">
        {label}
      </div>
    </div>
  );
}

interface GaugeCardProps {
  metric: GaugeMetric;
  finish?: MetalFinish | null;
  value: number;
  heroSize?: number;
  showFinishLabel?: boolean;
}

function GaugeCard({ metric, finish = null, value, heroSize = 196, showFinishLabel = false }: GaugeCardProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <PlasmaGauge metric={metric} finish={finish} value={value} size={heroSize} variant="hero" />
      {showFinishLabel && finish ? (
        <span className="text-[11px] uppercase tracking-[0.12em] text-white/55">{finish.replace('-', ' ')}</span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registry. One entry per artboard.
// ---------------------------------------------------------------------------

interface RegistryEntry {
  id: string;
  group: string;
  label: string;
  metric: GaugeMetric;
  value: number;
  finish?: MetalFinish | null;
  heroSize?: number;
}

const SUBS: Record<string, string> = {
  'Metallic and premium': 'Conic metal bezels, rotating sheen, travelling specular glint',
  'Glassmorphic': 'Frosted refraction, depth layers, light through glass',
  'Neumorphic': 'Soft extruded surfaces, carved channels, tactile',
  'True 3D': 'Real perspective: rings that tilt, spin, and orbit with depth',
  'Liquid fill': 'Animated fluid: waves, bubbles, and meniscus shimmer',
  'Signature': 'Showpiece hybrids, the ones that stop the scroll',
  'Plasma Core, 12 metallic finishes': 'The Plasma Core in twelve premium metals: warm gold to bronze, cool platinum to gunmetal, jewel emerald to ruby',
};

// Signature row: the Plasma Core in default color mode at every metric so the
// per metric palette reads alongside the showpiece composition.
const SIGNATURE_METRICS: Array<{ metric: GaugeMetric; label: string; value: number }> = [
  { metric: 'bioscore',  label: 'Bio Optimization Score',  value: 82 },
  { metric: 'sleep',     label: 'Sleep',                   value: 76 },
  { metric: 'energy',    label: 'Energy',                  value: 64 },
  { metric: 'mood',      label: 'Mood',                    value: 71 },
  { metric: 'nutrition', label: 'Nutrition',               value: 88 },
  { metric: 'activity',  label: 'Activity',                value: 59 },
  { metric: 'wellness',  label: 'Overall Wellness',        value: 73 },
  { metric: 'mealscore', label: 'Meal Quality',            value: 91 },
];

// Plasma Core, 12 metallic finishes: same gauge, twelve metals.
const FINISH_VALUE = 78;
const FINISH_METRIC: GaugeMetric = 'bioscore';

// Placeholder families that have not shipped a variant yet. Render a labelled
// empty card so the gallery composition reads as the full taxonomy.
const PLACEHOLDER_GROUPS: Array<{ group: string; entries: Array<{ id: string; label: string }> }> = [
  {
    group: 'Metallic and premium',
    entries: [
      { id: 'placeholder-metallic-1', label: 'Metallic, gold' },
      { id: 'placeholder-metallic-2', label: 'Metallic, platinum' },
      { id: 'placeholder-metallic-3', label: 'Metallic, gunmetal' },
    ],
  },
  {
    group: 'Glassmorphic',
    entries: [
      { id: 'placeholder-glass-1', label: 'Glass, refraction' },
      { id: 'placeholder-glass-2', label: 'Glass, depth layers' },
    ],
  },
  {
    group: 'Neumorphic',
    entries: [
      { id: 'placeholder-neumorphic-1', label: 'Neumorphic, channel' },
      { id: 'placeholder-neumorphic-2', label: 'Neumorphic, extruded' },
    ],
  },
  {
    group: 'True 3D',
    entries: [
      { id: 'placeholder-3d-1', label: '3D, perspective ring' },
      { id: 'placeholder-3d-2', label: '3D, orbiting body' },
    ],
  },
  {
    group: 'Liquid fill',
    entries: [
      { id: 'placeholder-liquid-1', label: 'Liquid, wave fill' },
      { id: 'placeholder-liquid-2', label: 'Liquid, bubbles' },
    ],
  },
];

function PlaceholderTile({ label }: { label: string }) {
  return (
    <div className="flex h-[196px] w-[196px] flex-col items-center justify-center rounded-full border border-dashed border-white/10 bg-white/[0.02] text-center">
      <span className="text-[11px] uppercase tracking-[0.12em] text-white/45">Coming soon</span>
      <span className="mt-2 max-w-[140px] text-[12px] leading-relaxed text-white/70">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GaugesGalleryPage() {
  // Build the registry from the four source arrays.
  const registry: RegistryEntry[] = [];

  // Signature: the showpiece Plasma Core in color mode at every metric.
  for (const m of SIGNATURE_METRICS) {
    registry.push({
      id: `signature-${m.metric}`,
      group: 'Signature',
      label: m.label,
      metric: m.metric,
      value: m.value,
    });
  }

  // Plasma Core, 12 finishes. One entry per metal in the canonical order.
  for (const mat of MATERIALS) {
    registry.push({
      id: `plasma-finish-${mat.id}`,
      group: 'Plasma Core, 12 metallic finishes',
      label: mat.name,
      metric: FINISH_METRIC,
      value: FINISH_VALUE,
      finish: mat.id,
    });
  }

  // Group registry entries preserving first seen order so Signature surfaces
  // first, then the 12 finishes, then any placeholder groups.
  const groups: string[] = [];
  const byGroup: Record<string, RegistryEntry[]> = {};
  for (const e of registry) {
    if (!byGroup[e.group]) {
      byGroup[e.group] = [];
      groups.push(e.group);
    }
    byGroup[e.group].push(e);
  }

  return (
    <DesignCanvas>
      {groups.map((g) => (
        <DCSection key={g} id={g} title={g} subtitle={SUBS[g]}>
          {byGroup[g].map((e) => (
            <DCArtboard key={e.id} label={e.label} width={340} height={478} style={{ background: '#1A2744', borderRadius: 26 }}>
              <GaugeCard
                metric={e.metric}
                finish={e.finish ?? null}
                value={e.value}
                heroSize={e.heroSize}
                showFinishLabel={!!e.finish}
              />
            </DCArtboard>
          ))}
        </DCSection>
      ))}

      {/* Placeholder families: render shells until each variant ships. */}
      {PLACEHOLDER_GROUPS.map((pg) => (
        <DCSection key={pg.group} id={pg.group} title={pg.group} subtitle={SUBS[pg.group]}>
          {pg.entries.map((e) => (
            <DCArtboard key={e.id} label={e.label} width={340} height={478} style={{ background: '#1A2744', borderRadius: 26 }}>
              <PlaceholderTile label={e.label} />
            </DCArtboard>
          ))}
        </DCSection>
      ))}

      {/* METRIC_FINISH usage note: the map is exported by PlasmaGauge so a
          single theme switch can flip the app to metallic without per call
          site edits. The Signature section above shows color mode; flipping
          ships in a later commit if Gary wants the all metal default. */}
      <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 text-[12px] leading-relaxed text-white/55 md:p-5 md:text-[13px]">
        <strong className="text-white/75">METRIC_FINISH map (reference):</strong>
        <pre className="mt-2 overflow-x-auto whitespace-pre text-[11px] text-white/45">{JSON.stringify(METRIC_FINISH, null, 2)}</pre>
      </section>
    </DesignCanvas>
  );
}
