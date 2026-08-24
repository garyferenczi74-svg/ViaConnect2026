// Read educational card markdown from content/educational-cards/**/*.md.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import {
  SKIP_CARD_FILENAMES,
  type CardFrontmatter,
  type CitationRef,
  type ParsedCard,
} from './types';
import {
  asBoolean,
  asOptionalString,
  asString,
  asStringArray,
  parseSimpleYaml,
  splitMarkdownFrontmatter,
  type YamlValue,
} from './yaml-frontmatter';

export function resolveEducationalCardsRoot(cwd: string = process.cwd()): string {
  const candidates = [
    join(cwd, 'content', 'educational-cards'),
    join(cwd, 'viaconnect-web', 'content', 'educational-cards'),
  ];
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isDirectory()) return candidate;
    } catch {
      // try next
    }
  }
  return candidates[0];
}

export function listCardMarkdownFiles(rootDir: string): string[] {
  const skip = new Set(SKIP_CARD_FILENAMES.map((name) => name.toLowerCase()));
  const found: string[] = [];

  const walk = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith('.md')) continue;
      if (skip.has(entry.name.toLowerCase())) continue;
      found.push(full);
    }
  };

  walk(rootDir);
  found.sort((a, b) => a.localeCompare(b));
  return found;
}

export function parseCardFile(filePath: string, rootDir: string): ParsedCard {
  const raw = readFileSync(filePath, 'utf8');
  const { frontmatter: frontmatterRaw, body } = splitMarkdownFrontmatter(raw);
  if (!frontmatterRaw) {
    throw new Error(`Missing YAML frontmatter in ${filePath}`);
  }
  const yaml = parseSimpleYaml(frontmatterRaw);
  const frontmatter = toFrontmatter(yaml);
  const titleFromH1 = extractH1(body);
  const title = frontmatter.title || titleFromH1 || '';
  const titleDerivedFromH1 = !frontmatter.title && Boolean(titleFromH1);
  const subtitle = frontmatter.subtitle || extractFirstH2(body);
  const leadText = extractLeadText(body);
  const keyTakeaways = extractListSection(body, 'key takeaways');
  const whatToDoNext = extractParagraphOrListSection(body, 'what to do next');
  const relatedSlugs = extractListSection(body, 'related content');
  const citations = extractCitations(extractSectionBody(body, 'sources'));
  const wordCount = countWords(body);
  const hasFdaDisclaimer = hasRequiredFdaDisclaimer(body);

  return {
    filePath,
    relativePath: relative(rootDir, filePath).split(sep).join('/'),
    raw,
    frontmatterRaw,
    frontmatter: {
      ...frontmatter,
      title: frontmatter.title || title,
    },
    body,
    title,
    titleDerivedFromH1,
    subtitle,
    leadText,
    keyTakeaways,
    whatToDoNext,
    relatedSlugs,
    citations,
    wordCount,
    estimatedReadingTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)),
    hasFdaDisclaimer,
  };
}

function toFrontmatter(yaml: Record<string, YamlValue>): CardFrontmatter {
  return {
    slug: asString(yaml.slug),
    title: asOptionalString(yaml.title) ?? undefined,
    subtitle: asOptionalString(yaml.subtitle) ?? undefined,
    primary_category: asString(yaml.primary_category),
    secondary_tags: asStringArray(yaml.secondary_tags),
    triggering_caq_flags: asStringArray(yaml.triggering_caq_flags),
    triggering_meal_patterns: asStringArray(yaml.triggering_meal_patterns),
    triggering_supplement_patterns: asStringArray(
      yaml.triggering_supplement_patterns,
    ),
    medical_caution_level: asString(yaml.medical_caution_level),
    safety_mode_filter: asString(yaml.safety_mode_filter),
    bioavailability_bridge_card: asBoolean(
      yaml.bioavailability_bridge_card,
      false,
    ),
    gary_approval_required: asBoolean(yaml.gary_approval_required, false),
    gary_approved_at: asOptionalString(yaml.gary_approved_at),
    fda_disclaimer_variant:
      asOptionalString(yaml.fda_disclaimer_variant) ?? 'standard',
    kelsey_compliance_review_id: asOptionalString(
      yaml.kelsey_compliance_review_id,
    ),
  };
}

function extractH1(body: string): string | null {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractFirstH2(body: string): string | null {
  const match = body.match(/^##\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractLeadText(body: string): string {
  const lines = body.split(/\r?\n/);
  const paragraphs: string[] = [];
  let bucket: string[] = [];
  const flush = () => {
    if (bucket.length > 0) {
      paragraphs.push(bucket.join(' ').trim());
      bucket = [];
    }
  };
  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line) || line.trim() === '') {
      flush();
      continue;
    }
    bucket.push(line.trim());
  }
  flush();
  return paragraphs[0] ?? '';
}

function extractSectionBody(body: string, heading: string): string {
  const lines = body.split(/\r?\n/);
  const target = heading.trim().toLowerCase();
  let capturing = false;
  const captured: string[] = [];
  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      if (capturing) break;
      capturing = headingMatch[1].trim().toLowerCase() === target;
      continue;
    }
    if (capturing) captured.push(line);
  }
  return captured.join('\n').trim();
}

function extractListSection(body: string, heading: string): string[] {
  const section = extractSectionBody(body, heading);
  if (!section) return [];
  return section
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
    .filter((line) => line.length > 0);
}

function extractParagraphOrListSection(body: string, heading: string): string[] {
  const section = extractSectionBody(body, heading);
  if (!section) return [];
  const list = section
    .split(/\r?\n/)
    .filter((line) => /^\s*[-*]\s+/.test(line))
    .map((line) => line.replace(/^\s*[-*]\s+/, '').trim());
  if (list.length > 0) return list;
  return section
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter((block) => block.length > 0);
}

function extractCitations(section: string): CitationRef[] {
  if (!section) return [];
  return section
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
    .filter((line) => line.length > 0)
    .map((text) => {
      const pmid = text.match(/\bPMID\s*(\d+)\b/i)?.[1] ?? null;
      const doi = text.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i)?.[0] ?? null;
      const url = text.match(/https?:\/\/\S+/i)?.[0]?.replace(/[).,;]+$/, '') ?? null;
      return { text, pmid, doi, url };
    });
}

function countWords(text: string): number {
  const words = text
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0);
  return words.length;
}

function hasRequiredFdaDisclaimer(body: string): boolean {
  const section = extractSectionBody(body, 'fda disclaimer');
  const haystack = `${section}\n${body}`;
  return /not intended to diagnose,\s*treat,\s*cure,\s*or\s*prevent/i.test(haystack);
}

export function loadEducationalCards(rootDir: string): ParsedCard[] {
  return listCardMarkdownFiles(rootDir).map((filePath) =>
    parseCardFile(filePath, rootDir),
  );
}
