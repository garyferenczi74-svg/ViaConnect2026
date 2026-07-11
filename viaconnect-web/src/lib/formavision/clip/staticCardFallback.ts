/**
 * src/lib/formavision/clip/staticCardFallback.ts
 *
 * Prompt 211a Workstream 1: PURE composition data for the STATIC-CARD fallback
 * served to iOS WKWebView, the 2D-floor tier, and any device that cannot encode a
 * clip on-device (canSupportOnDeviceEncode === false).
 *
 * GARY DECISION (governs): iOS + the 2D-floor tier + no-WebGL get a graceful
 * static-card fallback: a rendered card image with the SAME stats plus an honest
 * "Video export is coming to iOS" note. NEVER a fake video. NEVER a raw photo.
 *
 * ONE-SOURCE CONTRACT: the card's stats come from the SAME ClipCaption that the
 * video path uses (built from computeCompositionDeltas). This module adds no new
 * number and recomputes nothing; it re-frames the exact same caption as a still.
 *
 * NO RAW PHOTO CONTRACT: the card references only token colors and the caption
 * text. It carries no image URL, no photo, no data: URI.
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any. Pure and
 * deterministic; never throws.
 */

import type { CaptionTokens, ClipCaption } from './composition';

// The honest note shown on the fallback card. iOS video export is not yet
// supported (baseline item 1+2: iOS WKWebView MediaRecorder / captureStream is
// version-dependent with no MP4 guarantee), so we ship a still with the SAME
// stats and say so plainly. Never claims a video was made.
export const IOS_COMING_SOON_NOTE = 'Video export is coming to iOS. This is your progress card.';

// The generic non-iOS fallback note (2D-floor / no-WebGL on a non-iOS device). The
// card is still a real still with the same stats; only the reason differs.
export const STATIC_CARD_NOTE =
  'Your device shows a progress card instead of a video. The numbers are the same.';

// The reason the static card is being served, so the caller can pick the note and
// telemetry can record a coarse cause. 'ios' is the WKWebView limitation; 'tier2d'
// is the 2D floor / no-WebGL path; 'no_encode' is any other missing-encode case.
export type StaticCardReason = 'ios' | 'tier2d' | 'no_encode';

export interface StaticCardFallback {
  /** Why the still is served instead of a clip (coarse cause). */
  reason: StaticCardReason;
  /** The honest note for this reason (never claims a video was produced). */
  note: string;
  /** The date span text, carried verbatim from the caption. */
  dateSpanText: string;
  /**
   * The headline stat lines, one per line, built from the SAME caption. Empty when
   * the caption has no headline (body fat UNKNOWN) so the card shows an honest
   * "no change yet" state rather than a fabricated stat.
   */
  headlineLines: string[];
  /** True when the headline stat is a low-confidence estimate (carried from caption). */
  estimated: boolean;
  /** The estimated marker text, or null when not estimated (carried from caption). */
  estimatedMarkerText: string | null;
  /** The Via Cura wordmark (carried from the caption). */
  wordmark: string;
  /** The token palette the card may paint with (tokens only, no image). */
  tokens: CaptionTokens;
}

/**
 * Picks the honest note for a static-card reason. iOS gets the "coming to iOS"
 * note; every other cause gets the generic note. Never claims a video was made.
 */
export function noteForReason(reason: StaticCardReason): string {
  return reason === 'ios' ? IOS_COMING_SOON_NOTE : STATIC_CARD_NOTE;
}

/**
 * Builds the static-card fallback composition data from an already-built ClipCaption.
 *
 * The card shows the EXACT same stats as the video caption (same date span, same
 * headline, same estimated marker, same wordmark, same tokens) plus an honest note
 * that a still is being served. Pure and deterministic; never throws.
 *
 * @param caption - the ClipCaption from buildClipCaption (the one-source stats).
 * @param reason - why the still is served (drives the note + coarse telemetry).
 */
export function buildStaticCardFallback(
  caption: ClipCaption,
  reason: StaticCardReason,
): StaticCardFallback {
  const headlineLines: string[] = [];
  if (caption.headline) {
    const h = caption.headline;
    const arrowWord = h.arrow === 'down' ? 'down' : h.arrow === 'up' ? 'up' : 'steady';
    headlineLines.push(`${h.label}: ${h.fromText} to ${h.toText}`);
    headlineLines.push(`${h.changeText} ${arrowWord}`);
  }

  return {
    reason,
    note: noteForReason(reason),
    dateSpanText: caption.dateSpanText,
    headlineLines,
    estimated: caption.headline ? caption.headline.estimated : false,
    estimatedMarkerText: caption.estimatedMarkerText,
    wordmark: caption.wordmark,
    tokens: caption.tokens,
  };
}
