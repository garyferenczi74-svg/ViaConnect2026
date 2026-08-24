import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dispatchPhase1Feeds } from "../dispatchPhase1";
import { computeNextRunAt, selectDuePhase1Feeds, type FeedRow } from "../phase1";
import type { Phase1Store, ResearchFeedInsert, SyncRecord } from "../store";

function feed(overrides: Partial<FeedRow> & Pick<FeedRow, "source">): FeedRow {
  return {
    id: overrides.id ?? `id-${overrides.source}`,
    source: overrides.source,
    is_active: overrides.is_active ?? true,
    next_run_at: overrides.next_run_at ?? "2026-04-09T00:00:00.000Z",
    circuit_open_until: overrides.circuit_open_until ?? null,
    last_status: overrides.last_status ?? "ok",
  };
}

function createMemoryStore(initial: FeedRow[]): Phase1Store & {
  feeds: FeedRow[];
  research: ResearchFeedInsert[];
  syncLog: SyncRecord[];
} {
  const state = {
    feeds: initial.map((row) => ({ ...row })),
    research: [] as ResearchFeedInsert[],
    syncLog: [] as SyncRecord[],
  };

  const store: Phase1Store & typeof state = {
    ...state,
    async listActiveFeeds() {
      return state.feeds.filter((row) => row.is_active);
    },
    async updateNextRunAt(id, nextRunAt) {
      const row = state.feeds.find((feedRow) => feedRow.id === id);
      if (row) row.next_run_at = nextRunAt;
    },
    async existingExternalIds(source, ids) {
      return new Set(
        state.research
          .filter((row) => row.source === source && ids.includes(row.external_id))
          .map((row) => row.external_id)
      );
    },
    async insertResearchRows(rows) {
      state.research.push(...rows);
    },
    async recordSync(entry) {
      state.syncLog.push(entry);
    },
  };
  return store;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockPhase1Network(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch")) {
      return jsonResponse({ esearchresult: { idlist: ["39000001"] } });
    }
    if (url.includes("eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary")) {
      return jsonResponse({
        result: {
          "39000001": {
            uid: "39000001",
            title: "Methylated folate trial",
            authors: [{ name: "Lee J" }],
            pubdate: "2026 Aug 1",
          },
        },
      });
    }
    if (url.includes("clinicaltrials.gov/api/v2/studies")) {
      return jsonResponse({
        studies: [
          {
            protocolSection: {
              identificationModule: { nctId: "NCT09990001", briefTitle: "NMN trial" },
              descriptionModule: { briefSummary: "Adults 55-75" },
              statusModule: { lastUpdateSubmitDate: "2026-08-20" },
              sponsorCollaboratorsModule: { leadSponsor: { name: "NIH" } },
            },
          },
        ],
      });
    }
    if (url.includes("api.fda.gov/drug/event.json")) {
      return jsonResponse({
        results: [
          {
            safetyreportid: "FDA-AE-1001",
            receivedate: "20260820",
            serious: "1",
            patient: {
              drug: [{ medicinalproduct: "MAGNESIUM" }],
              reaction: [{ reactionmeddrapt: "Nausea" }],
            },
          },
        ],
      });
    }
    return jsonResponse({ error: "unexpected url" }, 500);
  }) as unknown as typeof fetch;
}

const NOW = new Date("2026-08-24T12:00:00.000Z");

describe("selectDuePhase1Feeds", () => {
  it("selects only overdue Phase 1 sources", () => {
    const due = selectDuePhase1Feeds(
      [
        feed({ source: "pubmed", next_run_at: "2026-04-09T01:27:10.000Z" }),
        feed({ source: "clinicaltrials_gov", next_run_at: "2026-08-25T00:00:00.000Z" }),
        feed({ source: "openfda", next_run_at: "2026-04-09T19:27:14.000Z" }),
        feed({ source: "dsld", next_run_at: "2026-04-09T19:23:05.000Z" }),
        feed({ source: "bright_data", next_run_at: "2026-04-09T19:23:05.000Z" }),
      ],
      NOW
    );
    expect(due.map((row) => row.source).sort()).toEqual(["openfda", "pubmed"]);
  });
});

