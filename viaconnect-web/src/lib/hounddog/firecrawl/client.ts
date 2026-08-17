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
  // Production historically used lower-case firecrawl_api_key in Vercel
  const k =
    process.env.FIRECRAWL_API_KEY?.trim() ||
    process.env.firecrawl_api_key?.trim() ||
    "";
  return k.length > 0 ? k : null;
}

export type FirecrawlAction =
  | { type: 'wait'; milliseconds?: number; selector?: string }
  | { type: 'click'; selector: string }
  | { type: 'scroll'; direction?: 'up' | 'down'; }
  | { type: 'screenshot'; fullPage?: boolean };

export interface ScrapeResult {
  ok: boolean;
  url: string;
  markdown?: string;
  title?: string;
  /** Base64 screenshot when formats include screenshot (no data-url prefix). */
  screenshotBase64?: string;
  skipped?: boolean;
  reason?: string;
  status?: number;
  usedActions?: boolean;
}

/**
 * Firecrawl scrape endpoint. Fail-open: returns skipped on missing key / budget / error.
 * Optional actions drive JS tabs (Supplement Facts) before capture.
 */
export async function firecrawlScrape(
  url: string,
  budget: FirecrawlBudget,
  opts?: {
    timeoutMs?: number;
    actions?: FirecrawlAction[];
    /** Include screenshot for vision OCR (costs more). */
    includeScreenshot?: boolean;
    onlyMainContent?: boolean;
  },
): Promise<ScrapeResult> {
  const key = apiKey();
  if (!key) {
    return { ok: false, url, skipped: true, reason: 'FIRECRAWL_API_KEY unset' };
  }
  // Interactive scrapes burn more credit; charge 2 when actions/screenshot used
  const creditCost =
    (opts?.actions?.length ?? 0) > 0 || opts?.includeScreenshot ? 2 : 1;
  if (!canSpend(budget, 1, creditCost)) {
    budget.hitBudget = true;
    return { ok: false, url, skipped: true, reason: 'budget_exhausted' };
  }

  const timeoutMs = opts?.timeoutMs ?? FIRECRAWL_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const formats: string[] = ['markdown'];
  if (opts?.includeScreenshot) formats.push('screenshot');

  const body: Record<string, unknown> = {
    url,
    formats,
    onlyMainContent: opts?.onlyMainContent ?? true,
  };
  if (opts?.actions?.length) {
    body.actions = opts.actions.map((a) => {
      if (a.type === 'screenshot') {
        return { type: 'screenshot', fullPage: a.fullPage ?? false };
      }
      return a;
    });
  }

  try {
    const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    recordSpend(budget, 1, creditCost);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      safeLog.warn('firecrawl.scrape', 'non-ok', {
        url,
        status: res.status,
        // never log API key
        bodyPreview: errBody.slice(0, 200),
      });
      return { ok: false, url, status: res.status, reason: `http_${res.status}` };
    }

    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        markdown?: string;
        screenshot?: string;
        metadata?: { title?: string };
      };
    };
    const markdown = json.data?.markdown ?? '';
    const title = json.data?.metadata?.title;
    let screenshotBase64 = json.data?.screenshot;
    if (screenshotBase64?.startsWith('data:image')) {
      screenshotBase64 = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
    }
    return {
      ok: true,
      url,
      markdown,
      title,
      screenshotBase64: screenshotBase64 || undefined,
      usedActions: Boolean(opts?.actions?.length),
    };
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
 * Click common Supplement Facts / Ingredients tabs then scrape.
 * Best-effort selectors; fails open to plain markdown if actions error.
 */
export async function firecrawlScrapeSupplementFacts(
  url: string,
  budget: FirecrawlBudget,
  opts?: { timeoutMs?: number; screenshot?: boolean },
): Promise<ScrapeResult> {
  // Try interactive first: wait for JS, scroll to facts, click common tab hooks.
  // Use portable CSS only (no Playwright :has-text).
  const interactive = await firecrawlScrape(url, budget, {
    timeoutMs: opts?.timeoutMs ?? 60_000,
    includeScreenshot: opts?.screenshot ?? true,
    onlyMainContent: false,
    actions: [
      { type: 'wait', milliseconds: 1500 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 600 },
      { type: 'click', selector: '[role="tab"]' },
      { type: 'wait', milliseconds: 500 },
      { type: 'click', selector: 'button[aria-controls*="fact"], a[href*="supplement"], button[class*="ingredient"], [data-tab*="fact"], [id*="supplement-facts"], [class*="supplement-facts"]' },
      { type: 'wait', milliseconds: 1200 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 800 },
    ],
  });

  if (interactive.ok && (interactive.markdown?.length ?? 0) > 200) {
    return interactive;
  }

  // Fallback plain scrape (still counts if interactive failed without spend... interactive already spent)
  if (!interactive.ok && interactive.reason === 'budget_exhausted') {
    return interactive;
  }
  return firecrawlScrape(url, budget, {
    timeoutMs: opts?.timeoutMs,
    includeScreenshot: opts?.screenshot ?? false,
  });
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
