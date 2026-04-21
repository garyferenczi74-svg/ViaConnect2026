-- =============================================================================
-- Prompt #104 Phase 3: Seed initial legal template library
-- =============================================================================
-- One starter template per cease-and-desist family + DMCA Amazon +
-- Amazon Brand Registry complaint. Status = 'draft' so counsel must
-- review before activation. The DRAFT - ATTORNEY REVIEW REQUIRED
-- header is preserved on every transmission until counsel marks the
-- specific version active.
--
-- Idempotent (ON CONFLICT (template_family, version) DO NOTHING).
-- =============================================================================

INSERT INTO public.legal_templates_library
  (template_family, version, applicable_buckets, applicable_jurisdictions,
   required_merge_fields, markdown_body, status, notes)
VALUES
  ('cd_counterfeit', 'v2026.04.23',
   ARRAY['counterfeit']::legal_case_bucket[],
   ARRAY['US']::TEXT[],
   ARRAY['case_label','counterparty.display_label','product.name','evidence_summary','response_deadline','signing_officer'],
   $$DRAFT - ATTORNEY REVIEW REQUIRED

[ViaCura Letterhead]

{{counterparty.display_label}}
{{counterparty.contact_address}}

Re: Case {{case_label}} - Counterfeit Product Sale

Dear Sir or Madam,

ViaCura, a brand of FarmCeutica Wellness LLC, has identified your offering of products bearing the ViaCura brand that, based on documented physical evidence (including {{evidence_summary}}), are counterfeit and not produced by our authorized manufacturing chain.

The product implicated is: {{product.name}}.

Counterfeit goods harm consumers who may receive product that has not passed our quality, identity, and potency verification. They infringe our registered trademarks and constitute violations of state and federal law.

Demand: Cease all sale, advertising, and distribution of these counterfeit products immediately. Provide a written response identifying your supply source by {{response_deadline}}. Failure to respond will result in escalation to outside counsel and may result in marketplace IP enforcement, customs seizure, and civil litigation.

This is a serious matter. We expect your prompt attention.

Sincerely,
{{signing_officer}}
ViaCura / FarmCeutica Wellness LLC$$,
   'draft',
   'Initial seed; pending counsel review.'),

  ('cd_material_differences', 'v2026.04.23',
   ARRAY['gray_market_material_differences']::legal_case_bucket[],
   ARRAY['US']::TEXT[],
   ARRAY['case_label','counterparty.display_label','product.name','material_differences_summary','response_deadline','signing_officer'],
   $$DRAFT - ATTORNEY REVIEW REQUIRED

[ViaCura Letterhead]

{{counterparty.display_label}}
{{counterparty.contact_address}}

Re: Case {{case_label}} - Materially Different ViaCura Product Sale; Lanham Act 15 U.S.C. 1114 Notice

Dear Sir or Madam,

ViaCura, a brand of FarmCeutica Wellness LLC, has identified your offering of {{product.name}} that, while sourced from genuine ViaCura inventory, materially differs from the product authorized for sale in the United States. The documented material differences include:

{{material_differences_summary}}

Under settled federal trademark law (Lanham Act, 15 U.S.C. Section 1114; see Iberia Foods Corp. v. Romeo, Fender Musical Instruments Corp. v. Unlimited Music Center), the sale of materially different products bearing our trademarks constitutes infringement notwithstanding that the products may originate from authorized manufacturing.

Demand: Cease all sale, advertising, and distribution of the implicated products. Respond in writing by {{response_deadline}} identifying your supply source and confirming compliance. Failure to comply will result in marketplace IP enforcement, escalation to outside counsel, and potential civil litigation.

Sincerely,
{{signing_officer}}
ViaCura / FarmCeutica Wellness LLC$$,
   'draft',
   'Initial seed; pending counsel review.'),

  ('cd_distribution_breach', 'v2026.04.23',
   ARRAY['gray_market_no_differences']::legal_case_bucket[],
   ARRAY['US']::TEXT[],
   ARRAY['case_label','counterparty.display_label','product.name','wholesale_agreement_reference','breach_clauses','response_deadline','signing_officer'],
   $$DRAFT - ATTORNEY REVIEW REQUIRED

[ViaCura Letterhead]

{{counterparty.display_label}}
{{counterparty.contact_address}}

Re: Case {{case_label}} - Wholesale Distribution Agreement Breach

Dear Sir or Madam,

ViaCura has identified your offering of {{product.name}} in violation of the wholesale distribution agreement dated {{wholesale_agreement_reference}}, specifically the following provisions: {{breach_clauses}}.

This communication does not allege trademark infringement or counterfeiting. We acknowledge the products are genuine ViaCura goods sourced through prior authorized channels. The issue is contractual: the resale activity exceeds the scope of the parties agreement and post-termination covenants.

Demand: Cease the offending activity. Respond in writing by {{response_deadline}} confirming compliance. Continued non-compliance may result in liquidated damages, injunctive relief, and termination of any remaining commercial relationship.

Sincerely,
{{signing_officer}}
ViaCura / FarmCeutica Wellness LLC$$,
   'draft',
   'Initial seed; pending counsel review.'),

  ('cd_map_policy_breach', 'v2026.04.23',
   ARRAY['map_only']::legal_case_bucket[],
   ARRAY['US']::TEXT[],
   ARRAY['case_label','counterparty.display_label','product.name','map_policy_reference','specific_violations_summary','response_deadline','signing_officer'],
   $$DRAFT - ATTORNEY REVIEW REQUIRED

[ViaCura Letterhead]

{{counterparty.display_label}}
{{counterparty.contact_address}}

Re: Case {{case_label}} - Minimum Advertised Price Policy Notice

Dear Sir or Madam,

ViaCura has observed advertising of {{product.name}} at prices below the published Minimum Advertised Price set forth in our MAP Policy ({{map_policy_reference}}).

Specifically: {{specific_violations_summary}}.

This communication is not a legal claim of infringement. We make no allegation that the goods are counterfeit or that the resale itself is unlawful; the First Sale Doctrine permits authorized resale of genuine goods. ViaCura reserves the right unilaterally to refuse to sell to resellers who do not honor MAP Policy and to file appropriate marketplace TOS complaints.

Request: Restore advertising to MAP-compliant pricing by {{response_deadline}}. Failure to do so will result in (a) refusal to sell from this date forward and (b) marketplace TOS complaints.

Sincerely,
{{signing_officer}}
ViaCura / FarmCeutica Wellness LLC$$,
   'draft',
   'Initial seed; pending counsel review. Note: deliberately makes no IP claims (MAP-only is not legally actionable as trademark infringement).'),

  ('dmca_takedown_amazon', 'v2026.04.23',
   ARRAY['gray_market_material_differences','counterfeit']::legal_case_bucket[],
   ARRAY['US']::TEXT[],
   ARRAY['signing_officer','copyrighted_work_url','infringing_listing_url','copyright_registration','contact_email','contact_phone'],
   $$DRAFT - ATTORNEY REVIEW REQUIRED

To: Amazon DMCA Notice Agent
Subject: DMCA Takedown Notice - 17 U.S.C. Section 512(c)(3)

I, {{signing_officer}}, declare under penalty of perjury that I am authorized to act on behalf of ViaCura / FarmCeutica Wellness LLC, the copyright owner of the work identified below.

(i) Signature of authorized agent: {{signing_officer}}
(ii) Identification of copyrighted work: {{copyrighted_work_url}}
     Copyright registration: {{copyright_registration}}
(iii) Identification of infringing material: {{infringing_listing_url}}
(iv) Contact information: {{contact_email}} / {{contact_phone}}
(v) Good-faith statement: I have a good-faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
(vi) Accuracy under penalty of perjury: I declare under penalty of perjury that the information in this notification is accurate and that I am authorized to act on behalf of the copyright owner.

Please remove the infringing material expeditiously per 17 U.S.C. Section 512(c).

Sincerely,
{{signing_officer}}$$,
   'draft',
   'Initial seed; pending counsel review. All six 512(c)(3)(A) elements present.'),

  ('marketplace_complaint_amazon_brand_registry', 'v2026.04.23',
   ARRAY['gray_market_material_differences','counterfeit']::legal_case_bucket[],
   ARRAY['US']::TEXT[],
   ARRAY['case_label','asin_or_listing_url','complaint_type','evidence_summary','signing_officer'],
   $$DRAFT - ATTORNEY REVIEW REQUIRED

To: Amazon Brand Registry IP Complaint Submission
Re: Case {{case_label}}

Brand: ViaCura
Listing: {{asin_or_listing_url}}
Complaint type: {{complaint_type}}

Evidence summary:
{{evidence_summary}}

Submitted by: {{signing_officer}}, Brand Registry administrator for ViaCura$$,
   'draft',
   'Initial seed; pending counsel review.')

ON CONFLICT (template_family, version) DO NOTHING;
