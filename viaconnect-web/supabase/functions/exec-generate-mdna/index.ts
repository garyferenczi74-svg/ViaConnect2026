// Prompt #105 Phase 2a — draft MD&A section via Claude.
//
// Pipeline:
//   1. Auth + CFO/admin/exec_reporting_admin role gate.
//   2. Load pack; reject if not in an editable state.
//   3. Load active ai_prompt for section_type.
//   4. Build user prompt from aggregate KPI context ONLY (never individual rows).
//   5. Pre-send PII scan — abort call with PII_IN_CLAUDE_PROMPT if any pattern hits.
//   6. POST /v1/messages with the system + user prompt.
//   7. Post-generation validator: flag investment advice / unbounded forecasts /
//      individual attribution. Findings attach to the response; the section is
//      still persisted with commentary_source='ai_drafted' so a human can review.
//   8. Upsert into board_pack_sections; audit log.
//
// Contract:
//   POST { packId, sectionType, sectionOrder, title, kpiContextJson, packContextMd? }
//   Response { section_id, commentary_md, findings: [...] }

// deno-lint-ignore-file no-explicit-any
import {
  adminClient,
  canWriteExec,
  corsPreflight,
  EXEC_ERRORS,
  jsonResponse,
  resolveActor,
} from '../_exec_reporting_shared/shared.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MDNA_MODEL = Deno.env.get('EXEC_MDNA_MODEL') ?? 'claude-sonnet-4-6';

// Pack states where section edits are permitted (mirrors canEditPackSections in pure lib).
const EDITABLE_PACK_STATES = new Set([
  'draft', 'mdna_pending', 'mdna_drafted', 'cfo_review',
]);

