'use client';

// Prompt 182d / 182e (2026-06-09): internal gauge gallery at
// /admin/gauges.
//
// Mirrors the canonical prototype shell (app.jsx + gauge-core.jsx) in
// ViaConnect styling so every gauge family can be compared side by
// side as variants ship. Display only. No data access, no schema
// changes, no route table edit beyond the new page.
//
// 182e (this commit) adopts the prototype's richer GaugeCard
// scaffolding: glow halo behind the hero, hero gauge in the middle,
// label row with the metric icon chip + display name, and a STATES
// strip showing the same gauge at three preset values (22 / 58 / 91)
// as miniature compact tiles. The render prop signature is
// (props) => ReactNode where the variant renderer receives
// { value, size, metric, live, mini? }, so future families (Liquid,
// Helix, Coin etc) plug in without touching the card shell.
//
// House rules: no em or en dashes anywhere (subtitles use commas and
// colons). No emojis. Instrument Sans only. Lucide icons at
// strokeWidth 1.5.

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  Activity,
  Apple,
  Beef,
  Brain,
  Droplets,
  Heart,
  Moon,
  Sparkles,
  Utensils,
  Wheat,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  PlasmaGauge,
  MATERIALS,
  METRIC_COLORS,
  METRIC_FINISH,
  type GaugeMetric,
  type MetalFinish,
} from '@/components/gauges/PlasmaGauge';

// ---------------------------------------------------------------------------
// Metric metadata (display name + icon). Extended from the prototype's six
// core metrics to cover every PlasmaGauge token so the gallery surfaces the
// full taxonomy.
// ---------------------------------------------------------------------------

interface MetricMeta {
  name: string;
  icon: LucideIcon;
}

const METRIC_META: Record<GaugeMetric, MetricMeta> = {
  bioscore:  { name: 'Bio Optimization Score', icon: Sparkles },
  sleep:     { name: 'Sleep Quality',          icon: Moon },
  energy:    { name: 'Energy Level',           icon: Zap },
  mood:      { name: 'Mood and Stress',        icon: Brain },
  nutrition: { name: 'Nutrition',              icon: Apple },
  activity:  { name: 'Physical Activity',      icon: Activity },
  wellness:  { name: 'Overall Wellness',       icon: Heart },
  protein:   { name: 'Protein',                icon: Beef },
  carbs:     { name: 'Carbohydrates',          icon: Wheat },
  fat:       { name: 'Dietary Fat',            icon: Droplets },
  fiber:     { name: 'Fiber',                  icon: Wheat },
  mealscore: { name: 'Meal Quality',           icon: Utensils },
};

// ---------------------------------------------------------------------------
// Hooks (porting useInView + useCountUp from the prototype's gauge-core).
// useCountUp is unused inside this gallery because the PlasmaGauge renderer
// owns its own count up; useInView is exported so future renderers that
// want their own gating can grab it. Both stay co located with the card
// so a renderer that does not use PlasmaGauge can still wire correctly.
// ---------------------------------------------------------------------------

function useInView(margin = '120px'): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => setSeen(e.isIntersecting)),
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, seen];
}

