// Prompt #98 Phase 4: Privacy-aware notification router.
//
// Pure. Given the milestone event stage + the referred practitioner's
// privacy preference + the relevant context, returns whether to send
// + which template + the payload. Opt-out cases get an aggregate
// "credit applied" message (vested) or no message at all
// (pending_hold) so we never reveal the referred practitioner's
// identity to the referrer when they have asked for privacy.

export type NotificationStage = 'pending_hold' | 'vested' | 'silent_vesting_announcement';

export type NotificationTemplate =
  | 'referral_milestone_reached_pending_hold'
  | 'referral_milestone_vested'
  | 'referral_credit_applied_anonymous'
  | 'referral_silent_vesting_notice';

export interface NotificationRouteInput {
  stage: NotificationStage;
  privacy_allows_progress: boolean;
  referred_practice_name: string | null;
  milestone_display_name: string;
  amount_cents: number;
  hold_expires_at: string | null;
}

export interface NotificationRouteResult {
  send: boolean;
  template?: NotificationTemplate;
  payload?: {
    referred_practice_name?: string | null;
    milestone_display_name?: string;
    amount_cents?: number;
    hold_expires_at?: string | null;
  };
}

export function routeNotification(input: NotificationRouteInput): NotificationRouteResult {
  switch (input.stage) {
    case 'pending_hold':
      // Opt-out: no notification at all, never leak the referred id.
      if (!input.privacy_allows_progress) return { send: false };
      return {
        send: true,
        template: 'referral_milestone_reached_pending_hold',
        payload: {
          referred_practice_name: input.referred_practice_name,
          milestone_display_name: input.milestone_display_name,
          amount_cents: input.amount_cents,
          hold_expires_at: input.hold_expires_at,
        },
      };

    case 'vested':
      if (input.privacy_allows_progress) {
        return {
          send: true,
          template: 'referral_milestone_vested',
          payload: {
            referred_practice_name: input.referred_practice_name,
            milestone_display_name: input.milestone_display_name,
            amount_cents: input.amount_cents,
          },
        };
      }
      // Opt-out: send anonymous credit-applied notice (no referred name).
      return {
        send: true,
        template: 'referral_credit_applied_anonymous',
        payload: {
          amount_cents: input.amount_cents,
        },
      };

    case 'silent_vesting_announcement':
      // Phase 3 contract: one-time notice when the referred practitioner
      // toggles privacy off. Always sends.
      return {
        send: true,
        template: 'referral_silent_vesting_notice',
        payload: {
          referred_practice_name: input.referred_practice_name,
        },
      };

    default:
      return { send: false };
  }
}
