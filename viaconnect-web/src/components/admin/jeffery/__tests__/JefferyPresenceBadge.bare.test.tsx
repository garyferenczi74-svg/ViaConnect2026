import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import JefferyPresenceBadge from "../JefferyPresenceBadge";

const WALK_NEWEST_ISO = "2026-08-19T08:51:20.000Z";
const WALK_NOW_MS = Date.parse("2026-08-25T18:00:00.000Z");

describe("JefferyPresenceBadge paint", () => {
  it("walk 25 Aug / newest 8/19 paints Idle · last event, not Online", () => {
    const html = renderToStaticMarkup(
      <JefferyPresenceBadge newestCreatedAt={WALK_NEWEST_ISO} nowMs={WALK_NOW_MS} />,
    );
    expect(html).toContain("Idle · last event Aug 19, 2026, 2:51 AM");
    expect(html).not.toContain("Jeffery Online");
    expect(html).not.toContain("Online ·");
    expect(html).not.toContain("bg-emerald-500");
  });

  it("fresh event paints Online + timestamp", () => {
    const html = renderToStaticMarkup(
      <JefferyPresenceBadge
        newestCreatedAt="2026-08-25T12:12:00.000Z"
        nowMs={WALK_NOW_MS}
      />,
    );
    expect(html).toContain("Online · Aug 25, 2026, 6:12 AM");
    expect(html).toContain("bg-emerald-500");
    expect(html).not.toContain("Jeffery Online");
  });

  it("empty feed paints Idle · no events", () => {
    const html = renderToStaticMarkup(
      <JefferyPresenceBadge newestCreatedAt={null} nowMs={WALK_NOW_MS} />,
    );
    expect(html).toContain("Idle · no events");
    expect(html).not.toContain("Jeffery Online");
    expect(html).not.toContain("Online ·");
  });
});
