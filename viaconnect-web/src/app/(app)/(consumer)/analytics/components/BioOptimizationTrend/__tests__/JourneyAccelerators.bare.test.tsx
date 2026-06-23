/**
 * Tests for the bare prop on JourneyAccelerators (Prompt 208d Task D-T5).
 *
 * Uses react-dom/server renderToStaticMarkup so the tests run in the node
 * environment without requiring jsdom. next/link is mocked via vi.mock.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { JourneyRec } from "../hooks/useJourneyRecommendations";

// Mock next/link: render a plain anchor so renderToStaticMarkup works in node.
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement("a", { href, className }, children),
}));

// Import AFTER vi.mock so the mock is in place.
const { JourneyAccelerators } = await import("../JourneyAccelerators");

const FIXTURE_RECS: JourneyRec[] = [
  {
    id: "sleep-window",
    title: "Anchor Your Sleep Window",
    description: "Hold a 30 minute sleep/wake window for 7 days.",
    category: "Sleep",
    estimatedImpact: 8,
    icon: "sleep",
  },
  {
    id: "zone-2",
    title: "Zone 2 Movement Block",
    description: "Three 25 minute easy sessions this week.",
    category: "Movement",
    estimatedImpact: 5,
    icon: "movement",
  },
  {
    id: "breath-reset",
    title: "Midday Breath Reset",
    description: "Five minute box breathing at the 2pm dip.",
    category: "Stress",
    estimatedImpact: 4,
    icon: "stress",
  },
];

describe("JourneyAccelerators", () => {
  it("default (no bare prop) renders the heading and rec titles", () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyAccelerators, { recs: FIXTURE_RECS })
    );
    expect(html).toContain("Journey Accelerators");
    expect(html).toContain("High impact");
    expect(html).toContain("Anchor Your Sleep Window");
    expect(html).toContain("Zone 2 Movement Block");
    expect(html).toContain("Midday Breath Reset");
  });

  it("bare=true renders rec titles but NOT the heading or High impact badge", () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyAccelerators, { recs: FIXTURE_RECS, bare: true })
    );
    expect(html).not.toContain("Journey Accelerators");
    expect(html).not.toContain("High impact");
    expect(html).toContain("Anchor Your Sleep Window");
    expect(html).toContain("Zone 2 Movement Block");
    expect(html).toContain("Midday Breath Reset");
  });

  it("renders without crashing when recs is empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyAccelerators, { recs: [] })
    );
    expect(html).toBeTruthy();
  });

  it("bare=true with empty recs renders without crashing", () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyAccelerators, { recs: [], bare: true })
    );
    expect(html).toBeTruthy();
  });
});
