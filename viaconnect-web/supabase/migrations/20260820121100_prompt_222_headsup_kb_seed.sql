-- Prompt 222: Heads Up Health competitor_app KB seed (apply later; do not live-apply here).
-- Titles mirror HEADSUP_KB_TITLES in src/lib/kb/competitorAppPayload.ts:
--   1. Heads Up Health platform overview
--   2. Heads Up Health feature matrix
--   3. Heads Up Health integration inventory
--   4. Heads Up Health pricing structure
--   5. Heads Up Health review themes
-- Each row: consumer_safe = false, practitioner_depth = false,
-- evidence_grade = 'E', gate_status = 'approved', jeffery_verdict = 'needs_human',
-- payload_type = 'competitor_app', retrieval_timestamp = '2026-08-18T00:00:00Z'.
-- Live apply pending; do not call Supabase from this task.

DO $$
DECLARE
  v_collection_id uuid;
  v_title text;
  v_summary text;
  v_urls text[];
  v_provenance jsonb;
BEGIN
  SELECT id INTO v_collection_id
  FROM public.kb_collections
  WHERE slug = 'competitor_platforms';

  IF v_collection_id IS NULL THEN
    RAISE EXCEPTION 'competitor_platforms collection missing; apply prompt_222_competitor_app first';
  END IF;

  -- 1. Heads Up Health platform overview
  v_title := 'Heads Up Health platform overview';
  v_summary := 'Heads Up (Heads Up Health LLC; store seller phase2body, Inc.) is a practitioner-first clinical intelligence platform for concierge, longevity, functional, and integrative practices. It unifies labs, wearables, devices, and EHRs. Halo is the named clinical copilot. Help center is branded Heads Up | Nicoya. Public vertical pages cover functional medicine, longevity, and concierge medicine. Homepage funding claim of $20M+ is claimed-not-verified. Internal strategy only.';
  v_urls := ARRAY[
    'https://headsuphealth.com/',
    'https://headsuphealth.com/product/',
    'https://headsuphealth.com/about/',
    'https://explore.headsup.health/llms.txt',
    'https://headsuphealth.com/functional-medicine-platform/',
    'https://headsuphealth.com/longevity-platform/',
    'https://headsuphealth.com/concierge-medicine-platform/'
  ];
  v_provenance := jsonb_build_object(
    'classification', 'internal_strategy',
    'source_class', 'public_http',
    'retrieval_timestamp', '2026-08-18T00:00:00Z',
    'source_urls', to_jsonb(v_urls),
    'payload', jsonb_build_object(
      'brand', 'Heads Up / Heads Up Health LLC',
      'legal_seller', 'phase2body, Inc., 4400 N Scottsdale Rd Ste 9445, Scottsdale, AZ 85251',
      'positioning', 'practitioner-first AI-Powered Clinical Intelligence',
      'halo_copilot', true,
      'help_brand', 'Heads Up | Nicoya',
      'funding_claim', 'Backed By $20M+ In Funding',
      'funding_claim_status', 'claimed-not-verified',
      'nicoya_relationship', 'claimed-not-verified',
      'verticals', jsonb_build_array('functional medicine', 'longevity', 'concierge medicine'),
      'use_case_mentions', jsonb_build_array('RPM', 'sports/high performance', 'clinical research', 'integrative/precision medicine')
    )
  );
  INSERT INTO public.kb_items (
    primary_collection_id, title, summary, source_urls, retrieval_timestamp,
    content_hash, evidence_grade, gate_status, jeffery_verdict, provenance,
    payload_type, practitioner_depth, consumer_safe
  ) VALUES (
    v_collection_id, v_title, v_summary, v_urls, '2026-08-18T00:00:00Z',
    encode(sha256(convert_to(v_title || v_summary, 'UTF8')), 'hex'),
    'E', 'approved', 'needs_human', v_provenance,
    'competitor_app', false, false
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- 2. Heads Up Health feature matrix
  v_title := 'Heads Up Health feature matrix';
  v_summary := 'Public feature inventory for Heads Up Health with depth ratings deeply documented, documented on marketing plus help index, or marketing mention only. Deeply documented items include integrations connect/sync, EHR setups, documents and AI extraction with provider approval, patient Today page, labs and biomarkers, cohorts, and AI assistant chat. Documented items include Halo copilot, custom AI agents, Partner API, and white-label branding. Marketing-only mentions include 30,000 organizations one-click records and Athena EHR as claimed-not-verified. Internal strategy only.';
  v_urls := ARRAY[
    'https://explore.headsup.health/llms.txt',
    'https://explore.headsup.health/docs/platform/documentation/web/integrations.md',
    'https://headsuphealth.com/product/',
    'https://explore.headsup.health/docs/developers/api-documentation/README.md'
  ];
  v_provenance := jsonb_build_object(
    'classification', 'internal_strategy',
    'source_class', 'public_http',
    'retrieval_timestamp', '2026-08-18T00:00:00Z',
    'source_urls', to_jsonb(v_urls),
    'payload', jsonb_build_object(
      'deeply_documented', jsonb_build_array(
        'integrations connect/sync',
        'Elation/Cerbo/AdvancedMD setup',
        'InBody upload vs API',
        'Apple Health via iOS app only',
        'documents and AI extraction with provider approval',
        'patient Today page',
        'labs and biomarkers',
        'notes',
        'secure messaging',
        'programs',
        'cohorts and reference ranges',
        'AI assistant chat',
        'AI insights',
        'Oura Insights custom view',
        'weekly key metric trends',
        'iOS tabs (Insights, Chat, Progress, My Care, Profile)'
      ),
      'documented', jsonb_build_array(
        'Halo copilot',
        'custom AI agents',
        'health score card',
        'alerts',
        'journal/symptoms',
        'nutrition (AI food analysis)',
        'medications and supplements',
        'assessments',
        'file storage',
        'white-label branding',
        'Partner API',
        'iframe widgets',
        'Swift HealthKit SDK',
        'program management (Coming Soon on pricing matrix)'
      ),
      'marketing_mention_only', jsonb_build_array(
        '30000 organizations one-click records',
        '1upHealth health-system connector',
        'Athena EHR integrable (claimed; setup doc not fetched)',
        'BioStrap Coming Soon',
        'Healthie Coming Soon'
      )
    )
  );
  INSERT INTO public.kb_items (
    primary_collection_id, title, summary, source_urls, retrieval_timestamp,
    content_hash, evidence_grade, gate_status, jeffery_verdict, provenance,
    payload_type, practitioner_depth, consumer_safe
  ) VALUES (
    v_collection_id, v_title, v_summary, v_urls, '2026-08-18T00:00:00Z',
    encode(sha256(convert_to(v_title || v_summary, 'UTF8')), 'hex'),
    'E', 'approved', 'needs_human', v_provenance,
    'competitor_app', false, false
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- 3. Heads Up Health integration inventory
  v_title := 'Heads Up Health integration inventory';
  v_summary := 'Named public integrations for Heads Up Health across wearables and apps, labs and pharmacies (PDF import unless stated otherwise), EHRs, health-system search via 1upHealth, Partner API surfaces, and coming-soon or legacy-named devices. Strava appears on marketing; help integrations.md lacked a setup block in the fetched doc. Athena is claimed on FAQ. Internal strategy only.';
  v_urls := ARRAY[
    'https://explore.headsup.health/docs/platform/documentation/web/integrations.md',
    'https://headsuphealth.com/product/',
    'https://explore.headsup.health/docs/developers/api-documentation/README.md',
    'https://api.headsup.health'
  ];
  v_provenance := jsonb_build_object(
    'classification', 'internal_strategy',
    'source_class', 'public_http',
    'retrieval_timestamp', '2026-08-18T00:00:00Z',
    'source_urls', to_jsonb(v_urls),
    'payload', jsonb_build_object(
      'wearables_apps_documented', jsonb_build_array(
        'Apple Health', 'Health Connect (Android)', 'Oura', 'Fitbit', 'Garmin',
        'WHOOP', 'Withings', 'Dexcom (org enable)', 'Cronometer (org enable)',
        'InBody (upload or API+webhook)',
        'Strava (marketing; help setup block not in fetched doc)'
      ),
      'labs_pharmacies_marketing', jsonb_build_array(
        'LabCorp', 'Quest Diagnostics', 'Dutch Test', 'Cleveland Heart Lab',
        'CVS Minute Clinic', 'Walgreens', 'Rite Aid', 'Walmart Pharmacy',
        'Innoquest Diagnostics', 'Great Plains Organic Acids Test',
        'Enzo Clinical Labs', 'Parkway Clinical Laboratories',
        'BioReference Laboratories (page spelling BioReferece)',
        'SpectreCell Laboratories', 'Doctors Data', 'GDX', 'Everlywell', 'Duane Reade'
      ),
      'ehrs_documented', jsonb_build_array('Elation', 'Cerbo', 'AdvancedMD'),
      'health_systems', jsonb_build_array('1upHealth patient-authorized search'),
      'ehrs_claimed', jsonb_build_array('Athena (FAQ; setup doc not fetched)'),
      'coming_soon', jsonb_build_array('BioStrap', 'Healthie'),
      'legacy_or_store_named', jsonb_build_array('Keto-Mojo', 'Mira fertility', 'Cardiomood'),
      'partner_api', jsonb_build_object(
        'swagger', 'https://api.headsup.health',
        'auth', 'OAuth client_id/secret + Clerk publishable key',
        'surfaces', jsonb_build_array(
          'headless patient provision',
          'iframe widgets',
          'server-to-server reads via admin JWT and X-On-Behalf-Of',
          'Swift HealthKit SDK'
        ),
        'rate_limits', 'not currently enforced (build defensively)'
      )
    )
  );
  INSERT INTO public.kb_items (
    primary_collection_id, title, summary, source_urls, retrieval_timestamp,
    content_hash, evidence_grade, gate_status, jeffery_verdict, provenance,
    payload_type, practitioner_depth, consumer_safe
  ) VALUES (
    v_collection_id, v_title, v_summary, v_urls, '2026-08-18T00:00:00Z',
    encode(sha256(convert_to(v_title || v_summary, 'UTF8')), 'hex'),
    'E', 'approved', 'needs_human', v_provenance,
    'competitor_app', false, false
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- 4. Heads Up Health pricing structure
  -- Pricing numbers live only in provenance.payload (never a consumer-facing string).
  v_title := 'Heads Up Health pricing structure';
  v_summary := 'Heads Up Health publishes three practitioner SaaS tiers on the web pricing page effective July 1, 2026: Professional, Premier, and Enterprise. Billing is month to month with no long-term contract claimed. AI token usage and professional services are billed separately. Store listings still advertise a stale annual subscription scale versus the July 1, 2026 web tiers. Compliance badges are claimed and not independently verified from public cert directories in this crawl. Numeric prices are stored only in provenance.payload. Internal strategy only.';
  v_urls := ARRAY[
    'https://headsuphealth.com/pricing-packages/',
    'https://play.google.com/store/apps/details?id=health.headsup.p',
    'https://apps.apple.com/us/app/heads-up-health-1-0-legacy/id1399133678'
  ];
  v_provenance := jsonb_build_object(
    'classification', 'internal_strategy',
    'source_class', 'public_http',
    'retrieval_timestamp', '2026-08-18T00:00:00Z',
    'source_urls', to_jsonb(v_urls),
    'payload', jsonb_build_object(
      'effective', '2026-07-01',
      'billing', 'month to month; no long-term contract claimed',
      'tiers', jsonb_build_object(
        'professional', jsonb_build_object(
          'monthly_usd', 250,
          'clients_included', 40,
          'overage_per_client_usd', 6,
          'onboarding_usd', 1000,
          'onboarding_cs_hours', 5,
          'notes', 'Branding. Professional AI Community Agents.'
        ),
        'premier', jsonb_build_object(
          'monthly_usd', 1000,
          'clients_included', 100,
          'overage_per_client_usd', 10,
          'onboarding_usd', 3500,
          'onboarding_cs_hours', 15,
          'notes', 'Advanced branding. Premier AI Community Agents.',
          'professional_addon_per_client_usd', 14,
          'professional_addon_status', 'claimed on FAQ'
        ),
        'enterprise', jsonb_build_object(
          'monthly_usd', 'custom',
          'onboarding_from_usd', 7000,
          'mobile_sdk_setup_usd', 2500,
          'managed_white_label_mobile_setup_usd', 5000,
          'managed_white_label_mobile_monthly_usd', 10000,
          'notes', 'White-label, SSO, APIs and webhooks, custom integrations, premium support.'
        )
      ),
      'ai_tokens_usd', jsonb_build_object(
        'lab_diagnostic_extraction_avg_per_page', 0.07,
        'lab_diagnostic_extraction_high_per_page', 0.60,
        'community_agents_avg_per_action', 0.03,
        'custom_agents_avg_per_action', 0.04
      ),
      'professional_services_hourly_usd', 200,
      'compliance_claimed', jsonb_build_array('HIPAA', 'SOC2 Type II', 'GDPR', '2FA', 'data residency'),
      'compliance_verification', 'not independently verified from public cert directories in this crawl',
      'store_stale_claim', jsonb_build_object(
        'play_and_listings', '$299/mth with an annual subscription; 25-client starting scale',
        'status', 'stale versus July 1, 2026 web pricing'
      ),
      'legacy_ios_iap_usd', jsonb_build_object(
        'monthly', 8.99,
        'yearly', 78.99,
        'note', 'consumer-style IAP on 1.0 legacy listing only'
      )
    )
  );
  INSERT INTO public.kb_items (
    primary_collection_id, title, summary, source_urls, retrieval_timestamp,
    content_hash, evidence_grade, gate_status, jeffery_verdict, provenance,
    payload_type, practitioner_depth, consumer_safe
  ) VALUES (
    v_collection_id, v_title, v_summary, v_urls, '2026-08-18T00:00:00Z',
    encode(sha256(convert_to(v_title || v_summary, 'UTF8')), 'hex'),
    'E', 'approved', 'needs_human', v_provenance,
    'competitor_app', false, false
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- 5. Heads Up Health review themes
  v_title := 'Heads Up Health review themes';
  v_summary := 'Public voice-of-customer themes for Heads Up Health from a small review set. Praise themes: lab trend tracking, multi-device unification, and practice appointment or concierge CS flow. Complaint themes: invite required on the public App Store listing, integration lag versus selected third-party tools, and Play Data Safety declaring data cannot be deleted. Capterra was bot-walled; no public G2 review set was retrieved. Do not invent scores. Case-study customers are marketing names, not reviews. Internal strategy only.';
  v_urls := ARRAY[
    'https://apps.apple.com/us/app/heads-up-health/id6754039108',
    'https://apps.apple.com/us/app/heads-up-health-1-0-legacy/id1399133678',
    'https://play.google.com/store/apps/details?id=health.headsup.p'
  ];
  v_provenance := jsonb_build_object(
    'classification', 'internal_strategy',
    'source_class', 'public_http',
    'retrieval_timestamp', '2026-08-18T00:00:00Z',
    'source_urls', to_jsonb(v_urls),
    'payload', jsonb_build_object(
      'praise_themes', jsonb_build_array(
        jsonb_build_object(
          'theme', 'Lab trend tracking',
          'count', 2,
          'examples', jsonb_build_array('Carl Lipp 2025-07-28', 'Unsmoothie 2025-07-28 (legacy)')
        ),
        jsonb_build_object(
          'theme', 'Multi-device unification',
          'count', 2,
          'examples', jsonb_build_array(
            'Unsmoothie (KetoMojo, Stelo, Oura, MyFitnessPal)',
            'KelShae 2024-07-11'
          )
        ),
        jsonb_build_object(
          'theme', 'Practice appointment flow and concierge/CS',
          'count', 1,
          'examples', jsonb_build_array('KelShae')
        )
      ),
      'complaint_themes', jsonb_build_array(
        jsonb_build_object(
          'theme', 'Invite required, unexplained on public App Store',
          'count', 2,
          'note', 'two copies of same 2.0 review, 2026-03-16'
        ),
        jsonb_build_object(
          'theme', 'Integration lag vs MyFitnessPal fasting, Apple Ultra, Renpho',
          'count', 1,
          'examples', jsonb_build_array('IceBear2144 2023-01-24')
        ),
        jsonb_build_object(
          'theme', 'Play Data Safety cannot delete data',
          'count', 1,
          'note', 'listing declaration, not a star review'
        )
      ),
      'store_ratings', jsonb_build_object(
        'ios_2_0', jsonb_build_object('rating', 3.5, 'ratings_count', 4, 'version', '2.26.0'),
        'ios_legacy_1_0', jsonb_build_object('rating', 4.3, 'ratings_count', 20),
        'android', jsonb_build_object('downloads', '100+', 'data_safety', 'Data can''t be deleted')
      ),
      'g2_capterra', 'Capterra bot-walled; no public G2 review set retrieved; do not invent scores',
      'case_study_customers_marketing', jsonb_build_array(
        'Jigsaw Health', 'Beacon40', 'Proactive Health', 'Nexus Medicine', 'Jyzen',
        'BlueWave Medicine', 'RMI', 'Living Proof Institute', 'RootCauses', 'AndHealth',
        'Mode+Method', 'Ciba Health', 'GladdMD'
      )
    )
  );
  INSERT INTO public.kb_items (
    primary_collection_id, title, summary, source_urls, retrieval_timestamp,
    content_hash, evidence_grade, gate_status, jeffery_verdict, provenance,
    payload_type, practitioner_depth, consumer_safe
  ) VALUES (
    v_collection_id, v_title, v_summary, v_urls, '2026-08-18T00:00:00Z',
    encode(sha256(convert_to(v_title || v_summary, 'UTF8')), 'hex'),
    'E', 'approved', 'needs_human', v_provenance,
    'competitor_app', false, false
  )
  ON CONFLICT (content_hash) DO NOTHING;
END $$;
