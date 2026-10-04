// PP-37 / PP-38: practitioner and naturopath pages must not keep the
// hard-coded people, clinics, titles, or chart fixtures, and the shared
// empty state must render those pages' neutral copy.

import { describe, it, expect } from "vitest";
import { createElement, type ComponentType } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { PORTAL_EMPTY_COPY } from "@/lib/portal/empty-state-copy";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import PractitionerAiPage from "@/app/(app)/practitioner/ai/page";
import PractitionerEhrPage from "@/app/(app)/practitioner/ehr/page";
import PractitionerGenomicsPage from "@/app/(app)/practitioner/genomics/page";
import PractitionerProtocolsPage from "@/app/(app)/practitioner/protocols/page";
import PractitionerProtocolBuilderPage from "@/app/(app)/practitioner/protocols/builder/page";
import PractitionerSchedulerPage from "@/app/(app)/practitioner/scheduler/page";
import PractitionerSettingsPage from "@/app/(app)/practitioner/settings/page";
import PractitionerCompliancePage from "@/app/(app)/practitioner/compliance/page";
import CohortsPage from "@/app/(app)/practitioner/analytics/cohorts/page";
import PractitionerConstitutionalPage from "@/app/(app)/practitioner/naturopath/constitutional/page";
import PractitionerHolisticAdvisorPage from "@/app/(app)/practitioner/naturopath/holistic-advisor/page";
import PractitionerNaturalProtocolsPage from "@/app/(app)/practitioner/naturopath/natural-protocols/page";
import NaturopathAiPage from "@/app/(app)/naturopath/ai/page";
import NaturopathAnalyticsPage from "@/app/(app)/naturopath/analytics/page";
import NaturopathBotanicalPage from "@/app/(app)/naturopath/botanical/page";
import NaturopathFormulaBuilderPage from "@/app/(app)/naturopath/botanical/formula-builder/page";
import NaturopathCompliancePage from "@/app/(app)/naturopath/compliance/page";
import NaturopathConstitutionalPage from "@/app/(app)/naturopath/constitutional/page";
import NaturopathPatientDetailPage from "@/app/(app)/naturopath/patients/[id]/page";
import NaturopathProtocolsPage from "@/app/(app)/naturopath/protocols/page";
import NaturopathSchedulerPage from "@/app/(app)/naturopath/scheduler/page";
import NaturopathSettingsPage from "@/app/(app)/naturopath/settings/page";
import PractitionerAnalyticsPage from "@/app/(app)/practitioner/analytics/page";

const REPO = path.resolve(__dirname, "..");

/** Names, titles, clinics, and fixtures removed from the portal pages. */
const FORBIDDEN_MOCK_STRINGS = [
  "Dr. Chen",
  "Dr. Thompson",
  "Dr. Ferenczi",
  "Dr. Sarah Thompson",
  "Dr. ViaConnect",
  "Dr. Kim",
  "Board Certified Naturopathic Doctor",
  "Chen Integrative Wellness",
  "Harmony Naturopathic Clinic",
  "ViaConnect Wellness Clinic",
  "Sarah Mitchell",
  "James Robertson",
  "James Rodriguez",
  "Anika Patel",
  "Marcus Thompson",
  "Emily Zhao",
  "Emily Chen",
  "Elena Vasquez",
  "Marcus Chen",
  "Marcus Jones",
  "Priya Patel",
  "Priya Sharma",
  "David Nguyen",
  "Michael Chen",
  "Robert Chen",
  "Sarah Kim",
  "James Wright",
  "James Thornton",
  "James Kowalski",
  "Sarah Williams",
  "dr.chen@chenwellness.com",
  "dr.thompson@harmonyclinic.com",
  "harmonyclinic.com",
  "Epic MyChart",
  "HIPAA Audit Trail",
  "$12,460",
  "192.168.1.42",
  "192.168.1.45",
] as const;

