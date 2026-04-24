import Link from 'next/link';
import { ChevronLeft, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface TemplateRow {
  id: string;
  template_code: string;
  mechanism: string;
  version: number;
  jurisdiction: string;
  language: string;
  required_slots: string[];
  active: boolean;
  approved_at: string | null;
  created_at: string;
}

const MECHANISM_ORDER = [
  'amazon_brand_registry',
  'ebay_vero',
  'walmart_seller_protection',
  'etsy_ip_policy',
  'dmca_takedown',
  'platform_trust_safety',
  'manual_legal',
];

const MECHANISM_LABELS: Record<string, string> = {
  amazon_brand_registry: 'Amazon Brand Registry',
  ebay_vero: 'eBay VeRO',
  walmart_seller_protection: 'Walmart Seller Protection',
  etsy_ip_policy: 'Etsy IP Policy',
  dmca_takedown: 'DMCA Takedown',
  platform_trust_safety: 'Platform Trust and Safety',
  manual_legal: 'Manual Legal',
};

export default async function TakedownTemplatesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('takedown_templates')
    .select('id, template_code, mechanism, version, jurisdiction, language, required_slots, active, approved_at, created_at')
    .order('mechanism', { ascending: true })
    .order('version', { ascending: false });
  const rows: TemplateRow[] = (data as TemplateRow[] | null) ?? [];

  const byMechanism = new Map<string, TemplateRow[]>();
  for (const r of rows) {
    if (!byMechanism.has(r.mechanism)) byMechanism.set(r.mechanism, []);
    byMechanism.get(r.mechanism)!.push(r);
  }

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/marshall/vision" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Vision overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Takedown templates</h1>
            <p className="text-xs text-white/40">Per-platform templates used by the takedown drafter. Steve approves before use.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-4">
        {MECHANISM_ORDER.map((m) => {
          const list = byMechanism.get(m) ?? [];
          return (
            <section key={m} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h2 className="text-sm font-semibold text-white">{MECHANISM_LABELS[m] ?? m}</h2>
                <span className="text-[11px] text-white/40">{list.length} template{list.length === 1 ? '' : 's'}</span>
              </div>
              {list.length === 0 ? (
                <p className="text-xs text-white/40 italic">No templates yet. Seed data lands in P6.</p>
              ) : (
                <div className="space-y-1.5">
                  {list.map((t) => (
                    <div key={t.id} className="rounded-md border border-white/[0.08] bg-black/20 p-2 flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-white">{t.template_code}</span>
                      <span className="text-[11px] text-white/50">v{t.version}</span>
                      <span className="text-[11px] text-white/50">{t.jurisdiction}</span>
                      <span className="text-[11px] text-white/50">{t.language}</span>
                      <span className={`text-[11px] rounded-md px-1.5 py-0.5 border ${t.active ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200' : 'bg-white/[0.05] border-white/[0.12] text-white/60'}`}>
                        {t.active ? 'active' : 'inactive'}
                      </span>
                      <span className={`text-[11px] rounded-md px-1.5 py-0.5 border ${t.approved_at ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200' : 'bg-amber-500/15 border-amber-400/30 text-amber-200'}`}>
                        {t.approved_at ? 'approved' : 'pending approval'}
                      </span>
                      <span className="ml-auto text-[10px] text-white/40">
                        {t.required_slots.length} slot{t.required_slots.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
