/**
 * Marshall dictionary: phrases that are never acceptable in ViaConnect
 * client-facing copy, regardless of pillar. Kept small and high-signal.
 */

export const FORBIDDEN_PHRASES: ReadonlyArray<{ pattern: RegExp; reason: string; severity: "P0" | "P1" | "P2" }> = [
  {
    pattern: /\bvitality\s+(?:score|index)\b/gi,
    reason: "Score name is exactly 'Bio Optimization'; 'Vitality Score' and 'Vitality Index' are forbidden.",
    severity: "P0",
  },
  {
    pattern: /\bwellness\s+score\b/gi,
    reason: "Score name is exactly 'Bio Optimization'; 'Wellness Score' is forbidden.",
    severity: "P0",
  },
  {
    pattern: /\bsemaglutide\b/gi,
    reason: "Semaglutide is prohibited platform-wide.",
    severity: "P0",
  },
  {
    pattern: /\bmiracle\s+(?:cure|pill|drug|treatment)\b/gi,
    reason: "Superlative disease-adjacent claims violate FTC and DSHEA guidance.",
    severity: "P1",
  },
  {
    pattern: /\bfda[\s-]approved\b/gi,
    reason: "FarmCeutica supplements are not FDA-approved; this phrase is misleading.",
    severity: "P1",
  },
  {
    pattern: /\bclinically\s+proven\b/gi,
    reason: "'Clinically proven' requires a linked substantiation record; prefer 'studied' or 'supported by research'.",
    severity: "P2",
  },
];

// Emoji unicode ranges forbidden in client-facing UI strings.
// Kept as a single regex so runtime guards can strip in one pass.
export const EMOJI_REGEX =
  /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F100}-\u{1F1FF}]/gu;

// Emoticons that are common in AI outputs and must be stripped.
export const TEXT_EMOTICON_REGEX = /(?:^|\s)(?::\-?\)|:\-?D|:\-?P|:\-?\(|;\-?\)|<3|xD|XD)(?=\s|$)/g;