const SCANNED_PAGES = [
  "src/app/(app)/practitioner/ai/page.tsx",
  "src/app/(app)/practitioner/ehr/page.tsx",
  "src/app/(app)/practitioner/genomics/page.tsx",
  "src/app/(app)/practitioner/interactions/page.tsx",
  "src/app/(app)/practitioner/protocols/page.tsx",
  "src/app/(app)/practitioner/protocols/builder/page.tsx",
  "src/app/(app)/practitioner/scheduler/page.tsx",
  "src/app/(app)/practitioner/settings/page.tsx",
  "src/app/(app)/practitioner/compliance/page.tsx",
  "src/app/(app)/practitioner/analytics/page.tsx",
  "src/app/(app)/practitioner/patients/[id]/LegacyPatientView.tsx",
  "src/app/(app)/practitioner/analytics/cohorts/page.tsx",
  "src/app/(app)/practitioner/naturopath/constitutional/page.tsx",
  "src/app/(app)/practitioner/naturopath/holistic-advisor/page.tsx",
  "src/app/(app)/practitioner/naturopath/natural-protocols/page.tsx",
  "src/app/(app)/naturopath/ai/page.tsx",
  "src/app/(app)/naturopath/analytics/page.tsx",
  "src/app/(app)/naturopath/botanical/page.tsx",
  "src/app/(app)/naturopath/botanical/formula-builder/page.tsx",
  "src/app/(app)/naturopath/compliance/page.tsx",
  "src/app/(app)/naturopath/constitutional/page.tsx",
  "src/app/(app)/naturopath/interactions/page.tsx",
  "src/app/(app)/naturopath/patients/[id]/page.tsx",
  "src/app/(app)/naturopath/protocols/page.tsx",
  "src/app/(app)/naturopath/scheduler/page.tsx",
  "src/app/(app)/naturopath/settings/page.tsx",
  "src/lib/portal/empty-state-copy.ts",
  "src/components/portal/PortalEmptyState.tsx",
] as const;

const CLAIM_WORDS = [
  "viacura",
  "viaconnect",
  "farmceutica",
  "hipaa",
  "soc 2",
  "soc2",
  "board certified",
  "board-certified",
  "doctor",
  "physician",
  "epic",
  "mychart",
  "klas",
] as const;

const RENDERED_PAGES: { name: string; Page: ComponentType; body: string }[] = [
  { name: "practitioner ai", Page: PractitionerAiPage, body: PORTAL_EMPTY_COPY.practitionerAi.body },
  { name: "practitioner ehr", Page: PractitionerEhrPage, body: PORTAL_EMPTY_COPY.practitionerEhr.body },
  { name: "practitioner genomics", Page: PractitionerGenomicsPage, body: PORTAL_EMPTY_COPY.practitionerGenomics.body },
  { name: "practitioner protocols", Page: PractitionerProtocolsPage, body: PORTAL_EMPTY_COPY.practitionerProtocols.body },
  { name: "practitioner protocol builder", Page: PractitionerProtocolBuilderPage, body: PORTAL_EMPTY_COPY.practitionerProtocolBuilder.body },
  { name: "practitioner scheduler", Page: PractitionerSchedulerPage, body: PORTAL_EMPTY_COPY.practitionerScheduler.body },
  { name: "practitioner settings", Page: PractitionerSettingsPage, body: PORTAL_EMPTY_COPY.practitionerSettings.body },
  { name: "practitioner compliance", Page: PractitionerCompliancePage, body: PORTAL_EMPTY_COPY.practitionerCompliance.body },
  { name: "practitioner cohorts", Page: CohortsPage, body: PORTAL_EMPTY_COPY.practitionerCohorts.body },
  { name: "practitioner constitutional", Page: PractitionerConstitutionalPage, body: PORTAL_EMPTY_COPY.practitionerConstitutional.body },
  { name: "practitioner holistic advisor", Page: PractitionerHolisticAdvisorPage, body: PORTAL_EMPTY_COPY.practitionerHolisticAdvisor.body },
  { name: "practitioner natural protocols", Page: PractitionerNaturalProtocolsPage, body: PORTAL_EMPTY_COPY.practitionerNaturalProtocols.body },
  { name: "naturopath ai", Page: NaturopathAiPage, body: PORTAL_EMPTY_COPY.naturopathAi.body },
  { name: "naturopath analytics", Page: NaturopathAnalyticsPage, body: PORTAL_EMPTY_COPY.naturopathAnalytics.body },
  { name: "naturopath botanical", Page: NaturopathBotanicalPage, body: PORTAL_EMPTY_COPY.naturopathBotanical.body },
  { name: "naturopath formula builder", Page: NaturopathFormulaBuilderPage, body: PORTAL_EMPTY_COPY.naturopathFormulaBuilder.body },
  { name: "naturopath compliance", Page: NaturopathCompliancePage, body: PORTAL_EMPTY_COPY.naturopathCompliance.body },
  { name: "naturopath constitutional", Page: NaturopathConstitutionalPage, body: PORTAL_EMPTY_COPY.naturopathConstitutional.body },
  { name: "naturopath patient detail", Page: NaturopathPatientDetailPage, body: PORTAL_EMPTY_COPY.naturopathPatientDetail.body },
  { name: "naturopath protocols", Page: NaturopathProtocolsPage, body: PORTAL_EMPTY_COPY.naturopathProtocols.body },
  { name: "naturopath scheduler", Page: NaturopathSchedulerPage, body: PORTAL_EMPTY_COPY.naturopathScheduler.body },
  { name: "naturopath settings", Page: NaturopathSettingsPage, body: PORTAL_EMPTY_COPY.naturopathSettings.body },
  {
    name: "practitioner analytics charts",
    Page: PractitionerAnalyticsPage,
    body: PORTAL_EMPTY_COPY.practitionerAnalyticsCharts.body,
  },
];

