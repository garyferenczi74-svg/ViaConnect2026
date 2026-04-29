import { NextResponse } from "next/server";
import { withAbortTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";

const claudeBreaker = getCircuitBreaker("claude-api");

export async function POST(req: Request) {
  const { query } = await req.json();

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const response = await claudeBreaker.execute(() =>
      withAbortTimeout(
        (signal) => fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: `You are a supplement product identification expert. When given a search query, return a JSON array of the most likely supplement products the user is looking for. Each product must include: brandName, productName, formulation (key facts like "24g protein, 5.5g BCAAs per serving"), category, dosageForm, typicalDosage, and keyIngredients array.

Return ONLY valid JSON array. No markdown, no backticks, no explanation.
Maximum 6 results. Prioritize major brands users are most likely to take.
If the query is ambiguous, return the most popular matching products.`,
            messages: [{
              role: "user",
              content: `Search: "${query}". Return the top supplement product matches as JSON array.`,
            }],
          }),
          signal,
        }),
        10000,
        "api.ai.supplement-lookup.claude",
      )
    );

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";

    const suggestions = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
  } catch (err) {
    if (isCircuitBreakerError(err)) {
      safeLog.warn("api.ai.supplement-lookup", "claude circuit open", { error: err });
    } else if (isTimeoutError(err)) {
      safeLog.warn("api.ai.supplement-lookup", "claude timeout", { error: err });
    } else {
      safeLog.warn("api.ai.supplement-lookup", "fetch failed", { error: err });
    }
    return NextResponse.json({ suggestions: [], stale: true });
  }
}
