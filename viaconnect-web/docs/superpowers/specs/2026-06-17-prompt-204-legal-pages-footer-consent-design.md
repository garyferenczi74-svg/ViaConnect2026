# Prompt 204: Legal Pages, Site Footer, and Signup Consent

Platform: ViaConnect (viaconnect-web) | Entity: Farmceutica Wellness LLC | Backend: ViaConnect2026 (Supabase project nnhkcufyqjojdbvdrpky)

Design date: 2026-06-17. Source prompt was labeled "199" then "202"; renumbered to 204 because HEAD is "Prompt 203" and commit a94f275e already used "Prompt 202".

## Objective

Publish the public Privacy Policy and Terms of Service using the final copy (Appendix A and Appendix B below), add a site footer that links to them, and add a required consent acknowledgment to the signup flow. Desktop and mobile built together with responsive Tailwind.

## Resolved decisions (Gary, 2026-06-17)

1. Legal entity name: Farmceutica Wellness LLC, applied consistently. Correct every "Farmceutica Wellness Ltd" header and prose occurrence in both documents to LLC. The defined short term "Farmceutica" is unchanged. No other "Wellness Ltd" strings exist in src, so no further app or marketing edits are required for the name.
2. Registered street address: 60 Lakefront Blvd, Suite 120, Buffalo, NY, 14202. Correct Privacy Policy Section 2 and Section 18 (which read Waterfront). Terms Section 22 already reads Lakefront.
3. Laboratory partner: render verbatim. Named "Genemetric Inc" only in Privacy Section 4.3; generic ("our CLIA-certified laboratory partner") in 5.4 and 7. No copy change.
4. Venue county: Erie County, New York, as written in Terms 19.6.
5. Consent persistence: trigger approach. Capture consent in signUp user_metadata, copy to a user_consents table via an AFTER INSERT trigger on auth.users.
6. Footer mounting: login and signup pages only. Do not mount on forgot-password or onboarding.
7. Commit label: Prompt 204.

These four identity corrections override the literal appendix text where they conflict. Everything else is rendered word for word, with section numbers, headings, sub-headings, and order preserved.

## Codebase facts confirmed

- Web app: viaconnect-web, Next.js App Router, src/app, branch main.
- No markdown rendering dependency. Copy is hand-rendered as structured TSX. Do not add a package.
- Public-route allowlist lives in src/lib/supabase/middleware.ts in the isPublicRoute expression. Middleware runs before next.config redirects, so redirect source paths must also be allowlisted or a logged-out visitor is sent to /login before the redirect fires.
- next.config.mjs already has a redirects() block to mirror.
- Wordmark component: src/components/ui/ViaConnectLogo.tsx.
- No SiteFooter exists. Landing page is src/app/page.tsx (sticky hero, no footer). Auth group layout is src/app/(auth)/layout.tsx (centers a max-w-4xl card).
- Signup is a single client component src/app/(auth)/signup/page.tsx (637 lines). Step state machine; Step 1 = Account block near lines 390 to 415; shared Continue button near lines 595 to 627; supabase.auth.signUp at handleSignup near line 256, already passing options.data user_metadata; step 5 is OTP verify (email confirmation is on, so there is no session until verification).
- Design tokens already in Tailwind config: teal, copper, dark-bg and related. New tokens to honor: Deep Navy 1A2744, Card 1E3054, Teal 2DA5A0, Orange B75E18. Use existing token classes where they match; do not introduce arbitrary hex if a token class exists.

## Task breakdown

### Task 1: Public legal routes with final copy

New files:

- src/app/(legal)/layout.tsx. Reading layout: ViaConnectLogo wordmark, a back-to-home link, a constrained measure around max-w-3xl (about 768px), generous line height, clear heading hierarchy. Tokens and Instrument Sans. Responsive padding.
- src/app/(legal)/privacy/page.tsx. Privacy Policy from Appendix A, hand-rendered as TSX. Preserve section numbers and headings exactly. Every email is a mailto link. Show Last Updated and Effective Date as given.
- src/app/(legal)/terms/page.tsx. Terms of Service from Appendix B, same rules.

