/**
 * Prompt 214b: Firecrawl REST client (no SDK / no package.json change).
 * Secrets: FIRECRAWL_API_KEY from env only.
 */

import { safeLog } from '@/lib/utils/safe-log';

/** v2 supports object screenshot formats + fullPage; search still on v1. */
const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape';
const FIRECRAWL_SEARCH_URL = 'https://api.firecrawl.dev/v1/search';

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
  | { type: 'click'; selector: string; all?: boolean }
  | { type: 'scroll'; direction?: 'up' | 'down' }
  | { type: 'screenshot'; fullPage?: boolean }
  | { type: 'executeJavascript'; script: string };

export interface ScrapeResult {
  ok: boolean;
  url: string;
  markdown?: string;
  title?: string;
  /** Base64 screenshot when formats include screenshot (no data-url prefix). */
  screenshotBase64?: string;
  /** Raw Firecrawl screenshot field before materialize (URL or data-url). */
  screenshotRaw?: string;
  skipped?: boolean;
  reason?: string;
  status?: number;
  usedActions?: boolean;
}

/**
 * Firecrawl returns screenshots as signed HTTPS URLs (expire ~24h), not
 * base64. Gemini vision needs raw base64. Materialize any URL / data-url
 * into bare base64; fail-open on fetch errors.
 */
export async function materializeScreenshotToBase64(
  raw: string | undefined | null,
  opts?: { timeoutMs?: number },
): Promise<string | undefined> {
  if (!raw || typeof raw !== 'string') return undefined;
  let s = raw.trim();
  if (!s) return undefined;

  if (s.startsWith('data:image')) {
    s = s.replace(/^data:image\/\w+;base64,/, '');
    return s.length > 200 ? s : undefined;
  }

  if (/^https?:\/\//i.test(s)) {
    const timeoutMs = opts?.timeoutMs ?? 15_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(s, {
        signal: controller.signal,
        headers: { Accept: 'image/*,*/*' },
      });
      if (!res.ok) {
        safeLog.warn('firecrawl.screenshot', 'fetch non-ok', {
          status: res.status,
          // never log full signed URL (may contain tokens)
          host: (() => {
            try {
              return new URL(s).host;
            } catch {
              return 'unknown';
            }
          })(),
        });
        return undefined;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      // Tiny payloads are placeholders; huge ones blow Gemini payload limits
      if (buf.length < 500 || buf.length > 8_000_000) return undefined;
      return buf.toString('base64');
    } catch (err) {
      safeLog.warn('firecrawl.screenshot', 'fetch failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }

  // Already bare base64 (legacy / self-hosted)
  if (s.length > 500 && !s.includes('://') && !/\s/.test(s)) {
    return s;
  }
  return undefined;
}

function pickScreenshotCandidate(data: {
  screenshot?: unknown;
  actions?: { screenshots?: unknown };
}): string {
  const primary = data.screenshot;
  if (typeof primary === 'string' && primary.trim()) return primary.trim();
  const shots = data.actions?.screenshots;
  if (Array.isArray(shots)) {
    for (const s of shots) {
      if (typeof s === 'string' && s.trim()) return s.trim();
    }
  }
  return '';
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

  // v2 formats: object form with fullPage for Supplement Facts below the fold.
  // Also include string aliases for proxy compatibility.
  const formats: unknown[] = [{ type: 'markdown' }, 'markdown'];
  if (opts?.includeScreenshot) {
    formats.push({ type: 'screenshot', fullPage: true });
    formats.push('screenshot');
  }

  const body: Record<string, unknown> = {
    url,
    formats,
    onlyMainContent: opts?.onlyMainContent ?? true,
    // Give SPA PDPs time to hydrate label tabs before capture
    waitFor: opts?.actions?.length ? 1500 : 800,
  };
  if (opts?.actions?.length) {
    body.actions = opts.actions.map((a) => {
      if (a.type === 'screenshot') {
        return { type: 'screenshot', fullPage: a.fullPage ?? true };
      }
      if (a.type === 'executeJavascript') {
        return { type: 'executeJavascript', script: a.script };
      }
      if (a.type === 'click') {
        return { type: 'click', selector: a.selector, all: a.all ?? false };
      }
      return a;
    });
  }

  try {
    const res = await fetch(FIRECRAWL_SCRAPE_URL, {
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
        // Newer Firecrawl shapes — screenshots are signed HTTPS URLs
        actions?: { screenshots?: string[] };
        metadata?: { title?: string };
      };
    };
    const markdown = json.data?.markdown ?? '';
    const title = json.data?.metadata?.title;
    const screenshotRaw = pickScreenshotCandidate(json.data ?? {});
    const screenshotBase64 = screenshotRaw
      ? await materializeScreenshotToBase64(screenshotRaw)
      : undefined;
    if (screenshotRaw && !screenshotBase64) {
      safeLog.warn('firecrawl.scrape', 'screenshot materialize empty', {
        hasRaw: true,
        rawKind: /^https?:\/\//i.test(screenshotRaw)
          ? 'url'
          : screenshotRaw.startsWith('data:')
            ? 'data_url'
            : 'other',
        rawLen: screenshotRaw.length,
      });
    }
    return {
      ok: true,
      url,
      markdown,
      title,
      screenshotBase64,
      screenshotRaw: screenshotRaw || undefined,
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
  // Interact: hydrate → open facts/ingredients tab → scroll → screenshot.
  // JS click is more reliable than brittle CSS across brand PDPs.
  const wantShot = opts?.screenshot ?? true;
  const openFactsTabScript = `
(() => {
  const re = /supplement\\s*facts|nutrition\\s*facts|ingredients|label|drug\\s*facts/i;
  const nodes = Array.from(document.querySelectorAll(
    'button, a, [role="tab"], [data-tab], .tab, .accordion-title, summary, h2, h3'
  ));
  for (const el of nodes) {
    const t = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
    if (t && re.test(t) && t.length < 80) {
      try { el.click(); return 'clicked:' + t.slice(0, 40); } catch (e) {}
    }
  }
  // Expand collapsed sections that mention facts
  for (const el of Array.from(document.querySelectorAll('details'))) {
    const t = (el.innerText || '').slice(0, 120);
    if (re.test(t)) { try { el.open = true; } catch (e) {} }
  }
  return 'no-tab';
})()
`.trim();

  const actions: FirecrawlAction[] = [
    { type: 'wait', milliseconds: 1600 },
    // JS click is fail-open (returns no-tab); avoid CSS click that can 400 the scrape
    { type: 'executeJavascript', script: openFactsTabScript },
    { type: 'wait', milliseconds: 1000 },
    { type: 'scroll', direction: 'down' },
    { type: 'wait', milliseconds: 700 },
    { type: 'scroll', direction: 'down' },
    { type: 'wait', milliseconds: 600 },
  ];
  if (wantShot) {
    actions.push({ type: 'screenshot', fullPage: true });
  }
  return firecrawlScrape(url, budget, {
    timeoutMs: opts?.timeoutMs ?? 55_000,
    includeScreenshot: wantShot,
    onlyMainContent: false,
    actions,
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
    const res = await fetch(FIRECRAWL_SEARCH_URL, {
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
