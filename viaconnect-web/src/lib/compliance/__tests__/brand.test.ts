import { describe, it, expect } from "vitest";
import {
  BIO_OPTIMIZATION_NAMING,
  BIOAVAILABILITY_RANGE,
  HELIX_CONSUMER_ONLY,
  LUCIDE_ONLY_ICONS,
  NO_EMOJIS_IN_OUTPUT,
  MEDICAL_DISCLAIMER_MANDATORY,
} from "../rules/brand";

describe("MARSHALL.BRAND.BIO_OPTIMIZATION_NAMING", () => {
  it("flags Vitality Score", async () => {
    expect((await BIO_OPTIMIZATION_NAMING.evaluate("Your Vitality Score is 72")).length).toBe(1);
  });
  it("flags Vitality Index", async () => {
    expect((await BIO_OPTIMIZATION_NAMING.evaluate("Vitality Index trending up")).length).toBe(1);
  });
  it("flags Wellness Score", async () => {
    expect((await BIO_OPTIMIZATION_NAMING.evaluate("Track your Wellness Score")).length).toBe(1);
  });
  it("passes Bio Optimization", async () => {
    expect((await BIO_OPTIMIZATION_NAMING.evaluate("Your Bio Optimization is 72")).length).toBe(0);
  });
  it("auto-remediates to Bio Optimization", async () => {
    const fixed = await BIO_OPTIMIZATION_NAMING.autoRemediate!("Your Vitality Score is 72", {} as any);
    expect(fixed).toContain("Bio Optimization");
    expect(fixed).not.toMatch(/vitality score/i);
  });
});

describe("MARSHALL.BRAND.BIOAVAILABILITY_RANGE", () => {
  it("flags 5-27× variants", async () => {
    for (const v of ["5-27x bioavailable", "5 to 27 times more bioavailable", "5-27× bioavailability"]) {
      const hits = await BIOAVAILABILITY_RANGE.evaluate(v);
      expect(hits.length).toBeGreaterThanOrEqual(1);
    }
  });
  it("passes canonical 10-27x", async () => {
    const hits = await BIOAVAILABILITY_RANGE.evaluate("10-27x bioavailable formulation");
    expect(hits.length).toBe(0);
  });
  it("passes 10-27 times bioavailability", async () => {
    const hits = await BIOAVAILABILITY_RANGE.evaluate("10 to 27 times bioavailability");
    expect(hits.length).toBe(0);
  });
  it("auto-remediates to 10-27x", async () => {
    const fixed = await BIOAVAILABILITY_RANGE.autoRemediate!("5-27x more bioavailable", {} as any);
    expect(fixed).toMatch(/10-27/);
  });
});

describe("MARSHALL.BRAND.HELIX_CONSUMER_ONLY", () => {
  it("flags when practitioner sees tier name", async () => {
    const hits = await HELIX_CONSUMER_ONLY.evaluate({ text: "Patient reached Gold tier", userRole: "practitioner" });
    expect(hits.length).toBe(1);
  });
  it("passes for consumer role", async () => {
    const hits = await HELIX_CONSUMER_ONLY.evaluate({ text: "Gold tier unlocked", userRole: "consumer" });
    expect(hits.length).toBe(0);
  });
  it("passes for admin role", async () => {
    const hits = await HELIX_CONSUMER_ONLY.evaluate({ text: "Gold tier unlocked", userRole: "admin" });
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.BRAND.LUCIDE_ONLY_ICONS", () => {
  it("flags react-icons import", async () => {
    const hits = await LUCIDE_ONLY_ICONS.evaluate('import { FaHeart } from "react-icons/fa"');
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
  it("passes lucide-react import", async () => {
    const hits = await LUCIDE_ONLY_ICONS.evaluate('import { Heart } from "lucide-react"');
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.BRAND.NO_EMOJIS_IN_OUTPUT", () => {
  it("flags emoji output", async () => {
    const hits = await NO_EMOJIS_IN_OUTPUT.evaluate("Great job \u{1F389} keep it up");
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
  it("strips emojis via autoRemediate", async () => {
    const fixed = await NO_EMOJIS_IN_OUTPUT.autoRemediate!("Great \u{1F389} work", {} as any);
    expect(fixed).not.toMatch(/\u{1F389}/u);
  });
});

describe("MARSHALL.BRAND.MEDICAL_DISCLAIMER_MANDATORY", () => {
  it("flags AI output lacking disclaimer", async () => {
    const hits = await MEDICAL_DISCLAIMER_MANDATORY.evaluate("Try this stack for better energy and focus. It boosts glucose metabolism.");
    expect(hits.length).toBe(1);
  });
  it("passes when disclaimer present", async () => {
    const hits = await MEDICAL_DISCLAIMER_MANDATORY.evaluate(
      "Try this stack. These statements have not been evaluated by the FDA. This product is not intended to diagnose treat cure or prevent any disease."
    );
    expect(hits.length).toBe(0);
  });
  it("autoRemediate appends disclaimer", async () => {
    const fixed = await MEDICAL_DISCLAIMER_MANDATORY.autoRemediate!("This stack supports focus.", {} as any);
    expect(fixed).toMatch(/not intended to diagnose/i);
  });
});
