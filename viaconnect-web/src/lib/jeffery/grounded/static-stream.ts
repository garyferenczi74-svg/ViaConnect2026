/**
 * Stream a pre-assembled grounded answer using the same SSE-ish UTF-8 + onComplete
 * contract as streamAdvisorResponse so Marshall still scans the full text.
 */

import { stripEmEnDashes } from "@/lib/jeffery/hannah-persona";
import { formatMsgIdMarker } from "@/lib/jeffery/advisor-msg-marker";
import type { StreamOptions, StreamResult } from "@/lib/jeffery/advisor-stream";
import { EDUCATIONAL_DISCLAIMER } from "./copy";

const DISCLAIMER = `\n\n⚕️ ${EDUCATIONAL_DISCLAIMER}`;

export function streamStaticAdvisorAnswer(text: string, options?: StreamOptions): StreamResult {
  const t0 = Date.now();
  let resolveMeta: (m: Awaited<StreamResult["meta"]>) => void = () => {};
  const meta = new Promise<Awaited<StreamResult["meta"]>>((r) => {
    resolveMeta = r;
  });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = stripEmEnDashes(text);
      controller.enqueue(encoder.encode(fullText));
      if (!fullText.includes("educational purposes only")) {
        fullText += DISCLAIMER;
        controller.enqueue(encoder.encode(DISCLAIMER));
      }
      const duration_ms = Date.now() - t0;
      let msgId: string | null | undefined;
      if (options?.onComplete) {
        try {
          msgId = await options.onComplete(fullText, {
            duration_ms,
            input_tokens: 0,
            output_tokens: 0,
          });
        } catch {
          msgId = null;
        }
      }
      if (msgId) {
        controller.enqueue(encoder.encode(formatMsgIdMarker(msgId)));
      }
      controller.close();
      resolveMeta({
        full_text: fullText,
        input_tokens: 0,
        output_tokens: 0,
        duration_ms,
      });
    },
  });

  return { stream, meta };
}