### Task 2: Make routes public and add redirects

- Edit src/lib/supabase/middleware.ts. Add to isPublicRoute: /privacy, /terms, and the redirect sources /privacy-policy, /terms-of-service, /tos. All must be public, unauthenticated, and never redirect to /login. Authenticated users are not redirected away from arbitrary public routes (only from /login, /signup, /forgot-password), so signed-in users can still read the legal pages.
- Edit next.config.mjs redirects(): add permanent redirects /privacy-policy to /privacy, /terms-of-service to /terms, /tos to /terms.
- Acceptance: each canonical route returns its own content with x-matched-path equal to the requested path, not /login.

### Task 3: Per-page metadata

- Each legal page exports metadata with a descriptive title, description, robots index follow, and a canonical URL.
- Titles: "Privacy Policy | ViaConnect" and "Terms of Service | ViaConnect".

### Task 4: Site footer

- New src/components/layout/SiteFooter.tsx: ViaConnect wordmark, a short company line naming Farmceutica Wellness LLC, a current-year copyright (computed at render), a contact line using info@farmceuticawellness.com as a mailto, and links to /privacy and /terms.
- Responsive: stacked and centered on mobile, row layout at md and up. Lucide icons only, strokeWidth 1.5, where icons are used.
- Mount on the landing page (src/app/page.tsx) after the main element, with bottom spacing so it clears the sticky hero and does not overlap it. Mount on the login page and the signup page. Do not mount on forgot-password or onboarding.

### Task 5: Signup consent acknowledgment

- In Step 1 (Account), above the Continue button, add a required consent control: a checkbox labeled "I have read and agree to the Privacy Policy and Terms of Service", where Privacy Policy links to /privacy and Terms of Service links to /terms, each opening in a new tab (target blank with rel noopener noreferrer).
- Continue stays disabled while step is 1 and the box is unchecked. Add an accessible label tied to the input, visible focus states, and an inline validation message that appears if the user tries to advance without consent.
- Persistence: extend the existing signUp options.data with privacy_accepted_at (ISO timestamp), terms_accepted_at (ISO timestamp), and policy_version. policy_version is "2026-06-17" (the Effective Date). The timestamps are captured at submit time.

### Task 6: Consent migration (append-only)

- New migration file in viaconnect-web/supabase/migrations, timestamped after the latest (latest is 20260616000011). Suggested name: 20260617000010_prompt_204_user_consents.sql.
- Create table public.user_consents:
  - user_id uuid primary key references auth.users(id) on delete cascade
  - privacy_accepted_at timestamptz
  - terms_accepted_at timestamptz
  - policy_version text
  - created_at timestamptz not null default now()
- Enable RLS. Policy: a user can select their own row (auth.uid() = user_id). No client insert or update policy is needed because rows are written by the trigger with definer rights.
- Trigger function public.handle_user_consent(): security definer, reads NEW.raw_user_meta_data for privacy_accepted_at, terms_accepted_at, policy_version, and inserts a user_consents row when those keys are present. On conflict (user_id) do nothing.
- AFTER INSERT trigger on auth.users calling handle_user_consent(). If an existing handle_new_user trigger or function is present on the live database, prefer extending it over adding a competing trigger. Verify live trigger state via the Supabase MCP (list_migrations and a quick catalog check) before finalizing the SQL.
- Append-only: never edit an applied migration. Confirm the final SQL with Gary before applying.

### Task 6b: Capacitor considerations

- Links to /privacy and /terms are internal app routes (Next Link or relative anchors), so they resolve inside the Capacitor shell and do not break out to an external browser. The /privacy URL is reachable without authentication so it can be submitted as the privacy policy URL for the Apple App Store and Google Play listings.

## Design constraints (apply throughout)

