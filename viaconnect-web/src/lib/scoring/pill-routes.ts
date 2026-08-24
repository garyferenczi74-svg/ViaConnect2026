// Pill destination route map for the Bio Optimization Score card.
//
// The /api/bos/current endpoint emits a `destination_key` per pill
// rather than a hard-coded URL so the client can adapt routes to the
// project's actual app router layout without coordinating an API
// release. This module is the SSOT for that key to path mapping.
//
// A key intentionally absent from PILL_ROUTES renders its pill as
// disabled with a "Coming Soon" treatment per Prompt #162 §2.4. The
// pill primitive components consume `getPillRoute(key)` and branch on
// whether the return value is null.
//
// Routes verified against src/app/(app)/(consumer)/ on 2026-05-12:
//   caq_resume          /onboarding/i-caq-intro          (auth route group)
//   labs_upload         /genetics#upload-lab-results     (consumer; deep link
//                                                         to the Upload Lab
//                                                         Results section)
//   genex360_purchase   /shop/genex360                   (consumer)
//   genex360_status     /genetics                        (consumer; status surface)
//   nutrition_log       /nutrition/photo-ai              (consumer; Prompt 173a
//                                                         re-pointed from the
//                                                         frozen 168c legacy
//                                                         editor to the scored
//                                                         NutriVision hub)
//   supplements_protocol /supplements                    (consumer)
//   body_tracker        /body-tracker                    (consumer)
//   wearable_dashboard  /body-tracker/connections        (consumer; /wearables redirects)
//   plug_ins_directory  /plugins                         (consumer; no hyphen)
//   helix_challenges    /helix                           (consumer)

export type PillDestinationKey =
  | 'caq_resume'
  | 'labs_upload'
  | 'genex360_purchase'
  | 'genex360_status'
  | 'nutrition_log'
  | 'supplements_protocol'
  | 'body_tracker'
  | 'wearable_dashboard'
  | 'plug_ins_directory'
  | 'helix_challenges';

export const PILL_ROUTES: Record<PillDestinationKey, string> = {
  caq_resume: '/onboarding/i-caq-intro',
  labs_upload: '/genetics#upload-lab-results',
  genex360_purchase: '/shop/genex360',
  genex360_status: '/genetics',
  nutrition_log: '/nutrition/photo-ai',
  supplements_protocol: '/supplements',
  body_tracker: '/body-tracker',
  wearable_dashboard: '/body-tracker/connections',
  plug_ins_directory: '/plugins',
  helix_challenges: '/helix',
};

export function getPillRoute(key: string | null | undefined): string | null {
  if (key === null || key === undefined) return null;
  if (Object.prototype.hasOwnProperty.call(PILL_ROUTES, key)) {
    return PILL_ROUTES[key as PillDestinationKey];
  }
  return null;
}
