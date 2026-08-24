import { withAbortTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import type { Phase1Source } from "./phase1";
import type { Phase1Store, ResearchFeedInsert, SyncRecord } from "./store";

export interface IngestResult {
  source: Phase1Source;
  action: string;
  fetched: number;
  added: number;
  skipped: number;
  status: "ok" | "error";
  errorMessage: string | null;
}

export interface IngestDeps {
  store: Phase1Store;
  fetchFn: typeof fetch;
  env?: { NCBI_API_KEY?: string; FDA_API_KEY?: string };
  now?: Date;
}

const PUBMED_QUERY =
  "(supplement therapy OR peptide therapy OR functional medicine OR nutraceutical) AND (clinical trial[pt] OR meta-analysis[pt] OR systematic review[pt])";
const CTGOV_QUERY = "supplement OR peptide OR nutraceutical OR vitamin OR mineral";
const FDA_QUERY =
  "patient.drug.medicinalproduct:(vitamin+OR+supplement+OR+omega+OR+probiotic+OR+magnesium+OR+turmeric+OR+ginkgo+OR+st+john+wort)";

const MONTHS: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function pubmedDateToIso(value: string): string | null {
  const match = value.match(/^(\d{4})(?:\s+(\w+))?(?:\s+(\d{1,2}))?/);
  if (!match) return null;
  const year = match[1];
  const month = match[2] ? (MONTHS[match[2].slice(0, 3)] ?? "01") : "01";
  const day = match[3] ? match[3].padStart(2, "0") : "01";
  return `${year}-${month}-${day}`;
}

async function fetchJson(
  fetchFn: typeof fetch,
  url: string,
  label: string
): Promise<{ status: number; body: unknown }> {
  const response = await withAbortTimeout(
    (signal) => fetchFn(url, { signal }),
    20_000,
    label
  );
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`${label} returned non-JSON (HTTP ${response.status})`);
    }
  }
  return { status: response.status, body };
}

function syncFromIngest(
  runId: string,
  result: IngestResult,
  durationMs: number,
  metadata: Record<string, unknown>
): SyncRecord {
  return {
    runId,
    source: result.source,
    action: result.action,
    recordsIn: result.fetched,
    recordsAdded: result.added,
    recordsSkipped: result.skipped,
    recordsError: result.status === "error" ? 1 : 0,
    durationMs,
    status: result.status,
    errorMessage: result.errorMessage,
    metadata,
  };
}

export async function ingestPubmed(runId: string, deps: IngestDeps): Promise<IngestResult> {
  const t0 = Date.now();
  const days = 7;
  const retmax = 50;
  const ncbiKey = deps.env?.NCBI_API_KEY ?? "";

  try {
    const search = new URLSearchParams({
      db: "pubmed",
      term: `${PUBMED_QUERY} AND last ${days} days[edat]`,
      retmode: "json",
      retmax: String(retmax),
      sort: "pub+date",
    });
    if (ncbiKey) search.set("api_key", ncbiKey);

    const searchRes = await fetchJson(
      deps.fetchFn,
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${search}`,
      "ultrathink.pubmed.esearch"
    );
    if (searchRes.status >= 400) {
      throw new Error(`esearch HTTP ${searchRes.status}`);
    }
    const idList =
      (searchRes.body as { esearchresult?: { idlist?: string[] } } | null)?.esearchresult
        ?.idlist ?? [];

    if (idList.length === 0) {
      const result: IngestResult = {
        source: "pubmed",
        action: "esearch_empty",
        fetched: 0,
        added: 0,
        skipped: 0,
        status: "ok",
        errorMessage: null,
      };
      await deps.store.recordSync(syncFromIngest(runId, result, Date.now() - t0, { days, retmax }));
      return result;
    }

    const known = await deps.store.existingExternalIds("pubmed", idList);
    const fresh = idList.filter((id) => !known.has(id));
    const skipped = idList.length - fresh.length;

    if (fresh.length === 0) {
      const result: IngestResult = {
        source: "pubmed",
        action: "all_known",
        fetched: idList.length,
        added: 0,
        skipped,
        status: "ok",
        errorMessage: null,
      };
      await deps.store.recordSync(syncFromIngest(runId, result, Date.now() - t0, { days }));
      return result;
    }

    const summary = new URLSearchParams({
      db: "pubmed",
      id: fresh.join(","),
      retmode: "json",
    });
    if (ncbiKey) summary.set("api_key", ncbiKey);
    const summaryRes = await fetchJson(
      deps.fetchFn,
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summary}`,
      "ultrathink.pubmed.esummary"
    );
    if (summaryRes.status >= 400) {
      throw new Error(`esummary HTTP ${summaryRes.status}`);
    }
    const articles =
      (summaryRes.body as { result?: Record<string, {
        title?: string;
        authors?: Array<{ name: string }>;
        pubdate?: string;
      }> } | null)?.result ?? {};

    const rows: ResearchFeedInsert[] = fresh.map((pmid) => {
      const article = articles[pmid];
      return {
        source: "pubmed",
        external_id: pmid,
        title: article?.title ?? `[no title] ${pmid}`,
        abstract: null,
        authors: (article?.authors ?? []).map((author) => author.name),
        published_at: article?.pubdate ? pubmedDateToIso(article.pubdate) : null,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        raw_payload: (article ?? {}) as Record<string, unknown>,
        status: "pending",
      };
    });

    await deps.store.insertResearchRows(rows);
    const result: IngestResult = {
      source: "pubmed",
      action: "ingest_success",
      fetched: idList.length,
      added: rows.length,
      skipped,
      status: "ok",
      errorMessage: null,
    };
    await deps.store.recordSync(syncFromIngest(runId, result, Date.now() - t0, { days, retmax }));
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    safeLog.error("ultrathink.pubmed-ingest", "ingest failed", { runId, error });
    const result: IngestResult = {
      source: "pubmed",
      action: "ingest_error",
      fetched: 0,
      added: 0,
      skipped: 0,
      status: "error",
      errorMessage: message,
    };
    await deps.store.recordSync(syncFromIngest(runId, result, Date.now() - t0, { days }));
    return result;
  }
}

