import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ultrathink/feeds/dispatchPhase1", () => ({
  dispatchPhase1Feeds: vi.fn(),
}));

vi.mock("@/lib/ultrathink/feeds/store", () => ({
  createSupabasePhase1Store: vi.fn(() => ({ kind: "store" })),
}));

vi.mock("@/lib/utils/safe-log", () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET, POST } from "../route";
import { dispatchPhase1Feeds } from "@/lib/ultrathink/feeds/dispatchPhase1";

const SECRET = "test-cron-secret-brief21";

function request(auth?: string, method: "GET" | "POST" = "GET"): Request {
  const headers: Record<string, string> = {};
  if (auth !== undefined) headers.authorization = auth;
  return new Request("http://localhost/api/cron/ultrathink-feeds", { method, headers });
}

describe("GET/POST /api/cron/ultrathink-feeds", () => {
  let prior: string | undefined;

  beforeEach(() => {
    prior = process.env.CRON_SECRET;
    process.env.CRON_SECRET = SECRET;
    vi.mocked(dispatchPhase1Feeds).mockReset();
  });

  afterEach(() => {
    if (prior === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prior;
  });

  it("rejects missing bearer", async () => {
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(dispatchPhase1Feeds).not.toHaveBeenCalled();
  });

  it("dispatches Phase 1 on authorized GET", async () => {
    vi.mocked(dispatchPhase1Feeds).mockResolvedValue({
      ok: true,
      runId: "run-1",
      durationMs: 12,
      due: ["pubmed"],
      skippedNotDue: [],
      skippedNotPhase1: ["dsld"],
      dispatched: [],
      nextRunAt: { pubmed: "2026-08-24T18:00:00.000Z" },
    });

    const res = await GET(request(`Bearer ${SECRET}`));
    const body = (await res.json()) as { ok: boolean; result: { due: string[] } };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.result.due).toEqual(["pubmed"]);
    expect(dispatchPhase1Feeds).toHaveBeenCalledTimes(1);
  });

  it("accepts authorized POST for pg_cron", async () => {
    vi.mocked(dispatchPhase1Feeds).mockResolvedValue({
      ok: true,
      runId: "run-2",
      durationMs: 8,
      due: [],
      skippedNotDue: ["pubmed"],
      skippedNotPhase1: [],
      dispatched: [],
      nextRunAt: {},
    });

    const res = await POST(request(`Bearer ${SECRET}`, "POST"));
    expect(res.status).toBe(200);
    expect(dispatchPhase1Feeds).toHaveBeenCalledTimes(1);
  });
});
