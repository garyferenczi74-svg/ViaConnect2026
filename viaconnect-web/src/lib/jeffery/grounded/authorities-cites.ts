/**
 * Stage A Research Hub authorities cite lane — cite_id + label only.
 * approved + active authorities_sources READ-only. Deny-first static ids.
 * Not retriever monograph chunks. Never invent abstracts / doses.
 * ≤15 authorities; combined with edu+safety (≤20) ≤35. Past caps = NEW GATE.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { FALLBACK_ALLOWLIST_DOMAINS } from "@/lib/agents/authorityAllowlist";
import { isOffListSourceCite } from "./sources-off-list";
import { STAGE_A_RETRIEVER_ALLOWLIST_MAX } from "./education-allowlist";

export interface AuthoritySourceCite {
  cite_id: string;
  label: string;
}

export const STAGE_A_AUTHORITIES_ALLOWLIST_MAX = 15;
export const STAGE_A_RETRIEVER_COMBINED_ALLOWLIST_MAX = 35;

/** Soft-parked FALLBACK hosts — another NEW GATE required to cite. */
export const STAGE_A_AUTHORITIES_PARKED_DOMAINS = [
  "who.int",
  "efsa.europa.eu",
  "thelancet.com",
  "frontiersin.org",
  "academic.oup.com",
  "sciencedirect.com",
  "cell.com",
  "snpedia.com",
  "a4m.com",
  "utoronto.ca",
  "tufts.edu",
  "internationalgenome.org",
] as const;

/** Gated first 12 — cite_id auth:<domain>; label = stored label or seed/domain. */
export const STAGE_A_AUTHORITIES_CITE_ALLOWLIST = [
  { domain: "pubmed.ncbi.nlm.nih.gov", label: "PubMed" },
  { domain: "ncbi.nlm.nih.gov", label: "NCBI" },
  { domain: "fda.gov", label: "FDA" },
  { domain: "nih.gov", label: "NIH" },
  { domain: "clinicaltrials.gov", label: "ClinicalTrials.gov" },
  { domain: "medlineplus.gov", label: "MedlinePlus" },
  { domain: "ods.od.nih.gov", label: "NIH ODS" },
  { domain: "genome.gov", label: "NHGRI" },
  { domain: "nature.com", label: "Nature" },
  { domain: "nejm.org", label: "NEJM" },
  { domain: "jamanetwork.com", label: "JAMA Network" },
  { domain: "peptidesociety.org", label: "Peptide Society" },
] as const;

export type StageAAuthorityDomain = (typeof STAGE_A_AUTHORITIES_CITE_ALLOWLIST)[number]["domain"];

export interface AuthorityCiteRow {
  domain: string;
  label?: string | null;
  is_active?: boolean;
  approval_status?: string;
}

const AUTHORITY_DOMAIN_SET: ReadonlySet<string> = new Set(
  STAGE_A_AUTHORITIES_CITE_ALLOWLIST.map((row) => row.domain)
);

const SEED_LABEL_BY_DOMAIN: Readonly<Record<string, string>> = Object.fromEntries(
  STAGE_A_AUTHORITIES_CITE_ALLOWLIST.map((row) => [row.domain, row.label])
);

export function assertStageAAllowlistCapsHeld(): boolean {
  return (
    STAGE_A_RETRIEVER_ALLOWLIST_MAX === 20 &&
    STAGE_A_AUTHORITIES_ALLOWLIST_MAX === 15 &&
    STAGE_A_RETRIEVER_COMBINED_ALLOWLIST_MAX === 35 &&
    STAGE_A_RETRIEVER_ALLOWLIST_MAX + STAGE_A_AUTHORITIES_ALLOWLIST_MAX ===
      STAGE_A_RETRIEVER_COMBINED_ALLOWLIST_MAX &&
    STAGE_A_AUTHORITIES_CITE_ALLOWLIST.length <= STAGE_A_AUTHORITIES_ALLOWLIST_MAX
  );
}

export function normalizeAuthorityDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "").trim();
}

export function authorityCiteId(domain: string): string {
  const normalized = normalizeAuthorityDomain(domain);
  return normalized ? `auth:${normalized}` : "";
}

export function isStageAAuthorityDomainAllowlisted(domain: string): boolean {
  return AUTHORITY_DOMAIN_SET.has(normalizeAuthorityDomain(domain));
}

export function isStageAAuthorityCiteId(citeId: string): boolean {
  const id = citeId.trim();
  if (!id.startsWith("auth:")) return false;
  return isStageAAuthorityDomainAllowlisted(id.slice("auth:".length));
}

function seedLabelForDomain(domain: string): string {
  const normalized = normalizeAuthorityDomain(domain);
  return SEED_LABEL_BY_DOMAIN[normalized] ?? normalized;
}

