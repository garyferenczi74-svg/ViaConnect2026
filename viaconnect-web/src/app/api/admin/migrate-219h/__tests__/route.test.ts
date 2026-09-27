/**
 * migrate-219h must not echo exception text to the caller.
 * Uses the real presence check. The admin client throws; the function
 * fails open with a fixed reason.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { createAdminClientOrNull } = vi.hoisted(() => ({
  createAdminClientOrNull: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
  createAdminClientOrNull,
}));

vi.mock("@/lib/utils/safe-log", () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST } from "../route";
import { safeLog } from "@/lib/utils/safe-log";

const SECRET = "test-cron-secret-value";

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  createAdminClientOrNull.mockReset();
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("POST /api/admin/migrate-219h", () => {
  it("does not return the thrown admin-client message", async () => {
    const secretDetail = "postgres password leaked in this message";
    createAdminClientOrNull.mockImplementation(() => {
      throw new Error(secretDetail);
    });

    const response = await POST(
      new Request("http://localhost/api/admin/migrate-219h", {
        method: "POST",
        headers: { authorization: `Bearer ${SECRET}` },
      })
    );
    const body = (await response.json()) as {
      ok: boolean;
      applied: boolean;
      reason?: string;
      error?: string;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      applied: false,
      reason: "fail_open:threw",
    });
    expect(JSON.stringify(body)).not.toContain(secretDetail);
    expect(safeLog.error).toHaveBeenCalledWith(
      "ops.ensureSchema",
      "presence check threw; failed open",
      expect.objectContaining({
        error: expect.objectContaining({ message: secretDetail }),
      })
    );
  });
});
