// Prompt #122 P1: Per-field redaction policy map.
//
// For every table a collector reads, every column must have an explicit
// treatment. The redact() function is fail-closed: any field without a
// policy entry throws rather than leaking an unclassified column to the
// auditor. That guarantee is the key reason this file must stay exhaustive.
//
// Treatment taxonomy (from src/lib/soc2/types.ts RedactionTreatment):
//   remove                            Field is dropped entirely from output
//   pseudonymize(context)             Real ID replaced with HMAC pseudonym
//   retain                            Field passes through unchanged
//   truncate_timestamp_seconds        Timestamp truncated to whole seconds
//   truncate_ip                       IPv4 → /24, IPv6 → /64
//   generalize_user_agent             Normalized to "<Family> <MajorVersion>"
//   block_entire_table                Entire table forbidden from any packet

import type { RedactionPolicy } from '../types';

export const SOC2_REDACTION_POLICY: RedactionPolicy = {
  tables: {
    // ─── Profiles / Users ───────────────────────────────────────────────────
    profiles: {
      id:               { kind: 'pseudonymize', context: 'user' },
      email:            { kind: 'remove' },
      display_name:     { kind: 'remove' },
      phone:            { kind: 'remove' },
      role:             { kind: 'retain' },
      created_at:       { kind: 'truncate_timestamp_seconds' },
      updated_at:       { kind: 'truncate_timestamp_seconds' },
    },

    practitioners: {
      id:                  { kind: 'pseudonymize', context: 'practitioner' },
      user_id:             { kind: 'pseudonymize', context: 'user' },
      name:                { kind: 'remove' },
      display_name:        { kind: 'remove' },
      email:               { kind: 'remove' },
      phone:               { kind: 'remove' },
      npi:                 { kind: 'retain' },
      credential_type:     { kind: 'retain' },
      license_state:       { kind: 'retain' },
      verification_status: { kind: 'retain' },
      created_at:          { kind: 'truncate_timestamp_seconds' },
      updated_at:          { kind: 'truncate_timestamp_seconds' },
    },

    // ─── Marshall compliance (#119) ──────────────────────────────────────────
    compliance_findings: {
      id:                  { kind: 'pseudonymize', context: 'finding' },
      finding_id:          { kind: 'retain' },
      rule_id:             { kind: 'retain' },
      severity:            { kind: 'retain' },
      surface:             { kind: 'retain' },
      source:              { kind: 'retain' },
      location:            { kind: 'retain' },
      excerpt:             { kind: 'remove' }, // may quote user content
      message:             { kind: 'retain' },
      citation:            { kind: 'retain' },
      remediation:         { kind: 'retain' },
      status:              { kind: 'retain' },
      assigned_to:         { kind: 'pseudonymize', context: 'user' },
      escalated_to:        { kind: 'retain' },
      resolution_note:     { kind: 'remove' },
      resolved_at:         { kind: 'truncate_timestamp_seconds' },
      created_at:          { kind: 'truncate_timestamp_seconds' },
      evidence_bundle_id:  { kind: 'pseudonymize', context: 'evidence_bundle' },
    },

    compliance_incidents: {
      id:                  { kind: 'pseudonymize', context: 'incident' },
      incident_id:         { kind: 'retain' },
      title:               { kind: 'retain' },
      severity:            { kind: 'retain' },
      opened_by:           { kind: 'retain' },
      opened_at:           { kind: 'truncate_timestamp_seconds' },
      closed_at:           { kind: 'truncate_timestamp_seconds' },
      root_cause:          { kind: 'retain' },
      dev_side_escape:     { kind: 'retain' },
      related_finding_ids: { kind: 'pseudonymize_array', context: 'finding' },
      narrative:           { kind: 'remove' },
      owner:               { kind: 'pseudonymize', context: 'user' },
      created_at:          { kind: 'truncate_timestamp_seconds' },
    },

    compliance_audit_log: {
      id:            { kind: 'retain' },
      event_type:    { kind: 'retain' },
      actor_type:    { kind: 'retain' },
      actor_id:      { kind: 'pseudonymize', context: 'user' },
      payload:       { kind: 'retain' },
      prev_hash:     { kind: 'retain' },
      row_hash:      { kind: 'retain' },
      created_at:    { kind: 'truncate_timestamp_seconds' },
    },

    consent_ledger: {
      id:           { kind: 'pseudonymize', context: 'consent' },
      user_id:      { kind: 'pseudonymize', context: 'user' },
      consent_type: { kind: 'retain' },
      version:      { kind: 'retain' },
      granted:      { kind: 'retain' },
      granted_at:   { kind: 'truncate_timestamp_seconds' },
      revoked_at:   { kind: 'truncate_timestamp_seconds' },
      ip_address:   { kind: 'truncate_ip' },
      user_agent:   { kind: 'generalize_user_agent' },
      evidence:     { kind: 'retain' },
      created_at:   { kind: 'truncate_timestamp_seconds' },
    },

    dsar_requests: {
      id:            { kind: 'pseudonymize', context: 'dsar' },
      user_id:       { kind: 'pseudonymize', context: 'user' },
      email:         { kind: 'remove' },
      request_type:  { kind: 'retain' },
      jurisdiction:  { kind: 'retain' },
      opened_at:     { kind: 'truncate_timestamp_seconds' },
      sla_due_at:    { kind: 'truncate_timestamp_seconds' },
      completed_at:  { kind: 'truncate_timestamp_seconds' },
      status:        { kind: 'retain' },
      notes:         { kind: 'remove' },
      created_at:    { kind: 'truncate_timestamp_seconds' },
    },

    vendor_baas: {
      id:              { kind: 'pseudonymize', context: 'vendor_baa' },
      vendor_name:     { kind: 'retain' },
      scope:           { kind: 'retain' },
      baa_signed_on:   { kind: 'retain' },
      baa_expires_on:  { kind: 'retain' },
      document_url:    { kind: 'remove' }, // Vault/Storage ref; not exposed to auditor
      notes:           { kind: 'remove' },
      created_at:      { kind: 'truncate_timestamp_seconds' },
      updated_at:      { kind: 'truncate_timestamp_seconds' },
    },

    // ─── Hounddog social signals (#120) — social_signals is aggregate-only ──
    social_signals: {
      id:                              { kind: 'pseudonymize', context: 'signal' },
      collector_id:                    { kind: 'retain' },
      url:                             { kind: 'retain' }, // public listing URL
      captured_at:                     { kind: 'truncate_timestamp_seconds' },
      author_handle:                   { kind: 'remove' }, // PII-ish; aggregate counts only
      author_external_id:              { kind: 'remove' },
      author_display_name:             { kind: 'remove' },
      matched_practitioner_id:         { kind: 'pseudonymize', context: 'practitioner' },
      practitioner_match_confidence:   { kind: 'retain' },
      language:                        { kind: 'retain' },
      text_derived:                    { kind: 'remove' },
      jurisdiction_country:            { kind: 'retain' },
      overall_confidence:              { kind: 'retain' },
      status:                          { kind: 'retain' },
      created_at:                      { kind: 'truncate_timestamp_seconds' },
    },

    // ─── Pre-Check (#121) ───────────────────────────────────────────────────
    precheck_sessions: {
      id:                     { kind: 'pseudonymize', context: 'precheck_session' },
      session_id:             { kind: 'retain' },
      practitioner_id:        { kind: 'pseudonymize', context: 'practitioner' },
      source:                 { kind: 'retain' },
      draft_hash_sha256:      { kind: 'retain' }, // already a hash
      normalization_version:  { kind: 'retain' },
      rule_registry_version:  { kind: 'retain' },
      status:                 { kind: 'retain' },
      recursion_count:        { kind: 'retain' },
      target_platform:        { kind: 'retain' },
      cleared_at:             { kind: 'truncate_timestamp_seconds' },
      closed_at:              { kind: 'truncate_timestamp_seconds' },
      created_at:             { kind: 'truncate_timestamp_seconds' },
      updated_at:             { kind: 'truncate_timestamp_seconds' },
    },

    precheck_findings: {
      id:                          { kind: 'pseudonymize', context: 'precheck_finding' },
      session_id:                  { kind: 'pseudonymize', context: 'precheck_session' },
      rule_id:                     { kind: 'retain' },
      severity:                    { kind: 'retain' },
      confidence:                  { kind: 'retain' },
      remediation_kind:            { kind: 'retain' },
      remediation_suggestion_hash: { kind: 'retain' },
      round:                       { kind: 'retain' },
      created_at:                  { kind: 'truncate_timestamp_seconds' },
    },

    precheck_clearance_receipts: {
      id:                 { kind: 'pseudonymize', context: 'receipt' },
      receipt_id:         { kind: 'retain' },
      session_id:         { kind: 'pseudonymize', context: 'precheck_session' },
      practitioner_id:    { kind: 'pseudonymize', context: 'practitioner' },
      draft_hash_sha256:  { kind: 'retain' },
      signing_key_id:     { kind: 'retain' },
      issued_at:          { kind: 'truncate_timestamp_seconds' },
      expires_at:         { kind: 'truncate_timestamp_seconds' },
      revoked:            { kind: 'retain' },
      revoked_at:         { kind: 'truncate_timestamp_seconds' },
      revoked_reason:     { kind: 'retain' },
      // jwt_compact intentionally omitted — auditor gets receipt chain
      // metadata only, not the signed JWT bodies.
    },

    // ─── Signing keys (P4 key-rotation collector reads these) ───────────────
    soc2_signing_keys: {
      id:               { kind: 'retain' },
      alg:              { kind: 'retain' },
      public_key_pem:   { kind: 'retain' },
      private_key_ref:  { kind: 'remove' }, // Vault ref; never exposed
      active:           { kind: 'retain' },
      rotation_of:      { kind: 'retain' },
      created_at:       { kind: 'truncate_timestamp_seconds' },
      retired_at:       { kind: 'truncate_timestamp_seconds' },
    },

    precheck_signing_keys: {
      id:               { kind: 'retain' },
      alg:              { kind: 'retain' },
      public_key_pem:   { kind: 'retain' },
      private_key_ref:  { kind: 'remove' },
      active:           { kind: 'retain' },
      rotation_of:      { kind: 'retain' },
      created_at:       { kind: 'truncate_timestamp_seconds' },
      retired_at:       { kind: 'truncate_timestamp_seconds' },
    },

    // ─── Collector config itself (meta-evidence of which collectors ran) ────
    soc2_collector_config: {
      collector_id:       { kind: 'retain' },
      enabled:            { kind: 'retain' },
      api_key_ref:        { kind: 'remove' }, // Vault ref; never exposed
      last_run_at:        { kind: 'truncate_timestamp_seconds' },
      last_heartbeat_at:  { kind: 'truncate_timestamp_seconds' },
      notes:              { kind: 'retain' },
      updated_at:         { kind: 'truncate_timestamp_seconds' },
    },

    // ─── External system tables (P4 collectors populate these from APIs) ────
    soc2_external_github_prs: {
      id:                 { kind: 'retain' },
      repo:               { kind: 'retain' },
      pr_number:          { kind: 'retain' },
      title:              { kind: 'retain' },
      author_login:       { kind: 'pseudonymize', context: 'gh_user' },
      state:              { kind: 'retain' },
      merged_at:          { kind: 'truncate_timestamp_seconds' },
      closed_at:          { kind: 'truncate_timestamp_seconds' },
      created_at:         { kind: 'truncate_timestamp_seconds' },
      approvers:          { kind: 'pseudonymize_array', context: 'gh_user' },
      review_count:       { kind: 'retain' },
      checks_passed:      { kind: 'retain' },
    },

    soc2_external_vercel_deploys: {
      id:               { kind: 'retain' },
      deployment_id:    { kind: 'retain' },
      project:          { kind: 'retain' },
      environment:      { kind: 'retain' },
      state:            { kind: 'retain' },
      created_at:       { kind: 'truncate_timestamp_seconds' },
      ready_at:         { kind: 'truncate_timestamp_seconds' },
      creator_login:    { kind: 'pseudonymize', context: 'vercel_user' },
      commit_sha:       { kind: 'retain' },
    },

    soc2_external_anthropic_usage: {
      id:           { kind: 'retain' },
      day:          { kind: 'retain' },
      model:        { kind: 'retain' },
      input_tokens: { kind: 'retain' },
      output_tokens:{ kind: 'retain' },
      request_count:{ kind: 'retain' },
    },

    soc2_external_supabase_advisors: {
      id:           { kind: 'retain' },
      captured_at:  { kind: 'truncate_timestamp_seconds' },
      category:     { kind: 'retain' },
      level:        { kind: 'retain' },
      name:         { kind: 'retain' },
      description:  { kind: 'retain' },
      remediation:  { kind: 'retain' },
    },

    soc2_external_dependabot: {
      id:                   { kind: 'retain' },
      repo:                 { kind: 'retain' },
      alert_number:         { kind: 'retain' },
      severity:             { kind: 'retain' },
      package_name:         { kind: 'retain' },
      ecosystem:            { kind: 'retain' },
      cve:                  { kind: 'retain' },
      state:                { kind: 'retain' },
      created_at:           { kind: 'truncate_timestamp_seconds' },
      dismissed_at:         { kind: 'truncate_timestamp_seconds' },
      auto_dismissed:       { kind: 'retain' },
    },

    soc2_external_uptime: {
      id:            { kind: 'retain' },
      day:           { kind: 'retain' },
      service:       { kind: 'retain' },
      uptime_pct:    { kind: 'retain' },
      incidents:     { kind: 'retain' },
      p95_ms:        { kind: 'retain' },
    },

    soc2_external_cert_expiry: {
      id:             { kind: 'retain' },
      hostname:       { kind: 'retain' },
      not_before:     { kind: 'truncate_timestamp_seconds' },
      not_after:      { kind: 'truncate_timestamp_seconds' },
      issuer:         { kind: 'retain' },
      captured_at:    { kind: 'truncate_timestamp_seconds' },
      days_to_expiry: { kind: 'retain' },
    },

    soc2_external_mfa_status: {
      id:             { kind: 'retain' },
      user_id:        { kind: 'pseudonymize', context: 'user' },
      mfa_enabled:    { kind: 'retain' },
      factor_count:   { kind: 'retain' },
      factor_types:   { kind: 'retain' },
      captured_at:    { kind: 'truncate_timestamp_seconds' },
    },

    soc2_external_npi_reverify: {
      id:                    { kind: 'retain' },
      practitioner_id:       { kind: 'pseudonymize', context: 'practitioner' },
      npi:                   { kind: 'retain' },
      reverified_at:         { kind: 'truncate_timestamp_seconds' },
      prior_verification_at: { kind: 'truncate_timestamp_seconds' },
      status:                { kind: 'retain' },
      days_since_last:       { kind: 'retain' },
    },

    // ─── Genetic / lab data — BLOCKED entirely from any packet ──────────────
    genetic_profiles:     { _table: { kind: 'block_entire_table' } },
    clinical_assessments: { _table: { kind: 'block_entire_table' } },
    assessment_results:   { _table: { kind: 'block_entire_table' } },
    caq_assessment_versions: { _table: { kind: 'block_entire_table' } },
  },
};

/**
 * Policy-coverage audit. Given a table name and the set of column names
 * collectors will emit, returns the list of columns missing a treatment.
 * If the table is entirely blocked, returns ['__BLOCKED__'].
 */
export function auditPolicyCoverage(
  table: string,
  columnsEmitted: readonly string[],
): string[] {
  const tablePolicy = SOC2_REDACTION_POLICY.tables[table];
  if (!tablePolicy) {
    return columnsEmitted.slice();
  }
  const tableLevel = (tablePolicy as { _table?: { kind: string } })._table;
  if (tableLevel && tableLevel.kind === 'block_entire_table') {
    return ['__BLOCKED__'];
  }
  return columnsEmitted.filter((c) => !(c in tablePolicy));
}
