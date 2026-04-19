// Prompt #94 Phase 1.5: Customer acquisition attribution capture.
//
// Pure helpers + a thin DB writer. Pure helpers are exhaustively tested;
// the writer is exercised at signup time.
//
// Channel taxonomy (matches CHECK constraint on
// customer_acquisition_attribution.first_touch_channel):
//   facebook_ads, google_ads, tiktok_ads
//   podcast_sponsorship, forbes_article, pr_earned_media
//   direct_email, conference, practitioner_referral, consumer_referral
//   content_marketing, seo_organic, direct_traffic, unknown, other

import type { SupabaseClient } from '@supabase/supabase-js';

export const ACQUISITION_CHANNELS = [
  'facebook_ads', 'google_ads', 'tiktok_ads',
  'podcast_sponsorship', 'forbes_article', 'pr_earned_media',
  'direct_email', 'conference', 'practitioner_referral',
  'consumer_referral', 'content_marketing', 'seo_organic',
  'direct_traffic', 'unknown', 'other',
] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

export const PAID_CHANNELS = new Set<AcquisitionChannel>([
  'facebook_ads', 'google_ads', 'tiktok_ads',
  'podcast_sponsorship', 'content_marketing',
]);

export const ORGANIC_CHANNELS = new Set<AcquisitionChannel>([
  'seo_organic', 'direct_traffic', 'pr_earned_media',
]);

export interface AcquisitionContext {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerUrl?: string;
  landingPage?: string;
  referralCode?: string;
  practitionerInvitationToken?: string;
  consumerReferrerUserId?: string;
  userAgent?: string;
}

// ---------------------------------------------------------------------------
// Pure: classify channel
// ---------------------------------------------------------------------------

export function classifyChannel(context: AcquisitionContext): AcquisitionChannel {
  // Referral wins over UTM: a practitioner / consumer referral is the
  // strongest signal of provenance.
  if (context.practitionerInvitationToken) return 'practitioner_referral';
  if (context.consumerReferrerUserId) return 'consumer_referral';

  const src = (context.utmSource ?? '').toLowerCase().trim();
  const med = (context.utmMedium ?? '').toLowerCase().trim();

  if (src === 'facebook' || src === 'fb' || src === 'instagram' || src === 'ig') {
    return 'facebook_ads';
  }
  if (src === 'google' && (med === 'cpc' || med === 'paid' || med === 'ppc')) {
    return 'google_ads';
  }
  if (src === 'tiktok' || src === 'tt') return 'tiktok_ads';
  if (med === 'podcast') return 'podcast_sponsorship';
  if (src === 'forbes') return 'forbes_article';
  if (med === 'email' || med === 'newsletter') return 'direct_email';
  if (med === 'conference' || med === 'event') return 'conference';
  if (med === 'content' || src === 'blog') return 'content_marketing';

  // Fallbacks based on referrer
  if (!src && !med) {
    if (!context.referrerUrl) return 'direct_traffic';
    return 'seo_organic';
  }
  return 'other';
}

export function isPaidChannel(channel: AcquisitionChannel): boolean {
  return PAID_CHANNELS.has(channel);
}

export function isOrganicChannel(channel: AcquisitionChannel): boolean {
  return ORGANIC_CHANNELS.has(channel);
}

export interface DerivedAttributionFlags {
  isPractitionerAttached: boolean;
  isPaidAcquisition: boolean;
  isOrganic: boolean;
}

export function deriveAttributionFlags(
  channel: AcquisitionChannel,
  context: AcquisitionContext,
): DerivedAttributionFlags {
  return {
    isPractitionerAttached: !!context.practitionerInvitationToken,
    isPaidAcquisition: isPaidChannel(channel),
    isOrganic: isOrganicChannel(channel),
  };
}

// ---------------------------------------------------------------------------
// DB writer
// ---------------------------------------------------------------------------

export interface CaptureAttributionDeps {
  supabase: SupabaseClient | unknown;
}

export async function captureAcquisitionAttribution(
  userId: string,
  context: AcquisitionContext,
  deps: CaptureAttributionDeps,
): Promise<{ ok: boolean; reason?: string }> {
  const channel = classifyChannel(context);
  const flags = deriveAttributionFlags(channel, context);

  // Resolve practitioner_id from the invitation token if present.
  let practitionerId: string | null = null;
  if (context.practitionerInvitationToken) {
    const { data: rel } = await (deps.supabase as any)
      .from('practitioner_patients')
      .select('practitioner_id')
      .eq('invitation_token', context.practitionerInvitationToken)
      .maybeSingle();
    practitionerId = rel?.practitioner_id ?? null;
  }

  const row = {
    user_id: userId,
    acquired_at: new Date().toISOString(),

    first_touch_channel: channel,
    first_touch_campaign: context.utmCampaign ?? null,
    first_touch_source: context.utmSource ?? null,
    first_touch_medium: context.utmMedium ?? null,
    first_touch_referrer_url: context.referrerUrl ?? null,
    first_touch_landing_page: context.landingPage ?? null,

    last_touch_channel: channel,
    last_touch_campaign: context.utmCampaign ?? null,
    last_touch_source: context.utmSource ?? null,
    last_touch_medium: context.utmMedium ?? null,

    referred_by_user_id: context.consumerReferrerUserId ?? null,
    referred_by_practitioner_id: practitionerId,
    referral_code_used: context.referralCode ?? null,

    is_practitioner_attached: flags.isPractitionerAttached,
    is_paid_acquisition: flags.isPaidAcquisition,
    is_organic: flags.isOrganic,

    user_agent: context.userAgent ?? null,
  };

  const { error } = await (deps.supabase as any)
    .from('customer_acquisition_attribution')
    .insert(row);

  if (error) {
    // UNIQUE(user_id) constraint: signup retried after the row already
    // landed. Treat as success so we do not block the user.
    if ((error as { code?: string }).code === '23505') {
      return { ok: true, reason: 'already_attributed' };
    }
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}
