/**
 * Jeffery Advisor Streamer (Prompt #60b — Section 3B; Prompt 219F)
 *
 * Streams a Claude completion. Plain UTF-8 chunks for AdvisorChat.
 * Generation-path enforcement: em/en dash strip + medical disclaimer.
 */

import type { AdvisorContext } from "./advisor-context-builder";
import { mapToFarmceuticaProducts, formatProductsForPrompt, detectPeptideMention } from "./product-mapper";
import { stripEmEnDashes } from "./hannah-persona";
import { formatMsgIdMarker } from "./advisor-msg-marker";

export { extractMsgIdMarker, formatMsgIdMarker } from "./advisor-msg-marker";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_TOKENS = 2000;
/** Generation timeout for the upstream Anthropic call (wall clock). */
const UPSTREAM_TIMEOUT_MS = 55_000;

// ⚕️ marker is parsed by MessageBubble for italic footer styling
const DISCLAIMER =
  "\n\n⚕️ This information is for educational purposes only and is not a substitute for professional medical advice. Please consult with your physician, naturopath, or licensed healthcare provider before making any changes to your health regimen.";

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

export interface StreamOptions {
  /** Optional: after full text is ready, return an assistant message id to append as marker. */
  onComplete?: (fullText: string, meta: {
    duration_ms: number;
    input_tokens: number;
    output_tokens: number;
    error?: string;
  }) => Promise<string | null | undefined>;
}

export function streamAdvisorResponse(
  ctx: AdvisorContext,
  userMessage: string,
  options?: StreamOptions
): StreamResult {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.PHOTO_AI_ANTHROPIC_API_KEY ||
    process.env.Anthropic_API_Key ||
    "";
  const t0 = Date.now();

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of ctx.conversationHistory) {
    if (m.message_role === "user" || m.message_role === "assistant") {
      messages.push({ role: m.message_role, content: m.content });
    }
  }
  messages.push({ role: "user", content: userMessage });

  let fullSystemPrompt = ctx.systemPrompt;
  if (ctx.jefferyInstructions.length > 0) {
    fullSystemPrompt +=
      "\n\n-- Jeffery active behavioral nudges --\n" +
      ctx.jefferyInstructions.map((i) => `- ${i}`).join("\n");
  }

  let resolveMeta: (m: Awaited<StreamResult["meta"]>) => void = () => {};
  const meta = new Promise<Awaited<StreamResult["meta"]>>((r) => {
    resolveMeta = r;
  });

  const encoder = new TextEncoder();

  async function finishWith(
    controller: ReadableStreamDefaultController<Uint8Array>,
    fullText: string,
    inputTokens: number,
    outputTokens: number,
    error?: string
  ) {
    let text = stripEmEnDashes(fullText);
    if (!text.includes("educational purposes only")) {
      text += DISCLAIMER;
      controller.enqueue(encoder.encode(DISCLAIMER));
    }

    const duration_ms = Date.now() - t0;
    let msgId: string | null | undefined;
    if (options?.onComplete) {
      try {
        msgId = await options.onComplete(text, {
          duration_ms,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          error,
        });
      } catch {
        msgId = null;
      }
    }
    if (msgId) {
      const marker = formatMsgIdMarker(msgId);
      controller.enqueue(encoder.encode(marker));
    }

    controller.close();
    resolveMeta({
      full_text: text,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      duration_ms,
      error,
    });
  }

  if (!apiKey) {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const fallback =
          "I am temporarily unable to reach the AI provider. Please try again in a moment. If this keeps happening, ask support to confirm the ANTHROPIC_API_KEY is set for this environment.";
        controller.enqueue(encoder.encode(stripEmEnDashes(fallback)));
        await finishWith(controller, fallback, 0, 0, "ANTHROPIC_API_KEY not set");
      },
    });
    return { stream, meta };
  }

  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let enrichedSystemPrompt = fullSystemPrompt;
        try {
          const productMatches = await mapToFarmceuticaProducts(userMessage, { limit: 6 });
          enrichedSystemPrompt += formatProductsForPrompt(productMatches);
        } catch (productErr) {
          console.warn(
            `[advisor-stream] product mapper failed: ${(productErr as Error).message}`
          );
        }

        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), UPSTREAM_TIMEOUT_MS);

        let upstream: Response;
        try {
          upstream = await fetch(ANTHROPIC_URL, {
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
            signal: ac.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "unknown");
          const fallback = `I hit an upstream error (HTTP ${upstream.status}). Please try again in a moment.`;
          controller.enqueue(encoder.encode(stripEmEnDashes(fallback)));
          await finishWith(controller, fallback, 0, 0, errText.slice(0, 200));
          return;
        }

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
                const delta = evt.delta as { text?: string } | undefined;
                if (delta?.text) {
                  const cleaned = stripEmEnDashes(delta.text);
                  fullText += cleaned;
                  controller.enqueue(encoder.encode(cleaned));
                }
              } else if (evtType === "message_start") {
                const usage = (evt.message as { usage?: { input_tokens?: number } } | undefined)
                  ?.usage;
                if (usage?.input_tokens) inputTokens = usage.input_tokens;
              } else if (evtType === "message_delta") {
                const usage = evt.usage as { output_tokens?: number } | undefined;
                if (usage?.output_tokens) outputTokens = usage.output_tokens;
              }
            } catch {
              // keep streaming
            }
          }
        }

        // Peptide marker for consumer role
        if (ctx.role === "consumer") {
          try {
            const peptide = await detectPeptideMention(fullText);
            if (peptide) {
              const marker = `\n\n[SHARE_PEPTIDE_BUTTON:${peptide}]`;
              controller.enqueue(encoder.encode(marker));
              fullText += marker;
            }
          } catch (peptideErr) {
            console.warn(
              `[advisor-stream] peptide detect failed: ${(peptideErr as Error).message}`
            );
          }
        }

        await finishWith(controller, fullText, inputTokens, outputTokens);
      } catch (e) {
        const msg = (e as Error).name === "AbortError"
          ? "The AI provider timed out. Please try again."
          : (e as Error).message;
        const errMsg = `I encountered an error: ${msg}`;
        try {
          controller.enqueue(encoder.encode(stripEmEnDashes(errMsg)));
          await finishWith(controller, fullText + errMsg, inputTokens, outputTokens, msg);
        } catch {
          resolveMeta({
            full_text: fullText + errMsg,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            duration_ms: Date.now() - t0,
            error: msg,
          });
        }
      }
    },
  });

  return { stream, meta };
}
