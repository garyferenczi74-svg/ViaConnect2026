/**
 * Takedown template generator. Produces DRAFT takedown notices only; nothing
 * is submitted to any platform automatically. Steve Rica reviews, edits, and
 * manually dispatches via the platform's own UI.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type TakedownMechanism =
  | "amazon_brand_registry"
  | "ebay_vero"
  | "walmart_seller_protection"
  | "etsy_ip_policy"
  | "dmca_takedown"
  | "platform_trust_safety"
  | "manual_legal";

export interface TakedownDraftInput {
  findingId: string;
  platform: string;
  listingUrl: string;
  mechanism: TakedownMechanism;
  sku?: string;
  authorHandle?: string;
  evidenceUrls?: string[];
}

const TEMPLATES: Record<TakedownMechanism, (input: TakedownDraftInput) => string> = {
  amazon_brand_registry: (i) =>
    `AMAZON BRAND REGISTRY — Report a Violation

Mark owner: FarmCeutica Wellness LLC
Registered marks: FarmCeutica, ViaCura, GeneX360

Reported listing: ${i.listingUrl}
Reported seller handle: ${i.authorHandle ?? "[unknown]"}
FarmCeutica SKU implicated: ${i.sku ?? "[see evidence]"}

Violation type: Unauthorized reseller / suspected counterfeit

Evidence bundle references:
${(i.evidenceUrls ?? []).map((u) => `  - ${u}`).join("\n") || "  - [bundle URLs to attach]"}

Requested action: Immediate delisting pending investigation; seller account review.

Submitted by FarmCeutica Wellness LLC, contact: steve@farmceuticawellness.com
Marshall finding: ${i.findingId}`,
  ebay_vero: (i) =>
    `eBay VeRO — Notice of Claimed Infringement

Rights owner: FarmCeutica Wellness LLC
Contact: steve@farmceuticawellness.com

Listing URL: ${i.listingUrl}
Listing seller: ${i.authorHandle ?? "[unknown]"}

Infringement basis: Unauthorized commercial use of FarmCeutica / ViaCura / GeneX360 marks.

Good-faith belief statement: The rights holder has a good-faith belief that the
use of the identified material is not authorized by the rights owner, its agent,
or the law.

Marshall finding: ${i.findingId}
Evidence manifest hashes available on request.`,
  walmart_seller_protection: (i) =>
    `WALMART MARKETPLACE — IP/Brand Claim

Rights owner: FarmCeutica Wellness LLC
Listing URL: ${i.listingUrl}

Claim: Unauthorized resale of FarmCeutica-branded product.
Marshall finding: ${i.findingId}`,
  etsy_ip_policy: (i) =>
    `ETSY INTELLECTUAL PROPERTY POLICY — Report

Rights owner: FarmCeutica Wellness LLC
Listing URL: ${i.listingUrl}
Reported shop: ${i.authorHandle ?? "[unknown]"}

Claim type: Trademark infringement / unauthorized resale
Marshall finding: ${i.findingId}`,
  dmca_takedown: (i) =>
    `DMCA 512(c) TAKEDOWN NOTICE

To: [host designated agent]
From: FarmCeutica Wellness LLC
Contact: steve@farmceuticawellness.com

Identification of the copyrighted work: [describe]
Location of the infringing material: ${i.listingUrl}

Statement of good faith: I have a good faith belief that use of the material
in the manner complained of is not authorized by the copyright owner, its
agent, or the law.

Statement of accuracy: The information in this notification is accurate, and
under penalty of perjury, I am authorized to act on behalf of the owner of
an exclusive right that is allegedly infringed.

Marshall finding: ${i.findingId}`,
  platform_trust_safety: (i) =>
    `PLATFORM TRUST AND SAFETY REPORT

Platform: ${i.platform}
Content URL: ${i.listingUrl}
Handle: ${i.authorHandle ?? "[unknown]"}
Reported by: FarmCeutica Wellness LLC
Reason: Compliance concern flagged by Marshall compliance officer; finding ${i.findingId}.
Requested action: Platform-level review per published policies.`,
  manual_legal: (i) =>
    `LEGAL COUNSEL ENGAGEMENT DRAFT

Matter: Suspected counterfeit / unauthorized commercial use
Source listing: ${i.listingUrl}
Marshall finding: ${i.findingId}

Forwarding to external counsel for disposition. No platform notice sent directly.`,
};

export function draftTakedown(input: TakedownDraftInput): string {
  const template = TEMPLATES[input.mechanism];
  return template ? template(input) : TEMPLATES.manual_legal(input);
}

export async function createTakedownRequest(
  db: SupabaseClient,
  input: TakedownDraftInput,
): Promise<{ id: string; draftBody: string }> {
  const draftBody = draftTakedown(input);
  const { data, error } = await db
    .from("takedown_requests")
    .insert({
      finding_id: input.findingId,
      platform: input.platform,
      listing_url: input.listingUrl,
      mechanism: input.mechanism,
      status: "drafted",
      draft_body: draftBody,
    })
    .select("id")
    .single();
  if (error) throw new Error(`takedown insert failed: ${error.message}`);
  return { id: (data as { id: string }).id, draftBody };
}
