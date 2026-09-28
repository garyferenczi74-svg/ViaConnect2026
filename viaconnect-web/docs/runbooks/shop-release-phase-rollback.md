# Shop release phase rollback

Pausing `shop_release_phase_1` makes every supplement show Coming soon only while `shop_release_phase_2` stays `planned`. If phase 2 is later `active` or `completed`, pausing phase 1 leaves those phase 2 supplements buyable. Exact test kits stay buyable. No deploy is required. The shop reads `launch_phases` on the request.

This behavior depends on the #245 migrations `20260926200000_shop_release_phases.sql` and `20260926200100_shop_product_waitlist.sql`. Those migrations are applied in production.

## Pause

1. Open `/admin/launch-phases`.
2. Use the existing **Pause (rollback)** control on `shop_release_phase_1`. That sets the row's `activation_status` to `paused`.

A supplement is released only when its phase status is `active` or `completed`. `paused` is neither, so FC-NAD-001, FC-RISE-001, and FC-DESIRE-001 come off the shelf with the other supplements whose phase is not released. Exact test kits stay buyable because the exemption does not look at the phase. `shop_release_phase_2` is seeded `planned`, so those supplements are already Coming soon. That "every supplement" result holds only while phase 2 stays `planned`.

The browser cart is not cleared. On the next authenticated cart sync, the server cart mirror writes only released or exempt lines, so unreleased supplements drop out of the saved server cart. If the release lookup fails, the mirror skips the write and leaves the saved cart as it is. That saved-cart drop (N10) is the current behavior. Changing it is deferred.

## Resume

Use the existing **Resume** control on `shop_release_phase_1`. That sets the row back to `active`. No deploy is required.

## #247 merge gate (satisfied Sep 26)

- [x] #245 migrations `20260926200000_shop_release_phases.sql` and `20260926200100_shop_product_waitlist.sql` are applied and verified on the database
- [x] #246 is merged, so the shop vitest step is in CI