- Tokens: Deep Navy 1A2744, Card 1E3054, Teal 2DA5A0, Orange B75E18. Prefer existing Tailwind token classes.
- Typography: Instrument Sans.
- Icons: Lucide React only, strokeWidth 1.5.
- No emojis anywhere. No em-dashes or en-dashes anywhere, including code comments and visible copy. Hyphens in compound words are fine.
- Desktop and mobile developed together with responsive Tailwind.

## Guardrails

- Do not touch Supabase email templates.
- Do not modify package.json. If a library seems required, stop and ask Gary.
- Migrations are append-only.
- Build verification goes to localhost for Gary review before any live push. Never run npm run build in the working copy. Direct push to main, no pull requests, after sign-off.

## Acceptance checklist

- /privacy returns the Privacy Policy with its own title and x-matched-path /privacy, no auth required.
- /terms returns the Terms of Service with its own title and x-matched-path /terms, no auth required.
- /privacy-policy, /terms-of-service, and /tos redirect to the canonical routes.
- Rendered copy matches Appendix A and Appendix B word for word, including section numbers and headings, with the four resolved corrections applied.
- Footer appears on landing, login, and signup, links correctly, on desktop and mobile.
- Signup Step 1 blocks Continue until consent is checked, and acceptance is persisted with timestamps and policy version through the trigger.
- No em-dashes, en-dashes, or emojis introduced. Lucide icons use strokeWidth 1.5. Tokens and Instrument Sans applied.
- Verified on desktop and mobile breakpoints on localhost.

## Post-implementation follow-ups

- Update project memory: the canonical legal entity is now Farmceutica Wellness LLC (overrides the prior "Ltd" note).

---

## Appendix A: Privacy Policy (final, with resolved corrections applied)

ViaConnect Privacy Policy

Operated by Farmceutica Wellness LLC

Last Updated: June 17, 2026

Effective Date: June 17, 2026

1. Introduction

Farmceutica Wellness LLC ("Farmceutica", "we", "us", or "our") operates the ViaConnect precision wellness platform, the Via Cura consumer supplement brand, and the GENEX360 genetic testing suite (together, the "Services"). This Privacy Policy explains what information we collect, how and why we use it, who we share it with, how long we keep it, and the rights and choices you have.

We know the information you share with ViaConnect is sensitive. It can include your health history, your reported symptoms, your laboratory values, your body measurements and photos, and your genetic information. We treat that information with the care it deserves, and this policy is written to tell you plainly how we handle it.

By creating an account or using the Services, you acknowledge that you have read this Privacy Policy. Where the law requires your consent for specific processing, such as the processing of genetic information, we will ask for that consent separately and explicitly.

2. Who We Are and How to Contact Us

Farmceutica Wellness LLC is the controller responsible for the personal information processed through the Services.

Registered entity: Farmceutica Wellness LLC

Registered address: 60 Lakefront Blvd, Suite 120, Buffalo, NY, 14202

Privacy contact: info@farmceuticawellness.com

Data protection contact: Gary Ferenczi gary@farmceuticawellness.com

If you are in the European Economic Area or the United Kingdom, see Section 14 for our representative and lawful basis details. If you are in Canada, see Section 15. If you are a California resident, see Section 16.

3. Scope of This Policy

This Policy applies to personal information we process when you:

- Visit our marketing pages and create or attempt to create an account.
- Complete the Comprehensive Assessment Questionnaire (the "CAQ") and use your wellness dashboard.
- Order, register, or upload results for GENEX360 genetic testing, or upload raw genetic data generated elsewhere.
- Use logging and tracking features, including nutrition logging, hydration, body measurements, and progress photos.
- Purchase Via Cura products or manage a membership.
- Connect a wearable or third-party health data source.
- Interact with a practitioner or naturopath through the platform.
- Contact our support team.

This Policy does not cover the independent privacy practices of third parties whose services you choose to connect, or of practitioners and naturopaths who use the platform under their own privacy obligations.

4. Information We Collect

4.1 Information you provide directly

