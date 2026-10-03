import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

const credentialSql = read(
  "supabase/migrations/20261003130000_practitioner_naturopath_credential.sql",
);
const vipSql = read(
  "supabase/migrations/20261003130100_vip_sensitive_note_search_path.sql",
);
const credentialBody = stripSqlComments(credentialSql);
const vipBody = stripSqlComments(vipSql);

describe("naturopath credential migration", () => {
  it("keeps every role from the 20260423000010 check and adds naturopath", () => {
    for (const role of [
      "patient",
      "practitioner",
      "admin",
      "compliance_officer",
      "legal_ops",
      "cfo",
      "ceo",
      "medical_director",
      "naturopath",
    ]) {
      expect(credentialBody).toContain(`'${role}'`);
    }
    expect(credentialBody).not.toContain("'consumer'");
    expect(credentialBody).not.toContain("'board_member'");
    expect(credentialBody).not.toContain("'exec_reporting_admin'");
    expect(credentialBody).toMatch(/NOT VALID/);
    expect(credentialBody).toMatch(/VALIDATE CONSTRAINT profiles_role_check/);
  });

  it("stores licence fields with verification default unverified", () => {
    expect(credentialBody).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.practitioner_naturopath_credentials/,
    );
    expect(credentialBody).toMatch(/licence_type text NOT NULL/);
    expect(credentialBody).toMatch(/jurisdiction text NOT NULL/);
    expect(credentialBody).toMatch(/licence_number text NOT NULL/);
    expect(credentialBody).toMatch(
      /verification_status text NOT NULL DEFAULT 'unverified'/,
    );
    expect(credentialBody).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(credentialBody).toMatch(
      /REFERENCES public\.practitioners \(user_id\)/,
    );
    expect(credentialBody).toMatch(/NATUROPATH_ROLE_NOT_SELF_ASSIGNABLE/);
  });

  it("does not copy the licence number into audit_logs payloads", () => {
    expect(credentialBody).toMatch(/licence_number_present/);
    expect(credentialBody).not.toMatch(
      /'licence_number',\s*(OLD|NEW)\.licence_number/,
    );
  });

  it("does not delete rows, touch storage, or mention photo buckets", () => {
    expect(credentialBody).not.toMatch(/DROP TABLE/i);
    expect(credentialBody).not.toMatch(/DELETE FROM/i);
    expect(credentialBody).not.toMatch(/storage\.objects/i);
    expect(credentialBody).not.toMatch(/FormaVision/);
    expect(credentialBody).not.toMatch(/Body Tracker/);
    expect(credentialBody).not.toMatch(/body-progress-photos/);
  });
});

describe("VIP search_path migration", () => {
  it("schema-qualifies pgcrypto and does not change the key or the rows", () => {
    expect(vipBody).toMatch(/SET search_path = ''/);
    expect(vipBody).toMatch(/extensions\.pgp_sym_encrypt\s*\(/);
    expect(vipBody).toMatch(/extensions\.digest\s*\(/);
    expect(vipBody).not.toMatch(/(?<!extensions\.)\bpgp_sym_encrypt\s*\(/);
    expect(vipBody).not.toMatch(/(?<!extensions\.)\bdigest\s*\(/);
    expect(vipBody).toMatch(/app\.vip_sensitive_note_key/);
    expect(vipBody).not.toMatch(/DELETE FROM/i);
    expect(vipBody).not.toMatch(/UPDATE public\.map_vip_exemption_sensitive_notes/i);
    expect(vipBody).toMatch(
      /CREATE OR REPLACE FUNCTION public\.create_vip_sensitive_note/,
    );
  });
});

describe("encryption design docs", () => {
  const plan = read("docs/security/encryption-plan-gcp-kms.md");
  const photos = read("docs/security/per-session-practitioner-photo-access.md");

  it("records Google Cloud KMS, the envelope, and the phase order", () => {
    expect(plan).toMatch(/Google Cloud KMS/);
    expect(plan).toMatch(/Workload Identity Federation/);
    expect(plan).toMatch(/vcx1/);
    expect(plan).toMatch(/This design is \*{0,2}not end-to-end encryption/);
    expect(plan).toMatch(/notes/);
    expect(plan).toMatch(/genetics/);
    expect(plan).toMatch(/labs/);
    expect(plan).toMatch(/FormaVision/);
    expect(plan).toMatch(/covered-entity/i);
    expect(plan).toMatch(/\bBAA\b/);
    expect(plan).toMatch(/NOT APPLIED/);
    expect(plan).toMatch(
      /20261003130000_practitioner_naturopath_credential\.sql/,
    );
    expect(plan).toMatch(/20261003130100_vip_sensitive_note_search_path\.sql/);
    expect(plan).not.toMatch(/20261003120000_practitioner_naturopath_credential/);
    expect(plan).not.toMatch(/20261003120100_vip_sensitive_note_search_path/);
  });

  it("does not claim a regulatory certification or that encryption is end-to-end", () => {
    for (const doc of [plan, photos]) {
      expect(doc).not.toMatch(/HIPAA/i);
      expect(doc).not.toMatch(/SOC\s*2/i);
      expect(doc).not.toMatch(/zero-knowledge/i);
      expect(doc).not.toMatch(/\bis end-to-end encrypt/i);
      expect(doc).not.toMatch(/provides end-to-end/i);
      expect(doc).toMatch(/not end-to-end encryption/);
    }
  });

  it("keeps photo work as design only", () => {
    expect(photos).toMatch(/design only/i);
    expect(photos).toMatch(/photo_share_permissions/);
    expect(photos).toMatch(/storage polic/i);
    expect(photos).toMatch(/not changed/i);
    expect(photos).toMatch(/Apple[\s\S]{0,80}5\.1\.1/);
    expect(photos).toMatch(/5\.1\.3/);
    expect(photos).toMatch(/Play[\s\S]{0,40}User Data|Data safety/);
  });
});
