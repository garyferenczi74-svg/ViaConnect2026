/**
 * Prompt 214b: Firecrawl REST client (no SDK / no package.json change).
 * Secrets: FIRECRAWL_API_KEY from env only.
 */

import { safeLog } from '@/lib/utils/safe-log';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';

/** Scrape-appropriate timeout (ms); distinct from internal 3-5s budget. */
export const FIRECRAWL_TIMEOUT_MS = 45_000;

export interface FirecrawlBudget {
  pagesUsed: number;
  creditsUsed: number;
  maxPages: number;
  maxCredits: number;
  hitBudget: boolean;
}

export function defaultBudget(): FirecrawlBudget {
  const maxPages = Number(process.env.FIRECRAWL_MAX_PAGES_PER_RUN ?? '25');
  const maxCredits = Number(process.env.FIRECRAWL_MAX_CREDITS_PER_DAY ?? '200');
  return {
    pagesUsed: 0,
    creditsUsed: 0,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 25,
    maxCredits: Number.isFinite(maxCredits) && maxCredits > 0 ? maxCredits : 200,
    hitBudget: false,
  };
}

export function canSpend(budget: FirecrawlBudget, pages = 1, credits = 1): boolean {
  if (budget.hitBudget) return false;
  if (budget.pagesUsed + pages > budget.maxPages) return false;
  if (budget.creditsUsed + credits > budget.maxCredits) return false;
  return true;
}

export function recordSpend(budget: FirecrawlBudget, pages = 1, credits = 1): void {
  budget.pagesUsed += pages;
  budget.creditsUsed += credits;
  if (budget.pagesUsed >= budget.maxPages || budget.creditsUsed >= budget.maxCredits) {
    budget.hitBudget = true;
  }
}

function apiKey(): string | null {
  const k = process.env.FIRECRAWL_API_KEY?.trim();
  return k && k.length > 0 ? k : null;
}

export interface ScrapeResult {
  ok: boolean;
  url: string;
  markdown?: string;
  title?: string;
  skipped?: boolean;
  reason?: string;
  status?: number;
}

/**
 * Firecrawl scrape endpoint. Fail-open: returns skipped on missing key / budget / error.
 */
export async function firecrawlScrape(
  url: string,
  budget: FirecrawlBudget,
  opts?: { timeoutMs?: number },
): Promise<ScrapeResult> {
  const key = apiKey();
  if (!key) {
    return { ok: false, url, skipped: true, reason: 'FIRECRAWL_API_KEY unset' };
  }
  if (!canSpend(budget, 1, 1)) {
    budget.hitBudget = true;
    return { ok: false, url, skipped: true, reason: 'budget_exhausted' };
  }

  const timeoutMs = opts?.timeoutMs ?? FIRECRAWL_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
      signal: controller.signal,
    });

    recordSpend(budget, 1, 1);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      safeLog.warn('firecrawl.scrape', 'non-ok', {
        url,
        status: res.status,
        // never log API key
        bodyPreview: body.slice(0, 200),
      });
      return { ok: false, url, status: res.status, reason: `http_${res.status}` };
    }

    const json = (await res.json()) as {
      success?: boolean;
      data?: { markdown?: string; metadata?: { title?: string } };
    };
    const markdown = json.data?.markdown ?? '';
    const title = json.data?.metadata?.title;
    return { ok: true, url, markdown, title };
  } catch (err) {
    safeLog.warn('firecrawl.scrape', 'failed open', {
      url,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      url,
      skipped: true,
      reason: err instanceof Error ? err.message : 'scrape_error',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Firecrawl search (public web). Used for social/public discovery.
 */
export async function firecrawlSearch(
  query: string,
  budget: FirecrawlBudget,
  limit = 5,
): Promise<{ ok: boolean; results: Array<{ url: string; title?: string; description?: string }>; reason?: string }> {
  const key = apiKey();
  if (!key) {
    return { ok: false, results: [], reason: 'FIRECRAWL_API_KEY unset' };
  }
  if (!canSpend(budget, 1, 1)) {
    budget.hitBudget = true;
    return { ok: false, results: [], reason: 'budget_exhausted' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT_MS);

  try {
    const res = await fetch(`${FIRECRAWL_BASE}/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }),
      signal: controller.signal,
    });
    recordSpend(budget, 1, 1);

    if (!res.ok) {
      return { ok: false, results: [], reason: `http_${res.status}` };
    }

    const json = (await res.json()) as {
      data?: Array<{ url?: string; title?: string; description?: string }>;
    };
    const results = (json.data ?? [])
      .filter((r) => typeof r.url === 'string')
      .map((r) => ({
        url: r.url as string,
        title: r.title,
        description: r.description,
      }));
    return { ok: true, results };
  } catch (err) {
    safeLog.warn('firecrawl.search', 'failed open', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, results: [], reason: 'search_error' };
  } finally {
    clearTimeout(timer);
  }
}

export function isFirecrawlConfigured(): boolean {
  return Boolean(apiKey());
}
