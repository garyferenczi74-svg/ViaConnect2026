// Prompt 170b Workstream A: hand-rolled pure-TS CSV parser.
//
// Per Gary 2026-06-01 ratification on Prompt 170b Ask #1: avoid the
// papaparse dependency the original spec section 3.5 incorrectly claimed
// was already in the repo. The [[feedback_permanent_protections]]
// package.json lock stays intact; the parser lives here as a single ~50
// LOC pure-TS module.
//
// Scope:
//   - header row on line 1
//   - comma-delimited fields
//   - double-quoted fields with escaped " via ""
//   - empty fields tolerated (treated as empty string)
//   - LF or CRLF line endings
//
// Not RFC 4180 strict; sufficient for Gordon-controlled seed data where
// every escape character is in our authored vocabulary. The unit tests
// at tests/unit/seed/curated-foods-csv-shape.test.ts exercise the parser
// against the production seed file before each Workstream A push.

export interface ParseResult {
  readonly headers: string[];
  readonly rows: Array<Record<string, string>>;
}

export function parseCSV(input: string): ParseResult {
  const lines = input.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]);
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim().length === 0) continue;
    const fields = parseLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = fields[j] ?? '';
    }
    rows.push(row);
  }
  return { headers, rows };
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
    } else if (c === ',') {
      fields.push(current);
      current = '';
    } else if (c === '"') {
      inQuotes = true;
    } else {
      current += c;
    }
  }
  fields.push(current);
  return fields;
}