- Account information: email address and password credentials.
- Profile and demographic information: name, date of birth, sex assigned at birth, gender where you choose to provide it, and contact details.
- Health information from the CAQ: health history, reported physical, neurological, and emotional symptoms, medications, supplements, and lifestyle inputs.
- Laboratory information: lab values you enter or upload.
- Body and lifestyle tracking: weight, body composition, measurements, hydration, nutrition logs, and progress photos.
- Genetic information: GENEX360 panel results and, where you choose to upload it, raw genetic data files produced by other testing providers. See Section 5 for the special handling that applies to this category.
- Payment information: processed by our payment provider. We do not store full card numbers on our systems.
- Communications: messages you send to support or to a connected practitioner or naturopath.

4.2 Information we collect automatically

- Device and usage information: device type, operating system, browser, app version, IP address, and interactions with features.
- Cookies and similar technologies: see Section 11.

4.3 Information we receive from third parties

- Laboratory partners: when you order GENEX360, our CLIA-certified laboratory partner Genemetric Inc processes your biological sample and returns results to the Services.
- Connected devices and apps: where you authorize a connection, we receive data such as activity, sleep, and other metrics.
- Practitioners and naturopaths: where you share your protocol with a clinician and they add notes or recommendations.

5. Genetic Information: Special Handling

Genetic information is among the most sensitive categories of personal information, and we apply heightened protections to it.

5.1 Consent

We collect, analyze, and store genetic information only with your separate, explicit, opt-in consent. You provide this consent before any genetic data is uploaded or before a GENEX360 sample is analyzed. You may withdraw that consent at any time as described in Section 5.5.

5.2 How we use genetic information

We use your genetic information solely to provide the Services you have asked for. That includes analyzing variants across the GENEX360 panels, generating and refining your supplement protocol, performing interaction and safety checks, and presenting your variant explorer and related insights.

5.3 What we do not do with genetic information

- We do not sell your genetic information.
- We do not use your genetic information for advertising, and we do not allow third parties to do so.
- We do not disclose your genetic information to employers, life insurers, disability insurers, or long-term care insurers.
- We do not use your genetic information for research unless you give a separate, specific, and revocable consent for that use, and any such use is on a de-identified basis.

5.4 Laboratory processing

Where you order GENEX360, your biological sample is processed by our CLIA-certified laboratory partner under a written agreement that restricts the partner to processing the sample for the purpose of returning your results and prohibits unauthorized use or disclosure.

5.5 Withdrawal, deletion, and sample destruction

You may withdraw your consent to genetic processing and request deletion of your genetic information and the destruction of any retained biological sample at any time, by contacting us at info@farmceuticawellness.com or through your account settings where available. We will honor the request subject to any legal or laboratory accreditation retention obligation, and we will tell you if any such obligation applies.

6. How We Use Your Information

We use personal information to:

- Create and secure your account and verify your identity.
- Generate your Bio Optimization Score, your supplement protocol, and your wellness analytics.
- Perform medication, supplement, and herbal interaction and safety checks.
- Provide nutrition, hydration, body, and progress tracking features.
- Fulfill Via Cura product orders and manage memberships and billing.
- Enable you to share data with, and communicate with, a practitioner or naturopath at your direction.
- Operate, maintain, secure, and improve the Services.
- Communicate with you about the Services, including service and transactional messages.
- Comply with legal obligations and enforce our terms.

6.1 Automated and AI processing

The Services use automated systems, including AI reasoning agents, to analyze the information you provide and to generate personalized recommendations such as your protocol and your Bio Optimization Score. These outputs are informational and are not a medical diagnosis or a substitute for professional medical advice. You can contact us to ask questions about how an automated output was generated.

7. How We Share Your Information

We share personal information only as described here.

- Service providers: we use vetted providers for hosting, database, infrastructure, payment processing, communications, and analytics. They process information on our instructions under contracts that protect it. This includes our cloud database and hosting providers.
- Laboratory partner: as described in Section 5.4, for GENEX360 sample processing.
- Practitioners and naturopaths: only where you choose to share, and only the data scope you authorize. Access is role locked.
- Legal and safety: where required by law, valid legal process, or to protect the rights, safety, and property of users, the public, or Farmceutica.
- Business transfers: in connection with a merger, acquisition, financing, or sale of assets, subject to the protections in this Policy. We will notify you of any change in control of your personal information.

