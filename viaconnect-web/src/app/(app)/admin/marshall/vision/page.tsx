import Link from 'next/link';
import {
  Eye,
  ShieldCheck,
  ListChecks,
  Library,
  Flame,
  MessageSquareWarning,
  Package,
  FileText,
  Upload,
  Activity,
  Radio,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TILES = [
  { href: '/admin/marshall/vision/review',              label: 'Review queue',        icon: ListChecks },
  { href: '/admin/marshall/vision/corpus',              label: 'Reference corpus',    icon: Library },
  { href: '/admin/marshall/vision/exemplars',           label: 'Counterfeit exemplars', icon: Flame },
  { href: '/admin/marshall/vision/consumer-reports',    label: 'Consumer reports',    icon: MessageSquareWarning },
  { href: '/admin/marshall/vision/test-buys',           label: 'Test buys',           icon: Package },
  { href: '/admin/marshall/vision/takedown-templates',  label: 'Takedown templates',  icon: FileText },
  { href: '/admin/marshall/vision/upload',              label: 'Upload suspect image', icon: Upload },
];

export default async function MarshallVisionOverviewPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [queueRes, counterfeitRes, authenticRes, inconclusiveRes, configRes] = await Promise.all([
    supabase.from('counterfeit_determinations').select('id', { count: 'exact', head: true }).eq('human_review_required', true),
    supabase.from('counterfeit_determinations').select('id', { count: 'exact', head: true }).eq('verdict', 'counterfeit_suspected').gte('created_at', since),
    supabase.from('counterfeit_determinations').select('id', { count: 'exact', head: true }).eq('verdict', 'authentic').gte('created_at', since),
    supabase.from('counterfeit_determinations').select('id', { count: 'exact', head: true }).eq('verdict', 'inconclusive').gte('created_at', since),
    supabase.from('marshall_vision_config').select('key, value'),
  ]);

  const counts = {
    queue: queueRes.count ?? 0,
    counterfeit: counterfeitRes.count ?? 0,
    authentic: authenticRes.count ?? 0,
    inconclusive: inconclusiveRes.count ?? 0,
  };

  type ConfigRow = { key: string; value: unknown };
  const configRows: ConfigRow[] = (configRes.data as ConfigRow[] | null) ?? [];
  const mode = parseMode(configRows);
  const activeSources = configRows
    .filter((r) => r.key.startsWith('source.') && r.value === true)
    .map((r) => r.key.replace('source.', '').replace(/_/g, ' '));

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <Header />

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Pending review" value={counts.queue} tone="amber" icon={ListChecks} />
          <StatCard label="Counterfeit (30d)" value={counts.counterfeit} tone="red" icon={Flame} />
          <StatCard label="Authentic (30d)" value={counts.authentic} tone="emerald" icon={ShieldCheck} />
          <StatCard label="Inconclusive (30d)" value={counts.inconclusive} tone="slate" icon={Activity} />
        </div>

        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
            <h2 className="text-sm font-semibold text-white">Pipeline status</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 border border-white/[0.12] bg-white/[0.04] text-white/80">
              <span className="text-white/60">Mode</span>
              <ModeBadge mode={mode} />
            </span>
            <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 border border-white/[0.12] bg-white/[0.04] text-white/80">
              <span className="text-white/60">Active sources</span>
              <span className="text-white">{activeSources.length > 0 ? activeSources.join(', ') : 'none'}</span>
            </span>
          </div>
        </section>

        <section>
          <div className="text-sm font-semibold text-white mb-3">Quick links</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TILES.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="flex items-center gap-3 rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-3"
              >
                <div className="w-9 h-9 rounded-md bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
                  <t.icon className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
                </div>
                <span className="text-sm text-white">{t.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
          <Eye className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-white">Marshall Vision</h1>
          <p className="text-xs text-white/40">Counterfeit-detection layer. Detection only; humans decide and act.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, icon: Icon }: { label: string; value: number; tone: 'amber' | 'red' | 'emerald' | 'slate'; icon: typeof Flame }) {
  const tones: Record<string, { border: string; bg: string; text: string }> = {
    amber:   { border: 'border-amber-400/30',   bg: 'bg-amber-500/10',   text: 'text-amber-200' },
    red:     { border: 'border-red-400/30',     bg: 'bg-red-500/10',     text: 'text-red-200' },
    emerald: { border: 'border-emerald-400/30', bg: 'bg-emerald-500/10', text: 'text-emerald-200' },
    slate:   { border: 'border-white/[0.12]',   bg: 'bg-white/[0.04]',   text: 'text-white/80' },
  };
  const t = tones[tone];
  return (
    <div className={`rounded-lg border ${t.border} ${t.bg} p-3`}>
      <div className="flex items-center gap-2 text-xs text-white/70">
        <Icon className={`w-4 h-4 ${t.text}`} strokeWidth={1.5} aria-hidden />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function ModeBadge({ mode }: { mode: 'active' | 'shadow' | 'off' }) {
  const classes =
    mode === 'active' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
    : mode === 'shadow' ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
    : 'bg-slate-500/20 text-slate-200 border-slate-400/40';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 border text-[11px] font-medium ${classes}`}>
      {mode}
    </span>
  );
}

function parseMode(rows: Array<{ key: string; value: unknown }>): 'active' | 'shadow' | 'off' {
  const row = rows.find((r) => r.key === 'mode');
  const v = row?.value;
  if (v === 'active' || v === 'shadow' || v === 'off') return v;
  return 'shadow';
}
