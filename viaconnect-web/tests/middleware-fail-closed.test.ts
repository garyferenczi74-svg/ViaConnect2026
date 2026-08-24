import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  authTimeoutAction,
  failClosedOnAuthTimeout,
} from "@/lib/auth/session-role";

const REPO = path.resolve(__dirname, "..");

describe("middleware fail-closed contract (Brief 11)", () => {
  it("denies clinician/admin routes when auth cannot be confirmed", () => {
    expect(failClosedOnAuthTimeout("/practitioner/dashboard")).toBe(true);
    expect(authTimeoutAction("/practitioner/dashboard")).toBe("deny_page");
    expect(authTimeoutAction("/api/practitioner/invite-patient")).toBe("deny_api");
    expect(authTimeoutAction("/admin/hounddog")).toBe("deny_page");
  });

  it("edge middleware calls the fail-closed helper instead of passing through", () => {
    const src = readFileSync(path.join(REPO, "src/middleware.ts"), "utf8");
    expect(src).toContain("authTimeoutAction");
    expect(src).toContain("denyClinicianAdminOnAuthTimeout");
    expect(src).toContain("AUTH_TIMEOUT");
    expect(src).not.toContain("session check timed out, passing request through");
  });
});
