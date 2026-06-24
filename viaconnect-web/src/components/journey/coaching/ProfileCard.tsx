'use client';

/**
 * src/components/journey/coaching/ProfileCard.tsx
 *
 * The LEFT-top card of the Your Journey coaching header (Prompt 208d, 3.2,
 * Task D-T2). It is the honest "who you are" card: a real avatar (or an
 * honest initial-circle, never a fake photo), the real first name via
 * getDisplayName, a primary goal chip from the derived journey state, an
 * HONEST last-sync line (the wearable connector is flag-off, so this reads
 * "No wearable connected" rather than a fabricated timestamp), and one short
 * Hannah note. A small pencil affordance links to the profile editor; this
 * card does NOT build the editor.
 *
 * Every read is best-effort and fail-open: a missing avatar falls back to the
 * initial circle, a missing name reads "there", a missing goal hides the chip.
 * The component never throws.
 *
 * Style: glass surface over Deep Navy, Teal #2DA5A0 accent, DM Sans / DM Mono,
 * Lucide icons strokeWidth 1.5, no emojis, no em/en-dashes, reduced-motion safe
 * (no motion of its own; next/image handles its own loading).
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Pencil, Target, WifiOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getDisplayName } from '@/lib/user/get-display-name';
import { useJourneyState } from '@/hooks/journey/useJourneyState';

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

// The consumer profile page hosts the inline name/details editor. The pencil
// is a navigation affordance only; the editor is owned by that route.
const PROFILE_EDIT_ROUTE = '/profile';

export function ProfileCard({ userId }: { userId: string | null }) {
  // First name (fail-open to "there"), resolved the same way the spine does.
  const [displayName, setDisplayName] = useState<string>('');
  // Avatar URL, best-effort from profiles.avatar_url. Null = honest initial.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarErrored, setAvatarErrored] = useState(false);

  // Goal phrase comes from the same derived journey brain the spine uses. It
  // is fail-open and always returns an honest phrase (degrades to a baseline
  // phrase), so the chip is safe to render directly.
  const { state } = useJourneyState(userId);

  useEffect(() => {
    let active = true;
    getDisplayName()
      .then((n) => {
        if (active) setDisplayName(n);
      })
      .catch(() => {
        /* keep empty default; render falls back to "there" */
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    setAvatarErrored(false);
    setAvatarUrl(null);
    if (!userId) return;
    (async () => {
      try {
        const supabase = createClient();
        type ProfileRow = { avatar_url: string | null };
        const { data } = await withTimeout(
          (supabase as any)
            .from('profiles')
            .select('avatar_url')
            .eq('id', userId)
            .maybeSingle() as unknown as Promise<{ data: ProfileRow | null; error: unknown }>,
          4000,
          'ProfileCard read',
        );
        const url = (data?.avatar_url as string | null) ?? null;
        if (active) setAvatarUrl(url && url.trim().length > 0 ? url : null);
      } catch (error) {
        safeLog.warn('ProfileCard', 'read failed, failing open', { error });
        /* keep null: honest initial-circle fallback */
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const who = displayName && displayName.trim().length > 0 ? displayName : 'there';
  const initial = who.charAt(0).toUpperCase() || 'V';
  const showAvatar = !!avatarUrl && !avatarErrored;
  const goalPhrase = state.goalPhrase;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      {/* Identity row: avatar (with edit affordance) + name + goal chip */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full"
            style={{
              border: '1px solid rgba(45,165,160,0.40)',
              background: 'linear-gradient(135deg, #1A2744 0%, #2DA5A0 140%)',
            }}
          >
            {showAvatar ? (
              <Image
                src={avatarUrl!}
                alt={who}
                fill
                sizes="56px"
                className="object-cover"
                onError={() => setAvatarErrored(true)}
              />
            ) : (
              <span
                className="text-lg font-semibold text-white"
                style={{ fontFamily: DM_SANS }}
              >
                {initial}
              </span>
            )}
          </div>
          {/* Edit affordance: links to the profile editor, does not edit here. */}
          <Link
            href={PROFILE_EDIT_ROUTE}
            aria-label="Edit your profile"
            title="Edit your profile"
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,165,160,0.6)]"
            style={{
              background: 'rgba(11,17,32,0.92)',
              border: '1px solid rgba(45,165,160,0.45)',
            }}
          >
            <Pencil className="h-3 w-3" strokeWidth={1.5} style={{ color: TEAL }} />
          </Link>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span
            className="truncate text-base font-semibold text-white"
            style={{ fontFamily: DM_SANS }}
          >
            {who}
          </span>
          {goalPhrase && goalPhrase.trim().length > 0 && (
            <span
              className="inline-flex w-fit max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-[11px] font-semibold text-white/85"
              style={{
                fontFamily: DM_SANS,
                background: 'rgba(45,165,160,0.14)',
                border: '1px solid rgba(45,165,160,0.32)',
              }}
              title={`Working toward ${goalPhrase}`}
            >
              <Target
                className="h-3 w-3 shrink-0"
                strokeWidth={1.5}
                style={{ color: TEAL }}
              />
              <span className="truncate">{goalPhrase}</span>
            </span>
          )}
        </div>
      </div>

      {/* Honest last-sync line: the wearable connector is flag-off, so we state
          the real connection status instead of a fabricated timestamp. */}
      <div className="flex items-center gap-2">
        <WifiOff
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={1.5}
          style={{ color: 'rgba(255,255,255,0.40)' }}
        />
        <span
          className="text-[11px] uppercase tracking-wider text-white/45"
          style={{ fontFamily: DM_MONO }}
        >
          No wearable connected
        </span>
      </div>

      {/* One short Hannah note: a calm, honest, name-aware line. */}
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            fontFamily: DM_MONO,
            color: TEAL,
            background: 'rgba(45,165,160,0.12)',
            border: '1px solid rgba(45,165,160,0.24)',
          }}
        >
          Hannah
        </span>
        <p
          className="min-w-0 text-[12.5px] leading-relaxed text-white/70"
          style={{ fontFamily: DM_SANS }}
        >
          {who === 'there'
            ? 'Welcome. As you log and connect your data, your read sharpens here.'
            : `Good to see you, ${who}. Your read below sharpens as you log and connect more data.`}
        </p>
      </div>
    </div>
  );
}

export default ProfileCard;
