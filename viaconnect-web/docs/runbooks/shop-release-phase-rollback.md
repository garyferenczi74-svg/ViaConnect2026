# Shop release phase rollback

Pausing `shop_release_phase_1` makes every supplement show Coming soon. Exact test kits stay buyable. No deploy is required. The shop reads `launch_phases` on the request.

## Pause

1. Open `/admin/launch-phases`.
2. Use the existing **Pause (rollback)** control on `shop_release_phase_1`. That sets the row's `activation_status` to `paused`.

A supplement is released only when its phase status is `active` or `completed`. `paused` is neither, so FC-NAD-001, FC-RISE-001, and FC-DESIRE-001 come off the shelf with the rest of the supplements. Exact test kits stay buyable because the exemption does not look at the phase. `shop_release_phase_2` is seeded `planned`, so those supplements are already Coming soon.

## Resume

Use the existing **Resume** control on `shop_release_phase_1`. That sets the row back to `active`. No deploy is required.
