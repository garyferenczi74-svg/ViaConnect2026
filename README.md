# ViaConnect2026
ViaConnect™ GeneX360 — Clinical-grade precision health platform. Triple-portal (Consumer/Practitioner/Naturopath), five-source AI consensus, 6-panel genomic diagnostics (PeptideIQ™ + CannabisIQ™), 500+ botanical DB, FarmaTokens gamification. Next.js + React Native + Supabase. HIPAA/FHIR R4 compliant
<p align="center">
  <img src="docs/assets/farmceutica-logo.png" alt="FarmCeutica Wellness" width="200"/>
</p>
<h1 align="center">ViaConnect™ GeneX360</h1>
<p align="center">
  <strong>Clinical-Grade Precision Health Platform</strong><br/>
  Triple-Portal Architecture · Five-Source AI Consensus · 6-Panel Genomic Diagnostics
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React_Native-Expo-blue?logo=react" alt="React Native"/>
  <img src="https://img.shields.io/badge/Supabase-Postgres-green?logo=supabase" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Vercel-Edge-black?logo=vercel" alt="Vercel"/>
  <img src="https://img.shields.io/badge/HIPAA-Compliant-red" alt="HIPAA"/>
  <img src="https://img.shields.io/badge/FHIR-R4-orange" alt="FHIR R4"/>
  <img src="https://img.shields.io/badge/License-Proprietary-lightgrey" alt="License"/>
</p>

Overview
ViaConnect™ GeneX360 is FarmCeutica Wellness LLC's cross-platform precision health ecosystem — the industry's first integrated test-to-intervention platform combining multi-omic genetic diagnostics, AI-powered personalization, pharmaceutical-grade dual-delivery supplementation (10–27x bioavailability), and clinical-grade practitioner tools into a single vertically integrated system.
The platform serves three distinct user portals through a shared codebase with >90% code reuse, HIPAA-compliant data handling, and FHIR R4 healthcare interoperability.
Architecture
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │  Next.js 15  │  │ React Native     │  │  PWA Desktop          │  │
│  │  (Vercel)    │  │ + Expo (EAS)     │  │  (Installable)        │  │
│  │              │  │ + WatermelonDB   │  │                       │  │
│  │  3 Portals   │  │  Offline-First   │  │  Practitioner         │  │
│  └──────────────┘  └──────────────────┘  └───────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                     INTELLIGENCE LAYER                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Tier 1: Deterministic Rules Engine + XGBoost/DNN (SHAP)     │   │
│  │  Tier 1B: ML Prediction (R²=0.82, AUC-ROC=0.89, 500+ feat.) │   │
│  │  Tier 2: Five-Source AI Consensus                             │   │
│  │    Claude API · OpenAI GPT-4o · Perplexity Sonar             │   │
│  │    OpenEvidence AI (GRADE) · PubMed E-utilities (36M+ refs)   │   │
│  └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │  Supabase    │  │  pgvector    │  │  Supabase Storage      │    │
│  │  Postgres    │  │  RAG Store   │  │  (Genomic Data, S3)    │    │
│  │  + RLS       │  │              │  │  + KMS Encryption      │    │
│  │  + Realtime  │  │              │  │                        │    │
│  └──────────────┘  └──────────────┘  └────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
Three-Portal System
PortalUsersAccentKey CapabilitiesPersonal WellnessConsumersCyan #06B6D4Sonar-inspired dashboard, GENEX360 genomic visualization, AI supplement recommendations, wearable correlations, FarmaTokens gamification, e-commercePractitionerMDs, DOs, RDsEmerald #10B981Patient management, drug-supplement interaction engine, EHR/FHIR integration (Epic, Cerner, Athena), clinical protocols, population health analytics, CME creditsNaturopathNDs, NMDs, CNSAmber #F59E0B500+ botanical database, herb-gene cross-reference, formulation builder with label generation, Therapeutic Order framework, TCM/Ayurveda/Western herbalism, functional lab importing
GeneX360™ Diagnostic Panels
PanelMarkersApplicationGENEX-M™25+ SNPs (MTHFR, COMT, CYP450, VDR, APOE, FTO)Methylation, pharmacogenomics, nutrient metabolismNUTRIGEN-DX™Vitamin, mineral, macronutrient, fatty acid genesPersonalized nutrition protocolsHormoneIQ™40+ hormones/metabolites (DUTCH Complete)Sex hormones, cortisol rhythm, estrogen metabolitesEpigenHQ™853,307 CpG sites (Illumina 850K)Biological age via 4 validated clocksPeptideIQ™GHSR, IGF1, COL1A1, SLC15A1, FOXN1Peptide therapy optimization (first-mover, zero competitors)CannabisIQ™CNR1, CNR2, FAAH, CYP2C9, AKT1, TRPV1Cannabinoid response profiling (first-mover, zero competitors)
Monorepo Structure
viaconnect/
├── apps/
│   ├── web/                    # Next.js 15 (Vercel) — all 3 portals
│   └── mobile/                 # React Native + Expo — consumer portal
├── packages/
│   ├── core/                   # Business logic, validation, RBAC, types
│   ├── api-client/             # Supabase client, hooks, realtime, offline sync
│   ├── genomics-engine/        # GENEX360 parsing, PRS, CYP phenotyping
│   ├── ai-layer/               # Five-source orchestration, RAG, rules engine
│   ├── interactions/           # Drug-supplement, herb-herb, herb-gene checking
│   ├── caq/                    # Clinical Assessment Questionnaire logic
│   ├── wearables/              # Apple Health, Fitbit, Oura, Whoop, Garmin
│   ├── farmatokens/            # Token ledger, streak engine, redemption
│   └── ui/                     # Shared components (Tailwind + NativeWind)
├── services/
│   ├── genetic-pipeline/       # Bioinformatics (Hail, PLINK, PharmCAT)
│   └── botanical-intelligence/ # 500+ herb DB, formulation builder, labels
├── infrastructure/
│   └── supabase/               # Migrations, RLS policies, edge functions
└── docs/
    └── architecture/           # Technical specifications, ADRs
