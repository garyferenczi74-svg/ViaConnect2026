-- =============================================================================
-- Prompt #124 P6: Takedown template seeds
-- =============================================================================
-- Seven canonical templates, one per mechanism, all version 1, all
-- jurisdiction='generic', language='en-US'. Every template declares the
-- slot set its body relies on so the drafter can validate before insert.
--
-- `active = true` but `approved_by / approved_at` unset — Steve must flip
-- each template to approved before the drafter will accept it for a first
-- live filing. This matches the P1 design: drafts can be produced once
-- active, filings require approved state.
--
-- Slot reference (buildSlots in src/lib/marshall/vision/takedownDraft.ts):
--   listing_url, listing_platform, evaluation_id, matched_sku, verdict,
--   confidence, mismatch_flags, feature_trace, cited_reference_list,
--   finding_id, test_buy_id, actor_id, brand_legal_name, platform_name,
--   jurisdiction, language
-- =============================================================================

-- ── 1. Amazon Brand Registry ────────────────────────────────────────────────
INSERT INTO public.takedown_templates (template_code, mechanism, version, jurisdiction, language, body, required_slots, active) VALUES
  ('amazon-counterfeit-v1', 'amazon_brand_registry', 1, 'generic', 'en-US',
$template$To Amazon Brand Registry Counterfeit Enforcement,

{{brand_legal_name}} submits this report under the Brand Registry Report a Violation program.

Listing: {{listing_url}}
Reported by: {{actor_id}} (FarmCeutica Wellness LLC Compliance)
Marshall Vision determination: {{verdict}} (confidence {{confidence}})
Evaluation reference: {{evaluation_id}}
Internal finding: {{finding_id}}

Authentic product: {{matched_sku}} manufactured by {{brand_legal_name}}.

Specific counterfeit indicators observed in the listing:

{{mismatch_flags}}

Feature-by-feature comparison against our authentic reference photography:

{{feature_trace}}

Authentic reference images cited in this submission:

{{cited_reference_list}}

We affirm the listed item is not an authentic {{brand_legal_name}} product and that we are the rights holder for the brand name and packaging trade dress. We request the listing be removed and seller account measures be applied per the Brand Registry policy.

Test buy reference (if applicable): {{test_buy_id}}

Jurisdiction: {{jurisdiction}}. Language: {{language}}.
$template$,
   ARRAY['brand_legal_name','listing_url','actor_id','verdict','confidence','evaluation_id','finding_id','matched_sku','mismatch_flags','feature_trace','cited_reference_list','test_buy_id','jurisdiction','language']::text[],
   true)
ON CONFLICT (template_code, version) DO NOTHING;

-- ── 2. eBay VeRO (Notice of Claimed Infringement) ───────────────────────────
INSERT INTO public.takedown_templates (template_code, mechanism, version, jurisdiction, language, body, required_slots, active) VALUES
  ('ebay-vero-counterfeit-v1', 'ebay_vero', 1, 'generic', 'en-US',
$template$eBay Verified Rights Owner (VeRO) Program,
Notice of Claimed Infringement — Counterfeit

Rights holder: {{brand_legal_name}}
Submitted by: {{actor_id}}

Listing ID / URL: {{listing_url}}
Platform: {{platform_name}}

Claim: The listing offers a counterfeit item bearing the {{brand_legal_name}} trademark and packaging trade dress. Our Compliance Officer, aided by Marshall Vision structured evaluation, reviewed the listing imagery and identified the following non-authentic indicators:

{{mismatch_flags}}

Feature comparison against authentic references:

{{feature_trace}}

Authentic reference assets cited:

{{cited_reference_list}}

Authentic product SKU: {{matched_sku}}.
Marshall Vision evaluation reference: {{evaluation_id}}.
Confidence: {{confidence}}.
Internal finding: {{finding_id}}.
Test buy record (if any): {{test_buy_id}}.

Under penalty of perjury under the laws of the United States, the undersigned affirms that the information in this notice is accurate and that the undersigned is authorized to act on behalf of the rights holder.
$template$,
   ARRAY['brand_legal_name','actor_id','listing_url','platform_name','mismatch_flags','feature_trace','cited_reference_list','matched_sku','evaluation_id','confidence','finding_id','test_buy_id']::text[],
   true)
ON CONFLICT (template_code, version) DO NOTHING;

-- ── 3. Walmart Marketplace Seller Protection ───────────────────────────────
INSERT INTO public.takedown_templates (template_code, mechanism, version, jurisdiction, language, body, required_slots, active) VALUES
  ('walmart-marketplace-counterfeit-v1', 'walmart_seller_protection', 1, 'generic', 'en-US',
$template$Walmart Marketplace Brand Portal,
Counterfeit Report

Brand: {{brand_legal_name}}
Submitted by: {{actor_id}}

Listing URL: {{listing_url}}
Authentic SKU: {{matched_sku}}

Observations from the Marshall Vision structured review:

{{mismatch_flags}}

Detailed feature trace:

{{feature_trace}}

Authentic reference images used for comparison:

{{cited_reference_list}}

We affirm that {{brand_legal_name}} is the authorized manufacturer and is not the seller listed on the reported URL. The listed product is a non-authentic imitation and we request removal.

Evaluation reference: {{evaluation_id}} (confidence {{confidence}}). Internal finding: {{finding_id}}. Test buy reference: {{test_buy_id}}.
$template$,
   ARRAY['brand_legal_name','actor_id','listing_url','matched_sku','mismatch_flags','feature_trace','cited_reference_list','evaluation_id','confidence','finding_id','test_buy_id']::text[],
   true)
ON CONFLICT (template_code, version) DO NOTHING;