We do not sell your personal information, and we do not share it for cross-context behavioral advertising.

8. Data Retention

We keep personal information for as long as your account is active and for as long as needed to provide the Services, then for the period required to meet legal, accounting, accreditation, or dispute-resolution obligations. Genetic information and biological samples are retained only as described in Section 5 and are deleted or destroyed on valid request, subject to any retention obligation we are required to meet. When information is no longer needed, we delete it or de-identify it.

9. How We Protect Your Information

We maintain administrative, technical, and physical safeguards designed to protect personal information, including encryption in transit, access controls, role-based permissions, and monitoring. The platform is designed to be HIPAA-aware in its handling of health information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security. If we become aware of a breach affecting your personal information, we will notify you and the relevant authorities as required by applicable law.

10. Your Rights and Choices

Depending on where you live, you may have the right to:

- Access the personal information we hold about you.
- Correct inaccurate or incomplete information.
- Delete your personal information.
- Receive a portable copy of certain information.
- Withdraw consent, including consent to genetic processing.
- Object to or restrict certain processing.
- Be free from discrimination for exercising your rights.

To exercise any of these rights, contact us at info@farmceuticawellness.com or use the controls in your account settings. We will verify your identity before acting on a request. We will respond within the timeframe required by applicable law. You also have the right to lodge a complaint with your local data protection authority.

11. Cookies and Similar Technologies

We use cookies and similar technologies to keep you signed in, remember your preferences, secure the Services, and understand how the Services are used. You can control cookies through your browser settings. Some features may not function correctly if you disable certain cookies. Where required, we will request your consent before setting non-essential cookies.

12. International Data Transfers

Farmceutica operates and works with partners and facilities in multiple countries, which may include the United States, the European Union (including Croatia), and Canada. When we transfer personal information across borders, we use safeguards required by applicable law, such as standard contractual clauses, to protect it. See Sections 14 and 15 for region-specific details.

13. Children

The Services are intended for adults aged 18 and over. We do not knowingly collect personal information from anyone under 18. If you believe a minor has provided us with personal information, contact us at info@farmceuticawellness.com and we will delete it.

14. Notice for the European Economic Area and United Kingdom

If you are in the EEA or the UK, the following applies.

- Controller: Farmceutica Wellness LLC. EEA or UK representative: Gary Ferenczi gary@farmceuticawellness.com
- Lawful bases: we rely on your consent for genetic and other special-category health data; on performance of a contract to provide the Services you request; on our legitimate interests to operate and secure the Services; and on legal obligation where applicable.
- Special category data: health and genetic data are special category data. We process them based on your explicit consent under Article 9.
- Your rights: in addition to the rights in Section 10, you may withdraw consent at any time without affecting prior lawful processing, and you may complain to your supervisory authority.
- Transfers: where we transfer data outside the EEA or UK, we use standard contractual clauses or another approved mechanism.

15. Notice for Canada

If you are in Canada, we handle personal information in accordance with the Personal Information Protection and Electronic Documents Act and applicable provincial laws, including those of Alberta. We collect, use, and disclose personal information only for the purposes identified in this Policy and with your consent, and you may withdraw consent subject to legal and contractual restrictions. You may direct questions or complaints to our privacy contact in Section 2, and you may contact the Office of the Privacy Commissioner of Canada or your provincial commissioner.

16. Notice for California Residents

If you are a California resident, you have the rights described in Section 10, including the right to know, the right to delete, the right to correct, and the right to limit the use of sensitive personal information. We collect the categories of personal information described in Section 4, including sensitive personal information such as health and genetic information, which we use only to provide the Services and not for purposes that would require an opt-out right. We do not sell or share personal information as those terms are defined under California law. To exercise your rights, contact us at info@farmceuticawellness.com . We will not discriminate against you for exercising your rights.

