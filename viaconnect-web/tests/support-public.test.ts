import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("public support page", () => {
  it("allowlists /support in the session middleware", () => {
    const middleware = read("src/lib/supabase/middleware.ts");
    expect(middleware).toContain('pathname === "/support"');
  });

  it("names ViaConnect, the contact addresses, and public help links", () => {
    const page = read("src/app/support/page.tsx");
    expect(page).toContain("ViaConnect");
    expect(page).toContain("mailto:support@viaconnectapp.com");
    expect(page).toContain("support@viaconnectapp.com");
    expect(page).toContain("mailto:info@viaconnectapp.com");
    expect(page).toContain("info@viaconnectapp.com");
    expect(page).toContain('href="/privacy"');
    expect(page).toContain('href="/terms"');
    expect(page).toContain('href="/delete-account"');
    expect(page).toContain('href="/dsar"');
    expect(page).toContain(
      "The Services are for informational and wellness purposes only. They do not provide medical advice, diagnosis, or treatment."
    );
    expect(page).not.toMatch(/business day|within \d+|response time|office hours/i);
  });

  it("links support from the footer and the legal header", () => {
    expect(read("src/components/layout/SiteFooter.tsx")).toContain('href="/support"');
    expect(read("src/app/(legal)/layout.tsx")).toContain('href="/support"');
  });

  it("updates product contact mailtos and leaves legal policy emails", () => {
    const footer = read("src/components/layout/SiteFooter.tsx");
    expect(footer).toContain("mailto:info@viaconnectapp.com");
    expect(footer).not.toContain("farmceuticawellness.com");
    const order = read("src/app/(app)/(consumer)/account/orders/[orderId]/page.tsx");
    expect(order).toContain("mailto:support@viaconnectapp.com");
    expect(order).not.toContain("support@farmceutica.com");
    expect(read("src/app/(legal)/privacy/page.tsx")).toContain("info@farmceuticawellness.com");
    expect(read("src/app/(legal)/terms/page.tsx")).toContain("Payments@farmceuticawellness.com");
    expect(read("src/lib/api/email-service.ts")).toContain(
      "process.env.SENDGRID_FROM_EMAIL ?? 'hello@viaconnect.app'"
    );
  });
});
