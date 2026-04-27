import { describe, it, expect } from "vitest";
import {
  SEMANTIC_DISEASE_IMPLIED,
  SUPERLATIVE_OVERUSE,
  AMBIGUOUS_ENDORSEMENT,
  AUDIENCE_MISMATCH_RISK,
  BIO_OPTIMIZATION_COACHING,
  BIOAVAILABILITY_COACHING,
  MISSING_DSHEA_FOOTER,
  SHARING_PROTOCOL_REMINDER,
  CLEARANCE_DRIFT_PATTERN,
  type PrecheckDraft,
} from "../rules/precheck";

function draft(text: string, extras: Partial<PrecheckDraft> = {}): PrecheckDraft {
  return {
    text,
    author: {},
    productMatches: [{ sku: "FARM-METH-30", confidence: 0.95 }],
    ...extras,
  };
}

describe("MARSHALL.PRECHECK.SEMANTIC_DISEASE_IMPLIED", () => {
  it("flags pain-free-every-morning adjacent to a product", async () => {
    const hits = await SEMANTIC_DISEASE_IMPLIED.evaluate(draft("FarmCeutica MTHFR and I finally woke up pain-free every morning"));
    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe("P2");
  });
  it("passes structure/function phrasing", async () => {
    const hits = await SEMANTIC_DISEASE_IMPLIED.evaluate(draft("FarmCeutica supports healthy methylation"));
    expect(hits.length).toBe(0);
  });
  it("does not fire without product reference", async () => {
    const hits = await SEMANTIC_DISEASE_IMPLIED.evaluate(draft("I finally woke up pain-free every morning", { productMatches: [] }));
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.PRECHECK.SUPERLATIVE_OVERUSE", () => {
  it("flags two or more superlatives", async () => {
    const hits = await SUPERLATIVE_OVERUSE.evaluate(draft("the best and most powerful formulation on the market"));
    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe("P3");
  });
  it("passes a single superlative", async () => {
    const hits = await SUPERLATIVE_OVERUSE.evaluate(draft("our best formulation yet"));
    expect(hits.length).toBe(0);
  });
  it("passes plain copy", async () => {
    const hits = await SUPERLATIVE_OVERUSE.evaluate(draft("this protocol supports daily routine"));
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.PRECHECK.AMBIGUOUS_ENDORSEMENT", () => {
  it("flags hashtag-only disclosure with product mention", async () => {
    const hits = await AMBIGUOUS_ENDORSEMENT.evaluate(draft("Love this FarmCeutica MTHFR stack #ad"));
    expect(hits.length).toBe(1);
  });
  it("passes hashtag plus plain-English role", async () => {
    const hits = await AMBIGUOUS_ENDORSEMENT.evaluate(draft("I am a FarmCeutica certified practitioner #ad"));
    expect(hits.length).toBe(0);
  });
  it("does not fire without product mention", async () => {
    const hits = await AMBIGUOUS_ENDORSEMENT.evaluate(draft("Random #ad post with no product", { productMatches: [] }));
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.PRECHECK.AUDIENCE_MISMATCH_RISK", () => {
  it("flags peptide post when audience skews under 18", async () => {
    const hits = await AUDIENCE_MISMATCH_RISK.evaluate({
      text: "loving the new BPC-157 protocol",
      author: { audienceUnder18Pct: 0.3 },
      productMatches: [],
    });
    expect(hits.length).toBe(1);
  });
  it("passes adult audience", async () => {
    const hits = await AUDIENCE_MISMATCH_RISK.evaluate({
      text: "loving the new BPC-157 protocol",
      author: { audienceUnder18Pct: 0.05 },
      productMatches: [],
    });
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.PRECHECK.BIO_OPTIMIZATION_COACHING", () => {
  it("flags Vitality Score", async () => {
    const hits = await BIO_OPTIMIZATION_COACHING.evaluate("Your Vitality Score went up");
    expect(hits.length).toBe(1);
  });
  it("auto-remediates to Bio Optimization", async () => {
    const out = (await BIO_OPTIMIZATION_COACHING.autoRemediate!("Your Vitality Score went up", {} as never)) as string;
    expect(out).toContain("Bio Optimization");
  });
  it("passes canonical naming", async () => {
    expect((await BIO_OPTIMIZATION_COACHING.evaluate("Bio Optimization is climbing")).length).toBe(0);
  });
});

describe("MARSHALL.PRECHECK.BIOAVAILABILITY_COACHING", () => {
  it("flags 5-27x bioavailable", async () => {
    const hits = await BIOAVAILABILITY_COACHING.evaluate("5-27x more bioavailable formulation");
    expect(hits.length).toBe(1);
  });
  it("passes canonical 10-28x", async () => {
    expect((await BIOAVAILABILITY_COACHING.evaluate("10-28x bioavailability")).length).toBe(0);
  });
});

describe("MARSHALL.PRECHECK.MISSING_DSHEA_FOOTER", () => {
  it("flags supplement draft without DSHEA disclaimer", async () => {
    const hits = await MISSING_DSHEA_FOOTER.evaluate("Try this FarmCeutica supplement today");
    expect(hits.length).toBe(1);
  });
  it("passes when disclaimer present", async () => {
    const hits = await MISSING_DSHEA_FOOTER.evaluate("Try this FarmCeutica supplement. These statements have not been evaluated by the FDA.");
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.PRECHECK.SHARING_PROTOCOL_REMINDER", () => {
  it("reminds on peptide mention", async () => {
    const hits = await SHARING_PROTOCOL_REMINDER.evaluate("trying BPC-157 this month");
    expect(hits[0].severity).toBe("ADVISORY");
  });
  it("skips when already references practitioner guidance", async () => {
    const hits = await SHARING_PROTOCOL_REMINDER.evaluate("trying BPC-157. Sharing protocol: speak with your provider first.");
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.PRECHECK.CLEARANCE_DRIFT_PATTERN", () => {
  it("fires at 3 bad-faith events", async () => {
    const hits = await CLEARANCE_DRIFT_PATTERN.evaluate({ practitionerId: "p1", badFaithCount60d: 3 });
    expect(hits[0].severity).toBe("P1");
  });
  it("does not fire at 2", async () => {
    const hits = await CLEARANCE_DRIFT_PATTERN.evaluate({ practitionerId: "p1", badFaithCount60d: 2 });
    expect(hits.length).toBe(0);
  });
});
