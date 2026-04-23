// Prompt #113 — Text normalizer used by Stage 1 disease-claim detector.
// Normalization is lossless-for-matching (lowercase + strip punctuation +
// collapse whitespace + expand common contractions + strip HTML tags).

const CONTRACTIONS: Record<string, string> = {
  "it's": "it is", "its": "it is",
  "can't": "cannot", "cant": "cannot",
  "won't": "will not", "wont": "will not",
  "don't": "do not", "dont": "do not",
  "doesn't": "does not", "doesnt": "does not",
  "isn't": "is not", "isnt": "is not",
  "wasn't": "was not", "wasnt": "was not",
  "we're": "we are", "were": "we are",
  "you're": "you are", "youre": "you are",
  "they're": "they are", "theyre": "they are",
};

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ");
}

export function expandContractions(input: string): string {
  let out = input;
  for (const [k, v] of Object.entries(CONTRACTIONS)) {
    const rx = new RegExp(`\\b${k}\\b`, "gi");
    out = out.replace(rx, v);
  }
  return out;
}

export function normalize(input: string): string {
  let s = input;
  s = stripHtml(s);
  s = expandContractions(s);
  s = s.toLowerCase();
  s = s.replace(/[–—]/g, "-"); // en/em dashes to hyphen
  s = s.replace(/[‘’]/g, "'");
  s = s.replace(/[“”]/g, '"');
  s = s.replace(/[^\w\s\-']/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function tokenize(input: string): string[] {
  return input.split(/\s+/).filter((t) => t.length > 0);
}

export function splitSentences(input: string): string[] {
  // Basic sentence splitter: period/question/exclamation followed by space.
  // Good enough for marketing/social content; tighter NLP deferred.
  return input.split(/(?<=[.!?])\s+(?=[A-Z])/).filter((s) => s.trim().length > 0);
}
