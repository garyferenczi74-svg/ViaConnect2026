'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Activity, CheckCircle, Clock, AlertTriangle, Zap, RefreshCw } from 'lucide-react';

interface BrandState {
  brand_name: string;
  tier: number;
  enrichment_status: string;
  enriched_product_count: number;
  total_sku_target: number;
  enrichment_score: number;
  last_success_at: string | null;
}

interface StatusSummary { status: string; brand_count: number; pct: number; }

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  enriched:  { color: 'text-teal-600 bg-teal-50 border-teal-200',      icon: CheckCircle,    label: 'Enriched' },
  seeded:    { color: 'text-blue-600 bg-blue-50 border-blue-200',       icon: Zap,            label: 'Seeded' },
  enriching: { color: 'text-orange-600 bg-orange-50 border-orange-200', icon: Activity,       label: 'Enriching' },
  pending:   { color: 'text-gray-600 bg-gray-50 border-gray-200',       icon: Clock,          label: 'Pending' },
  failed:    { color: 'text-red-600 bg-red-50 border-red-200',          icon: AlertTriangle,  label: 'Failed' },
};

export default function BrandAgentDashboard() {
  const [summary, setSummary] = useState<StatusSummary[]>([]);
  const [brands, setBrands] = useState<BrandState[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    const supabase = createClient();
    const [{ data: sum }, { data: br }] = await Promise.all([
      supabase.rpc('get_brand_agent_status'),
      supabase.from('brand_enrichment_state')
        .select('brand_name,tier,enrichment_status,enriched_product_count,total_sku_target,enrichment_score,last_success_at')
        .order('tier').order('enrichment_score', { ascending: true }),
    ]);
    if (sum) setSummary(sum);
    if (br) setBrands(br);
    setIsRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const totalBrands = summary.reduce((a, s) => a + s.brand_count, 0);
  const enrichedCount = summary.find(s => s.status === 'enriched')?.brand_count ?? 0;
  const overallPct = totalBrands > 0 ? Math.round(enrichedCount * 100 / totalBrands) : 0;
  const filteredBrands = filter === 'all' ? brands : brands.filter(b => b.enrichment_status === filter);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1A2744]">Brand Enrichment Agent</h2>
          <p className="text-sm text-gray-500">{totalBrands} brands · {enrichedCount} enriched · {overallPct}% complete</p>
        </div>
        <button onClick={loadData} disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2DA5A0] text-white text-sm hover:bg-[#2DA5A0]/90 transition-colors">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          Refresh
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#2DA5A0] to-[#1A2744] rounded-full transition-all duration-500"
          style={{ width: `${overallPct}%` }} />
      </div>

      {/* Status tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const data = summary.find(s => s.status === status);
          const Icon = cfg.icon;
          return (
            <button key={status} onClick={() => setFilter(filter === status ? 'all' : status)}
              className={`p-3 rounded-xl border text-left transition-all ${cfg.color} ${filter === status ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
              <Icon className="w-4 h-4 mb-1" strokeWidth={1.5} />
              <p className="text-lg font-bold">{data?.brand_count ?? 0}</p>
              <p className="text-xs font-medium">{cfg.label}</p>
              {data && <p className="text-xs opacity-70">{data.pct}%</p>}
            </button>
          );
        })}
      </div>

      {/* Brand list */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
          {filter === 'all' ? 'All Brands' : STATUS_CONFIG[filter]?.label || filter} ({filteredBrands.length})
        </p>
        {filteredBrands.map(brand => {
          const cfg = STATUS_CONFIG[brand.enrichment_status] ?? STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          const score = Math.round((brand.enrichment_score ?? 0) * 100);
          return (
            <div key={brand.brand_name} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{brand.brand_name}</p>
                  <span className="text-xs text-gray-400">T{brand.tier}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500">
                    {brand.enriched_product_count || 0} / {brand.total_sku_target || '?'} SKUs
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-24">
                    <div className="h-full bg-[#2DA5A0] rounded-full" style={{ width: `${score}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">{score}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
