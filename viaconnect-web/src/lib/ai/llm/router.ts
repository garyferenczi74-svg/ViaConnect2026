/**
 * LLM provider router (LM-05).
 *
 * Soft GO 2026-10-05: xAI primary, Claude fallback. Flags default off.
 * With every flag off this router, if called, talks only to Claude and
 * does not call xAI. The Marshall remediate call site does not call this
 * router until its own flag is on, so the existing SDK path stays as it is.
 *
 * P1, P2, and P3 inputs are not sent to xAI unless
 * llm_xai_member_data_allowed is true. That flag defaults false.
 * Audit events carry provider, tokens, and outcome. They do not carry
 * prompts or outputs.
 */

import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError, type CircuitBreaker } from '@/lib/utils/circuit-breaker';
import { createAnthropicProvider } from './anthropic-adapter';
import { containsJsonObject } from './json-text';
import {
  LLM_XAI_KILL_FLAG,
  LLM_XAI_MEMBER_DATA_ALLOWED_FLAG,
  llmXaiEnabledFlag,
  llmXaiShadowFlag,
  readLlmAllowlist,
  readLlmCanaryPercent,
} from './flags';
import { sha256Hex } from './hash';
import { planLlmRoute } from './plan';
import { createXaiProvider } from './xai-client';
import {
  emptyUsage,
  type LlmAuditEvent,
  type LlmCompareClass,
  type LlmErrorCode,
  type LlmProvider,
  type LlmProviderFailure,
  type LlmProviderId,
  type LlmProviderRequest,
  type LlmProviderResult,
  type LlmRouteOutcome,
  type LlmRouteRequest,
  type LlmStreamEvent,
  type RoutePlan,
  type RouteReason,
} from './types';

const XAI_BREAKER = 'llm-xai';
const ANTHROPIC_BREAKER = 'llm-anthropic';
const RETRY_LIMIT = 2;
const RETRY_BASE_MS = 200;

export interface LlmRouterDeps {
  xai?: LlmProvider;
  anthropic?: LlmProvider;
  isEnabled?: (flag: string) => boolean;
  audit?: (event: LlmAuditEvent) => void;
  sleep?: (ms: number) => Promise<void>;
  breaker?: (name: string) => Pick<CircuitBreaker, 'execute'>;
  env?: Record<string, string | undefined>;
  now?: () => number;
}

class RetryableLlmError extends Error {
  readonly result: LlmProviderFailure;

  constructor(result: LlmProviderFailure) {
    super(result.code);
    this.name = 'RetryableLlmError';
    this.result = result;
  }
}

export async function routeLlm(req: LlmRouteRequest, deps: LlmRouterDeps = {}): Promise<LlmRouteOutcome> {
  const started = (deps.now ?? Date.now)();
  const plan = await resolvePlan(req, deps);
  const anthropic = deps.anthropic ?? createAnthropicProvider();
  const xai = deps.xai ?? createXaiProvider();

  if (plan.mode === 'anthropic_only') {
    const claude = await runProvider(anthropic, req, req.anthropicModel, deps);
    return finish(req, plan, claude, null, null, started, deps, 'skipped');
  }

  if (plan.mode === 'shadow') {
    const [xaiResult, claude] = await Promise.all([
      runProvider(xai, req, req.xaiModel, deps),
      runProvider(anthropic, req, req.anthropicModel, deps),
    ]);
    return finish(req, plan, claude, null, xaiResult, started, deps, compareResults(xaiResult, claude));
  }

  const primary = await runProvider(xai, req, req.xaiModel, deps);
  const rejected = rejectPrimary(primary, req.requireJson === true);
  if (!rejected) {
    return finish(req, plan, primary, null, null, started, deps, null);
  }
  const claude = await runProvider(anthropic, req, req.anthropicModel, deps);
  return finish(req, plan, claude, 'xai', rejected, started, deps, null);
}

/**
 * Stream fallback applies before the first text delta. Shadow streaming is
 * Claude-only here: a shadow call still sends the prompt, and the stream
 * adapter that compares token events is a later task. Complete() implements
 * shadow. This avoids sending a stream the caller cannot compare yet.
 */