describe("portal empty-state copy", () => {
  it("keeps every new string free of claim words", () => {
    const blob = JSON.stringify(PORTAL_EMPTY_COPY).toLowerCase();
    for (const word of CLAIM_WORDS) {
      expect(blob.includes(word), word).toBe(false);
    }
  });

  it("renders the shared empty state", () => {
    const html = renderToStaticMarkup(
      createElement(PortalEmptyState, { copy: PORTAL_EMPTY_COPY.practitionerScheduler }),
    );
    expect(html).toContain('data-testid="portal-empty-state"');
    expect(html).toContain("No appointments");
    expect(html).toContain("There are no appointments on this page.");
    expect(html).toContain('stroke-width="1.5"');
  });
});

describe("portal pages no longer contain mock fixtures", () => {
  it.each(SCANNED_PAGES)("%s has none of the removed mock strings", (rel) => {
    const src = readFileSync(path.join(REPO, rel), "utf8");
    for (const needle of FORBIDDEN_MOCK_STRINGS) {
      expect(src.includes(needle), needle).toBe(false);
    }
  });

  it("keeps the saved-interaction report on both interaction pages", () => {
    for (const rel of [
      "src/app/(app)/practitioner/interactions/page.tsx",
      "src/app/(app)/naturopath/interactions/page.tsx",
    ]) {
      const src = readFileSync(path.join(REPO, rel), "utf8");
      expect(src).toContain("InteractionEngine");
      expect(src).not.toContain("INTERACTION_DB");
    }
  });
});

describe("portal empty states render", () => {
  it.each(RENDERED_PAGES)("$name shows the empty state and its copy", ({ Page, body }) => {
    const html = renderToStaticMarkup(createElement(Page));
    expect(html).toContain('data-testid="portal-empty-state"');
    expect(html).toContain(body);
    expect(html).not.toContain("Dr. Chen");
    expect(html).not.toContain("Board Certified");
  });

  it("keeps the settings plugin links and the patient roster link", () => {
    const practitionerSettings = renderToStaticMarkup(createElement(PractitionerSettingsPage));
    expect(practitionerSettings).toContain('href="/practitioner/settings/plugins"');
    expect(practitionerSettings).toContain("Plugin manager");

    const naturopathSettings = renderToStaticMarkup(createElement(NaturopathSettingsPage));
    expect(naturopathSettings).toContain('href="/naturopath/settings/plugins"');

    const patient = renderToStaticMarkup(createElement(NaturopathPatientDetailPage));
    expect(patient).toContain('href="/naturopath/patients"');
    expect(patient).toContain("Patient roster");
  });

  it("keeps the cohorts disclaimer and analytics back link", () => {
    const html = renderToStaticMarkup(createElement(CohortsPage));
    expect(html).toContain("Medical disclaimer");
    expect(html).toContain('href="/practitioner/analytics"');
    expect(html).toContain("decision-support tools, not medical advice");
  });
});