17. Changes to This Policy

We may update this Policy from time to time. When we make material changes, we will update the Last Updated date and, where required, notify you or seek your consent. Your continued use of the Services after an update means you acknowledge the revised Policy.

18. How to Reach Us

Questions, requests, or complaints about this Policy or our handling of your information can be sent to:

Farmceutica Wellness LLC

60 Lakefront Blvd, Suite 120, Buffalo, NY, 14202

info@farmceuticawellness.com

---

## Appendix B: Terms of Service (final, with resolved corrections applied)

ViaConnect Terms of Service

Operated by Farmceutica Wellness LLC

Last Updated: June 17, 2026

Effective Date: June 17, 2026

1. Agreement to These Terms

These Terms of Service (the "Terms") are a binding agreement between you and Farmceutica Wellness LLC ("Farmceutica", "we", "us", or "our"). They govern your access to and use of the ViaConnect platform, the Via Cura brand and products, the GENEX360 genetic testing suite, and our related websites and applications (together, the "Services").

By creating an account, checking the acceptance box at signup, or using the Services, you agree to these Terms and to our Privacy Policy, which is incorporated by reference. If you do not agree, do not use the Services.

2. Eligibility

You must be at least 18 years old and able to form a binding contract to use the Services. By using the Services, you represent that you meet these requirements and that the information you provide is accurate.

3. What ViaConnect Is, and Important Medical Disclaimer

ViaConnect is a precision wellness platform. It provides assessments, genetic insights, personalized supplement protocols, tracking tools, analytics such as the Bio Optimization Score, and educational content.

The Services are for informational and wellness purposes only. They do not provide medical advice, diagnosis, or treatment. Supplement recommendations, genetic insights, scores, and other outputs are informational and do not replace the advice of a qualified healthcare provider. Always speak with a qualified healthcare provider before starting, stopping, or changing any supplement, medication, or health regimen, and before acting on any information from the Services. Never disregard professional medical advice or delay seeking it because of something you read or received through the Services. If you think you may have a medical emergency, call your local emergency number immediately.

The Services do not create a clinician-patient relationship between you and Farmceutica. Where you choose to connect with a practitioner or naturopath through the platform, any clinical relationship is between you and that independent professional.

4. Accounts and Security

You are responsible for the accuracy of your account information, for keeping your credentials confidential, and for all activity under your account. Notify us promptly at info@farmceuticawellness.com if you suspect unauthorized use. We may suspend or terminate accounts that violate these Terms or that we reasonably believe present a security or legal risk.

5. Genetic Testing and Genetic Data (GENEX360)

If you order GENEX360 or upload genetic data, the following applies in addition to our Privacy Policy.

- Consent: genetic testing and analysis proceed only after your separate, explicit consent.
- Sample handling: where you order testing, your biological sample is processed by our CLIA-certified laboratory partner for the purpose of producing your results.
- Nature and limits of results: GENEX360 results describe genetic variants and their general associations. They are informational and are not a clinical diagnosis, a prediction of disease, or a guarantee of any health outcome. Genetic science evolves, and interpretations may be updated over time.
- Uploaded raw data: if you upload genetic data generated by another provider, you represent that you have the right to provide it and that it relates to you.
- Withdrawal and deletion: you may withdraw consent and request deletion of genetic data and destruction of any retained sample as described in the Privacy Policy.

6. Supplements, Peptides, and Product Information

- Via Cura products and any statements about them have not been evaluated as treatments for any disease, and they are not intended to diagnose, treat, cure, or prevent any disease.
- Peptide content within the Services is provided as educational information for qualified practitioners. Peptides are not offered for sale as commercial products through the Services.
- Product formulations, availability, and the catalog may change. Some ingredients may be paused or withdrawn for regulatory-timing reasons, and availability can vary by jurisdiction.
- You are responsible for reviewing product information and for consulting a qualified healthcare provider before use, especially if you are pregnant, nursing, have a medical condition, or take medication.

