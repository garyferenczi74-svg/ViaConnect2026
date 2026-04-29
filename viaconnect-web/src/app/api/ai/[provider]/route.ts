import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withTimeout, withAbortTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";

const claudeBreaker = getCircuitBreaker("claude-api");
const grokBreaker = getCircuitBreaker("grok-api");
const gptBreaker = getCircuitBreaker("openai-api");

const ALLOWED_PROVIDERS = ["claude", "grok", "gpt", "consensus"] as const;
type Provider = (typeof ALLOWED_PROVIDERS)[number];

// In-memory rate limiter: 10 req/min per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

interface AiRequestBody {
  messages: Array<{ role: string; content: string }>;
  context?: Record<string, unknown>;
  patientId?: string;
  model?: string;
}

function apiEnvelope(
  success: boolean,
  data?: unknown,
  error?: string,
  errorCode?: string
) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error, errorCode: errorCode ?? "UNKNOWN" }),
    timestamp: new Date().toISOString(),
  };
}

async function writeAuditLog(
  userId: string,
  action: string,
  resourceType: string,
  metadata?: Record<string, unknown>,
  ip?: string | null
) {
  try {
    const supabase = createClient();
    // @ts-expect-error -- audit_logs table not in generated Database type
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      metadata: (metadata ?? null) as import("@/lib/supabase/types").Json,
      ip_address: ip ?? null,
    });
  } catch {
    // Audit log failure should not break the request
  }
}

// ---------- Provider-specific callers ----------

async function callClaude(
  messages: AiRequestBody["messages"],
  context?: Record<string, unknown>
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const systemPrompt = [
    "You are a precision health AI assistant for ViaConnect GeneX360 by ViaConnect.",
    "Provide evidence-based clinical reasoning. Never diagnose — only suggest.",
    "Bioavailability figure is 10–27x. Peptide strategy: retatrutide + tirzepatide only (no semaglutide).",
    context ? `Context: ${JSON.stringify(context)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

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
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
        }),
        signal,
      }),
      15000,
      "api.ai.provider.claude",
    )
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return {
    provider: "claude",
    content:
      data.content?.[0]?.text ?? data.content?.[0]?.value ?? "",
    model: data.model,
    usage: data.usage,
  };
}

async function callGrok(
  messages: AiRequestBody["messages"],
  context?: Record<string, unknown>
) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY not configured");

  const systemMessage = [
    "You are a real-time health research assistant for ViaConnect GeneX360.",
    "Provide up-to-date research findings, citations, and evidence summaries.",
    context ? `Context: ${JSON.stringify(context)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await grokBreaker.execute(() =>
    withAbortTimeout(
      (signal) => fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-beta",
          messages: [
            { role: "system", content: systemMessage },
            ...messages,
          ],
          max_tokens: 4096,
        }),
        signal,
      }),
      15000,
      "api.ai.provider.grok",
    )
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Grok API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return {
    provider: "grok",
    content: data.choices?.[0]?.message?.content ?? "",
    model: data.model,
    usage: data.usage,
  };
}

async function callGpt(
  messages: AiRequestBody["messages"],
  context?: Record<string, unknown>
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const systemMessage = [
    "You are a clinical data extraction assistant for ViaConnect GeneX360.",
    "Extract structured data from genetic reports, lab results, and clinical notes.",
    context ? `Context: ${JSON.stringify(context)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await gptBreaker.execute(() =>
    withAbortTimeout(
      (signal) => fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemMessage },
            ...messages,
          ],
          max_tokens: 4096,
        }),
        signal,
      }),
      15000,
      "api.ai.provider.gpt",
    )
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GPT API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return {
    provider: "gpt",
    content: data.choices?.[0]?.message?.content ?? "",
    model: data.model,
    usage: data.usage,
  };
}

async function callConsensus(
  messages: AiRequestBody["messages"],
  context?: Record<string, unknown>
) {
  const [claudeResult, grokResult, gptResult] = await Promise.allSettled([
    callClaude(messages, context),
    callGrok(messages, context),
    callGpt(messages, context),
  ]);

  const individual_responses = [claudeResult, grokResult, gptResult].map(
    (r, i) => {
      const providerName = (["claude", "grok", "gpt"] as const)[i];
      if (r.status === "fulfilled") {
        return { provider: providerName, content: r.value.content, status: "success" as const };
      }
      return { provider: providerName, content: null, status: "error" as const, error: r.reason?.message };
    }
  );

  const successResponses = individual_responses.filter((r) => r.status === "success");
  const successCount = successResponses.length;

  // Calculate confidence based on how many providers responded
  const confidence =
    successCount === 3
      ? "high"
      : successCount === 2
        ? "moderate"
        : successCount === 1
          ? "low"
          : "none";

  // Build consensus summary from successful responses
  let consensus = "";
  if (successCount > 0) {
    const contents = successResponses
      .map((r) => `[${r.provider?.toUpperCase()}]: ${r.content}`)
      .join("\n\n---\n\n");

    consensus = [
      `Multi-model consensus (${successCount}/3 providers responded):`,
      "",
      contents,
    ].join("\n");
  }

  const rationale =
    successCount === 3
      ? "All three AI providers returned results. Cross-reference for highest confidence."
      : successCount === 2
        ? "Two of three providers responded. Review for partial consensus."
        : successCount === 1
          ? "Only one provider responded. Treat as single-source opinion."
          : "No providers responded successfully.";

  return {
    consensus,
    confidence,
    individual_responses,
    rationale,
  };
}

// ---------- Streaming support for Claude ----------

async function streamClaude(
  messages: AiRequestBody["messages"],
  context?: Record<string, unknown>
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const systemPrompt = [
    "You are a precision health AI assistant for ViaConnect GeneX360 by ViaConnect.",
    "Provide evidence-based clinical reasoning. Never diagnose — only suggest.",
    "Bioavailability figure is 10–27x. Peptide strategy: retatrutide + tirzepatide only (no semaglutide).",
    context ? `Context: ${JSON.stringify(context)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      stream: true,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    }),
  });

  if (!response.ok || !response.body) {
    const err = await response.text();
    throw new Error(`Claude streaming error ${response.status}: ${err}`);
  }

  return response.body;
}