describe("dispatchPhase1Feeds", () => {
  it("advances next_run_at and writes ingest plus sync_log on success", async () => {
    const store = createMemoryStore([
      feed({ source: "pubmed" }),
      feed({ source: "clinicaltrials_gov" }),
      feed({ source: "openfda" }),
      feed({ source: "dsld" }),
      feed({ source: "examine" }),
    ]);

    const result = await dispatchPhase1Feeds({
      store,
      fetchFn: mockPhase1Network(),
      env: {},
      now: NOW,
      runId: "00000000-0000-4000-8000-000000000021",
    });

    expect(result.due.sort()).toEqual(["clinicaltrials_gov", "openfda", "pubmed"]);
    expect(result.skippedNotPhase1.sort()).toEqual(["dsld", "examine"]);
    expect(result.dispatched.every((row) => row.status === "ok")).toBe(true);

    expect(store.feeds.find((row) => row.source === "pubmed")?.next_run_at).toBe(
      computeNextRunAt("pubmed", NOW)
    );
    expect(store.feeds.find((row) => row.source === "clinicaltrials_gov")?.next_run_at).toBe(
      computeNextRunAt("clinicaltrials_gov", NOW)
    );
    expect(store.feeds.find((row) => row.source === "openfda")?.next_run_at).toBe(
      computeNextRunAt("openfda", NOW)
    );
    expect(store.feeds.find((row) => row.source === "dsld")?.next_run_at).toBe(
      "2026-04-09T00:00:00.000Z"
    );

    expect(store.research.map((row) => row.external_id).sort()).toEqual([
      "39000001",
      "FDA-AE-1001",
      "NCT09990001",
    ]);

    const pubmedSync = store.syncLog.find((row) => row.source === "pubmed");
    const ctgSync = store.syncLog.find((row) => row.source === "clinicaltrials_gov");
    const fdaSync = store.syncLog.find((row) => row.source === "openfda");
    const orchSync = store.syncLog.find((row) => row.source === "orchestrator");

    expect(pubmedSync).toMatchObject({
      action: "ingest_success",
      status: "ok",
      recordsAdded: 1,
    });
    expect(ctgSync).toMatchObject({
      action: "ingest_success",
      status: "ok",
      recordsAdded: 1,
    });
    expect(fdaSync).toMatchObject({
      action: "ingest_success",
      status: "ok",
      recordsAdded: 1,
    });
    expect(orchSync).toMatchObject({
      action: "tick",
      status: "ok",
      recordsAdded: 3,
    });
  });

  it("does not invent live keys and still ingests when env keys are absent", async () => {
    const fetchFn = mockPhase1Network();
    const store = createMemoryStore([feed({ source: "pubmed" })]);

    await dispatchPhase1Feeds({
      store,
      fetchFn,
      env: {},
      now: NOW,
    });

    const calledUrl = String((fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]);
    expect(calledUrl).not.toContain("api_key=");
    expect(store.syncLog.some((row) => row.source === "pubmed" && row.status === "ok")).toBe(true);
  });

  it("records an honest error when an API rejects and still advances next_run_at", async () => {
    const store = createMemoryStore([feed({ source: "openfda" })]);
    const fetchFn = vi.fn(async () => jsonResponse({ error: "upstream" }, 500)) as unknown as typeof fetch;

    const result = await dispatchPhase1Feeds({
      store,
      fetchFn,
      env: {},
      now: NOW,
    });

    expect(result.dispatched[0]).toMatchObject({
      source: "openfda",
      status: "error",
      action: "ingest_error",
      errorMessage: "openfda HTTP 500",
    });
    expect(store.feeds[0].next_run_at).toBe(computeNextRunAt("openfda", NOW));
    expect(store.research).toHaveLength(0);
    expect(store.syncLog.find((row) => row.source === "openfda")).toMatchObject({
      status: "error",
      action: "ingest_error",
    });
  });

  it("skips Phase 1 feeds that are not due yet", async () => {
    const store = createMemoryStore([
      feed({ source: "pubmed", next_run_at: "2026-08-24T18:00:00.000Z" }),
    ]);
    const fetchFn = mockPhase1Network();

    const result = await dispatchPhase1Feeds({
      store,
      fetchFn,
      env: {},
      now: NOW,
    });

    expect(result.due).toEqual([]);
    expect(result.skippedNotDue).toEqual(["pubmed"]);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(store.feeds[0].next_run_at).toBe("2026-08-24T18:00:00.000Z");
  });
});

describe("vercel cron registration", () => {
  it("schedules /api/cron/ultrathink-feeds separately from hannah-research", () => {
    const vercel = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    expect(vercel).toMatch(/\/api\/cron\/ultrathink-feeds/);
    expect(vercel).toMatch(/\/api\/cron\/hannah-research/);
    expect(vercel).toMatch(/6,16,26,36,46,56 \* \* \* \*/);
  });
});
