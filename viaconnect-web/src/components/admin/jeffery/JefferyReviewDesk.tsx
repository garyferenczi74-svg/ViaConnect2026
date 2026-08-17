"use client";

/**
 * Prompt 221A: Jeffery Review Desk (desktop + mobile).
 * Queue by class, SLA clocks, Gary needs_human inbox, scorecards, corpus tiles.
 */

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardCheck,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface QueueRow {
  id: string;
  artifactType: string;
  artifactRef: string;
  verdict: string;
  reviewerMode: string;
  rationale: string | null;
  producedByAgent: string | null;
  reviewedAt: string;
  ageMinutes: number;
  slaMinutes: number;
  slaBreached: boolean;
}

interface Payload {
  ok: boolean;
  stats: {
    totalCurrent: number;
    approved: number;
    rejected: number;
    needsHuman: number;
    slaBreached: number;
    byType: Record<string, number>;
  };
  needsHuman: QueueRow[];
  queue: QueueRow[];
  pendingKb: Array<{
    id: string;
    title: string;
    gate_status: string;
    jeffery_verdict: string | null;
    payload_type: string;
    created_at: string;
  }>;
  scorecards: Record<
    string,
    { approved: number; rejected: number; needsHuman: number }
  >;
  collections: Array<{
    slug: string;
    display_name: string;
    status: string;
    seeding_phase: number;
    gate_profile: string;
  }>;
  corpus: { items: number; liveRetrievable: number };
  backlogAlert: boolean;
}