export async function* routeLlmStream(
  req: LlmRouteRequest,
  deps: LlmRouterDeps = {},
): AsyncGenerator<LlmStreamEvent> {
  const plan = await resolvePlan(req, deps);
  const anthropic = deps.anthropic ?? createAnthropicProvider();
  const xai = deps.xai ?? createXaiProvider();
  if (plan.mode !== 'xai_primary') {
    yield* streamProvider(anthropic, req, req.anthropicModel);
    return;
  }

  let emittedText = false;
  for await (const event of streamProvider(xai, req, req.xaiModel)) {
    if (event.type === 'error' && !emittedText) {
      safeLog.warn('ai.llm.router', 'xai stream failed before text, falling back', {
        code: event.error.code,
        featureId: req.featureId,
      });
      yield* streamProvider(anthropic, req, req.anthropicModel);
      return;
    }
    if (event.type === 'text_delta' && event.text) emittedText = true;
    yield event;
  }
}

async function resolvePlan(req: LlmRouteRequest, deps: LlmRouterDeps): Promise<RoutePlan> {
  const isEnabled = deps.isEnabled ?? isFeatureEnabled;
  const env = deps.env ?? process.env;
  const userKeyHash = await hashUserKey(req.safetyIdentifierSource);
  const allowlist = readLlmAllowlist(env);
  return planLlmRoute({
    featureId: req.featureId,
    dataClass: req.dataClass,
    kill: isEnabled(LLM_XAI_KILL_FLAG),
    enabled: isEnabled(llmXaiEnabledFlag(req.featureId)),
    shadow: isEnabled(llmXaiShadowFlag(req.featureId)),
    memberDataAllowed: isEnabled(LLM_XAI_MEMBER_DATA_ALLOWED_FLAG),
    canaryPercent: readLlmCanaryPercent(req.featureId, env),
    userKeyHash,
    allowlisted: userKeyHash ? allowlist.has(userKeyHash) : false,
  });
}

async function hashUserKey(source: string | undefined): Promise<string | null> {
  const trimmed = source?.trim();
  if (!trimmed) return null;
  try {
    return await sha256Hex(trimmed);
  } catch {
    return null;
  }
}

async function runProvider(
  provider: LlmProvider,
  req: LlmRouteRequest,
  model: string,
  deps: LlmRouterDeps,
): Promise<LlmProviderResult> {
  const breaker = (deps.breaker ?? defaultBreaker)(provider.id === 'xai' ? XAI_BREAKER : ANTHROPIC_BREAKER);
  const sleep = deps.sleep ?? defaultSleep;
  const providerReq = await toProviderRequest(req, model);
  let last: LlmProviderResult | null = null;

  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt += 1) {
    try {
      last = await breaker.execute(async () => {
        const result = await provider.complete(providerReq);
        if (!result.ok && result.retryable) throw new RetryableLlmError(result);
        return result;
      });
      if (last.ok || !last.retryable) return last;
    } catch (error) {
      if (isCircuitBreakerError(error)) {
        return {
          ok: false,
          code: 'circuit_open',
          provider: provider.id,
          model,
          httpStatus: null,
          retryable: false,
          latencyMs: 0,
        };
      }
      if (error instanceof RetryableLlmError) {
        last = error.result;
      } else {
        last = {
          ok: false,
          code: 'upstream_error',
          provider: provider.id,
          model,
          httpStatus: null,
          retryable: true,
          latencyMs: 0,
        };
      }
    }

    if (last && !last.ok && last.retryable && attempt < RETRY_LIMIT) {
      const code: LlmErrorCode = last.code;
      safeLog.warn('ai.llm.router', 'retry after transient provider error', {
        provider: provider.id,
        featureId: req.featureId,
        attempt,
        code,
      });
      await sleep(RETRY_BASE_MS * attempt);
    }
  }

  return (
    last ?? {
      ok: false,
      code: 'upstream_error',
      provider: provider.id,
      model,
      httpStatus: null,
      retryable: true,
      latencyMs: 0,
    }
  );
}

async function* streamProvider(
  provider: LlmProvider,
  req: LlmRouteRequest,
  model: string,
): AsyncGenerator<LlmStreamEvent> {
  const providerReq = await toProviderRequest(req, model);
  yield* provider.stream(providerReq);
}

