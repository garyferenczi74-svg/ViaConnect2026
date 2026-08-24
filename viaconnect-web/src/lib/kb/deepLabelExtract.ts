/**
 * Prompt 221 Phase 2 C1: deep label extraction pipeline.
 * Order: plain markdown parse → interact scrape → Gemini text → vision OCR.
 * Fail-closed; never invents.
 */

import {
  firecrawlScrape,
  firecrawlScrapeSupplementFacts,
  type FirecrawlBudget,
} from "@/lib/hounddog/firecrawl/client";
import { safeLog } from "@/lib/utils/safe-log";
import {
  geminiExtractCompetitiveLabel,
  pageLooksLikeHasLabelFacts,
} from "./geminiLabelExtract";
import {
  extractLabelAssetUrls,
  geminiVisionExtractLabel,
  geminiVisionExtractLabelFromUrl,
} from "./geminiLabelVision";
import {
  hasUnknownOnlyIngredients,
  parseCompetitiveLabelText,
  type CompetitiveLabelFacts,
} from "./parseCompetitiveLabel";

export interface DeepLabelExtractResult {
  facts: CompetitiveLabelFacts;
  path:
    | "regex"
    | "interact_regex"
    | "gemini_text"
    | "vision_screenshot"
    | "vision_asset"
    | "unknown";
  markdown: string;
  pageTitle?: string;
  markdownLen: number;
  scraped: boolean;
  interacted: boolean;
  visionUsed: boolean;
}

export async function deepExtractCompetitiveLabel(opts: {
  url: string;
  title?: string;
  existingMarkdown?: string;
  budget: FirecrawlBudget;
  /** Cap expensive vision calls. */
  allowVision?: boolean;
  allowInteract?: boolean;
}): Promise<DeepLabelExtractResult> {
  const title = opts.title ?? "";
  let markdown = opts.existingMarkdown ?? "";
  let scraped = false;
  let interacted = false;
  let visionUsed = false;
  let screenshotBase64: string | undefined;
  /** If base64 materialize failed, still try vision via signed URL fetch. */
  let screenshotRawUrl: string | undefined;

  // 1) Regex on existing text
  let facts = parseCompetitiveLabelText(markdown || title, { title });
  if (!hasUnknownOnlyIngredients(facts.ingredient_rows)) {
    return {
      facts,
      path: "regex",
      markdown,
      markdownLen: markdown.length,
      scraped,
      interacted,
      visionUsed,
    };
  }

  // 2) Interactive scrape for facts tabs (if no/thin markdown)
  if (opts.allowInteract !== false && opts.url && !opts.budget.hitBudget) {
    try {
      const needVision = opts.allowVision !== false;
      const scrape = await firecrawlScrapeSupplementFacts(opts.url, opts.budget, {
        screenshot: needVision,
        timeoutMs: 55_000,
      });
      scraped = true;
      if (scrape.ok) {
        interacted = Boolean(scrape.usedActions);
        if (scrape.markdown && scrape.markdown.length > markdown.length) {
          markdown = scrape.markdown;
        }
        if (scrape.title && !title) {
          // keep opts.title preferred
        }
        screenshotBase64 = scrape.screenshotBase64;
        if (
          !screenshotBase64 &&
          scrape.screenshotRaw &&
          /^https?:\/\//i.test(scrape.screenshotRaw)
        ) {
          screenshotRawUrl = scrape.screenshotRaw;
        }
        facts = parseCompetitiveLabelText(markdown, {
          title: scrape.title || title,
        });
        if (!hasUnknownOnlyIngredients(facts.ingredient_rows)) {
          return {
            facts: {
              ...facts,
              parse_notes: ["interact_scrape", ...facts.parse_notes],
            },
            path: "interact_regex",
            markdown,
            pageTitle: scrape.title,
            markdownLen: markdown.length,
            scraped,
            interacted,
            visionUsed,
          };
        }
      } else if (!markdown) {
        // last-ditch plain scrape if interact failed early
        const plain = await firecrawlScrape(opts.url, opts.budget, {
          includeScreenshot: needVision,
        });
        scraped = true;
        if (plain.ok && plain.markdown) {
          markdown = plain.markdown;
          screenshotBase64 = plain.screenshotBase64 ?? screenshotBase64;
          if (
            !screenshotBase64 &&
            plain.screenshotRaw &&
            /^https?:\/\//i.test(plain.screenshotRaw)
          ) {
            screenshotRawUrl = plain.screenshotRaw;
          }
          facts = parseCompetitiveLabelText(markdown, {
            title: plain.title || title,
          });
          if (!hasUnknownOnlyIngredients(facts.ingredient_rows)) {
            return {
              facts,
              path: "regex",
              markdown,
              pageTitle: plain.title,
              markdownLen: markdown.length,
              scraped,
              interacted,
              visionUsed,
            };
          }
        }
      }
    } catch (err) {
      safeLog.warn("kb.deepLabel", "interact scrape threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 3) Gemini text extract when page looks fact-like OR long product body
  if (
    markdown &&
    (pageLooksLikeHasLabelFacts(markdown) || markdown.length > 1500)
  ) {
    try {
      const gem = await geminiExtractCompetitiveLabel(markdown, { title });
      if (gem && !hasUnknownOnlyIngredients(gem.ingredient_rows)) {
        return {
          facts: gem,
          path: "gemini_text",
          markdown,
          markdownLen: markdown.length,
          scraped,
          interacted,
          visionUsed,
        };
      }
    } catch (err) {
      safeLog.warn("kb.deepLabel", "gemini text threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 4) Vision OCR on screenshot (base64 preferred; signed URL fallback)
  if (opts.allowVision !== false && (screenshotBase64 || screenshotRawUrl)) {
    try {
      visionUsed = true;
      let vis = screenshotBase64
        ? await geminiVisionExtractLabel(screenshotBase64, {
            mimeType: "image/png",
            title,
          })
        : null;
      if (
        (!vis || hasUnknownOnlyIngredients(vis.ingredient_rows)) &&
        screenshotRawUrl
      ) {
        vis = await geminiVisionExtractLabelFromUrl(screenshotRawUrl, {
          title,
        });
      }
      if (vis && !hasUnknownOnlyIngredients(vis.ingredient_rows)) {
        return {
          facts: vis,
          path: "vision_screenshot",
          markdown,
          markdownLen: markdown.length,
          scraped,
          interacted,
          visionUsed,
        };
      }
    } catch (err) {
      safeLog.warn("kb.deepLabel", "vision screenshot threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 5) Vision OCR on label assets linked from markdown
  if (opts.allowVision !== false && markdown && opts.url) {
    const assets = extractLabelAssetUrls(markdown, opts.url);
    for (const asset of assets.slice(0, 2)) {
      try {
        visionUsed = true;
        const vis = await geminiVisionExtractLabelFromUrl(asset, { title });
        if (vis && !hasUnknownOnlyIngredients(vis.ingredient_rows)) {
          return {
            facts: {
              ...vis,
              parse_notes: [`vision_asset:${asset.slice(0, 80)}`, ...vis.parse_notes],
            },
            path: "vision_asset",
            markdown,
            markdownLen: markdown.length,
            scraped,
            interacted,
            visionUsed,
          };
        }
      } catch {
        /* next asset */
      }
    }
  }

  return {
    facts,
    path: "unknown",
    markdown,
    markdownLen: markdown.length,
    scraped,
    interacted,
    visionUsed,
  };
}