Tech Stack
LayerTechnologyWebNext.js 15, Tailwind CSS, shadcn/ui, Recharts/D3.js, Three.js, GSAP 3MobileReact Native, Expo, NativeWind, WatermelonDBStateZustand + TanStack QueryBackendSupabase Postgres (RLS, pgvector, pgcrypto, Realtime, Edge Functions)AuthSupabase Auth (JWT, MFA, RBAC, SSO, biometric)AIClaude API, OpenAI GPT-4o, Perplexity Sonar, OpenEvidence AI, PubMed E-utilitiesGenomicsHail, PLINK, PharmCAT, ClinVar, GenemetricsPaymentsStripe, Apple Pay, Google Pay, Truemed (HSA/FSA)NotificationsKlaviyo, Firebase Cloud MessagingMonitoringSentry, PostHog (self-hosted), Vercel AnalyticsDevOpsTurborepo, GitHub Actions, Vercel, Expo EASComplianceHIPAA, FHIR R4, GDPR, PIPEDA, AES-256, TLS 1.3
AI Architecture: Five-Source Consensus
Patient Context (CAQ + Genomics + Wearables + Labs)
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌─────────┐  ┌──────────┐  ┌─────────────┐
│ Tier 1  │  │ Tier 1B  │  │   Tier 2    │
│ Rules   │  │ ML Layer │  │ Five-Source  │
│ Engine  │  │ XGBoost  │  │ Consensus   │
│         │  │ + DNN    │  │             │
│ SNP→Rx  │  │ 500+ ft  │  │ Claude      │
│ CYP450  │  │ SHAP     │  │ OpenAI      │
│ Interact│  │ R²=0.82  │  │ Perplexity  │
│ Dosing  │  │          │  │ OpenEvidence│
│         │  │          │  │ PubMed      │
└────┬────┘  └────┬─────┘  └──────┬──────┘
     │            │               │
     └────────────┼───────────────┘
                  ▼
    ┌──────────────────────────┐
    │   Safety Gating Layer    │
    │  Interaction Check       │
    │  Allergy Exclusion       │
    │  Contraindication Flag   │
    │  Evidence Grade (GRADE)  │
    │  Citation Chain (PMIDs)  │
    └────────────┬─────────────┘
                 ▼
    ┌──────────────────────────┐
    │  Personalized Protocol   │
    │  → Patient Portal        │
    │  → Practitioner Review   │
    │  → Naturopath Dashboard  │
    └──────────────────────────┘
