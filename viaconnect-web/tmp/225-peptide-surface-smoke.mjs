/**
 * Prompt 225: peptide education surface smoke + screenshots.
 * Checks consumer /peptide-protocol, shop redirect, practitioner gate.
 * Never logs secrets.
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs/peptides/225-surface-evidence");
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.SMOKE_BASE || "https://www.viaconnectapp.com";

// Numeric dose amounts only. Do not flag educational disclaimers that say
 // "No dosing, reconstitution, or sourcing" (false positive in prior 225 tests).
const DOSE_LEXICON =
  /\b\d+(?:\.\d+)?\s?(mg|mcg|µg|ug|iu|ml)\b|\binject(?:ion)?\s+technique\b|\btitrat(?:e|ion)\s+schedule\b|\bcycle\s+length\s*:\s*\d/i;

const COMMERCE_HREF = /\/shop\/|add-to-cart|checkout|buy[-_ ]?now/i;

async function probe(page, urlPath, opts = {}) {
  const url = BASE + urlPath;
  const resp = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForTimeout(opts.waitMs ?? 1500);
  const finalUrl = page.url();
  const status = resp?.status() ?? null;
  const title = await page.title();
  const bodyText = (await page.locator("body").innerText().catch(() => "")) || "";
  const hrefs = await page.$$eval("a[href]", (as) =>
    as.map((a) => a.getAttribute("href") || "").filter(Boolean),
  );
  const html = await page.content();

  const doseHits = [];
  const doseRe = new RegExp(DOSE_LEXICON.source, "gi");
  let m;
  while ((m = doseRe.exec(bodyText)) && doseHits.length < 8) {
    doseHits.push(m[0]);
  }

  const commerceHrefs = hrefs.filter((h) => COMMERCE_HREF.test(h));
  const hasWada = /WADA/i.test(bodyText) || /WADA/i.test(html);
  const hasEducational =
    /educational|Collection 14|Peptide Education|monograph|Marshall/i.test(
      bodyText,
    );
  const hasViaCura = /Via Cura|related nutritional support|10x to 28x/i.test(
    bodyText,
  );
  const isLoginGate = /\/login/i.test(finalUrl);
  const redirectedFromShop =
    urlPath.startsWith("/shop/peptides") &&
    (finalUrl.includes("/peptide-protocol") ||
      /redirectTo=%2Fpeptide-protocol/i.test(finalUrl) ||
      /redirectTo=\/peptide-protocol/i.test(finalUrl));

  return {
    path: urlPath,
    status,
    finalUrl,
    title,
    isLoginGate,
    redirectedFromShop,
    bodyLen: bodyText.length,
    hasWada,
    hasEducational,
    hasViaCura,
    doseHits,
    commerceHrefs: commerceHrefs.slice(0, 12),
    sampleText: bodyText.replace(/\s+/g, " ").trim().slice(0, 280),
  };
}

const browser = await chromium.launch({ headless: true });
const results = {
  at: new Date().toISOString(),
  base: BASE,
  checks: [],
  screenshots: [],
  ok: false,
};

try {
  // Desktop consumer protocol
  const desktop = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const protocol = await probe(desktop, "/peptide-protocol");
  const shop = await probe(desktop, "/shop/peptides");
  const shopSlug = await probe(desktop, "/shop/peptides/epitalon");
  const practitioner = await probe(desktop, "/practitioner/peptides");

  const deskShot = path.join(outDir, "peptide-protocol-desktop-1280.png");
  await desktop.goto(BASE + "/peptide-protocol", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await desktop.waitForTimeout(2000);
  await desktop.screenshot({ path: deskShot, fullPage: true });
  results.screenshots.push({
    name: "peptide-protocol-desktop-1280",
    path: "docs/peptides/225-surface-evidence/peptide-protocol-desktop-1280.png",
  });

  // Mobile consumer protocol
  const iPhone = devices["iPhone 13"];
  const mobile = await browser.newPage({
    ...iPhone,
  });
  await mobile.goto(BASE + "/peptide-protocol", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await mobile.waitForTimeout(2000);
  const mobileProbe = await probe(mobile, "/peptide-protocol", { waitMs: 500 });
  const mobShot = path.join(outDir, "peptide-protocol-mobile-390.png");
  await mobile.screenshot({ path: mobShot, fullPage: true });
  results.screenshots.push({
    name: "peptide-protocol-mobile-390",
    path: "docs/peptides/225-surface-evidence/peptide-protocol-mobile-390.png",
  });

  // Practitioner login-gate screenshot
  await desktop.goto(BASE + "/practitioner/peptides", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await desktop.waitForTimeout(1000);
  const pracShot = path.join(outDir, "practitioner-peptides-auth-gate.png");
  await desktop.screenshot({ path: pracShot, fullPage: true });
  results.screenshots.push({
    name: "practitioner-peptides-auth-gate",
    path: "docs/peptides/225-surface-evidence/practitioner-peptides-auth-gate.png",
  });

  results.checks = [
    protocol,
    shop,
    shopSlug,
    practitioner,
    { ...mobileProbe, viewport: "mobile" },
  ];

  const shopRedirectOk = shop.redirectedFromShop === true;
  const shopSlugRedirectOk = shopSlug.redirectedFromShop === true;
  // Consumer peptide surfaces are auth-gated in production middleware.
  // Smoke proves G1 retirement chain + auth gates + no dose/commerce leaks on login pages.
  const protocolAuthGated = protocol.isLoginGate === true;
  const noDoseLeak = results.checks.every((c) => (c.doseHits?.length ?? 0) === 0);
  const noCommerceLeak = results.checks.every(
    (c) => (c.commerceHrefs?.length ?? 0) === 0,
  );
  const practitionerGated =
    practitioner.isLoginGate ||
    practitioner.finalUrl.includes("/peptide-protocol") ||
    practitioner.finalUrl.includes("/login");

  results.assertions = {
    shopRedirectOk,
    shopSlugRedirectOk,
    protocolAuthGated,
    noDoseLeak,
    noCommerceLeak,
    practitionerGated,
    screenshotsCaptured: results.screenshots.length >= 3,
  };

  results.ok = Object.values(results.assertions).every(Boolean);
  results.note =
    "Authenticated catalog/WADA chip render requires a logged-in session; see prove-225-surfaces cron for DB chip candidates.";

  await desktop.close();
  await mobile.close();
} finally {
  await browser.close();
}

const outJson = path.join(root, "docs/peptides/225-surface-smoke-result.json");
fs.writeFileSync(outJson, JSON.stringify(results, null, 2));
console.log(JSON.stringify({
  ok: results.ok,
  assertions: results.assertions,
  screenshots: results.screenshots.map((s) => s.name),
  checks: results.checks.map((c) => ({
    path: c.path,
    finalUrl: c.finalUrl,
    isLoginGate: c.isLoginGate,
    hasWada: c.hasWada,
    hasEducational: c.hasEducational,
    doseHits: c.doseHits,
    commerceHrefs: c.commerceHrefs,
  })),
}, null, 2));
process.exit(results.ok ? 0 : 2);
