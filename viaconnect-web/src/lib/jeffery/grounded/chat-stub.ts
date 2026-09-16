/**
 * Stage A grounded-chat orchestrator.
 * Flag OFF → legacy (today's stream). Flag ON → allowlist retriever + refuse-if-tool-fails.
 * Success: get_protocol / check_interactions / lookup_snp / lookup_peptide / get_education
 * restatement (protocol → interactions → snp → peptide → education). Fail-closed otherwise.
 * Marshall scan stays on the host route.
 */

import { safeLog } from "@/lib/utils/safe-log";
import { isLlmGroundedChatEnabled } from "./flag";
import { inferRequiredTools } from "./intent";
import {
  assembleEducationListingText,
  assembleInteractionsListingText,
  assemblePeptideListingText,
  assembleProtocolListingText,
  assembleSafetyRefuseText,
  assembleSnpListingText,
  assembleToolRefuseText,
  detectSafetyRefuse,
  joinAssembledListingBlocks,
} from "./refuse";
import type { StreamOptions, StreamResult } from "@/lib/jeffery/advisor-stream";
import { retrieveGroundedChunks } from "./retriever";
import { streamStaticAdvisorAnswer } from "./static-stream";
import { runRequiredTools } from "./tool-router";
import type {
  AdvisorChatRole,
  CheckInteractionsData,
  GetEducationData,
  GetProtocolData,
  GroundedToolContext,
  GroundedToolName,
  GroundedTurn,
  LookupPeptideData,
  LookupSnpData,
  ToolError,
} from "./types";

export interface ResolveGroundedChatInput {
  message: string;
  role: AdvisorChatRole;
  userId: string;
  advisorContextVariables?: Record<string, string>;
  storedProtocol?: GroundedToolContext["storedProtocol"];
  requestId: string;
  checkInteractionsAssemble?: GroundedToolContext["checkInteractionsAssemble"];
  lookupSnpAssemble?: GroundedToolContext["lookupSnpAssemble"];
  lookupPeptideAssemble?: GroundedToolContext["lookupPeptideAssemble"];
  getEducationAssemble?: GroundedToolContext["getEducationAssemble"];
}

function isToolError(value: { ok: boolean }): value is ToolError {
  return value.ok === false;
}

export async function resolveGroundedChatTurn(
  input: ResolveGroundedChatInput
): Promise<GroundedTurn> {
  if (!isLlmGroundedChatEnabled()) {
    return { kind: "legacy" };
  }

  const ctx: GroundedToolContext = {
    userId: input.userId,
    role: input.role,
    advisorContextVariables: input.advisorContextVariables,
    storedProtocol: input.storedProtocol ?? null,
    requestId: input.requestId,
    message: input.message,
    checkInteractionsAssemble: input.checkInteractionsAssemble,
    lookupSnpAssemble: input.lookupSnpAssemble,
    lookupPeptideAssemble: input.lookupPeptideAssemble,
    getEducationAssemble: input.getEducationAssemble,
  };

  try {
    await retrieveGroundedChunks({
      message: input.message,
      role: input.role,
      userId: input.userId,
    });
  } catch {
    // Empty / failed retrieve never authorizes doses or invented edu.
  }

  const safety = detectSafetyRefuse(input.message);
  if (safety) {
    return {
      kind: "static",
      reason: "safety_faq",
      text: assembleSafetyRefuseText({ role: input.role, kind: safety }),
      requiredTools: [],
    };
  }

  const required = inferRequiredTools(input.message);
  if (required.length === 0) {
    return { kind: "legacy" };
  }

  const results = await runRequiredTools(required, ctx);
  const failed: GroundedToolName[] = [];
  let firstError: ToolError | undefined;
  for (const name of required) {
    const result = results[name];
    if (!result || isToolError(result)) {
      failed.push(name);
      if (result && isToolError(result) && !firstError) firstError = result;
    }
  }

  if (failed.length > 0) {
    safeLog.warn("advisor.grounded", "required tool failed; refuse", {
      requestId: input.requestId,
      tools: failed,
      code: firstError?.code ?? "unavailable",
      route: firstError?.route,
    });
    return {
      kind: "static",
      reason: "tool_refuse",
      text: assembleToolRefuseText({
        role: input.role,
        failedTools: failed,
        error: firstError,
        requestId: input.requestId,
      }),
      requiredTools: required,
    };
  }

  const listingBlocks: string[] = [];
  const protocol = results.get_protocol;
  const interactions = results.check_interactions;
  const snp = results.lookup_snp;
  const peptide = results.lookup_peptide;
  const education = results.get_education;
  const interactionsOk = Boolean(interactions && interactions.ok === true);
  const snpOk = Boolean(snp && snp.ok === true);
  const peptideOk = Boolean(peptide && peptide.ok === true);
  const educationOk = Boolean(education && education.ok === true);

  if (protocol && protocol.ok === true) {
    const data = protocol.data as GetProtocolData;
    listingBlocks.push(
      assembleProtocolListingText({
        role: input.role,
        items: data.items,
        protocolName: data.protocol_name,
        sourceRoute: protocol.route,
        includeDisclaimer: !interactionsOk && !snpOk && !peptideOk && !educationOk,
      })
    );
  }

  if (interactions && interactions.ok === true) {
    listingBlocks.push(
      assembleInteractionsListingText({
        role: input.role,
        data: interactions.data as CheckInteractionsData,
        sourceRoute: interactions.route,
        includeDisclaimer: !snpOk && !peptideOk && !educationOk,
      })
    );
  }

  if (snp && snp.ok === true) {
    listingBlocks.push(
      assembleSnpListingText({
        role: input.role,
        data: snp.data as LookupSnpData,
        sourceRoute: snp.route,
        includeDisclaimer: !peptideOk && !educationOk,
      })
    );
  }

  if (peptide && peptide.ok === true) {
    listingBlocks.push(
      assemblePeptideListingText({
        role: input.role,
        data: peptide.data as LookupPeptideData,
        sourceRoute: peptide.route,
        includeDisclaimer: !educationOk,
      })
    );
  }

  if (education && education.ok === true) {
    listingBlocks.push(
      assembleEducationListingText({
        role: input.role,
        data: education.data as GetEducationData,
        sourceRoute: education.route,
      })
    );
  }

  if (listingBlocks.length > 0) {
    return {
      kind: "static",
      reason: "assembled_from_tools",
      text: joinAssembledListingBlocks(listingBlocks),
      requiredTools: required,
    };
  }

  return {
    kind: "static",
    reason: "tool_refuse",
    text: assembleToolRefuseText({
      role: input.role,
      failedTools: required,
      requestId: input.requestId,
    }),
    requiredTools: required,
  };
}

/**
 * Optional hook for /api/advisor/chat.
 * Flag off (default) or non-tool turns → null so the host keeps today's stream.
 */
export async function maybeGroundedStaticStream(
  input: ResolveGroundedChatInput,
  options?: StreamOptions
): Promise<StreamResult | null> {
  const turn = await resolveGroundedChatTurn(input);
  if (turn.kind !== "static") return null;
  return streamStaticAdvisorAnswer(turn.text, options);
}