7. Memberships, Orders, Billing, and Cancellation

- Memberships and purchases are offered at the prices and on the terms presented at the point of sale.
- Recurring memberships renew automatically until cancelled. You authorize us or our payment processor to charge your payment method on each renewal until you cancel.
- You may cancel a recurring membership as described in your account settings or by contacting info@farmceuticawellness.com Cancellation stops future renewals and takes effect at the end of the current paid period unless stated otherwise.
- Refunds and returns are governed by our then-current refund policy and by applicable consumer law. Payments@farmceuticawellness.com
- Taxes, shipping, and applicable fees may apply and will be shown where required.

8. Practitioner and Naturopath Use

Practitioners and naturopaths who use the Services agree to use them only for lawful, professional purposes, to access only the data a patient has authorized, and to comply with their own professional, licensing, and privacy obligations. Practitioner access to consumer engagement information is limited to aggregate measures as configured in the platform. Practitioners are independent professionals and are solely responsible for their clinical decisions.

9. Acceptable Use

You agree not to:

- Use the Services unlawfully or in violation of these Terms.
- Upload data you do not have the right to provide, or that relates to another person without authorization.
- Attempt to access accounts, data, or systems without authorization, or probe, scan, or test the security of the Services.
- Interfere with or disrupt the integrity or performance of the Services.
- Reverse engineer, scrape, or copy the Services except as permitted by law.
- Misrepresent your identity or your professional credentials.

10. Your Content and Licenses

You retain ownership of the information and content you submit. You grant Farmceutica a limited license to host, process, and use that information solely to provide and improve the Services and as described in the Privacy Policy. You are responsible for the accuracy and legality of the content you submit.

11. Intellectual Property

The Services, including the ViaConnect platform, the Via Cura and GENEX360 brands, the Bio Optimization Score methodology, software, text, graphics, and design, are owned by or licensed to Farmceutica and are protected by intellectual property laws. We grant you a limited, revocable, non-transferable license to use the Services for your personal, non-commercial use, or for practitioners, for permitted professional use. No other rights are granted.

12. Third-Party Services

The Services may link to or integrate with third-party services, such as connected devices, payment processors, and laboratory partners. We are not responsible for third-party services, and your use of them is governed by their own terms and privacy policies.

13. Automated and AI-Generated Outputs

Some outputs are generated by automated systems, including AI agents. These outputs may contain errors or omissions, are informational only, and are not medical advice. You are responsible for evaluating outputs and for seeking professional advice before acting on them.

14. Assumption of Risk

You understand that wellness, nutrition, supplementation, and exercise carry inherent risks, and that genetic insights have limits. You assume responsibility for decisions you make based on the Services and agree to consult a qualified healthcare provider as appropriate.

15. Disclaimers of Warranties

The Services are provided on an "as is" and "as available" basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, accuracy, and non-infringement. We do not warrant that the Services will be uninterrupted, error free, or that any output will achieve a particular result. Some jurisdictions do not allow the exclusion of certain warranties, so some of these exclusions may not apply to you.

16. Limitation of Liability

To the fullest extent permitted by law, Farmceutica and its officers, employees, and partners will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, profits, or goodwill, arising from your use of the Services. To the fullest extent permitted by law, our total liability for any claim relating to the Services will not exceed the greater of the amount you paid us in the twelve months before the claim or one hundred dollars. Some jurisdictions do not allow certain limitations, so some of these limitations may not apply to you. Nothing in these Terms limits liability that cannot be limited by law.

17. Indemnification

You agree to indemnify and hold harmless Farmceutica and its officers, employees, and partners from claims, losses, and expenses, including reasonable legal fees, arising from your misuse of the Services, your violation of these Terms, or your violation of any law or the rights of a third party.

18. Termination

You may stop using the Services and close your account at any time. We may suspend or terminate your access if you violate these Terms, if required by law, or to protect the Services or other users. Provisions that by their nature should survive termination will survive, including Sections 11, and 15 through 19.

