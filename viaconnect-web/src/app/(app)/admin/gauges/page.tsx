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
import { Gauge3D, type Gauge3DVariant } from '@/components/gauges/Gauge3D';
import { GaugeGlass, type GlassVariant } from '@/components/gauges/GaugeGlass';
import { GaugeLiquid, type LiquidVariant } from '@/components/gauges/GaugeLiquid';
import { GaugeMetal, type MetalVariant } from '@/components/gauges/GaugeMetal';
// Prompt 182f (2026-06-09): structural design tokens (surface, hairline,
// text levels, neumorphic surface, gold / chrome / rose stops). Imported
// here so they flow into the gallery only; the consumer surfaces stay on
// their existing tokens.
import '@/components/gauges/gauges-tokens.css';

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
  // Prompt 182f: canvas background pulls from --surface-1; the artboard
  // bodies pull from --surface-0 so the gallery reads as nested surfaces
  // matching the prototype's depth layering.
  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--surface-1)', color: 'var(--text-hi)' }}>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <header className="mb-6 md:mb-8">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2DA5A0]">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#2DA5A0]" />
            Design canvas
          </p>
          <h1 className="mt-1 text-[22px] font-semibold leading-tight md:text-[26px]" style={{ color: 'var(--text-hi)' }}>
            Gauges Gallery
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed md:text-[14px]" style={{ color: 'var(--text-mid)' }}>
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
      <header className="pb-3 md:pb-4" style={{ borderBottom: '1px solid var(--hairline)' }}>
        <h2 className="text-[16px] font-semibold leading-tight md:text-[18px]" style={{ color: 'var(--text-hi)' }}>
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[12px] leading-relaxed md:text-[13px]" style={{ color: 'var(--text-mid)' }}>
            {subtitle}
          </p>
        ) : null}
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
      className="flex flex-col overflow-hidden rounded-[26px]"
      style={{
        width: '100%',
        maxWidth: width,
        minHeight: height,
        background: 'var(--surface-0)',
        border: '1px solid var(--hairline)',
      }}
    >
      <div className="flex-1">{children}</div>
      <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.10em]" style={{ borderTop: '1px solid var(--hairline)', color: 'var(--text-mid)' }}>
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
  // Prompt 182g (2026-06-09): --c-deep added so the True 3D family
  // gradients resolve correctly.
  const cardVars = {
    ['--c' as string]: palette.c,
    ['--c-bright' as string]: palette.bright,
    ['--c-deep' as string]: palette.deep,
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

      {/* Label row: icon chip + display name. The icon chip reads
          var(--c) / var(--c-bright) from the inline cardVars above. */}
      <div className="relative z-[1] mt-1 flex items-center gap-[9px]">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border"
          style={{
            color: 'var(--c-bright)',
            background: 'color-mix(in srgb, var(--c) 14%, transparent)',
            borderColor: 'color-mix(in srgb, var(--c) 26%, transparent)',
          }}
          aria-hidden="true"
        >
          <IconCmp className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span className="text-[15.5px] font-semibold tracking-[0.2px]" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-hi)' }}>
          {meta.name}
        </span>
      </div>

      {/* STATES strip. */}
      <div className="relative z-[1] mt-auto w-full pt-4">
        <div className="pt-3 text-center" style={{ borderTop: '1px solid var(--hairline)' }}>
          <div className="text-[9.5px] font-semibold uppercase tracking-[2.4px]" style={{ color: 'var(--text-lo)' }}>
            States
          </div>
        </div>
        <div className="mt-2 flex justify-around gap-1.5">
          {states.map((v) => (
            <div key={v} className="flex flex-col items-center gap-1.5">
              <div className="flex h-14 w-14 items-center justify-center">
                {render({ value: v, size: 56, metric, finish, live: false, mini: true })}
              </div>
              <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-mid)' }}>
                {v}
              </span>
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

// Prompt 182g (2026-06-09): True 3D family renderers. Same render prop
// signature as Plasma so the GaugeCard shell is variant agnostic; the
// 3D variants ignore the finish prop because they color code per
// metric only (no metallic finishes for the 3D family today).
const makeRender3D = (variant: Gauge3DVariant): GaugeRenderer => ({ value, size, metric, live, mini }) => (
  <Gauge3D value={value} size={size} metric={metric} live={live} mini={mini} variant={variant} />
);
const renderOrbit = makeRender3D('orbit');
const renderGyro  = makeRender3D('gyro');
const renderCoin  = makeRender3D('coin');
const renderHelix = makeRender3D('helix');

// Prompt 182h (2026-06-09): Glassmorphic family renderers. Same render
// prop signature; the glass variants ignore finish (color coded by
// metric only).
const makeRenderGlass = (variant: GlassVariant): GaugeRenderer => ({ value, size, metric, live, mini }) => (
  <GaugeGlass value={value} size={size} metric={metric} live={live} mini={mini} variant={variant} />
);
const renderFrosted = makeRenderGlass('frosted');
const renderLens    = makeRenderGlass('lens');
const renderStacked = makeRenderGlass('stacked');
const renderAurora  = makeRenderGlass('aurora');

// Prompt 182i (2026-06-09): Liquid fill family renderers. Same render
// prop signature; liquid variants ignore finish (palette comes from
// METRIC_COLORS or, for mercury, a built in silver gradient).
const makeRenderLiquid = (variant: LiquidVariant): GaugeRenderer => ({ value, size, metric, live, mini }) => (
  <GaugeLiquid value={value} size={size} metric={metric} live={live} mini={mini} variant={variant} />
);
const renderSphere  = makeRenderLiquid('sphere');
const renderTube    = makeRenderLiquid('tube');
const renderMercury = makeRenderLiquid('mercury');
const renderCapsule = makeRenderLiquid('capsule');

// Prompt 182j (2026-06-09): Metallic family renderers. Same render
// prop signature. Metal variants embed their own bezel + progress
// palette so they ignore both finish and (for material progMode) the
// metric palette.
const makeRenderMetal = (variant: MetalVariant): GaugeRenderer => ({ value, size, metric, live, mini }) => (
  <GaugeMetal value={value} size={size} metric={metric} live={live} mini={mini} variant={variant} />
);
const renderLiquidGold     = makeRenderMetal('liquid-gold');
const renderBrushedChrome  = makeRenderMetal('brushed-chrome');
const renderRoseGold       = makeRenderMetal('rose-gold');
const renderObsidianGold   = makeRenderMetal('obsidian-gold');
const renderPlatinumDome   = makeRenderMetal('platinum-dome');

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
    group: 'Neumorphic',
    entries: [
      { id: 'placeholder-neumorphic-1', label: 'Neumorphic, channel' },
      { id: 'placeholder-neumorphic-2', label: 'Neumorphic, extruded' },
    ],
  },
];