export function mapAuthorityRowToCite(row: AuthorityCiteRow): AuthoritySourceCite | null {
  if (row.is_active === false) return null;
  if (row.approval_status && row.approval_status !== "approved") return null;
  const domain = normalizeAuthorityDomain(row.domain ?? "");
  if (!domain || !isStageAAuthorityDomainAllowlisted(domain)) return null;
  const cite_id = authorityCiteId(domain);
  const stored = typeof row.label === "string" ? row.label.trim() : "";
  const label = stored || seedLabelForDomain(domain);
  if (!cite_id || !label) return null;
  if (isOffListSourceCite({ cite_id, label })) return null;
  return { cite_id, label };
}

/** Intersect approved+active rows with the gated 12. Empty → no phantom cites. */
export function citesFromApprovedAuthorityRows(
  rows: readonly AuthorityCiteRow[] | null | undefined
): AuthoritySourceCite[] {
  if (!rows || rows.length === 0) return [];
  const out: AuthoritySourceCite[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const cite = mapAuthorityRowToCite(row);
    if (!cite) continue;
    if (seen.has(cite.cite_id)) continue;
    seen.add(cite.cite_id);
    out.push(cite);
    if (out.length >= STAGE_A_AUTHORITIES_ALLOWLIST_MAX) break;
  }
  return out;
}

/**
 * Intentional production continuity seed — not a successful DB read and not
 * loaded evidence. Empty, unmappable, or failed approved-authority READ may
 * return only this gated static authority seed (`cite_id` + label). Never
 * invents abstract / body / summary / dose / monograph / protocol / genotype /
 * source-count. Distinct from the chat injection seam
 * `loadAuthorityCites: async () => []`, which stays truly empty and yields no
 * phantom Sources. Soft-park: true-empty Sources when live DB is empty is a
 * later product gate — do not collapse these seams.
 */
export function fallbackAuthorityCites(): AuthoritySourceCite[] {
  const fallbackSet = new Set(
    FALLBACK_ALLOWLIST_DOMAINS.map((domain) => normalizeAuthorityDomain(domain))
  );
  return citesFromApprovedAuthorityRows(
    STAGE_A_AUTHORITIES_CITE_ALLOWLIST.filter((row) => fallbackSet.has(row.domain)).map(
      (row) => ({
        domain: row.domain,
        label: row.label,
        is_active: true,
        approval_status: "approved",
      })
    )
  );
}

export type LoadAuthorityCiteRows = () => Promise<AuthorityCiteRow[] | null>;

/** READ-only. No writes. No /api HTTP loopback. Fail → gated fallback seed. */
export async function readApprovedActiveAuthorityRows(): Promise<AuthorityCiteRow[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("authorities_sources")
      .select("domain, label, is_active, approval_status")
      .eq("is_active", true)
      .eq("approval_status", "approved");
    if (error || !Array.isArray(data)) return [];
    return data.map((row) => ({
      domain: String((row as { domain?: string }).domain ?? ""),
      label: String((row as { label?: string }).label ?? ""),
      is_active: Boolean((row as { is_active?: boolean }).is_active),
      approval_status: String((row as { approval_status?: string }).approval_status ?? ""),
    }));
  } catch {
    return [];
  }
}

/**
 * Production approved+active authorities_sources READ.
 * Empty / unmappable / throw → fallbackAuthorityCites() continuity seed only
 * (`cite_id` + label; not DB evidence). An explicit injected empty loader at
 * the chat seam bypasses this function and must stay zero cites.
 */
export async function loadApprovedAuthorityCites(
  loadRows?: LoadAuthorityCiteRows
): Promise<AuthoritySourceCite[]> {
  try {
    const rows = loadRows ? await loadRows() : await readApprovedActiveAuthorityRows();
    const cites = citesFromApprovedAuthorityRows(rows);
    if (cites.length > 0) return cites;
    return fallbackAuthorityCites();
  } catch {
    return fallbackAuthorityCites();
  }
}

export function sanitizeAuthorityCites(
  cites: AuthoritySourceCite[] | undefined
): AuthoritySourceCite[] {
  if (!cites || cites.length === 0) return [];
  const out: AuthoritySourceCite[] = [];
  const seen = new Set<string>();
  for (const cite of cites) {
    const cite_id = cite.cite_id.trim();
    const label = cite.label.trim();
    if (!isStageAAuthorityCiteId(cite_id) || !label) continue;
    if (isOffListSourceCite({ cite_id, label })) continue;
    if (seen.has(cite_id)) continue;
    seen.add(cite_id);
    out.push({ cite_id, label });
    if (out.length >= STAGE_A_AUTHORITIES_ALLOWLIST_MAX) break;
  }
  return out;
}
