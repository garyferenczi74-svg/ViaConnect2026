'use client';

import { useEffect, useState } from 'react';
import { Loader2, Share2, Coins } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { PortalType } from './ScanResultsPanel';

interface ScanShareTabProps {
  sessionId: string;
  userId: string;
  portalType: PortalType;
}

interface HelixRow {
  amount: number;
  source: string;
}

export function ScanShareTab({ sessionId, userId, portalType }: ScanShareTabProps) {
  const [sharedWithPractitioner, setSharedWithPractitioner] = useState<boolean | null>(null);
  const [toggling, setToggling]   = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [helixAmount, setHelixAmount]   = useState<number | null>(null);
  const [helixLoading, setHelixLoading] = useState(false);

  // Load share state
  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('body_photo_sessions')
        .select('shared_with_practitioner')
        .eq('id', sessionId)
        .maybeSingle();
      if (!mounted) return;
      const row = data as unknown as { shared_with_practitioner: boolean } | null;
      setSharedWithPractitioner(row?.shared_with_practitioner ?? false);
    })();
    return () => { mounted = false; };
  }, [sessionId]);

  // Load Helix earned for this scan (consumer-only)
  useEffect(() => {
    if (portalType !== 'consumer') return;
    let mounted = true;
    setHelixLoading(true);
    (async () => {
      try {
        const supabase = createClient();
        type Loose = {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                gt: (col: string, val: number) => Promise<{ data: HelixRow[] | null; error: unknown }>;
              };
            };
          };
        };
        const sb = supabase as unknown as Loose;
        const { data } = await sb
          .from('helix_transactions')
          .select('amount, source')
          .eq('related_entity_id', sessionId)
          .gt('amount', 0);
        if (!mounted) return;
        const rows = (data ?? []) as HelixRow[];
        const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
        setHelixAmount(total > 0 ? total : null);
      } catch {
        // Helix is best-effort; silently swallow
      } finally {
        if (mounted) setHelixLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [sessionId, portalType]);

  async function toggleShare(next: boolean) {
    setToggling(true);
    setToggleError(null);
    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from('body_photo_sessions')
        .update({ shared_with_practitioner: next } as { shared_with_practitioner: boolean })
        .eq('id', sessionId)
        .eq('user_id', userId);
      if (updateErr) throw new Error(updateErr.message);
      setSharedWithPractitioner(next);
    } catch (e) {
      setToggleError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2DA5A0]/15">
          <Share2 className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        </div>
        <span className="text-sm font-bold text-white">Share and rewards</span>
      </div>

      {/* Practitioner share toggle */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-white">Share this scan with my practitioner</p>
            <p className="text-xs text-white/50 leading-relaxed">
              Your practitioner will see your measurements, composition, and trend; they will not see Helix engagement data.
            </p>
          </div>
          {sharedWithPractitioner === null ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/40 shrink-0" strokeWidth={1.5} />
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={sharedWithPractitioner}
              onClick={() => toggleShare(!sharedWithPractitioner)}
              disabled={toggling}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 disabled:opacity-50 ${
                sharedWithPractitioner
                  ? 'bg-[#2DA5A0] border-[#2DA5A0]'
                  : 'bg-white/10 border-white/[0.12]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  sharedWithPractitioner ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              {toggling && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 animate-spin text-white/70" strokeWidth={1.5} />
                </span>
              )}
            </button>
          )}
        </div>
        {toggleError && (
          <p className="text-xs text-red-300">{toggleError}</p>
        )}
      </div>

      {/* Helix earned: consumer-only */}
      {portalType === 'consumer' && (
        <div className="rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/5 px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-4 w-4 text-[#F59E0B]" strokeWidth={1.5} />
            <span className="text-sm font-semibold text-[#F59E0B]">Helix earned for this scan</span>
          </div>
          {helixLoading ? (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
              Loading rewards
            </div>
          ) : helixAmount != null ? (
            <p className="text-2xl font-bold text-white">
              {helixAmount.toLocaleString()}
              <span className="ml-1.5 text-sm font-normal text-[#F59E0B]">Helix</span>
            </p>
          ) : (
            <p className="text-xs text-white/45">
              No Helix tokens recorded for this scan yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
