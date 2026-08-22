/**
 * Prompt 227a proof: claims observatory isolation + freshness SLA drill.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateFreshnessSla } from '@/lib/research-hub/freshnessSla227a';
import { proveDosingClaimRedaction } from '@/lib/research-hub/signalLaneIngest';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const dosing = proveDosingClaimRedaction(
      'Users should take 250mg BPC-157 subcutaneously twice daily',
    );

    const { count: claimCount } = await admin
      .from('observed_claims')
      .select('id', { count: 'exact', head: true });

    const { data: claims } = await admin
      .from('observed_claims')
      .select(
        'id, source_domain, claim_type, claim_text, stores_dose, stores_body_text, stores_person_id, observation_count',
      )
      .order('last_observed_at', { ascending: false })
      .limit(10);

    const doseLeak = (claims ?? []).some(
      (c) =>
        c.stores_dose === true ||
        c.stores_body_text === true ||
        c.stores_person_id === true ||
        /\b\d+\s*mg\b/i.test(String(c.claim_text ?? '')),
    );

    const { data: youtube } = await admin
      .from('authorities_sources')
      .select('domain, registry_status, lane, transport, is_active')
      .eq('domain', 'youtube.com')
      .maybeSingle();

    const { data: platforms } = await admin
      .from('authorities_sources')
      .select('domain, registry_status, is_active')
      .in('domain', [
        'reddit.com',
        'x.com',
        'tiktok.com',
        'instagram.com',
        'facebook.com',
        'linkedin.com',
      ]);

    const youtubeLive =
      youtube?.registry_status === 'live' &&
      youtube?.transport === 'rest_api' &&
      youtube?.lane === 'signal';
    const othersPending = (platforms ?? []).every(
      (p) => p.registry_status === 'pending_access' && p.is_active === false,
    );

    const { count: ytClaims } = await admin
      .from('observed_claims')
      .select('id', { count: 'exact', head: true })
      .eq('source_domain', 'youtube.com');

    const { data: ytSample } = await admin
      .from('observed_claims')
      .select('claim_text, stores_person_id, stores_dose, original_url')
      .eq('source_domain', 'youtube.com')
      .limit(5);

    const ytNoPerson =
      (ytSample ?? []).every((c) => c.stores_person_id === false) &&
      !(ytSample ?? []).some((c) =>
        /channel|@\w+|handle/i.test(String(c.claim_text ?? '')),
      );

    // Synthetic breach drill on a live signal source if present
    const drillDomain =
      (
        await admin
          .from('authorities_sources')
          .select('domain')
          .eq('lane', 'signal')
          .eq('registry_status', 'live')
          .limit(1)
          .maybeSingle()
      ).data?.domain ?? 'examine.com';

    const freshness = await evaluateFreshnessSla({
      syntheticBreachDomain: String(drillDomain),
    });

    const { data: alerts } = await admin
      .from('source_freshness_alerts')
      .select('id, source_domain, alert_kind, escalated, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const breachAlert = (alerts ?? []).some(
      (a) =>
        a.alert_kind === 'breached' &&
        String(a.source_domain) === String(drillDomain),
    );

    const { data: mercolaLive } = await admin
      .from('authorities_sources')
      .select('domain, lane, registry_status, is_active')
      .ilike('domain', '%mercola%');

    const mercolaOk = (mercolaLive ?? []).every(
      (m) =>
        m.lane === 'excluded' ||
        m.registry_status === 'blocked' ||
        m.is_active === false,
    );

    const ok =
      dosing.claimType === 'dosing' &&
      !dosing.containsDoseToken &&
      !doseLeak &&
      mercolaOk &&
      youtubeLive &&
      othersPending &&
      ytNoPerson &&
      (ytClaims ?? 0) >= 1 &&
      freshness.ok &&
      breachAlert &&
      (claimCount ?? 0) >= 0;

    return Response.json({
      ok,
      prompt: '227a',
      phase: 'observatory-freshness-proof',
      dosingProof: dosing,
      observedClaimsCount: claimCount ?? 0,
      sampleClaims: claims ?? [],
      doseLeak,
      youtube,
      youtubeLive,
      youtubeClaims: ytClaims ?? 0,
      youtubeSample: ytSample ?? [],
      ytNoPerson,
      platforms,
      onlyYoutubeWave1Ready: youtubeLive && othersPending,
      freshness,
      alerts: alerts ?? [],
      breachAlert,
      mercolaOk,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.prove-227a-observatory', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
