# DrinkLinc / LINC plugin (scaffold)

Brand: LINC (drinklinc.com). Connected supplement / nutrition dispenser
(countertop device + smart cartridges + companion app). Not a biometric
wearable.

## Audit (2026-09-01)

No public DrinkLinc or LINC API, OAuth URLs, SDK, or developer portal.
The marketing site is Webflow (`data-wf-domain` www.drinklinc.com). Only
`/` returns 200. `/privacy`, `/terms`, `/api`, `/developers`, and `/docs`
all 404. Waitlist is an on-page Webflow form (email + country).

Commercial launch: early-access waitlist. Press points at about 2027.

Partner contact:

- hello@drinklinc.com
- Founder Paul O'Connor (paul@drinklinc.com in press)

Social: Instagram @drinklinc, LinkedIn company/drinklinc, YouTube @DrinkLinc.

## Why this is a /plugins Nutrition card, not a Wearables tile

LINC consumes wearable data (claims Apple Health, WHOOP, Oura, Apple Watch)
and bloodwork to personalize vitamins, minerals, adaptogens, and
electrolytes. It does not produce first-class biometric streams for
ViaConnect. Keep `drinklinc` off `FIRST_CLASS_TILE_IDS` and off
`PLUGIN_PAGE_EXCLUDED_SLUGS`. Wearables Data stays Whoop, Hume, Apple
Health, Oura, Google Health, Garmin.

LINC claims the same wearable sources ViaConnect already targets
(Whoop, Oura, Apple Health).

## Integration options when a partner API exists

A. Partner API pull: ViaConnect reads dose events, cartridge ingredient
   amounts, and adherence, then maps them toward nutrients / regimen.

B. Inbound push: ViaConnect sends reconciled biometrics to LINC if they
   open an inbound partner write.

C. Apple Health bridge only: no DrinkLinc OAuth. Dose or nutrition
   samples that land in Apple Health are attributed on the existing
   Health XML / native path.

Do not invent endpoints. `isDrinkLincConfigured()` stays false until
partner docs publish real base URLs and secrets are provisioned.

Placeholder env names (unread until then):

- `DRINKLINC_CLIENT_ID`
- `DRINKLINC_CLIENT_SECRET`
- `DRINKLINC_REDIRECT_URI`

Stub routes under `/api/integrations/drinklinc/` return HTTP 501 and
`connected: false`. They never claim Connected.

## IA

- Slug: `drinklinc`
- Display name: LINC
- Category: Nutrition
- Status: coming_soon
- Connection type: oauth2 (future partner API, same as MyFitnessPal)
- connectPath / disconnectPath: null
- wearablesCrossLink: null
- Icon: Lucide Droplets (no licensed brand mark)
