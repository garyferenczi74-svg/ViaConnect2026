/**
 * migrate-219h must not echo exception text to the caller.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { ensureContinuousOpsSchema } = vi.hoisted(() => ({
  ensureContinuousOpsSchema: vi.fn(),
}));

vi.mock("@/lib/jeffery/ops/ensureSchema", () => ({
  ensureContinuousOpsSchema,
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
  ensureContinuousOpsSchema.mockReset();
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("POST /api/admin/migrate-219h", () => {
  it("returns a generic error and logs the thrown detail", async () => {
    const secretDetail = "postgres password leaked in this message";
    ensureContinuousOpsSchema.mockRejectedValue(new Error(secretDetail));

    const response = await POST(
      new Request("http://localhost/api/admin/migrate-219h", {
        method: "POST",
        headers: { authorization: `Bearer ${SECRET}` },
      })
    );
    const body = (await response.json()) as { ok: boolean; error?: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("presence_check_failed");
    expect(JSON.stringify(body)).not.toContain(secretDetail);
    expect(safeLog.error).toHaveBeenCalledWith(
      "api.admin.migrate-219h",
      "threw",
      expect.objectContaining({
        error: expect.objectContaining({ message: secretDetail }),
      })
    );
  });
});
