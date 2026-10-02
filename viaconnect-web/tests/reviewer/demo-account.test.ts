import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  REVIEWER_APP_METADATA_KEY,
  ReviewerEmailAlreadyRegisteredError,
  SAMPLE_FULL_NAME,
  SAMPLE_PROFILE_COLUMNS,
  buildSampleProfilePatch,
  mergeReviewerAppMetadata,
  readReviewerCredentials,
  seedReviewerDemoAccount,
  type ReviewerAuthAdmin,
  type ReviewerAuthUser,
  type ReviewerProfileStore,
  type SampleConsentRow,
  type SampleProfilePatch,
} from "@/lib/reviewer/demo-account";

const PASSWORD = "sample-secret-value";
const EMAIL = "reviewer@example.com";

function credentials() {
  return readReviewerCredentials({
    REVIEWER_EMAIL: `  ${EMAIL.toUpperCase()}  `,
    REVIEWER_PASSWORD: PASSWORD,
  });
}

class MemoryAuth implements ReviewerAuthAdmin {
  users = new Map<string, ReviewerAuthUser>();
  created = 0;
  updated = 0;
  failCreateAsRegistered = false;

  async findByEmail(email: string): Promise<ReviewerAuthUser | null> {
    for (const user of this.users.values()) {
      if ((user.email ?? "").toLowerCase() === email.toLowerCase()) return user;
    }
    return null;
  }

