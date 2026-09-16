/**
 * Lex-cleared Stage A copy (SYSTEM-PROMPT + HIPAA FAQ intent).
 * Educational only. No doses. Prefer "already listed" / "on your protocol".
 * Never say "prescribed" in assembler output.
 *
 * FAQ.killSwitchLines = Lex PASS 2026-09-15 HIPAA-OPS §4 (provider outage /
 * explicit ops kill). LLM_GROUNDED_CHAT_ENABLED=false is legacy stream, not FAQ.
 */

/** Clinician ViaCura drafts stay draft-only until a human sends. SYSTEM-PROMPT lock. */
export const VIA_CURA_DRAFT_BANNER = "DRAFT ONLY — human send required";

export const EDUCATIONAL_DISCLAIMER =
  "This information is for educational purposes only and is not a substitute for professional medical advice. Please consult with your physician, naturopath, or licensed healthcare provider before making any changes to your health regimen.";

/** Lex-cleared kill-switch FAQ (HIPAA-OPS §4). Join for display. */
export const FAQ_KILL_SWITCH_LINES: string[] = [
  "The ViaConnect assistant is temporarily unavailable. Your protocol and education screens still work.",
  "Open your protocol in the app to see what is already listed for you. Do not change products or amounts based on this message.",
  "For personal guidance, contact your ViaConnect clinician or licensed healthcare provider.",
  "If this is a medical emergency, seek emergency services now. If you are thinking about harming yourself, call or text 988 (US Suicide and Crisis Lifeline) or use local emergency services.",
  "Please try the assistant again later. Educational content only — not a diagnosis or prescription.",
];

export const FAQ = {
  toolFailed:
    "I cannot verify that safely right now because a required ViaConnect check did not complete. Please retry in a moment, or ask your clinician. I will not guess.",
  killSwitchLines: FAQ_KILL_SWITCH_LINES,
  killSwitch: FAQ_KILL_SWITCH_LINES.join("\n"),
  diagnosis:
    "I cannot diagnose or treat medical conditions. Please discuss this with a qualified clinician. I can share educational context about pathways or what is already in your ViaConnect protocol.",
  newDose:
    "I cannot create or change doses. I can only explain what the ViaConnect protocol engine already listed. Ask your clinician before changing anything.",
  pregnancy:
    "Pregnancy needs personalized clinician guidance. I will not confirm or adjust protocols for pregnancy. Please contact your obstetric or primary clinician before taking or continuing any peptide or supplement.",
  pediatric:
    "I cannot provide pediatric treatment or dosing guidance. Please speak with a clinician who cares for children.",
  emergency:
    "This sounds like it needs urgent clinician care. If you may be having a medical emergency, seek emergency services now. If you are thinking about harming yourself, call or text 988 (US Suicide and Crisis Lifeline) or use local emergency services. I cannot triage serious symptoms in chat and I will not give doses or treatment plans.",
  semaglutide:
    "That topic is outside ViaConnect recommendation scope. Please discuss with your clinician. I can help with approved catalog and educational PeptideIQ topics instead.",
  genotypeMissing:
    "I do not have that genotype on file, so I will not invent one. I can share general educational pathway context and suggest uploading or confirming results with your clinician.",
  outOfScope:
    "I am grounded in your ViaConnect protocol and education content, not a general medical chatbot. For issues outside that scope, please ask your clinician.",
} as const;

export const NOTHING_ON_FILE = "Nothing on file for this yet.";
export const TOOLS_UNAVAILABLE = "Required ViaConnect checks were unavailable. I will not guess what is already on your protocol.";
