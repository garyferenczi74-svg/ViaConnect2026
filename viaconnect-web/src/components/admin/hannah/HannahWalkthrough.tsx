'use client';

// Prompt #114 P5: Hannah walkthrough slot (mount-point only).
//
// Per `project_hannah_video_walkthroughs` memory (2026-04-23):
// Gary is building a separate cross-cutting video + AI chatbox walkthrough
// system. Feature prompts ship only the slot; the framework lands on its
// own cadence. This component renders nothing in production until the
// framework wires itself in.
//
// When the walkthrough framework ships, its bootstrap will (a) find every
// slot instance via target matching, (b) load the right video and chatbox
// prompt bundle for that target key, (c) decide whether the current user
// should see the walkthrough (first-visit state, replay flag, user
// feature opt-ins), and (d) take over rendering. Until then this is a
// deliberate no-op so feature pages can mount the slot immediately.
//
// Dev hint: set NEXT_PUBLIC_HANNAH_WALKTHROUGH_DEBUG=1 to render a small
// inline marker showing the target key (helpful during development; off
// in production).

interface HannahWalkthroughProps {
  /**
   * Stable slug that identifies the surface this walkthrough belongs to.
   * Gary's framework will key video and chatbox prompt bundles off this.
   * Examples: "customs.recordation.new", "shop.checkout", "assessment.caq".
   */
  target: string;
  /**
   * Optional object to surface to the walkthrough framework (user tier,
   * role, entry point). Ignored by the mount-point; the framework reads it
   * at activation.
   */
  context?: Record<string, unknown>;
}

export default function HannahWalkthrough({ target }: HannahWalkthroughProps) {
  // `context` prop is defined in HannahWalkthroughProps but the mount-point
  // stub does not read it yet — Gary's future framework will destructure it
  // via a <HannahWalkthrough target=... context={...} /> call site. Keeping
  // the type contract here avoids a props-mismatch when the framework lands.
  if (process.env.NEXT_PUBLIC_HANNAH_WALKTHROUGH_DEBUG === '1') {
    return (
      <aside
        data-hannah-walkthrough-slot={target}
        className="text-[10px] uppercase tracking-wide text-gray-500 border border-dashed border-white/10 rounded px-2 py-1 inline-block"
      >
        Hannah walkthrough slot: {target}
      </aside>
    );
  }

  // Production no-op. The element is still emitted with a stable data
  // attribute so the future framework can locate every slot instance on
  // the page via `document.querySelectorAll('[data-hannah-walkthrough-slot]')`.
  return <span data-hannah-walkthrough-slot={target} aria-hidden />;
}
