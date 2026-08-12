/**
 * src/app/(app)/(consumer)/supplements/page.tsx
 *
 * Server component entry point for My Supplements.
 * Resolves the authenticated user, fetches the latest user_protocol_synthesis
 * row (owner-scoped, via admin client, fail-open), and passes the parsed
 * arrays to the client content shell.
 *
 * NOTE: user_protocol_synthesis is populated by synthesizeForUser (Task 12).
 * Wiring the recompute trigger (on supplement change / new upload / newly
 * published rule) and the human-gate publishing of rules are separate steps,
 * so the Recommended Protocol and Supplement Flags panels show their empty
 * states until then. That is expected and correct.
 *
 * DSHEA disclaimer is rendered inside SupplementsPageContent via
 * PractitionerDisclaimer (already present on this surface).
 *
 * Prompt 208, Phase 8, Task 22 (2026-06-21).
 * No em/en-dashes. No emojis.
 */

import { createClient } from '@/lib/supabase/server';
import { getOrComputeUserProtocolSynthesis } from '@/lib/protocol/readSynthesis';
import { SupplementsPageContent } from './SupplementsPageContent';

export default async function SupplementsPage() {
  // Resolve the authenticated user (server-side, session cookie).
  // Fail gracefully: if no session, pass empty arrays so panels show empty states.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // No session or client error -- continue with empty synthesis.
  }

  // Lazy compute-on-read: returns cached row if fresh, triggers synthesizeForUser
  // when absent or stale, then returns the freshly-written row. Fail-open.
  const synthesis = userId ? await getOrComputeUserProtocolSynthesis(userId) : null;

  return (
    <SupplementsPageContent
      recommendedItems={synthesis?.recommended_vitamins_minerals ?? []}
      supplementFlags={synthesis?.supplement_flags ?? []}
    />
  );
}