// ---------- Route handler ----------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await params;
  const provider = rawProvider as Provider;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? null;

  // Validate provider
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return NextResponse.json(
      apiEnvelope(
        false,
        undefined,
        `Invalid provider: ${provider}. Use: ${ALLOWED_PROVIDERS.join(", ")}`,
        "INVALID_PROVIDER"
      ),
      { status: 400 }
    );
  }

  // Auth check
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      apiEnvelope(false, undefined, "Unauthorized", "AUTH_REQUIRED"),
      { status: 401 }
    );
  }

  // Rate limiting
  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      apiEnvelope(
        false,
        undefined,
        "Rate limit exceeded. Max 10 requests per minute.",
        "RATE_LIMIT"
      ),
      { status: 429 }
    );
  }

  // Parse body
  let body: AiRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      apiEnvelope(false, undefined, "Invalid JSON body", "INVALID_BODY"),
      { status: 400 }
    );
  }

  const { messages, context, patientId } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      apiEnvelope(
        false,
        undefined,
        "messages array required",
        "MISSING_MESSAGES"
      ),
      { status: 400 }
    );
  }

  // Check for streaming request (only Claude supports streaming)
  const wantsStream = request.headers.get("accept") === "text/event-stream";

  try {
    // Audit log the request
    await writeAuditLog(user.id, "ai_request", "ai_proxy", {
      provider,
      message_count: messages.length,
      patient_id: patientId ?? null,
      streaming: wantsStream,
    }, ip);

    // Streaming path for Claude
    if (wantsStream && provider === "claude") {
      const stream = await streamClaude(messages, context);
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming path
    let result: unknown;

    switch (provider) {
      case "claude":
        result = await callClaude(messages, context);
        break;
      case "grok":
        result = await callGrok(messages, context);
        break;
      case "gpt":
        result = await callGpt(messages, context);
        break;
      case "consensus":
        result = await callConsensus(messages, context);
        break;
    }

    return NextResponse.json(apiEnvelope(true, result));
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    if (isCircuitBreakerError(err)) {
      safeLog.warn("api.ai.provider", "circuit open", { provider, userId: user.id, error: err });
      await writeAuditLog(user.id, "ai_error", "ai_proxy", { provider, error: message, code: "circuit-open" }, ip);
      return NextResponse.json(apiEnvelope(false, undefined, "AI service temporarily unavailable.", "CIRCUIT_OPEN"), { status: 503 });
    }
    if (isTimeoutError(err)) {
      safeLog.warn("api.ai.provider", "timeout", { provider, userId: user.id, error: err });
      await writeAuditLog(user.id, "ai_error", "ai_proxy", { provider, error: message, code: "timeout" }, ip);
      return NextResponse.json(apiEnvelope(false, undefined, "AI request took too long. Please try again.", "TIMEOUT"), { status: 504 });
    }
    safeLog.error("api.ai.provider", "request failed", { provider, userId: user.id, error: err });
    await writeAuditLog(user.id, "ai_error", "ai_proxy", { provider, error: message }, ip);
    return NextResponse.json(apiEnvelope(false, undefined, message, "AI_ERROR"), { status: 502 });
  }
}