export async function ingestClinicalTrials(
  runId: string,
  deps: IngestDeps
): Promise<IngestResult> {
  const t0 = Date.now();
  const pageSize = 100;

  try {
    const params = new URLSearchParams({
      "query.term": CTGOV_QUERY,
      "filter.overallStatus": "RECRUITING|ACTIVE_NOT_RECRUITING|COMPLETED",
      pageSize: String(pageSize),
      format: "json",
      sort: "LastUpdatePostDate:desc",
    });
    const res = await fetchJson(
      deps.fetchFn,
      `https://clinicaltrials.gov/api/v2/studies?${params}`,
      "ultrathink.clinicaltrials.studies"
    );
    if (res.status >= 400) {
      throw new Error(`ctg HTTP ${res.status}`);
    }

    type Study = {
      protocolSection?: {
        identificationModule?: { nctId?: string; briefTitle?: string };
        descriptionModule?: { briefSummary?: string };
        statusModule?: { lastUpdateSubmitDate?: string };
        sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
      };
    };
    const studies = (res.body as { studies?: Study[] } | null)?.studies ?? [];

    if (studies.length === 0) {
      const result: IngestResult = {
        source: "clinicaltrials_gov",
        action: "empty",
        fetched: 0,
        added: 0,
        skipped: 0,
        status: "ok",
        errorMessage: null,
      };
      await deps.store.recordSync(syncFromIngest(runId, result, Date.now() - t0, { query: CTGOV_QUERY }));
      return result;
    }

    const nctIds = studies
      .map((study) => study.protocolSection?.identificationModule?.nctId)
      .filter((id): id is string => Boolean(id));
    const known = await deps.store.existingExternalIds("clinicaltrials_gov", nctIds);

    const rows: ResearchFeedInsert[] = studies
      .filter((study) => {
        const id = study.protocolSection?.identificationModule?.nctId;
        return Boolean(id) && !known.has(id!);
      })
      .map((study) => {
        const protocol = study.protocolSection!;
        const id = protocol.identificationModule!.nctId!;
        const sponsor = protocol.sponsorCollaboratorsModule?.leadSponsor?.name ?? null;
        return {
          source: "clinicaltrials_gov" as const,
          external_id: id,
          title: protocol.identificationModule?.briefTitle ?? `[NCT] ${id}`,
          abstract: protocol.descriptionModule?.briefSummary ?? null,
          authors: sponsor ? [sponsor] : [],
          published_at: protocol.statusModule?.lastUpdateSubmitDate ?? null,
          url: `https://clinicaltrials.gov/study/${id}`,
          raw_payload: study as Record<string, unknown>,
          status: "pending" as const,
        };
      });

    await deps.store.insertResearchRows(rows);
    const result: IngestResult = {
      source: "clinicaltrials_gov",
      action: "ingest_success",
      fetched: studies.length,
      added: rows.length,
      skipped: studies.length - rows.length,
      status: "ok",
      errorMessage: null,
    };
    await deps.store.recordSync(
      syncFromIngest(runId, result, Date.now() - t0, { query: CTGOV_QUERY, pageSize })
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    safeLog.error("ultrathink.clinicaltrials-ingest", "ingest failed", { runId, error });
    const result: IngestResult = {
      source: "clinicaltrials_gov",
      action: "ingest_error",
      fetched: 0,
      added: 0,
      skipped: 0,
      status: "error",
      errorMessage: message,
    };
    await deps.store.recordSync(syncFromIngest(runId, result, Date.now() - t0, { query: CTGOV_QUERY }));
    return result;
  }
}

export async function ingestOpenFda(runId: string, deps: IngestDeps): Promise<IngestResult> {
  const t0 = Date.now();
  const days = 14;
  const limit = 100;
  const fdaKey = deps.env?.FDA_API_KEY ?? "";
  const fromDate = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const toDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const search = `${FDA_QUERY}+AND+receivedate:[${fromDate}+TO+${toDate}]`;

  try {
    const url = new URL("https://api.fda.gov/drug/event.json");
    url.searchParams.set("search", search);
    url.searchParams.set("limit", String(limit));
    if (fdaKey) url.searchParams.set("api_key", fdaKey);

    const res = await fetchJson(deps.fetchFn, url.toString(), "ultrathink.openfda.event");
    if (res.status === 404) {
      const result: IngestResult = {
        source: "openfda",
        action: "no_hits",
        fetched: 0,
        added: 0,
        skipped: 0,
        status: "ok",
        errorMessage: null,
      };
      await deps.store.recordSync(syncFromIngest(runId, result, Date.now() - t0, { search }));
      return result;
    }
    if (res.status >= 400) {
      throw new Error(`openfda HTTP ${res.status}`);
    }

    type FdaReport = {
      safetyreportid?: string;
      receivedate?: string;
      serious?: string;
      patient?: {
        drug?: Array<{ medicinalproduct?: string }>;
        reaction?: Array<{ reactionmeddrapt?: string }>;
      };
    };
    const results = (res.body as { results?: FdaReport[] } | null)?.results ?? [];
    const reportIds = results
      .map((report) => report.safetyreportid)
      .filter((id): id is string => Boolean(id));
    const known = await deps.store.existingExternalIds("openfda", reportIds);

    const rows: ResearchFeedInsert[] = results
      .filter((report) => report.safetyreportid && !known.has(report.safetyreportid))
      .map((report) => {
        const id = report.safetyreportid!;
        const drugs = (report.patient?.drug ?? [])
          .map((drug) => drug.medicinalproduct ?? "?")
          .filter(Boolean);
        const reactions = (report.patient?.reaction ?? [])
          .map((reaction) => reaction.reactionmeddrapt ?? "?")
          .filter(Boolean);
        return {
          source: "openfda" as const,
          external_id: id,
          title: `FDA AE: ${drugs.slice(0, 3).join(", ")} → ${reactions.slice(0, 3).join(", ")}`,
          abstract: `Drugs involved: ${drugs.join("; ")}\nReactions: ${reactions.join("; ")}\nSerious: ${report.serious === "1"}`,
          authors: [],
          published_at: report.receivedate
            ? `${report.receivedate.slice(0, 4)}-${report.receivedate.slice(4, 6)}-${report.receivedate.slice(6, 8)}`
            : null,
          url: `https://api.fda.gov/drug/event.json?search=safetyreportid:${id}`,
          raw_payload: report as Record<string, unknown>,
          status: "pending" as const,
        };
      });

    await deps.store.insertResearchRows(rows);
    const result: IngestResult = {
      source: "openfda",
      action: "ingest_success",
      fetched: results.length,
      added: rows.length,
      skipped: results.length - rows.length,
      status: "ok",
      errorMessage: null,
    };
    await deps.store.recordSync(syncFromIngest(runId, result, Date.now() - t0, { days, limit }));
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    safeLog.error("ultrathink.fda-ingest", "ingest failed", { runId, error });
    const result: IngestResult = {
      source: "openfda",
      action: "ingest_error",
      fetched: 0,
      added: 0,
      skipped: 0,
      status: "error",
      errorMessage: message,
    };
    await deps.store.recordSync(syncFromIngest(runId, result, Date.now() - t0, { days }));
    return result;
  }
}

export async function ingestPhase1Source(
  source: Phase1Source,
  runId: string,
  deps: IngestDeps
): Promise<IngestResult> {
  if (source === "pubmed") return ingestPubmed(runId, deps);
  if (source === "clinicaltrials_gov") return ingestClinicalTrials(runId, deps);
  return ingestOpenFda(runId, deps);
}
