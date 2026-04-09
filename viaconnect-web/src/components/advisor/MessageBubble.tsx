"use client";

/**
 * MessageBubble (Prompt #60b — sub-component, UPDATED for #60d)
 *
 * Single chat message — user or assistant. Uses design tokens from spec:
 * Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, white/8 borders.
 * Mobile: full-width with 12px gutters. Desktop: max 70%.
 *
 * Prompt #60d additions (assistant messages only):
 *   1. Hard-appended disclaimer (marked by ⚕️) renders as a styled italic footer
 *   2. [SHARE_PEPTIDE_BUTTON:NAME] marker token renders as a PeptideShareButton
 *
 * Both markers are produced server-side by advisor-stream.ts and parsed
 * here purely client-side — no extra props needed.
 */

import { motion } from "framer-motion";
import PeptideShareButton from "./PeptideShareButton";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  accentColor: string;
}

const DISCLAIMER_MARKER = "⚕️";
const PEPTIDE_BUTTON_RE = /\[SHARE_PEPTIDE_BUTTON:([^\]]+)\]/;

interface ParsedAssistant {
  body: string;
  disclaimer: string | null;
  peptideName: string | null;
}

function parseAssistantContent(raw: string): ParsedAssistant {
  // 1. Pull out the peptide marker first (it sits AFTER the disclaimer)
  const peptideMatch = raw.match(PEPTIDE_BUTTON_RE);
  const peptideName = peptideMatch ? peptideMatch[1].trim() : null;
  const withoutMarker = peptideMatch ? raw.replace(PEPTIDE_BUTTON_RE, "").trim() : raw;

  // 2. Split body from disclaimer at the ⚕️ marker
  const idx = withoutMarker.indexOf(DISCLAIMER_MARKER);
  if (idx === -1) {
    return { body: withoutMarker, disclaimer: null, peptideName };
  }
  const body = withoutMarker.slice(0, idx).trim();
  const disclaimer = withoutMarker.slice(idx + DISCLAIMER_MARKER.length).trim();
  return { body, disclaimer, peptideName };
}

export default function MessageBubble({ role, content, accentColor }: MessageBubbleProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div
          className="max-w-[88%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-white"
          style={{ background: `${accentColor}33` }}
        >
          {content}
        </div>
      </motion.div>
    );
  }

  // Assistant message — parse for disclaimer + peptide button
  const parsed = parseAssistantContent(content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[88%] md:max-w-[70%] rounded-2xl px-4 py-3 bg-[#1E3054] border border-white/[0.08]">
        {/* Main response body */}
        <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap break-words">
          {parsed.body || content}
        </div>

        {/* Peptide share button (consumer portal only — server-side gated) */}
        {parsed.peptideName && (
          <PeptideShareButton peptideName={parsed.peptideName} advisorResponse={content} />
        )}

        {/* Mandatory disclaimer footer */}
        {parsed.disclaimer && (
          <div className="mt-3 pt-3 border-t border-white/[0.08]">
            <p className="text-[11px] text-white/35 leading-relaxed italic">{parsed.disclaimer}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