function VerdictChip({ v }: { v: string }) {
  const cls =
    v === "approved"
      ? "bg-emerald-500/20 text-emerald-300"
      : v === "rejected"
        ? "bg-red-500/20 text-red-300"
        : "bg-amber-500/20 text-amber-200";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cls}`}>
      {v}
    </span>
  );
}

export default function JefferyReviewDesk() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyRef, setBusyRef] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/jeffery/reviews", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) {
        setError(res.status === 401 || res.status === 403 ? "Admin only" : "Load failed");
        setData(null);
        return;
      }
      const body = (await res.json()) as Payload;
      setData(body);
    } catch {
      setError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(
    row: QueueRow,
    decision: "approved" | "rejected"
  ): Promise<void> {
    setBusyRef(row.artifactRef);
    try {
      const res = await fetch("/api/admin/jeffery/reviews", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactType: row.artifactType,
          artifactRef: row.artifactRef,
          decision,
          notes: `Review Desk one-tap ${decision}`,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!body.ok) {
        setError(body.error ?? "Decision failed");
      }
      await load();
    } catch {
      setError("Decision network error");
    } finally {
      setBusyRef(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-white/50 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading Review Desk...
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 md:px-0 pb-8">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-white">
            Jeffery Review Desk
          </h2>
          <span className="text-[10px] text-white/40">221A managerial layer</span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white px-2 py-1 rounded-lg bg-white/5 border border-white/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {data?.backlogAlert && (
        <div className="flex items-start gap-2 text-sm text-red-200 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Backlog alert: needs_human volume or SLA breach. No silent auto-approve.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          ["Current", data?.stats.totalCurrent ?? 0],
          ["Approved", data?.stats.approved ?? 0],
          ["Rejected", data?.stats.rejected ?? 0],
          ["Needs human", data?.stats.needsHuman ?? 0],
          ["SLA breach", data?.stats.slaBreached ?? 0],
        ].map(([label, n]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
          >
            <p className="text-[10px] text-white/40 uppercase tracking-wide">
              {label}
            </p>
            <p className="text-lg font-semibold text-white">{n}</p>
          </div>
        ))}
      </div>

      {/* Corpus tiles */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <p className="text-xs font-semibold text-white mb-2">KB corpus</p>
        <div className="flex flex-wrap gap-3 text-xs text-white/70">
          <span>Items: {data?.corpus.items ?? 0}</span>
          <span>Live retrievable: {data?.corpus.liveRetrievable ?? 0}</span>
          <span>
            Collections: {data?.collections.length ?? 0} (all planned until phase
            gates)
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(data?.collections ?? []).map((c) => (
            <span
              key={c.slug}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/60 border border-white/10"
              title={c.gate_profile}
            >
              P{c.seeding_phase} {c.slug}
            </span>
          ))}
        </div>
      </div>

      {/* Gary escalation inbox */}
      <section className="rounded-xl border border-[#B75E18]/30 bg-[#B75E18]/5 p-3 md:p-4">
        <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#B75E18]" />
          Gary escalation inbox (needs_human)
        </h3>
        {(data?.needsHuman ?? []).length === 0 ? (
          <p className="text-xs text-white/40 py-4 text-center">
            No needs_human items. Jeffery is clearing programmatic checks.
          </p>
        ) : (
          <ul className="space-y-2">
            {data!.needsHuman.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-white/10 bg-[#1A2744]/80 p-3"
              >
                <div className="flex flex-wrap items-start gap-2 justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <VerdictChip v={row.verdict} />
                      <span className="text-[10px] text-white/50">
                        {row.artifactType}
                      </span>
                      {row.slaBreached && (
                        <span className="text-[10px] text-red-300 font-semibold">
                          SLA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/80 break-all">
                      {row.artifactRef}
                    </p>
                    <p className="text-[10px] text-white/40 mt-1">
                      age {row.ageMinutes}m / SLA {row.slaMinutes}m · agent{" "}
                      {row.producedByAgent ?? "?"} · {row.rationale ?? ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      disabled={busyRef === row.artifactRef}
                      onClick={() => void decide(row, "approved")}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyRef === row.artifactRef}
                      onClick={() => void decide(row, "rejected")}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-red-500/20 text-red-200 border border-red-500/30 disabled:opacity-40"
                    >
                      <XCircle className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending KB (Marshall done, Jeffery pending) */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3 md:p-4">
        <h3 className="text-xs font-semibold text-white mb-2">
          KB waiting on Jeffery (gate live, not retrievable yet)
        </h3>
        {(data?.pendingKb ?? []).length === 0 ? (
          <p className="text-xs text-white/40">No pending KB promotions.</p>
        ) : (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {data!.pendingKb.map((item) => (
              <li
                key={item.id}
                className="text-xs text-white/70 border-b border-white/5 py-1.5"
              >
                <span className="text-white/90">{item.title}</span>
                <span className="text-white/40">
                  {" "}
                  · {item.payload_type} · gate {item.gate_status} · jeffery{" "}
                  {item.jeffery_verdict ?? "pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Scorecards */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3 md:p-4">
        <h3 className="text-xs font-semibold text-white mb-2">
          Per-agent review scorecards
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(data?.scorecards ?? {}).map(([agent, s]) => (
            <div
              key={agent}
              className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 text-xs"
            >
              <p className="font-semibold text-white mb-1">{agent}</p>
              <p className="text-white/50">
                ok {s.approved} · rej {s.rejected} · human {s.needsHuman}
              </p>
            </div>
          ))}
          {Object.keys(data?.scorecards ?? {}).length === 0 && (
            <p className="text-xs text-white/40">No scorecard data yet.</p>
          )}
        </div>
      </section>

      {/* Recent current reviews */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3 md:p-4">
        <h3 className="text-xs font-semibold text-white mb-2">
          Recent current reviews
        </h3>
        <ul className="space-y-1.5 max-h-64 overflow-y-auto">
          {(data?.queue ?? []).slice(0, 30).map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-2 text-[11px] text-white/60 border-b border-white/5 py-1"
            >
              <VerdictChip v={row.verdict} />
              <span>{row.artifactType}</span>
              <span className="text-white/40 truncate max-w-[12rem] md:max-w-xs">
                {row.artifactRef}
              </span>
              <span className="text-white/30">
                {row.ageMinutes}m / {row.slaMinutes}m
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
