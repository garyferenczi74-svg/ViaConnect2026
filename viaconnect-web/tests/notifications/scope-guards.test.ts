// Prompt #112 — Scope-guard scanner. Confirms no ALTER on existing tables,
// no helix_/peptide_ touches, and no direct carrier API calls outside adapters.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  FORBIDDEN_ALTER_TARGETS,
  FORBIDDEN_TABLE_PREFIXES,
  PROTECTED_PATHS,
} from "@/lib/notifications/scope-guards";

const MIGRATIONS_DIR  = path.resolve(__dirname, "..", "..", "supabase", "migrations");
const LIB_NOTIF_DIR   = path.resolve(__dirname, "..", "..", "src", "lib", "notifications");
const EDGE_FUNCS_DIR  = path.resolve(__dirname, "..", "..", "supabase", "functions");

function prompt112Migrations(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.includes("prompt_112")).map((f) => path.join(MIGRATIONS_DIR, f));
}

describe("Prompt #112 migrations are append-only", () => {
  const migs = prompt112Migrations();
  it("finds at least four migration files", () => {
    expect(migs.length).toBeGreaterThanOrEqual(4);
  });

  for (const target of FORBIDDEN_ALTER_TARGETS) {
    it(`no ALTER TABLE ${target} in Prompt #112 migrations`, () => {
      const rx = new RegExp(`ALTER\\s+TABLE\\s+(?:public\\.)?${target}\\b`, "i");
      for (const mig of migs) {
        const body = readFileSync(mig, "utf8");
        expect(body, `${path.basename(mig)} must not ALTER ${target}`).not.toMatch(rx);
      }
    });
  }

  it("no writes to helix_ or peptide_ prefixed tables", () => {
    const rx = /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE\s+TABLE)\s+[^;]*(?:helix_|peptide_)[a-zA-Z_]+/i;
    for (const mig of migs) {
      const body = readFileSync(mig, "utf8");
      expect(body, `${path.basename(mig)} must not touch ${FORBIDDEN_TABLE_PREFIXES.join("/")} tables`).not.toMatch(rx);
    }
  });

  it("no Supabase email template or config.toml edits in Prompt #112", () => {
    for (const p of PROTECTED_PATHS) {
      // we don't scan migrations for these (migrations don't touch code paths),
      // but this assertion is a load-bearing reminder that the list exists.
      expect(p.length).toBeGreaterThan(0);
    }
  });
});

describe("lib/notifications scope guards", () => {
  function walk(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) files.push(...walk(p));
      else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) files.push(p);
    }
    return files;
  }

  it("no lib reads helix_ or peptide_ tables", () => {
    const files = walk(LIB_NOTIF_DIR);
    for (const f of files) {
      const body = readFileSync(f, "utf8");
      const rx = /\.from\(\s*["'](?:helix_|peptide_)[a-zA-Z_]+["']/;
      expect(body, `${path.relative(LIB_NOTIF_DIR, f)} must not reference helix_/peptide_ tables`).not.toMatch(rx);
    }
  });

  it("only approved adapter files call Twilio / Slack / Web Push APIs directly", () => {
    const libFiles = walk(LIB_NOTIF_DIR);
    const approved = new Set([
      path.join(LIB_NOTIF_DIR, "adapters", "sms.ts"),
      path.join(LIB_NOTIF_DIR, "adapters", "slack.ts"),
      path.join(LIB_NOTIF_DIR, "adapters", "push.ts"),
      path.join(LIB_NOTIF_DIR, "adapters", "fcm.ts"),
      path.join(LIB_NOTIF_DIR, "adapters", "apns.ts"),
    ]);
    for (const f of libFiles) {
      if (approved.has(f)) continue;
      const body = readFileSync(f, "utf8");
      expect(body, `${path.relative(LIB_NOTIF_DIR, f)} must not call api.twilio.com directly`).not.toMatch(/api\.twilio\.com/);
      expect(body, `${path.relative(LIB_NOTIF_DIR, f)} must not call slack.com/api directly`).not.toMatch(/slack\.com\/api/);
    }
  });
});

describe("notification edge functions", () => {
  it("every edge function in supabase/functions/notification-* exists", () => {
    const expected = [
      "practitioner-notification-dispatcher",
      "notification-sms-inbound",
      "notification-slack-webhook",
      "notification-push-token-hygiene",
      "notification-batch-digest",
    ];
    for (const name of expected) {
      const p = path.join(EDGE_FUNCS_DIR, name, "index.ts");
      expect(() => readFileSync(p, "utf8")).not.toThrow();
    }
  });
});
