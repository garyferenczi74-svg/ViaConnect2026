'use client';

/**
 * src/components/journey/coaching/NarrativeRead.tsx
 *
 * The RIGHT-top narrative read of the Your Journey coaching header (Prompt
 * 208d, 3.2, Task D-T2). It states, in plain language, where the user is
 * today: "{name} is in a {stateWord} state today" with the state word in
 * brand Teal, followed by a short two-sentence supportive read.
 *
 * The state word is DERIVED from the current Bio Optimization score by the
 * pure helper stateWordForScore below; it is never hardcoded. A null score
 * (no data yet) reads "getting started", which is honest rather than a
 * fabricated tier.
 *
 * The two-sentence read is a calm, educational, name-aware line. It makes no
 * medical claims and invents no numbers. Fail-open: a missing name reads
 * "There" and the component never throws.
 *
 * Style: glass surface over Deep Navy, Teal #2DA5A0 accent, DM Sans,
 * no emojis, no em/en-dashes, reduced-motion safe (no motion of its own).
 */

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

/**
 * Pure mapping from a Bio Optimization score to a single supportive state
 * word. null (no score yet) is an honest "getting started" rather than a
 * fabricated tier. Thresholds mirror the platform's score tiers.
 *
 * Exported so it can be unit-tested and reused without rendering.
 */
export function stateWordForScore(score: number | null): string {
  if (score === null || !isFinite(score)) return 'getting started';
  if (score >= 85) return 'optimizing';
  if (score >= 70) return 'building';
  if (score >= 55) return 'steady';
  return 'recovering';
}

/**
 * The supportive two-sentence read, derived from the same state word so the
 * copy and the highlighted word always agree. Educational framing only.
 */
function readForState(stateWord: string): string {
  switch (stateWord) {
    case 'optimizing':
      return 'Your signals are clustering near your best. Keep the routine steady and let the small wins compound.';
    case 'building':
      return 'Your trend is moving in the right direction. Consistency over the next stretch is what carries it higher.';
    case 'steady':
      return 'You are holding a solid, level baseline. A single focused area is usually the next lever to nudge it up.';
    case 'recovering':
      return 'This is a rebuilding stretch, which is a normal part of the cycle. Small, repeatable habits restore momentum fastest.';
    default:
      return 'You are at the start of your read, and that is exactly where it should begin. As you log and connect data, this picture fills in.';
  }
}

export function NarrativeRead({
  displayName,
  score,
}: {
  /** Kept for call-site symmetry and possible future per-user reads. */
  userId?: string | null;
  displayName: string;
  score: number | null;
}) {
  const name =
    displayName && displayName.trim().length > 0 ? displayName : 'There';
  const stateWord = stateWordForScore(score);
  const read = readForState(stateWord);

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ fontFamily: DM_MONO, color: TEAL }}
      >
        Your read today
      </span>
      <p
        className="text-[15px] font-semibold leading-snug text-white/90 md:text-base"
        style={{ fontFamily: DM_SANS }}
      >
        {name} is in a{' '}
        <span style={{ color: TEAL }}>{stateWord}</span> state today
      </p>
      <p
        className="text-[12.5px] leading-relaxed text-white/65"
        style={{ fontFamily: DM_SANS }}
      >
        {read}
      </p>
    </div>
  );
}

export default NarrativeRead;