12 Clinical Pathways
Methylation · Phase I Detox · Phase II Detox · Neurotransmitter Metabolism · Inflammation Response · Oxidative Stress · Lipid Metabolism & Neuroprotection · Vitamin D Function · Hormone Metabolism · Iron Metabolism · Histamine Metabolism · Peptide Response (PeptideIQ™)
Design System: Dual-Mode

Mode A — MDX.so Dark Cinematic (Consumer default): #0A0F1C → #0F172A gradient, glassmorphism cards, Three.js 3D DNA helix, GSAP scroll animations
Mode B — Sonar Health Clean Clinical (Practitioner/Naturopath): White backgrounds, Primary Blue #0066CC, Wellness Green #00AA88, elevated cards, WCAG 2.1 AA compliant

FarmaTokens™ Gamification
Tokenized loyalty system rewarding health behaviors: daily logging (5 tokens), weekly check-ins (15), biomarker improvements (50), GENEX360 testing (200–500), referrals (100), 30-day streaks (75 bonus), 90-day streaks (250 bonus). Redeemable for store credit, free products, consultations, and Founders Circle VIP access. Target: 85%+ retention at 90 days.
Membership Tiers
TierPriceAccessGold$8.88/moDashboard, basic AI, tracking, communityPlatinum$28.88/moFull AI protocols, SHAP, wearables, telehealthPlatinum (GeneX360)6 mo freeIncluded with GeneX360 Complete ($988.88)Naturopath & Practitioner$128.88/moFull portal, white-label, CME/CE, wholesale
Security & Compliance

HIPAA compliant with BAAs (Supabase Enterprise, Vercel Enterprise)
Row-Level Security (RLS) on all PHI tables
AES-256 encryption at rest (AWS KMS), TLS 1.3 in transit
MFA required for practitioner/naturopath roles
Immutable append-only audit logging
FHIR R4 data models (Patient, Observation, MedicationRequest, CarePlan, DiagnosticReport)
GDPR/PIPEDA international compliance with data residency controls
SOC 2 Type II audit roadmap

Getting Started
bash# Clone the repository
git clone https://github.com/farmceutica/viaconnect-genex360.git
cd viaconnect-genex360

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Configure: Supabase, Claude API, OpenAI, Perplexity, OpenEvidence, Stripe keys

# Run development server
npx turbo dev

# Run tests
npx turbo test
Documentation

Technical Architecture Specification V2.2 — 22-section, 1,940-paragraph comprehensive specification
API Reference — Supabase Edge Function endpoints
FHIR Data Models — Resource schemas and mapping documentation
Genomics Pipeline — Bioinformatics workflow documentation
Deployment Guide — Vercel, Expo EAS, and Supabase configuration

Company
FarmCeutica Wellness LLC · Buffalo, NY · Calgary, AB
Founded by Gary Ferenczi · 30+ years GMP facility development · Precision health since 2018
$5.5M Seed Round · 77.5% 5-Year Revenue CAGR · $160M Base Case EV · 72–77% Gross Margins

<p align="center">
  <strong>CONFIDENTIAL</strong> — This repository contains proprietary technology of FarmCeutica Wellness LLC.<br/>
  Unauthorized access, copying, or distribution is strictly prohibited.
</p>
