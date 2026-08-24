// Minimal YAML subset parser for Gordon-authored card frontmatter.
// Supports scalars and string arrays. No new package.json dependencies.

export type YamlScalar = string | boolean | number | null;
export type YamlValue = YamlScalar | string[];

export interface SplitMarkdown {
  frontmatter: string;
  body: string;
}

export function splitMarkdownFrontmatter(raw: string): SplitMarkdown {
  const text = raw.replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) {
    return { frontmatter: '', body: text };
  }
  const afterOpen = text.slice(3);
  const rest = afterOpen.replace(/^\r?\n/, '');
  const close = rest.search(/\r?\n---(?:\r?\n|$)/);
  if (close === -1) {
    return { frontmatter: '', body: text };
  }
  const frontmatter = rest.slice(0, close);
  const afterClose = rest.slice(close).replace(/^\r?\n---/, '');
  const body = afterClose.replace(/^\r?\n/, '');
  return { frontmatter, body };
}

export function parseSimpleYaml(source: string): Record<string, YamlValue> {
  const out: Record<string, YamlValue> = {};
  const lines = source.split(/\r?\n/);
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  const flushList = () => {
    if (currentKey && currentList) {
      out[currentKey] = currentList;
    }
    currentKey = null;
    currentList = null;
  };

  for (const rawLine of lines) {
    if (rawLine.trim() === '' || rawLine.trimStart().startsWith('#')) {
      continue;
    }
    const listMatch = rawLine.match(/^\s+-\s+(.*)$/);
    if (listMatch && currentList) {
      currentList.push(unquote(listMatch[1].trim()));
      continue;
    }
    const kv = rawLine.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) {
      throw new Error(`Unsupported YAML line: ${rawLine}`);
    }
    flushList();
    const key = kv[1];
    const rest = kv[2];
    if (rest === '') {
      currentKey = key;
      currentList = [];
      continue;
    }
    out[key] = parseScalar(rest);
  }
  flushList();
  return out;
}

function parseScalar(raw: string): YamlScalar {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  return unquote(value);
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function asString(value: YamlValue | undefined): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

export function asStringArray(value: YamlValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
}

export function asBoolean(value: YamlValue | undefined, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
}

export function asOptionalString(value: YamlValue | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  if (typeof value === 'number') return String(value);
  return null;
}