  async createConfirmedUser(input: {
    email: string;
    password: string;
    userMetadata: Record<string, unknown>;
    appMetadata: Record<string, unknown>;
  }): Promise<ReviewerAuthUser> {
    if (input.password !== PASSWORD) throw new Error("unexpected password");
    if (this.failCreateAsRegistered) throw new ReviewerEmailAlreadyRegisteredError();
    this.created += 1;
    const user: ReviewerAuthUser = {
      id: "user-created",
      email: input.email,
      appMetadata: input.appMetadata,
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateConfirmedUser(input: {
    id: string;
    email: string;
    password: string;
    userMetadata: Record<string, unknown>;
    appMetadata: Record<string, unknown>;
  }): Promise<ReviewerAuthUser> {
    if (input.password !== PASSWORD) throw new Error("unexpected password");
    this.updated += 1;
    const user: ReviewerAuthUser = {
      id: input.id,
      email: input.email,
      appMetadata: input.appMetadata,
    };
    this.users.set(user.id, user);
    return user;
  }
}

class MemoryProfiles implements ReviewerProfileStore {
  patches: SampleProfilePatch[] = [];
  consents: SampleConsentRow[] = [];

  async writeSampleProfile(
    _userId: string,
    patch: SampleProfilePatch,
  ): Promise<"inserted" | "updated"> {
    this.patches.push(patch);
    return this.patches.length === 1 ? "inserted" : "updated";
  }

  async ensureConsent(row: SampleConsentRow): Promise<"inserted" | "already_present"> {
    const exists = this.consents.some((item) => item.user_id === row.user_id);
    if (exists) return "already_present";
    this.consents.push(row);
    return "inserted";
  }
}

describe("reviewer demo account plan", () => {
  it("requires both env vars and does not invent a password", () => {
    expect(() => readReviewerCredentials({})).toThrow(/REVIEWER_EMAIL and REVIEWER_PASSWORD/);
    expect(() =>
      readReviewerCredentials({ REVIEWER_EMAIL: EMAIL, REVIEWER_PASSWORD: "short" }),
    ).toThrow(/at least 8/);
  });

  it("labels the profile and omits health columns", () => {
    const patch = buildSampleProfilePatch();
    expect(Object.keys(patch).sort()).toEqual([...SAMPLE_PROFILE_COLUMNS].sort());
    expect(patch.full_name).toBe(SAMPLE_FULL_NAME);
    expect(patch.role).toBe("patient");
    expect(patch).not.toHaveProperty("bio_optimization_score");
    expect(patch).not.toHaveProperty("health_concerns");
    expect(patch).not.toHaveProperty("family_history");
    expect(patch).not.toHaveProperty("symptoms_physical");
    expect(patch).not.toHaveProperty("date_of_birth");
    expect(patch).not.toHaveProperty("vitality_score");
  });

  it("keeps existing app_metadata and sets reviewer to boolean true", () => {
    const merged = mergeReviewerAppMetadata({ plan: "free", reviewer: false });
    expect(merged.plan).toBe("free");
    expect(merged[REVIEWER_APP_METADATA_KEY]).toBe(true);
  });

  it("creates once and updates the same user on the next run", async () => {
    const auth = new MemoryAuth();
    const profiles = new MemoryProfiles();
    const first = await seedReviewerDemoAccount({
      credentials: credentials(),
      acceptedAtIso: "2026-10-02T00:00:00.000Z",
      auth,
      profiles,
    });
    const second = await seedReviewerDemoAccount({
      credentials: credentials(),
      acceptedAtIso: "2026-10-02T01:00:00.000Z",
      auth,
      profiles,
    });

    expect(first.authAction).toBe("created");
    expect(second.authAction).toBe("updated");
    expect(second.userId).toBe(first.userId);
    expect(auth.created).toBe(1);
    expect(auth.updated).toBe(1);
    expect(first.healthDataSeeded).toBe(false);
    expect(second.profileAction).toBe("updated");
    expect(second.consentAction).toBe("already_present");
    expect(JSON.stringify(second)).not.toContain(PASSWORD);
    expect(profiles.patches[0]?.full_name).toBe(SAMPLE_FULL_NAME);
  });

  it("updates when create reports the email is already registered", async () => {
    const auth = new MemoryAuth();
    auth.failCreateAsRegistered = true;
    auth.users.set("user-existing", {
      id: "user-existing",
      email: EMAIL,
      appMetadata: { keep: "yes" },
    });
    let lookups = 0;
    const find = auth.findByEmail.bind(auth);
    auth.findByEmail = async (email) => {
      lookups += 1;
      if (lookups === 1) return null;
      return find(email);
    };
    const profiles = new MemoryProfiles();
    const result = await seedReviewerDemoAccount({
      credentials: credentials(),
      acceptedAtIso: "2026-10-02T00:00:00.000Z",
      auth,
      profiles,
    });
    expect(result.authAction).toBe("updated");
    expect(result.userId).toBe("user-existing");
    expect(auth.users.get("user-existing")?.appMetadata.keep).toBe("yes");
    expect(auth.users.get("user-existing")?.appMetadata.reviewer).toBe(true);
  });
});

describe("reviewer seed script and review notes", () => {
  const root = path.resolve(__dirname, "../..");

  it("does not hardcode credentials in the seed script", () => {
    const source = readFileSync(
      path.join(root, "scripts/seed/reviewer-demo-account.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/REVIEWER_PASSWORD\s*[:=]\s*["'](?!\$)[^"']+["']/);
    expect(source).not.toMatch(/password\s*:\s*["'][^"']+["']/);
    expect(source).toContain("REVIEWER_EMAIL");
    expect(source).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).not.toContain("bio_optimization_score");
  });

  it("quotes the Terms section 3 disclaimer exactly", () => {
    const terms = readFileSync(path.join(root, "src/app/(legal)/terms/page.tsx"), "utf8");
    const notes = readFileSync(
      path.join(root, "docs/store-launch/app-review-notes-draft.md"),
      "utf8",
    );
    const marker = "The Services are for informational and wellness purposes only.";
    const ending = "call your local emergency number immediately.";
    const start = terms.indexOf(marker);
    const end = terms.indexOf(ending);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const disclaimer = terms
      .slice(start, end + ending.length)
      .replace(/\s+/g, " ")
      .trim();
    expect(notes).toContain(disclaimer);
    expect(notes).toContain("[REVIEWER_EMAIL]");
    expect(notes).toContain("[REVIEWER_PASSWORD]");
    expect(notes).toContain("UNCONFIRMED");
    expect(notes).not.toMatch(/\d+\s*mg\b/i);
  });
});