// ---------------------------------------------------------------------------
// Canvas primitives.
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
  children,
}: {
  label: string;
  width: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#1A2744]"
      style={{ width: '100%', maxWidth: width, minHeight: height }}
    >
      <div className="flex-1">{children}</div>
      <div className="border-t border-white/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.10em] text-white/55">
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GaugeCard. The prototype's shared card shell.
//
// render(props) is the variant renderer. Today only PlasmaGauge ships; the
// signature is stable so a Liquid Fill or Helix renderer can slot in
// without changing this card.
// ---------------------------------------------------------------------------

export interface GaugeRendererProps {
  value: number;
  size: number;
  metric: GaugeMetric;
  finish: MetalFinish | null;
  live: boolean;
  mini?: boolean;
}

type GaugeRenderer = (props: GaugeRendererProps) => ReactNode;

function GaugeCard({
  metric,
  finish = null,
  render,
  value = 72,
  states = [22, 58, 91],
  heroSize = 196,
}: {
  metric: GaugeMetric;
  finish?: MetalFinish | null;
  render: GaugeRenderer;
  value?: number;
  states?: number[];
  heroSize?: number;
}) {
  const meta = METRIC_META[metric];
  const IconCmp = meta.icon;
  const palette = METRIC_COLORS[metric];
  const [ref, inView] = useInView();
  const live = inView;

  // CSS custom properties scoped to the card. The prototype exposes
  // these via the surrounding theme; here we set them inline per card
  // so the icon chip, glow halo, and label use the correct accent.
  const cardVars = {
    ['--c' as string]: palette.c,
    ['--c-bright' as string]: palette.bright,
    ['--glow' as string]: palette.glow,
  } as CSSProperties;

  return (
    <div ref={ref} data-metric={metric} className="relative flex h-full w-full flex-col items-center overflow-hidden px-[22px] pt-[30px] pb-[22px]" style={cardVars}>
      {/* Glow halo behind the hero gauge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-18%] left-1/2 h-[52%] w-[78%] -translate-x-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${palette.glow} 0%, transparent 70%)`,
          opacity: 0.5,
          filter: 'blur(26px)',
        }}
      />

      {/* Hero gauge. */}
      <div className="relative z-[1] flex h-[208px] items-center justify-center">
        {render({ value, size: heroSize, metric, finish, live })}
      </div>

      {/* Label row: icon chip + display name. */}
      <div className="relative z-[1] mt-1 flex items-center gap-[9px]">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border"
          style={{
            color: palette.bright,
            background: `color-mix(in srgb, ${palette.c} 14%, transparent)`,
            borderColor: `color-mix(in srgb, ${palette.c} 26%, transparent)`,
          }}
          aria-hidden="true"
        >
          <IconCmp className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span className="font-[Instrument_Sans] text-[15.5px] font-semibold tracking-[0.2px] text-white">
          {meta.name}
        </span>
      </div>

      {/* STATES strip. */}
      <div className="relative z-[1] mt-auto w-full pt-4">
        <div className="border-t border-white/10 pt-3 text-center">
          <div className="text-[9.5px] font-semibold uppercase tracking-[2.4px] text-white/45">States</div>
        </div>
        <div className="mt-2 flex justify-around gap-1.5">
          {states.map((v) => (
            <div key={v} className="flex flex-col items-center gap-1.5">
              <div className="flex h-14 w-14 items-center justify-center">
                {render({ value: v, size: 56, metric, finish, live: false, mini: true })}
              </div>
              <span className="font-[Instrument_Sans] text-[13px] font-bold tabular-nums text-white/65">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plasma renderer: the (only) gauge variant shipping today. Plugged into
// GaugeCard via the render prop so the card shell stays variant agnostic.
// ---------------------------------------------------------------------------

const renderPlasma: GaugeRenderer = ({ value, size, metric, finish, live, mini }) => (
  <PlasmaGauge
    value={value}
    metric={metric}
    finish={finish}
    size={size}
    variant={mini ? 'compact' : 'hero'}
    animated={live}
    showUnit={!mini}
  />
);

// ---------------------------------------------------------------------------
// Registry. One entry per artboard.
// ---------------------------------------------------------------------------

const SUBS: Record<string, string> = {
  'Metallic and premium': 'Conic metal bezels, rotating sheen, travelling specular glint',
  'Glassmorphic': 'Frosted refraction, depth layers, light through glass',
  'Neumorphic': 'Soft extruded surfaces, carved channels, tactile',
  'True 3D': 'Real perspective: rings that tilt, spin, and orbit with depth',
  'Liquid fill': 'Animated fluid: waves, bubbles, and meniscus shimmer',
  'Signature': 'Showpiece hybrids, the ones that stop the scroll',
  'Plasma Core, 12 metallic finishes': 'The Plasma Core in twelve premium metals: warm gold to bronze, cool platinum to gunmetal, jewel emerald to ruby',
};

const SIGNATURE_METRICS: Array<{ metric: GaugeMetric; value: number }> = [
  { metric: 'bioscore',  value: 82 },
  { metric: 'sleep',     value: 76 },
  { metric: 'energy',    value: 64 },
  { metric: 'mood',      value: 71 },
  { metric: 'nutrition', value: 88 },
  { metric: 'activity',  value: 59 },
  { metric: 'wellness',  value: 73 },
  { metric: 'mealscore', value: 91 },
];

const FINISH_VALUE = 78;
const FINISH_METRIC: GaugeMetric = 'bioscore';

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
    <div className="flex h-[208px] flex-col items-center justify-center px-[22px] pt-[30px] pb-[22px]">
      <div className="flex h-[196px] w-[196px] flex-col items-center justify-center rounded-full border border-dashed border-white/10 bg-white/[0.02] text-center">
        <span className="text-[11px] uppercase tracking-[0.12em] text-white/45">Coming soon</span>
        <span className="mt-2 max-w-[140px] text-[12px] leading-relaxed text-white/70">{label}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GaugesGalleryPage() {
  return (
    <DesignCanvas>
      <DCSection id="signature" title="Signature" subtitle={SUBS['Signature']}>
        {SIGNATURE_METRICS.map(({ metric, value }) => (
          <DCArtboard key={`signature-${metric}`} label={METRIC_META[metric].name} width={340} height={478}>
            <GaugeCard metric={metric} render={renderPlasma} value={value} />
          </DCArtboard>
        ))}
      </DCSection>

      <DCSection
        id="plasma-finishes"
        title="Plasma Core, 12 metallic finishes"
        subtitle={SUBS['Plasma Core, 12 metallic finishes']}
      >
        {MATERIALS.map((mat) => (
          <DCArtboard key={`finish-${mat.id}`} label={mat.name} width={340} height={478}>
            <GaugeCard metric={FINISH_METRIC} finish={mat.id} render={renderPlasma} value={FINISH_VALUE} />
          </DCArtboard>
        ))}
      </DCSection>

      {PLACEHOLDER_GROUPS.map((pg) => (
        <DCSection key={pg.group} id={pg.group} title={pg.group} subtitle={SUBS[pg.group]}>
          {pg.entries.map((e) => (
            <DCArtboard key={e.id} label={e.label} width={340} height={478}>
              <PlaceholderTile label={e.label} />
            </DCArtboard>
          ))}
        </DCSection>
      ))}

      <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 text-[12px] leading-relaxed text-white/55 md:p-5 md:text-[13px]">
        <strong className="text-white/75">METRIC_FINISH map (reference):</strong>
        <pre className="mt-2 overflow-x-auto whitespace-pre text-[11px] text-white/45">{JSON.stringify(METRIC_FINISH, null, 2)}</pre>
      </section>
    </DesignCanvas>
  );
}