19. Governing Law and Dispute Resolution

19.1 Governing law

These Terms, and any dispute arising out of or relating to these Terms or the Services, are governed by the laws of the State of New York and applicable United States federal law, without regard to conflict-of-laws principles. The United Nations Convention on Contracts for the International Sale of Goods does not apply. This choice of law does not deprive you of the protection of any mandatory consumer-protection provisions of the law of the country, state, or province where you reside that cannot be waived by agreement.

19.2 Informal resolution first

Before starting an arbitration or court proceeding, you agree to first try to resolve the dispute informally. Send a written notice of dispute to info@farmceuticawellness.com that describes the issue and the relief you seek. You and Farmceutica will then have 60 days from receipt of that notice to reach a resolution. This informal step is a condition that must be met before either party starts a formal proceeding, and any applicable limitation period is paused while the parties pursue it in good faith.

19.3 Binding individual arbitration

If the dispute is not resolved within the 60-day informal period, and to the fullest extent permitted by applicable law, you and Farmceutica agree to resolve it by binding individual arbitration rather than in court, except as provided in Section 19.5. The arbitration will be administered by the American Arbitration Association (the "AAA") under its Consumer Arbitration Rules then in effect. The seat of the arbitration is New York, New York, and the arbitration may be conducted by video or at a mutually convenient location. The arbitrator has authority to resolve disputes about the interpretation, applicability, or enforceability of this arbitration agreement, except that a court of competent jurisdiction, and not an arbitrator, decides whether the waiver in Section 19.4 is enforceable. Judgment on the award may be entered in any court of competent jurisdiction.

19.4 Class-action and jury-trial waiver

To the fullest extent permitted by applicable law, you and Farmceutica agree that each may bring claims against the other only in an individual capacity, and not as a plaintiff or class member in any purported class, collective, consolidated, or representative proceeding. The arbitrator may not consolidate more than one person's claims and may not preside over any form of representative or class proceeding. You and Farmceutica also waive any right to a trial by jury. If this waiver is found unenforceable as to a particular claim or request for relief, that claim or request will be severed and heard in a court of competent jurisdiction described in Section 19.6, while the remaining claims proceed in arbitration.

19.5 Exceptions

Either party may bring an individual claim in small-claims court if the claim qualifies. Either party may also seek injunctive or other equitable relief in court to protect its intellectual property or confidential information. Nothing in this Section requires arbitration of any claim that applicable law does not permit to be arbitrated.

19.6 Forum for court proceedings

For any dispute that is not subject to arbitration, or if the arbitration agreement is found not to apply, you and Farmceutica submit to the exclusive jurisdiction of the state and federal courts located in Erie County, New York, and waive any objection to venue or to an inconvenient forum in those courts, to the extent permitted by law.

19.7 Right to opt out of arbitration

You may opt out of the arbitration agreement in Sections 19.3 and 19.4 by sending written notice to info@farmceuticawellness.com within 30 days after you first accept these Terms. The notice must include your name, the email associated with your account, and a clear statement that you opt out of arbitration. If you opt out, the court-forum provision in Section 19.6 governs your disputes. Opting out does not affect any other part of these Terms.

19.8 Changes to this Section

If we make a material change to this Section after you accept these Terms, you may reject the change by sending written notice to info@farmceuticawellness.com within 30 days of the change, in which case the most recent version of this Section before the change applies to you.

20. Changes to These Terms

We may update these Terms from time to time. When we make material changes, we will update the Last Updated date and, where required, notify you. Your continued use of the Services after an update means you accept the revised Terms.

21. General

These Terms, together with the Privacy Policy and any policies referenced at the point of sale, are the entire agreement between you and Farmceutica regarding the Services. If any provision is held unenforceable, the rest remains in effect. Our failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we may assign them in connection with a business transfer.

22. Contact

Questions about these Terms can be sent to:

Farmceutica Wellness LLC

60 Lakefront Blvd, Suite 120, Buffalo, NY, 14202

info@farmceuticawellness.com