async function toProviderRequest(req: LlmRouteRequest, model: string): Promise<LlmProviderRequest> {
  const safetyIdentifierHash = await hashUserKey(req.safetyIdentifierSource);
  return {
    ...req,
    model,
    ...(safetyIdentifierHash ? { safetyIdentifierHash } : {}),
  };
}

function rejectPrimary(result: LlmProviderResult, requireJson: boolean): LlmProviderFailure | null {
  if (!result.ok) return result;
  if (!result.text.trim()) {
    return {
      ok: false,
      code: 'empty_output',
      provider: result.provider,
      model: result.model,
      httpStatus: null,
      retryable: false,
      latencyMs: result.latencyMs,
    };
  }
  if (requireJson && !containsJsonObject(result.text)) {
    return {
      ok: false,
      code: 'schema_invalid',
      provider: result.provider,
      model: result.model,
      httpStatus: null,
      retryable: false,
      latencyMs: result.latencyMs,
    };
  }
  return null;
}

function compareResults(xaiResult: LlmProviderResult, claude: LlmProviderResult): LlmCompareClass {
  if (!xaiResult.ok || !claude.ok) return 'error';
  return xaiResult.text.trim() === claude.text.trim() ? 'agree' : 'differ';
}

function finish(
  req: LlmRouteRequest,
  plan: RoutePlan,
  result: LlmProviderResult,
  fallbackFrom: LlmProviderId | null,
  shadow: LlmProviderResult | null,
  started: number,
  deps: LlmRouterDeps,
  compareClass: LlmCompareClass | null,
): LlmRouteOutcome {
  const outcome = toOutcome(result, plan.reason, fallbackFrom);
  const event = toAudit(req, plan, outcome, shadow, compareClass, (deps.now ?? Date.now)() - started);
  emitAudit(event, deps.audit);
  return outcome;
}

function toOutcome(
  result: LlmProviderResult,
  planReason: RouteReason,
  fallbackFrom: LlmProviderId | null,
): LlmRouteOutcome {
  if (result.ok) {
    return { ...result, fallbackFrom, planReason };
  }
  return { ...result, fallbackFrom, planReason };
}

function toAudit(
  req: LlmRouteRequest,
  plan: RoutePlan,
  outcome: LlmRouteOutcome,
  shadow: LlmProviderResult | null,
  compareClass: LlmCompareClass | null,
  latencyMs: number,
): LlmAuditEvent {
  const usage = outcome.ok ? outcome.usage : emptyUsage();
  return {
    featureId: req.featureId,
    route: plan.mode === 'shadow' ? `llm.${req.featureId}#shadow` : `llm.${req.featureId}`,
    dataClass: req.dataClass,
    outcome: outcome.ok ? 'success' : 'failure',
    provider: outcome.provider,
    model: outcome.model,
    errorCode: outcome.ok ? null : outcome.code,
    httpStatus: outcome.ok ? null : outcome.httpStatus,
    latencyMs: outcome.ok ? outcome.latencyMs : latencyMs,
    inputTokens: outcome.ok ? usage.inputTokens : null,
    outputTokens: outcome.ok ? usage.outputTokens : null,
    cachedInputTokens: outcome.ok ? usage.cachedInputTokens : null,
    reasoningTokens: outcome.ok ? usage.reasoningTokens : null,
    costUsd: outcome.ok ? usage.costUsd : null,
    costInUsdTicks: outcome.ok ? usage.costInUsdTicks : null,
    fallbackFrom: outcome.fallbackFrom,
    planReason: plan.reason,
    compareClass,
    shadowErrorCode: plan.mode === 'shadow' && shadow && !shadow.ok ? shadow.code : null,
    primaryErrorCode: plan.mode === 'xai_primary' && shadow && !shadow.ok ? shadow.code : null,
  };
}

function emitAudit(event: LlmAuditEvent, audit: ((event: LlmAuditEvent) => void) | undefined): void {
  safeLog.info('ai.llm.router', 'audit', { ...event });
  if (!audit) return;
  try {
    audit(event);
  } catch (error) {
    safeLog.warn('ai.llm.router', 'audit hook failed', {
      name: error instanceof Error ? error.name : 'unknown',
    });
  }
}

function defaultBreaker(name: string): CircuitBreaker {
  return getCircuitBreaker(name);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
