/**
 * Jeffery Advisor Streamer (Prompt #60b — Section 3B)
 *
 * Streams a Claude completion to the browser as Server-Sent Events.
 * Uses claude-sonnet-4-6 (1M context) for advisor responses — fast, cheap,
 * and excellent at structured guardrail-aware chat.
 *
 * Returns a ReadableStream that the Next.js route handler passes to the
 * browser as text/event-stream. Each chunk is plain UTF-8 text (not JSON-
 * wrapped) so the AdvisorChat client component can append it directly.
 */

import type { AdvisorContext } from "./advisor-context-builder";
// Prompt #60d — guardrails: product enrichment + peptide detection
import { mapToFarmceuticaProducts, formatProductsForPrompt, detectPeptideMention } from "./product-mapper";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_TOKENS = 2000;

// Prompt #60d — mandatory medical disclaimer hard-appended to every response
// (NEVER trust the model to remember it)
const DISCLAIMER = "\n\n⚕️ This information is for educational purposes only and is not a substitute for professional medical advice. Please consult with your physician, naturopath, or licensed healthcare provider before making any changes to your health regimen.";

export interface StreamResult {
  stream: ReadableStream<Uint8Array>;
  meta: Promise<{
    full_text: string;
    input_tokens: number;
    output_tokens: number;
    duration_ms: number;
    error?: string;
  }>;
}

/**
 * Stream a Claude completion. Returns the live ReadableStream + a meta promise
 * that resolves once the stream finishes (used by the route handler to write
 * the final telemetry row to the DB after the response is sent).
 */
export function streamAdvisorResponse(
  ctx: AdvisorContext,
  userMessage: string
): StreamResult {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const t0 = Date.now();

  // Build the messages array: history + new user turn
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of ctx.conversationHistory) {
    if (m.message_role === "user" || m.message_role === "assistant") {
      messages.push({ role: m.message_role, content: m.content });
    }
  }
  messages.push({ role: "user", content: userMessage });

  // Add Jeffery's behavioral nudges as a final system note (appended to system prompt)
  let fullSystemPrompt = ctx.systemPrompt;
  if (ctx.jefferyInstructions.length > 0) {
    fullSystemPrompt += "\n\n── Jeffery™ active behavioral nudges ──\n" +
      ctx.jefferyInstructions.map(i => `- ${i}`).join("\n");
  }

  // Resolve meta promise once streaming completes
  let resolveMeta: (m: Awaited<StreamResult["meta"]>) => void = () => {};
  const meta = new Promise<Awaited<StreamResult["meta"]>>(r => { resolveMeta = r; });

  // Graceful early-fail when ANTHROPIC_API_KEY is missing — emit a single
  // friendly chunk and resolve meta with an error. Disclaimer is still
  // hard-appended so the guardrail holds even in the fallback path.
  if (!apiKey) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const fallback = "I'm not configured yet — the ANTHROPIC_API_KEY secret hasn't been set on this Supabase project. Ask an admin to run `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` to enable me.";
        const fallbackWithDisclaimer = fallback + DISCLAIMER;
        controller.enqueue(new TextEncoder().encode(fallbackWithDisclaimer));
        controller.close();
        resolveMeta({
          full_text: fallbackWithDisclaimer,
          input_tokens: 0,
          output_tokens: 0,
          duration_ms: Date.now() - t0,
          error: "ANTHROPIC_API_KEY not set",
        });
      },
    });
    return { stream, meta };
  }

  // Real Anthropic streaming
  const encoder = new TextEncoder();
  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Prompt #60d — Guardrail 1: enrich the system prompt with the
        // FarmCeutica catalog matches for THIS user query so the model is
        // constrained to recommend only from the supplied list. Failure here
        // must NEVER block the response — fall through silently.
        let enrichedSystemPrompt = fullSystemPrompt;
        try {
          const productMatches = await mapToFarmceuticaProducts(userMessage, { limit: 6 });
          enrichedSystemPrompt += formatProductsForPrompt(productMatches);
        } catch (productErr) {
          console.warn(`[advisor-stream] product mapper failed: ${(productErr as Error).message}`);
        }

        const upstream = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: MAX_TOKENS,
            system: enrichedSystemPrompt,
            messages,
            stream: true,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "unknown");
          const fallback = `I hit an upstream error (HTTP ${upstream.status}). Please try again in a moment.`;
          const fallbackWithDisclaimer = fallback + DISCLAIMER;
          controller.enqueue(encoder.encode(fallbackWithDisclaimer));
          controller.close();
          resolveMeta({ full_text: fallbackWithDisclaimer, input_tokens: 0, output_tokens: 0, duration_ms: Date.now() - t0, error: errText.slice(0, 200) });
          return;
        }

        // Parse Anthropic SSE stream — events are line-delimited "data: {json}"
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload) as Record<string, unknown>;
              const evtType = evt.type as string;
              if (evtType === "content_block_delta") {
                const delta = (evt.delta as { text?: string } | undefined);
                if (delta?.text) {
                  fullText += delta.text;
                  controller.enqueue(encoder.encode(delta.text));
                }
              } else if (evtType === "message_start") {
                const usage = (evt.message as { usage?: { input_tokens?: number } } | undefined)?.usage;
                if (usage?.input_tokens) inputTokens = usage.input_tokens;
              } else if (evtType === "message_delta") {
                const usage = (evt.usage as { output_tokens?: number } | undefined);
                if (usage?.output_tokens) outputTokens = usage.output_tokens;
              }
            } catch {
              // ignore individual parse errors — keep streaming
            }
          }
        }

        // Prompt #60d — Guardrail 3: hard-append the medical disclaimer.
        // We do NOT trust the model to remember it.
        controller.enqueue(encoder.encode(DISCLAIMER));
        fullText += DISCLAIMER;

        // Prompt #60d — Guardrail 2: peptide sharing protocol.
        // For consumer role only, scan the response for any peptide name from
        // the registry. If found, append a [SHARE_PEPTIDE_BUTTON:NAME] marker
        // token. The MessageBubble component parses this token and renders
        // a "Share with Practitioner" button.
        if (ctx.role === "consumer") {
          try {
            const peptide = await detectPeptideMention(fullText);
            if (peptide) {
              const marker = `\n\n[SHARE_PEPTIDE_BUTTON:${peptide}]`;
              controller.enqueue(encoder.encode(marker));
              fullText += marker;
            }
          } catch (peptideErr) {
            console.warn(`[advisor-stream] peptide detect failed: ${(peptideErr as Error).message}`);
          }
        }

        controller.close();
        resolveMeta({ full_text: fullText, input_tokens: inputTokens, output_tokens: outputTokens, duration_ms: Date.now() - t0 });
      } catch (e) {
        const msg = (e as Error).message;
        const errMsg = `I encountered an error: ${msg}` + DISCLAIMER;
        controller.enqueue(encoder.encode(errMsg));
        controller.close();
        resolveMeta({ full_text: fullText + errMsg, input_tokens: inputTokens, output_tokens: outputTokens, duration_ms: Date.now() - t0, error: msg });
      }
    },
  });

  return { stream, meta };
}
