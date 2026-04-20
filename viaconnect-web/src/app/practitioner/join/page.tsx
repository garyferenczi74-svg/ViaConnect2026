// Prompt #98 Phase 2: Public referral landing page.
//
// /practitioner/join?ref={code_slug}
//
// Server component that:
//   1. Reads the ?ref= query parameter.
//   2. If present, validates the code via the public RPC.
//   3. Renders a referral banner when the code is active.
//   4. Defers click recording + cookie set to a tiny client component
//      (cookies need browser context, click recording needs visitor
//      uuid which lives client-side).
//
// When the launch flag is OFF the page still loads (we never block
// the public marketing path) but the client component skips click
// recording entirely so no attribution accrues pre-launch.

import { createClient } from '@/lib/supabase/server';
import { isLaunchPhaseActive } from '@/lib/launch-phases/is-active';
import JoinLandingClient from './join-landing-client';

export const dynamic = 'force-dynamic';

interface CodeMeta {
  is_valid: boolean;
  practice_name: string | null;
}

async function lookupCode(supabase: ReturnType<typeof createClient>, codeSlug: string | null): Promise<CodeMeta> {
  if (!codeSlug) return { is_valid: false, practice_name: null };
  const sb = supabase as any;
  const { data } = await sb.rpc('lookup_referral_code_for_attribution', { p_code_slug: codeSlug });
  const row = (data as Array<{ code_id: string; practitioner_id: string; is_active: boolean }> | null)?.[0];
  if (!row || !row.is_active) return { is_valid: false, practice_name: null };
  // Get the practice name for the banner.
  const { data: pract } = await sb
    .from('practitioners')
    .select('practice_name')
    .eq('id', row.practitioner_id)
    .maybeSingle();
  return { is_valid: true, practice_name: pract?.practice_name ?? null };
}

export default async function PractitionerJoinPage({ searchParams }: { searchParams: { ref?: string } }) {
  const supabase = createClient();
  const refCodeSlug = searchParams.ref ?? null;
  const [active, codeMeta] = await Promise.all([
    isLaunchPhaseActive('practitioner_referral_2027', supabase),
    lookupCode(supabase, refCodeSlug),
  ]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white">
      <main className="max-w-3xl mx-auto px-4 py-10 md:py-16">
        {active && codeMeta.is_valid && (
          <div className="mb-6 rounded-xl border border-portal-green/30 bg-portal-green/10 p-4 text-sm text-portal-green">
            <p className="font-semibold mb-1">You were referred to ViaCura.</p>
            <p>
              {codeMeta.practice_name
                ? `${codeMeta.practice_name} invited you. `
                : 'A practitioner invited you. '}
              Receive 15% off your first subscription month and 15% off Level 2 certification.
            </p>
          </div>
        )}

        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-copper">For Practitioners</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Join the ViaCura platform</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">
            Wholesale supplements, certification, white-label production, custom formulations.
            Built for practitioners who want full control of their dispensary line.
          </p>
        </header>

        <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">What you get</p>
            <ul className="text-sm text-gray-300 space-y-1.5 list-disc list-inside">
              <li>56-SKU supplement catalog at wholesale.</li>
              <li>Four levels of certification, CE-eligible.</li>
              <li>White-label production at qualified tiers.</li>
              <li>Custom formulations once Level 4 unlocks.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Subscription tiers</p>
            <ul className="text-sm text-gray-300 space-y-1.5">
              <li><span className="font-semibold">Free</span>: catalog browse + Level 1 certification.</li>
              <li><span className="font-semibold">Standard Portal</span>: $128.88 per month, full wholesale + Level 2.</li>
              <li><span className="font-semibold">White-Label Platform</span>: $288.88 per month, unlocks Level 3.</li>
            </ul>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm">Ready to apply? Practitioner enrollment opens via the standard signup flow once the practitioner portal is live.</p>
        </section>

        {active && refCodeSlug && (
          <JoinLandingClient codeSlug={refCodeSlug} />
        )}
      </main>
    </div>
  );
}
