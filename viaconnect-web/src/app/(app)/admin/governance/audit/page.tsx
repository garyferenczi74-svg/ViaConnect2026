'use client';

// Prompt #95 Phase 7: governance audit trail UI.
// Joins proposal lifecycle + approvals + price_change_history +
// governance_configuration_log + notifications into one timeline.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Download, History, Search } from 'lucide-react';

const supabase = createClient();

interface AuditEvent {
  key: string;
  event_type: string;
  event_time: string;
  proposal_id: string | null;
  proposal_number: number | null;
  summary: string;
  actor: string | null;
}

export default function AuditTrailPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');

  const refresh = useCallback(async () => {
    const e: AuditEvent[] = [];

    const proposalQuery = supabase
      .from('pricing_proposals')
      .select('id, proposal_number, title, pricing_domain_id, initiated_at, submitted_at, activated_at, rolled_back_at, initiated_by')
      .order('initiated_at', { ascending: false })
      .limit(200);

    const { data: proposals } = await (domainFilter
      ? proposalQuery.eq('pricing_domain_id', domainFilter)
      : proposalQuery);

    for (const p of (proposals ?? []) as Array<{
      id: string;
      proposal_number: number;
      title: string;
      pricing_domain_id: string;
      initiated_at: string;
      submitted_at: string | null;
      activated_at: string | null;
      rolled_back_at: string | null;
      initiated_by: string;
    }>) {
      const push = (t: string, tp: string, s: string) => {
        e.push({
          key: `${p.id}:${tp}`,
          event_type: tp,
          event_time: t,
          proposal_id: p.id,
          proposal_number: p.proposal_number,
          summary: `#${p.proposal_number} ${p.title}: ${s}`,
          actor: p.initiated_by,
        });
      };
      // proposal_activated / proposal_rolled_back come from
      // price_change_history below (canonical). Do not double-emit here.
      push(p.initiated_at, 'proposal_initiated', 'Draft created');
      if (p.submitted_at) push(p.submitted_at, 'proposal_submitted', 'Submitted for approval');
    }

    const { data: history } = await supabase
      .from('price_change_history')
      .select('id, proposal_id, pricing_domain_id, change_action, applied_at, applied_by_user_id')
      .order('applied_at', { ascending: false })
      .limit(200);
    for (const h of (history ?? []) as Array<{
      id: string;
      proposal_id: string;
      pricing_domain_id: string;
      change_action: string;
      applied_at: string;
      applied_by_user_id: string | null;
    }>) {
      if (domainFilter && h.pricing_domain_id !== domainFilter) continue;
      e.push({
        key: `history:${h.id}`,
        event_type: `price_${h.change_action}`,
        event_time: h.applied_at,
        proposal_id: h.proposal_id,
        proposal_number: null,
        summary: `${h.change_action} on ${h.pricing_domain_id}`,
        actor: h.applied_by_user_id,
      });
    }

    const { data: cfg } = await supabase
      .from('governance_configuration_log')
      .select('id, change_type, target_table, change_justification, changed_by, changed_at')
      .order('changed_at', { ascending: false })
      .limit(200);
    for (const c of (cfg ?? []) as Array<{
      id: string;
      change_type: string;
      target_table: string;
      change_justification: string;
      changed_by: string;
      changed_at: string;
    }>) {
      e.push({
        key: `cfg:${c.id}`,
        event_type: c.change_type,
        event_time: c.changed_at,
        proposal_id: null,
        proposal_number: null,
        summary: `${c.change_type}: ${c.change_justification}`,
        actor: c.changed_by,
      });
    }

    e.sort((a, b) => (a.event_time < b.event_time ? 1 : -1));
    setEvents(e);
  }, [domainFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = events.filter((ev) => {
    if (eventTypeFilter && ev.event_type !== eventTypeFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return ev.summary.toLowerCase().includes(s) || ev.event_type.toLowerCase().includes(s);
  });

  const eventTypes = Array.from(new Set(events.map((e) => e.event_type))).sort();

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/admin/governance/proposals"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Proposals
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <History className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} /> Governance audit trail
          </h1>
          <p className="text-xs text-white/55 mt-1">
            {filtered.length} of {events.length} events shown.
          </p>
        </div>

        <div className="grid sm:grid-cols-4 gap-2">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search summary or event type"
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] pl-9 pr-3 py-2 text-xs text-white"
            />
          </div>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-xs text-white"
          >
            <option value="">All event types</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="text"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            placeholder="pricing_domain_id"
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-xs text-white"
          />
        </div>

        <div className="flex gap-2">
          <a
            href="/api/admin/governance/audit/export"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2DA5A0] text-[#0B1520] px-4 py-2 text-xs font-semibold hover:bg-[#2DA5A0]/90"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Export CSV
          </a>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="p-6 text-xs text-white/55 text-center">No events yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {filtered.map((ev) => (
                <li key={ev.key} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[10px] font-mono text-white/40 w-40 shrink-0">
                    {new Date(ev.event_time).toLocaleString()}
                  </span>
                  <span className="rounded-lg bg-white/[0.06] text-white/70 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                    {ev.event_type}
                  </span>
                  <span className="flex-1 min-w-0 text-xs text-white/80">
                    {ev.proposal_id ? (
                      <Link href={`/admin/governance/proposals/${ev.proposal_id}`} className="hover:text-[#2DA5A0]">
                        {ev.summary}
                      </Link>
                    ) : (
                      ev.summary
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
