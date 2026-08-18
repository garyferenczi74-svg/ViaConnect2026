import { createClient } from "@/lib/supabase/server";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";
import { safeLog } from "@/lib/utils/safe-log";
import { isTimeoutError, withTimeout } from "@/lib/utils/with-timeout";
import type { LocationOption } from "./types";

const SEARCH_TIMEOUT_MS = 1500;
const SEARCH_OP = "api.location.search";
const Q_CAP = 80;
const LIM = 20;

export type LocationSearchKind = "country" | "subdivision" | "city";

export type SearchLocationsInput = {
  kind: LocationSearchKind;
  q?: string | null;
  country?: string | null;
  subdivision?: string | null;
};

export type LocationSearchResponse = {
  ok: true;
  items: LocationOption[];
  failOpen: boolean;
};

type RpcError = { message: string };

type CountryRow = { code: string; name: string };
type SubdivisionRow = { code: string; name: string; country_code: string };
type CityRow = {
  id: number | string;
  name: string;
  subdivision_code: string | null;
  country_code: string;
};

type RpcResponse<T> = { data: T[] | null; error: RpcError | null };

type SearchRpcClient = {
  rpc(
    fn: "search_ref_countries",
    args: { q: string; lim: number },
  ): PromiseLike<RpcResponse<CountryRow>>;
  rpc(
    fn: "search_ref_subdivisions",
    args: { p_country: string; q: string; lim: number },
  ): PromiseLike<RpcResponse<SubdivisionRow>>;
  rpc(
    fn: "search_ref_cities",
    args: { p_country: string; p_subdivision: string; q: string; lim: number },
  ): PromiseLike<RpcResponse<CityRow>>;
};

export function toSearchResponse(input: {
  timedOut: boolean;
  error?: unknown;
  items?: LocationOption[];
}): LocationSearchResponse {
  if (input.timedOut || input.error) {
    return { ok: true, items: [], failOpen: true };
  }
  return { ok: true, items: input.items ?? [], failOpen: false };
}

function capQuery(q: string | null | undefined): string {
  return (q ?? "").slice(0, Q_CAP);
}

function asSearchClient(client: unknown): SearchRpcClient {
  return client as SearchRpcClient;
}

function mapRowsToOptions(
  kind: LocationSearchKind,
  data: unknown,
): LocationOption[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const items: LocationOption[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const rec = row as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name : "";
    if (name.length === 0) {
      continue;
    }
    if (kind === "city") {
      items.push({ value: name, label: name });
      continue;
    }
    const code = typeof rec.code === "string" ? rec.code : "";
    if (code.length === 0) {
      continue;
    }
    items.push({ value: code, label: name });
  }
  return items;
}

function invokeSearchRpc(
  client: SearchRpcClient,
  kind: LocationSearchKind,
  q: string,
  country: string,
  subdivision: string,
): PromiseLike<RpcResponse<CountryRow | SubdivisionRow | CityRow>> {
  if (kind === "country") {
    return client.rpc("search_ref_countries", { q, lim: LIM });
  }
  if (kind === "subdivision") {
    return client.rpc("search_ref_subdivisions", {
      p_country: country,
      q,
      lim: LIM,
    });
  }
  return client.rpc("search_ref_cities", {
    p_country: country,
    p_subdivision: subdivision,
    q,
    lim: LIM,
  });
}

function failOpenResponse(
  kind: LocationSearchKind,
  started: number,
  reason: string,
  timedOut: boolean,
  error: unknown,
): LocationSearchResponse {
  safeLog.warn(SEARCH_OP, "fail_open", {
    reason,
    kind,
    durationMs: Date.now() - started,
    timedOut,
  });
  return toSearchResponse({ timedOut, error, items: [] });
}

export async function searchLocations(
  input: SearchLocationsInput,
): Promise<LocationSearchResponse> {
  const kind = input.kind;
  const q = capQuery(input.q);
  const country = (input.country ?? "").trim();
  const subdivision = (input.subdivision ?? "").trim();

  if (kind === "city" && q.trim() === "") {
    return toSearchResponse({ timedOut: false, error: null, items: [] });
  }
  if (kind === "subdivision" && country === "") {
    return toSearchResponse({ timedOut: false, error: null, items: [] });
  }
  if (kind === "city" && country === "") {
    return toSearchResponse({ timedOut: false, error: null, items: [] });
  }

  const started = Date.now();
  const breaker = getCircuitBreaker(SEARCH_OP);

  try {
    const supabase = await createClient();
    const { data, error } = await breaker.execute(() =>
      withTimeout(
        Promise.resolve(
          invokeSearchRpc(asSearchClient(supabase), kind, q, country, subdivision),
        ),
        SEARCH_TIMEOUT_MS,
        SEARCH_OP,
      ),
    );

    if (error) {
      return failOpenResponse(kind, started, "rpc_error", false, error);
    }

    return toSearchResponse({
      timedOut: false,
      error: null,
      items: mapRowsToOptions(kind, data),
    });
  } catch (err) {
    const timedOut = isTimeoutError(err);
    const reason = timedOut
      ? "timeout"
      : isCircuitBreakerError(err)
        ? "circuit_open"
        : "exception";
    return failOpenResponse(kind, started, reason, timedOut, err);
  }
}
