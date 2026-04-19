'use client';

// Prompt #94 Phase 6.0: Unit economics analytics index page.
// Hub linking to the 6 sub-pages + 2 admin tools introduced in this phase.

import Link from 'next/link';
import {
  LayoutDashboard,
  CircleDollarSign,
  TrendingUp,
  Users,
  PieChart,
  History,
  Wand2,
  ShieldCheck,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface Tile {
  href: string;
  title: string;
  blurb: string;
  Icon: typeof LayoutDashboard;
  group: 'reports' | 'tools';
}

const TILES: Tile[] = [
  { href: '/admin/analytics/overview',     title: 'Overview',          blurb: 'CAC, LTV, payback, NRR/GRR snapshot.',     Icon: LayoutDashboard, group: 'reports' },
  { href: '/admin/analytics/cac',          title: 'CAC',               blurb: 'Blended + per-channel CAC, monthly view.', Icon: CircleDollarSign, group: 'reports' },
  { href: '/admin/analytics/ltv',          title: 'LTV',               blurb: '12/24/36-mo cohort LTV with projections.', Icon: TrendingUp,      group: 'reports' },
  { href: '/admin/analytics/cohorts',      title: 'Cohorts',           blurb: 'Retention + revenue + cohort compare.',    Icon: Users,           group: 'reports' },
  { href: '/admin/analytics/archetypes',   title: 'Archetypes',        blurb: 'Distribution + per-archetype LTV/CAC.',    Icon: PieChart,        group: 'reports' },
  { href: '/admin/analytics/snapshots',    title: 'Snapshots',         blurb: 'Historical monthly snapshot trends.',      Icon: History,         group: 'reports' },
  { href: '/admin/analytics/board-pack',   title: 'Board pack',        blurb: 'Print-ready monthly investor packet.',     Icon: FileText,        group: 'reports' },
  { href: '/admin/analytics/alerts',       title: 'Alerts',            blurb: 'Threshold breaches; acknowledge each.',    Icon: AlertTriangle,   group: 'reports' },
  { href: '/admin/analytics/marketing-spend', title: 'Marketing spend', blurb: 'CFO entry of monthly channel spend.',     Icon: CircleDollarSign, group: 'tools' },
  { href: '/admin/analytics/tools/classify-user',     title: 'Classify user',     blurb: 'Re-run archetype classification.', Icon: Wand2,        group: 'tools' },
  { href: '/admin/analytics/tools/archetype-override', title: 'Override archetype', blurb: 'Manual primary archetype set.',   Icon: ShieldCheck,  group: 'tools' },
];

export default function AnalyticsIndexPage() {
  const reports = TILES.filter((t) => t.group === 'reports');
  const tools = TILES.filter((t) => t.group === 'tools');

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Unit Economics</h1>
        <p className="text-sm text-gray-400 mt-1">
          CAC, LTV, retention, archetypes; the financial truth of the business.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((t) => <Tile key={t.href} {...t} />)}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">Admin tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((t) => <Tile key={t.href} {...t} />)}
        </div>
      </section>
    </div>
  );
}

function Tile({ href, title, blurb, Icon }: Tile) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-copper/40 transition p-4"
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-copper shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{blurb}</p>
        </div>
      </div>
    </Link>
  );
}
