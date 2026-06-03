'use client';

// useFamilySharingPrefs  the 169f section 5.4 member-controlled family-sharing
// toggles. DEFAULT OFF (private by default).
//
// 169f section 5.4 establishes member autonomy inside a platinum_family pool:
// each family member's data is private by default, and a member may individually
// opt IN to share, with their family plan HOLDER, two narrow things:
//   (a) their Body Tracker trend SUMMARY  (NOT raw data), and
//   (b) their FormaVision scan COMPLETION notifications  (NOT the scan data).
// "Parental consent for the account does not grant parental access to the
// account's health data," so the toggle is owned by the MEMBER, never the holder.
//
// Exposes:
//   * shareBodyTrackerSummary      the (a) flag, default false until loaded,
//   * shareFormavisionCompletion   the (b) flag, default false until loaded,
//   * isLoading,
//   * setShareBodyTrackerSummary(next)   persist (a) (optimistic upsert),
//   * setShareFormavisionCompletion(next) persist (b) (optimistic upsert),
//   * isFamilyMember               whether the current user is an ACTIVE family
//                                  member (an active family_members row where
//                                  member_user_id = auth.uid()), so the UI can show
//                                  the toggles ONLY to family members.
//
// PERSISTENCE: a row per user in public.family_member_sharing_prefs (added in
// migration 20260516000190), read with the Supabase browser client and written
// with an upsert keyed on user_id (creating the row on first write is fine; the
// absence of a row means "shares nothing"). The member's RLS self policy is the
// only write path; the holder is SELECT-only and cannot write this row. The table
// is not in the generated supabase types (types.ts drifts from the live schema),
// so the read/write use a narrow cast, matching useCyclePhaseOptIn +
// useBodyScanInclusivityWaitlist.
//
// PRIVACY / fail-safe: if any read fails, both flags default OFF (the private
// default) and isFamilyMember defaults false (so the toggles stay hidden). This is
// I/O + React state only; there is no shared client cache (the surface is a single
// settings panel, not multiple subtrees).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UseFamilySharingPrefsResult {
  // The two persisted preferences. Both default OFF until loaded.
  shareBodyTrackerSummary: boolean;
  shareFormavisionCompletion: boolean;
  isLoading: boolean;
  // Whether the current user is an ACTIVE family member (gates the UI).
  isFamilyMember: boolean;
  // Persist a new value (optimistic local update, then an upsert).
  setShareBodyTrackerSummary: (next: boolean) => Promise<void>;
  setShareFormavisionCompletion: (next: boolean) => Promise<void>;
}

interface SharingPrefsRow {
  share_body_tracker_summary?: boolean | null;
  share_formavision_completion?: boolean | null;
}

// Narrow structural readers/writers over the supabase client. The table and the
// family_members membership flag are not in the generated types, so we cast to the
// exact shape each call needs (the established pattern in the body-tracker hooks).
interface PrefsReader {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: SharingPrefsRow | null }>;
      };
    };
  };
}

interface MembershipReader {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: boolean) => {
          limit: (n: number) => Promise<{ data: Array<{ id: string }> | null }>;
        };
      };
    };
  };
}

interface PrefsWriter {
  from: (t: string) => {
    upsert: (
      v: Record<string, unknown>,
      opts: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
}

export function useFamilySharingPrefs(): UseFamilySharingPrefsResult {
  const [shareBodyTrackerSummary, setBodyState] = useState(false);
  const [shareFormavisionCompletion, setScanState] = useState(false);
  const [isFamilyMember, setIsFamilyMember] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        if (!cancelled) setUserId(user.id);

        // Am I an ACTIVE family member? (member_user_id = me AND is_active).
        // family_members_self_read RLS already scopes this to my own row.
        const { data: memberRows } = await (supabase as unknown as MembershipReader)
          .from('family_members')
          .select('id')
          .eq('member_user_id', user.id)
          .eq('is_active', true)
          .limit(1);
        const member = Array.isArray(memberRows) && memberRows.length > 0;
        if (!cancelled) setIsFamilyMember(member);

        // Read my sharing prefs row (may not exist yet: missing = both false).
        const { data: prefs } = await (supabase as unknown as PrefsReader)
          .from('family_member_sharing_prefs')
          .select('share_body_tracker_summary, share_formavision_completion')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled && prefs) {
          setBodyState(typeof prefs.share_body_tracker_summary === 'boolean'
            ? prefs.share_body_tracker_summary
            : false);
          setScanState(typeof prefs.share_formavision_completion === 'boolean'
            ? prefs.share_formavision_completion
            : false);
        }
      } catch {
        // Fail-safe: a sensitive opt-in defaults OFF, and an unknown membership
        // state hides the toggles, if the reads fail.
        if (!cancelled) {
          setBodyState(false);
          setScanState(false);
          setIsFamilyMember(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Single upsert helper: writes the member's own row (user_id = me). The RLS self
  // policy (USING + WITH CHECK user_id = auth.uid()) is the only write path here.
  const persist = useCallback(
    async (patch: Record<string, boolean>) => {
      if (!userId) return;
      try {
        const supabase = createClient();
        await (supabase as unknown as PrefsWriter)
          .from('family_member_sharing_prefs')
          .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
      } catch {
        // Best-effort persistence; the optimistic value still applies this session.
      }
    },
    [userId],
  );

  const setShareBodyTrackerSummary = useCallback(async (next: boolean) => {
    setBodyState(next); // optimistic
    await persist({ share_body_tracker_summary: next });
  }, [persist]);

  const setShareFormavisionCompletion = useCallback(async (next: boolean) => {
    setScanState(next); // optimistic
    await persist({ share_formavision_completion: next });
  }, [persist]);

  return useMemo(
    () => ({
      shareBodyTrackerSummary,
      shareFormavisionCompletion,
      isLoading,
      isFamilyMember,
      setShareBodyTrackerSummary,
      setShareFormavisionCompletion,
    }),
    [
      shareBodyTrackerSummary,
      shareFormavisionCompletion,
      isLoading,
      isFamilyMember,
      setShareBodyTrackerSummary,
      setShareFormavisionCompletion,
    ],
  );
}