function PlaceholderTile({ label }: { label: string }) {
  return (
    <div className="flex h-[208px] flex-col items-center justify-center px-[22px] pt-[30px] pb-[22px]">
      <div
        className="flex h-[196px] w-[196px] flex-col items-center justify-center rounded-full border border-dashed text-center"
        style={{ borderColor: 'var(--hairline)', background: 'rgba(255,255,255,0.02)' }}
      >
        <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-lo)' }}>
          Coming soon
        </span>
        <span className="mt-2 max-w-[140px] text-[12px] leading-relaxed" style={{ color: 'var(--text-mid)' }}>
          {label}
        </span>
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

      {/* Prompt 182j (2026-06-09): Metallic and premium family lights
          up. Liquid gold, brushed chrome, rose gold, obsidian and
          gold, platinum dome. */}
      <DCSection id="metallic-premium" title="Metallic and premium" subtitle={SUBS['Metallic and premium']}>
        <DCArtboard label="01, Liquid Gold"      width={340} height={478}>
          <GaugeCard metric="wellness"  render={renderLiquidGold}    value={78} states={[24, 58, 91]} />
        </DCArtboard>
        <DCArtboard label="02, Brushed Chrome"   width={340} height={478}>
          <GaugeCard metric="sleep"     render={renderBrushedChrome} value={75} states={[22, 56, 90]} />
        </DCArtboard>
        <DCArtboard label="03, Rose Gold Bezel"  width={340} height={478}>
          <GaugeCard metric="mood"      render={renderRoseGold}      value={90} states={[20, 55, 88]} />
        </DCArtboard>
        <DCArtboard label="04, Obsidian and Gold" width={340} height={478}>
          <GaugeCard metric="energy"    render={renderObsidianGold}  value={30} states={[14, 47, 82]} />
        </DCArtboard>
        <DCArtboard label="05, Platinum Dome"    width={340} height={478}>
          <GaugeCard metric="nutrition" render={renderPlatinumDome}  value={45} states={[13, 50, 86]} />
        </DCArtboard>
      </DCSection>

      {/* Prompt 182h (2026-06-09): Glassmorphic family lights up.
          Frosted, lens, stacked plates, aurora. */}
      <DCSection id="glassmorphic" title="Glassmorphic" subtitle={SUBS['Glassmorphic']}>
        <DCArtboard label="06, Frosted Disc"  width={340} height={478}>
          <GaugeCard metric="sleep"    render={renderFrosted} value={75} states={[22, 56, 90]} />
        </DCArtboard>
        <DCArtboard label="07, Liquid Lens"   width={340} height={478}>
          <GaugeCard metric="energy"   render={renderLens}    value={30} states={[14, 47, 82]} />
        </DCArtboard>
        <DCArtboard label="08, Stacked Plates" width={340} height={478}>
          <GaugeCard metric="mood"     render={renderStacked} value={90} states={[20, 55, 88]} />
        </DCArtboard>
        <DCArtboard label="09, Aurora Glass"  width={340} height={478}>
          <GaugeCard metric="wellness" render={renderAurora}  value={45} states={[13, 50, 86]} />
        </DCArtboard>
      </DCSection>

      {/* Prompt 182g (2026-06-09): True 3D family lights up. Real
          perspective + preserve 3d. Orbit, gyro, coin, helix. */}
      <DCSection id="true-3d" title="True 3D" subtitle={SUBS['True 3D']}>
        <DCArtboard label="14, Tilted Orbit" width={340} height={478}>
          <GaugeCard metric="mood"     render={renderOrbit} value={90} states={[20, 55, 88]} />
        </DCArtboard>
        <DCArtboard label="15, Gyroscope" width={340} height={478}>
          <GaugeCard metric="wellness" render={renderGyro}  value={45} states={[13, 50, 86]} />
        </DCArtboard>
        <DCArtboard label="16, 3D Coin" width={340} height={478}>
          <GaugeCard metric="activity" render={renderCoin}  value={15} states={[15, 48, 83]} />
        </DCArtboard>
        <DCArtboard label="17, DNA Helix" width={340} height={478}>
          <GaugeCard metric="sleep"    render={renderHelix} value={75} states={[22, 56, 90]} />
        </DCArtboard>
      </DCSection>

      {/* Prompt 182i (2026-06-09): Liquid fill family lights up.
          Sphere, fluid ring tube, mercury drop, wave capsule. */}
      <DCSection id="liquid-fill" title="Liquid fill" subtitle={SUBS['Liquid fill']}>
        <DCArtboard label="18, Liquid Sphere"   width={340} height={478}>
          <GaugeCard metric="energy"    render={renderSphere}  value={30} states={[14, 47, 82]} />
        </DCArtboard>
        <DCArtboard label="19, Fluid Ring Tube" width={340} height={478}>
          <GaugeCard metric="nutrition" render={renderTube}    value={45} states={[13, 50, 86]} />
        </DCArtboard>
        <DCArtboard label="20, Mercury Drop"    width={340} height={478}>
          <GaugeCard metric="activity"  render={renderMercury} value={15} states={[15, 48, 83]} />
        </DCArtboard>
        <DCArtboard label="21, Wave Capsule"    width={340} height={478}>
          <GaugeCard metric="mood"      render={renderCapsule} value={90} states={[20, 55, 88]} />
        </DCArtboard>
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

      <section
        className="mt-4 rounded-2xl p-4 text-[12px] leading-relaxed md:p-5 md:text-[13px]"
        style={{ border: '1px solid var(--hairline)', background: 'rgba(30,48,84,0.35)', color: 'var(--text-mid)' }}
      >
        <strong style={{ color: 'var(--text-hi)' }}>METRIC_FINISH map (reference):</strong>
        <pre className="mt-2 overflow-x-auto whitespace-pre text-[11px]" style={{ color: 'var(--text-lo)' }}>
          {JSON.stringify(METRIC_FINISH, null, 2)}
        </pre>
      </section>
    </DesignCanvas>
  );
}
