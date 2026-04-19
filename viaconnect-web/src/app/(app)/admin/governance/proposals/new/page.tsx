'use client';

// Prompt #95 Phase 3: initial draft creation. Minimal form that POSTs
// a draft, then redirects to the full editor.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, FilePlus } from 'lucide-react';

const supabase = createClient();

interface PricingDomain {
  id: string;
  display_name: string;
  category: string;
  is_active: boolean;
  pending_dependency: string | null;
}

export default function NewProposalPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<PricingDomain[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [domainId, setDomainId] = useState('');
  const [changeType, setChangeType] = useState<'price_amount' | 'discount_percent'>('price_amount');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase
      .from('pricing_domains')
      .select('id, display_name, category, is_active, pending_dependency')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setDomains((data ?? []) as PricingDomain[]);
      });
  }, []);

  const create = async () => {
    setError(null);
    if (title.trim().length < 20 || title.length > 120) {
      setError('Title must be 20 to 120 characters');
      return;
    }
    if (summary.trim().length < 100 || summary.length > 500) {
      setError('Summary must be 100 to 500 characters');
      return;
    }
    if (!domainId) {
      setError('Pick a pricing domain');
      return;
    }
    setCreating(true);
    const response = await fetch('/api/admin/governance/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        summary: summary.trim(),
        pricing_domain_id: domainId,
        change_type: changeType,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setError(err.error ?? `HTTP ${response.status}`);
      setCreating(false);
      return;
    }
    const { id } = await response.json();
    router.push(`/admin/governance/proposals/${id}`);
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/admin/governance/proposals"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Proposals
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <FilePlus className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} /> New pricing proposal
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Fill in the basics, then complete the full form on the next page.
            This creates a draft; nothing is shared until you submit for approval.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
          <label className="block text-xs">
            Title (20 to 120 characters)
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            />
            <span className="text-[10px] text-white/40">{title.length} / 120</span>
          </label>
          <label className="block text-xs">
            Summary (100 to 500 characters, one-paragraph elevator pitch)
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={500}
              rows={4}
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            />
            <span className="text-[10px] text-white/40">{summary.length} / 500</span>
          </label>
          <label className="block text-xs">
            Pricing domain
            <select
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            >
              <option value="">Select a domain</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            Change type
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value as 'price_amount' | 'discount_percent')}
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            >
              <option value="price_amount">price_amount (cents value)</option>
              <option value="discount_percent">discount_percent (percentage value)</option>
            </select>
          </label>
          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2DA5A0] text-[#0B1520] px-4 py-2 text-sm font-semibold hover:bg-[#2DA5A0]/90 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create draft + continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