-- ── 4. Etsy IP Policy ───────────────────────────────────────────────────────
INSERT INTO public.takedown_templates (template_code, mechanism, version, jurisdiction, language, body, required_slots, active) VALUES
  ('etsy-ip-counterfeit-v1', 'etsy_ip_policy', 1, 'generic', 'en-US',
$template$Etsy Intellectual Property Notice
Counterfeit — Trademark Infringement

Rights holder: {{brand_legal_name}}
Submitted by: {{actor_id}}

Reported listing: {{listing_url}}

Description of the alleged infringement: The listing offers an item bearing the {{brand_legal_name}} mark and packaging trade dress without authorization. Our Compliance Officer reviewed the listing photographs against our authentic reference corpus and identified:

{{mismatch_flags}}

Feature comparison:

{{feature_trace}}

Authentic reference images cited:

{{cited_reference_list}}

Authentic product SKU: {{matched_sku}}.
Marshall Vision evaluation: {{evaluation_id}}, confidence {{confidence}}.

Good-faith belief statement: We believe in good faith that the use described above is not authorized by {{brand_legal_name}}, its agent, or the law.

Perjury statement: The information in this notice is accurate under penalty of perjury, and I am authorized to act on behalf of {{brand_legal_name}}.
$template$,
   ARRAY['brand_legal_name','actor_id','listing_url','mismatch_flags','feature_trace','cited_reference_list','matched_sku','evaluation_id','confidence']::text[],
   true)
ON CONFLICT (template_code, version) DO NOTHING;

-- ── 5. Generic DMCA Takedown ────────────────────────────────────────────────
INSERT INTO public.takedown_templates (template_code, mechanism, version, jurisdiction, language, body, required_slots, active) VALUES
  ('dmca-counterfeit-v1', 'dmca_takedown', 1, 'generic', 'en-US',
$template$DMCA Notice — Copyright Infringement
(17 U.S.C. § 512(c)(3))

To the designated DMCA agent of the hosting service for the reported listing:

1. Identification of the copyrighted work: FarmCeutica authentic product photography and packaging artwork for SKU {{matched_sku}}. Reference images cited:

{{cited_reference_list}}

2. Identification of the infringing material and its location: {{listing_url}}

3. Good-faith belief: I have a good-faith belief that the use of the material described in paragraph 2 is not authorized by the copyright owner, its agent, or the law.

4. Accuracy and authority: The information in this notification is accurate. Under penalty of perjury, I am authorized to act on behalf of {{brand_legal_name}}, the owner of the exclusive rights allegedly infringed.

5. Contact: FarmCeutica Wellness LLC Compliance. Submitted by {{actor_id}}.

Supporting evidence: Marshall Vision evaluation {{evaluation_id}} (verdict {{verdict}}, confidence {{confidence}}) with feature trace attached:

{{feature_trace}}
$template$,
   ARRAY['matched_sku','cited_reference_list','listing_url','brand_legal_name','actor_id','evaluation_id','verdict','confidence','feature_trace']::text[],
   true)
ON CONFLICT (template_code, version) DO NOTHING;

-- ── 6. Platform Trust and Safety (Instagram / TikTok / etc.) ────────────────
INSERT INTO public.takedown_templates (template_code, mechanism, version, jurisdiction, language, body, required_slots, active) VALUES
  ('platform-trust-safety-counterfeit-v1', 'platform_trust_safety', 1, 'generic', 'en-US',
$template$Report to Platform Trust and Safety
Counterfeit / Trademark Misuse in User-Generated Content

Rights holder: {{brand_legal_name}}
Submitted by: {{actor_id}}

Reported content: {{listing_url}}
Platform: {{platform_name}}

Summary: The reported post or account promotes a counterfeit product using the {{brand_legal_name}} mark and packaging. We reviewed the imagery using our Marshall Vision structured pipeline; indicators:

{{mismatch_flags}}

Feature trace:

{{feature_trace}}

Authentic reference images cited:

{{cited_reference_list}}

Authentic SKU: {{matched_sku}}.
Evaluation reference: {{evaluation_id}}.

We request the content be removed under the platform trademark enforcement policy and that the associated account be flagged for repeat-offender review.
$template$,
   ARRAY['brand_legal_name','actor_id','listing_url','platform_name','mismatch_flags','feature_trace','cited_reference_list','matched_sku','evaluation_id']::text[],
   true)
ON CONFLICT (template_code, version) DO NOTHING;

-- ── 7. Manual Legal Counsel referral ────────────────────────────────────────
INSERT INTO public.takedown_templates (template_code, mechanism, version, jurisdiction, language, body, required_slots, active) VALUES
  ('manual-legal-counterfeit-v1', 'manual_legal', 1, 'generic', 'en-US',
$template$Memo to Legal Counsel
Subject: Counterfeit takedown candidate, cross-platform enforcement

Marshall Vision identified a suspected counterfeit product listing that may require legal counsel action beyond the platform trust and safety process.

Brand: {{brand_legal_name}}
Compliance submitter: {{actor_id}}
Listing URL: {{listing_url}}
Authentic SKU: {{matched_sku}}
Marshall Vision evaluation: {{evaluation_id}} (verdict {{verdict}}, confidence {{confidence}})
Internal finding: {{finding_id}}
Test buy record: {{test_buy_id}}

Observations:

{{mismatch_flags}}

Feature trace:

{{feature_trace}}

Authentic reference images cited:

{{cited_reference_list}}

Recommended next steps (for counsel review, not a directive): cease and desist letter, platform escalation, or civil action depending on severity and recidivism.
$template$,
   ARRAY['brand_legal_name','actor_id','listing_url','matched_sku','evaluation_id','verdict','confidence','finding_id','test_buy_id','mismatch_flags','feature_trace','cited_reference_list']::text[],
   true)
ON CONFLICT (template_code, version) DO NOTHING;