// SOURCE OF TRUTH: src/lib/executiveReporting/mdna/piiRedactor.ts (PII_PATTERNS).
// Keep in sync — Deno cannot import Node TS directly.
const PII_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: 'ein', re: /\b\d{2}-\d{7}\b/ },
  { name: 'credit_card', re: /\b(?:\d{4}[-\s]?){3}\d{4}\b/ },
  { name: 'bank_account_maybe', re: /\b\d{9,17}\b/ },
  { name: 'email_address', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { name: 'phone_us', re: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  { name: 'sin_ca', re: /\b\d{3}-\d{3}-\d{3}\b/ },
];

function scanPII(text: string): string[] {
  const hits: string[] = [];
  for (const { name, re } of PII_PATTERNS) {
    if (re.test(text)) hits.push(name);
  }
  return hits;
}

// SOURCE OF TRUTH: src/lib/executiveReporting/mdna/postGenerationValidator.ts
// (INVESTMENT_ADVICE_PATTERNS, UNBOUNDED_FORECAST_PATTERNS, INDIVIDUAL_ATTRIBUTION_PATTERNS).
// Keep in sync — Deno cannot import Node TS directly.
const INVESTMENT_ADVICE = [
  'buy the stock', 'sell the stock', 'investors should',
  'we recommend investors', 'investment recommendation', 'not investment advice',
];
const UNBOUNDED_FORECAST = [
  'will definitely', 'guaranteed to', 'we will achieve',
  'certain to reach', 'will undoubtedly',
];
const INDIVIDUAL_ATTRIBUTION: RegExp[] = [
  /\b(?:thanks|credit|driven) (?:to|by) (?:[A-Z][a-z]+ [A-Z][a-z]+)/,
  /\b[A-Z][a-z]+ [A-Z][a-z]+'s leadership\b/,
];

interface Finding { finding: string; matchedText: string }
function validateOutput(commentary: string): Finding[] {
  const findings: Finding[] = [];
  const lower = commentary.toLowerCase();
  for (const p of INVESTMENT_ADVICE) if (lower.includes(p)) findings.push({ finding: 'INVESTMENT_ADVICE', matchedText: p });
  for (const p of UNBOUNDED_FORECAST) if (lower.includes(p)) findings.push({ finding: 'UNBOUNDED_FORECAST', matchedText: p });
  for (const re of INDIVIDUAL_ATTRIBUTION) {
    const m = commentary.match(re);
    if (m && m[0]) findings.push({ finding: 'INDIVIDUAL_ATTRIBUTION', matchedText: m[0] });
  }
  return findings;
}

interface MDNARequest {
  packId: string;
  sectionType: string;
  sectionOrder: number;
  title: string;
  kpiContextJson: Record<string, unknown>;
  packContextMd?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  if (!ANTHROPIC_KEY) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  const actor = await resolveActor(req);
  if (!actor) return jsonResponse({ error: EXEC_ERRORS.MISSING_JWT }, 401);
  if (!canWriteExec(actor.role)) {
    return jsonResponse({ error: EXEC_ERRORS.FORBIDDEN_ROLE, role: actor.role }, 403);
  }

  let body: MDNARequest;
  try {
    body = (await req.json()) as MDNARequest;
  } catch {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'invalid JSON' }, 400);
  }
  if (!body.packId || !body.sectionType || typeof body.sectionOrder !== 'number' || !body.title) {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'packId, sectionType, sectionOrder, title required' }, 400);
  }

  const admin = adminClient() as any;

  // 1. Load pack + editability check.
  const { data: pack, error: pErr } = await admin
    .from('board_packs')
    .select('pack_id, state, pack_title, period_type, period_start, period_end')
    .eq('pack_id', body.packId)
    .maybeSingle();
  if (pErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: pErr.message }, 500);
  if (!pack) return jsonResponse({ error: EXEC_ERRORS.NOT_FOUND, detail: 'pack not found' }, 404);
  if (!EDITABLE_PACK_STATES.has(pack.state)) {
    return jsonResponse({
      error: EXEC_ERRORS.CONFLICT,
      detail: `pack state ${pack.state} does not permit section edits`,
    }, 409);
  }

  // 2. Active AI prompt for this section type.
  const { data: promptRow, error: prErr } = await admin
    .from('board_pack_ai_prompts')
    .select('prompt_id, version, system_prompt_md, token_budget')
    .eq('section_type', body.sectionType)
    .eq('status', 'active')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: prErr.message }, 500);
  if (!promptRow) {
    return jsonResponse({
      error: EXEC_ERRORS.NOT_FOUND,
      detail: `no active AI prompt for section_type=${body.sectionType}`,
    }, 404);
  }

  // 3. Build user prompt. KPI context JSON is serialized — aggregate-only.
  const userPrompt = [
    `PACK: ${pack.pack_title}`,
    `PERIOD: ${pack.period_type} ${pack.period_start} → ${pack.period_end}`,
    `SECTION: ${body.title}`,
    '',
    'AGGREGATE KPI CONTEXT (JSON):',
    JSON.stringify(body.kpiContextJson, null, 2),
    '',
    body.packContextMd ? `PACK NARRATIVE CONTEXT:\n${body.packContextMd}` : '',
    '',
    'Draft the MD&A section commentary now. Stay evidence-based. Do NOT make',
    'forward-looking statements without hedges. Do NOT attribute results to',
    'specific individuals. Do NOT offer investment advice.',
  ].filter(Boolean).join('\n');

  // 4. PII pre-send gate — aborts the fetch entirely on any hit.
  const hits = scanPII(userPrompt);
  if (hits.length > 0) {
    return jsonResponse({
      error: 'PII_IN_CLAUDE_PROMPT',
      detail: `Prompt blocked by PII scanner. Patterns: ${hits.join(',')}`,
      patterns: hits,
    }, 422);
  }

  // 5. Claude call.
  const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MDNA_MODEL,
      max_tokens: Math.min(promptRow.token_budget ?? 2000, 8000),
      system: promptRow.system_prompt_md,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!aiResp.ok) {
    const errTxt = await aiResp.text();
    return jsonResponse({
      error: 'CLAUDE_API_ERROR',
      detail: `Claude ${aiResp.status}: ${errTxt.slice(0, 500)}`,
    }, 502);
  }
  const aiJson = await aiResp.json();
  const commentary: string = (aiJson?.content?.[0]?.text ?? '').toString();

  // Reject empty or unusably short commentary before persisting — a silent
  // sentinel 'ai_drafted' row becomes an audit anomaly a reviewer then has
  // to discover and clean up. Fail fast instead.
  if (commentary.trim().length < 120) {
    return jsonResponse({
      error: 'CLAUDE_EMPTY_OUTPUT',
      detail: 'Claude returned empty or too-short commentary; not persisting',
      commentary_length: commentary.trim().length,
    }, 502);
  }

  // 6. Post-generation validator.
  const findings = validateOutput(commentary);

  // 7. Upsert section (AI-drafted; human must CFO-approve downstream).
  const { data: sec, error: secErr } = await admin
    .from('board_pack_sections')
    .upsert({
      pack_id: body.packId,
      section_type: body.sectionType,
      section_order: body.sectionOrder,
      title: body.title,
      content_json: body.kpiContextJson,
      commentary_md: commentary,
      commentary_source: 'ai_drafted',
      ai_prompt_version: promptRow.version,
      ai_model: MDNA_MODEL,
    }, { onConflict: 'pack_id,section_order' })
    .select('section_id')
    .single();
  if (secErr || !sec) {
    return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: secErr?.message ?? 'upsert failed' }, 500);
  }

  // 8. Audit.
  await admin.from('executive_reporting_audit_log').insert({
    action_category: 'mdna_draft',
    action_verb: 'mdna_draft.drafted',
    target_table: 'board_pack_sections',
    target_id: sec.section_id,
    pack_id: body.packId,
    actor_user_id: actor.userId,
    actor_role: actor.role,
    context_json: {
      section_type: body.sectionType,
      ai_model: MDNA_MODEL,
      ai_prompt_version: promptRow.version,
      findings_count: findings.length,
      findings: findings.map((f) => f.finding),
    },
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  // Transition pack to mdna_drafted if currently mdna_pending. Emit an
  // explicit pack-state audit row so the state change is self-evident
  // without a reviewer correlating timestamps across mdna_draft and pack
  // audit categories.
  if (pack.state === 'mdna_pending') {
    await admin.from('board_packs').update({ state: 'mdna_drafted' }).eq('pack_id', body.packId);
    await admin.from('executive_reporting_audit_log').insert({
      action_category: 'pack',
      action_verb: 'pack.mdna_drafted',
      target_table: 'board_packs',
      target_id: body.packId,
      pack_id: body.packId,
      actor_user_id: actor.userId,
      actor_role: actor.role,
      before_state_json: { state: 'mdna_pending' },
      after_state_json: { state: 'mdna_drafted' },
      context_json: { section_id: sec.section_id },
      ip_address: actor.ipAddress,
      user_agent: actor.userAgent,
    });
  }

  return jsonResponse({
    section_id: sec.section_id,
    commentary_md: commentary,
    findings,
    requires_human_rewrite: findings.length > 0,
  });
});
