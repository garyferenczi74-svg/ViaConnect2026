'use client';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Rec { id:string; sku:string; product_name:string; category:string; reason:string; confidence_score:number; confidence_level:string; priority_rank:number; dosage:string; frequency:string; time_of_day:string; monthly_price:number; status:string; }

export default function SupplementProtocol() {
  const supabase = createClientComponentClient();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchRecs(); }, []);

  async function fetchRecs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('recommendations').select('*')
      .eq('user_id', user.id).in('status', ['recommended','accepted']).order('priority_rank', { ascending: true });
    setRecs(data || []); setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/recommendations/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (res.ok) await fetchRecs();
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  }

  const grouped = recs.reduce<Record<string, Rec[]>>((acc, r) => { const t = r.time_of_day || 'morning'; if (!acc[t]) acc[t] = []; acc[t].push(r); return acc; }, {});
  const total = recs.reduce((s, r) => s + (r.monthly_price || 0), 0);
  const cfg: Record<string, {label:string;icon:string;color:string}> = {
    morning:{label:'Morning',icon:'\u2600\uFE0F',color:'#FBBF24'},
    afternoon:{label:'Afternoon',icon:'\uD83C\uDF24\uFE0F',color:'#22D3EE'},
    evening:{label:'Evening',icon:'\uD83C\uDF19',color:'#A78BFA'},
  };

  if (loading) return (<div className="rounded-xl bg-white/5 border border-white/10 p-5">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-lg mb-2 animate-pulse" />)}</div>);

  if (recs.length === 0) return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4"><span className="text-2xl">{'\uD83E\uDDEA'}</span></div>
      <p className="text-white/50 text-sm mb-4">No supplements in your protocol yet.</p>
      <button onClick={handleGenerate} disabled={generating}
        className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
        {generating ? '\u23F3 Analyzing Your Profile...' : '\u26A1 Generate My Protocol'}
      </button>
      <a href="/supplements" className="block mt-2 text-white/40 text-xs hover:text-white/60">Browse Supplements</a>
    </div>
  );

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">Your Personalized Protocol</h3>
        <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">{recs.length} products</span>
      </div>
      <div className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 w-fit">
        <div className="w-2 h-2 rounded-full bg-cyan-400" />
        <span className="text-cyan-300 text-xs font-medium">
          {recs[0]?.confidence_score || 68}% Confidence ({recs[0]?.confidence_level === 'combined' ? 'Genetic + Assessment' : 'Assessment-Based'})
        </span>
      </div>
      {(['morning','afternoon','evening'] as const).map(time => {
        const items = grouped[time] || []; if (!items.length) return null;
        const c = cfg[time];
        return (
          <div key={time} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span>{c.icon}</span><span className="text-sm font-medium" style={{ color: c.color }}>{c.label}</span>
            </div>
            {items.map(rec => (
              <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors mb-1.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: `${c.color}15`, color: c.color }}>{rec.product_name.charAt(0)}</div>
                  <div><p className="text-white text-sm font-medium">{rec.product_name}</p>
                    <p className="text-white/40 text-xs">{rec.dosage} &middot; {rec.frequency}</p></div>
                </div>
                <span className="text-white/30 text-xs">${rec.monthly_price?.toFixed(2)}/mo</span>
              </div>
            ))}
          </div>
        );
      })}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
        <div><span className="text-white/50 text-sm">Monthly: </span><span className="text-white font-semibold">${total.toFixed(2)}</span>
          <span className="text-emerald-400 text-xs ml-2">Save 20%: ${(total * 0.8).toFixed(2)}</span></div>
        <a href="/supplements/checkout" className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold">Build My Protocol</a>
      </div>
      {recs[0]?.confidence_level === 'questionnaire' && (
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
          <p className="text-white text-sm font-medium mb-1">{'\uD83E\uDDEC'} Unlock 94%+ confidence with genetic testing</p>
          <p className="text-white/50 text-xs mb-2">GENEX360 adds 80+ genetic markers for precision targeting.</p>
          <a href="/genex360" className="text-purple-300 text-xs font-medium hover:text-purple-200">Upgrade to GENEX360 &rarr;</a>
        </div>
      )}
    </div>
  );
}
