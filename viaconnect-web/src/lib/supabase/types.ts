export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      advisor_agent_config: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      advisor_fix_log: {
        Row: {
          applied_at: string | null
          duration_ms: number | null
          error_message: string | null
          fix_type: string
          id: string
          issue_id: string
          sql_applied: string
          success: boolean | null
        }
        Insert: {
          applied_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          fix_type: string
          id?: string
          issue_id: string
          sql_applied: string
          success?: boolean | null
        }
        Update: {
          applied_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          fix_type?: string
          id?: string
          issue_id?: string
          sql_applied?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_fix_log_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "advisor_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_issues: {
        Row: {
          affected_column: string | null
          affected_index: string | null
          affected_table: string | null
          category: string
          created_at: string | null
          description: string | null
          external_id: string | null
          first_seen_at: string | null
          fix_migration: string | null
          fix_sql: string | null
          fixed_at: string | null
          id: string
          last_seen_at: string | null
          recommended_fix: string | null
          seen_count: number | null
          severity: string
          snapshot_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          affected_column?: string | null
          affected_index?: string | null
          affected_table?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          first_seen_at?: string | null
          fix_migration?: string | null
          fix_sql?: string | null
          fixed_at?: string | null
          id?: string
          last_seen_at?: string | null
          recommended_fix?: string | null
          seen_count?: number | null
          severity: string
          snapshot_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          affected_column?: string | null
          affected_index?: string | null
          affected_table?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          first_seen_at?: string | null
          fix_migration?: string | null
          fix_sql?: string | null
          fixed_at?: string | null
          id?: string
          last_seen_at?: string | null
          recommended_fix?: string | null
          seen_count?: number | null
          severity?: string
          snapshot_id?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_issues_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "advisor_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_peptide_shares: {
        Row: {
          advisor_response: string
          created_at: string
          id: string
          original_question: string
          patient_id: string
          peptide_name: string
          practitioner_id: string
          practitioner_notes: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          advisor_response: string
          created_at?: string
          id?: string
          original_question: string
          patient_id: string
          peptide_name: string
          practitioner_id: string
          practitioner_notes?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          advisor_response?: string
          created_at?: string
          id?: string
          original_question?: string
          patient_id?: string
          peptide_name?: string
          practitioner_id?: string
          practitioner_notes?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      advisor_snapshots: {
        Row: {
          created_at: string | null
          error_count: number | null
          id: string
          info_count: number | null
          raw_payload: Json | null
          run_id: string
          snapshot_at: string | null
          total_advisories: number | null
          trigger_type: string
          warning_count: number | null
        }
        Insert: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          info_count?: number | null
          raw_payload?: Json | null
          run_id: string
          snapshot_at?: string | null
          total_advisories?: number | null
          trigger_type: string
          warning_count?: number | null
        }
        Update: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          info_count?: number | null
          raw_payload?: Json | null
          run_id?: string
          snapshot_at?: string | null
          total_advisories?: number | null
          trigger_type?: string
          warning_count?: number | null
        }
        Relationships: []
      }
      aggregation_snapshots: {
        Row: {
          as_of_timestamp: string
          cfo_review_notes: string | null
          cfo_reviewed_at: string | null
          cfo_reviewer_id: string | null
          computation_ended_at: string | null
          computation_started_at: string | null
          created_at: string
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["aggregation_period_type"]
          snapshot_id: string
          state: Database["public"]["Enums"]["aggregation_snapshot_state"]
          total_kpis_computed: number
          updated_at: string
        }
        Insert: {
          as_of_timestamp: string
          cfo_review_notes?: string | null
          cfo_reviewed_at?: string | null
          cfo_reviewer_id?: string | null
          computation_ended_at?: string | null
          computation_started_at?: string | null
          created_at?: string
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["aggregation_period_type"]
          snapshot_id?: string
          state?: Database["public"]["Enums"]["aggregation_snapshot_state"]
          total_kpis_computed?: number
          updated_at?: string
        }
        Update: {
          as_of_timestamp?: string
          cfo_review_notes?: string | null
          cfo_reviewed_at?: string | null
          cfo_reviewer_id?: string | null
          computation_ended_at?: string | null
          computation_started_at?: string | null
          created_at?: string
          period_end?: string
          period_start?: string
          period_type?: Database["public"]["Enums"]["aggregation_period_type"]
          snapshot_id?: string
          state?: Database["public"]["Enums"]["aggregation_snapshot_state"]
          total_kpis_computed?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          generated_at: string | null
          id: string
          insight_text: string
          insight_type: string | null
          pubmed_id: string | null
          relevance_score: number | null
          research_summary: string | null
          research_title: string | null
          research_url: string | null
          user_id: string
        }
        Insert: {
          generated_at?: string | null
          id?: string
          insight_text: string
          insight_type?: string | null
          pubmed_id?: string | null
          relevance_score?: number | null
          research_summary?: string | null
          research_title?: string | null
          research_url?: string | null
          user_id: string
        }
        Update: {
          generated_at?: string | null
          id?: string
          insight_text?: string
          insight_type?: string | null
          pubmed_id?: string | null
          relevance_score?: number | null
          research_summary?: string | null
          research_title?: string | null
          research_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_route_audit: {
        Row: {
          cost_usd: number | null
          created_at: string
          error_code: string | null
          http_status: number | null
          id: string
          input_chars: number | null
          input_tokens: number | null
          latency_ms: number | null
          model: string | null
          outcome: string
          output_tokens: number | null
          provider: string
          request_id: string
          route: string
          user_id: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          http_status?: number | null
          id?: string
          input_chars?: number | null
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          outcome: string
          output_tokens?: number | null
          provider: string
          request_id: string
          route: string
          user_id?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          http_status?: number | null
          id?: string
          input_chars?: number | null
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          outcome?: string
          output_tokens?: number | null
          provider?: string
          request_id?: string
          route?: string
          user_id?: string | null
        }
        Relationships: []
      }
      alert_snapshots: {
        Row: {
          alerts: Json
          checks_performed: number
          created_at: string | null
          critical_count: number
          id: string
          info_count: number
          overall_status: string
          snapshot_date: string
          warning_count: number
        }
        Insert: {
          alerts?: Json
          checks_performed: number
          created_at?: string | null
          critical_count: number
          id?: string
          info_count: number
          overall_status: string
          snapshot_date?: string
          warning_count: number
        }
        Update: {
          alerts?: Json
          checks_performed?: number
          created_at?: string | null
          critical_count?: number
          id?: string
          info_count?: number
          overall_status?: string
          snapshot_date?: string
          warning_count?: number
        }
        Relationships: []
      }
      analytics_category_history: {
        Row: {
          category_id: string
          data_completeness: number | null
          id: string
          insights_count: number | null
          recorded_at: string | null
          score: number | null
          user_id: string | null
        }
        Insert: {
          category_id: string
          data_completeness?: number | null
          id?: string
          insights_count?: number | null
          recorded_at?: string | null
          score?: number | null
          user_id?: string | null
        }
        Update: {
          category_id?: string
          data_completeness?: number | null
          id?: string
          insights_count?: number | null
          recorded_at?: string | null
          score?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      appeal_agreement_rollups: {
        Row: {
          agreement_rate: number
          approved_as_drafted_count: number
          claim_type: string
          computed_at: string
          flagged: boolean
          id: string
          jurisdiction: string
          modal_override_reason: string | null
          modified_count: number
          recommendation_count: number
          reviewed_manually_count: number
          rule_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          agreement_rate: number
          approved_as_drafted_count: number
          claim_type: string
          computed_at?: string
          flagged?: boolean
          id?: string
          jurisdiction: string
          modal_override_reason?: string | null
          modified_count: number
          recommendation_count: number
          reviewed_manually_count: number
          rule_id: string
          window_end: string
          window_start: string
        }
        Update: {
          agreement_rate?: number
          approved_as_drafted_count?: number
          claim_type?: string
          computed_at?: string
          flagged?: boolean
          id?: string
          jurisdiction?: string
          modal_override_reason?: string | null
          modified_count?: number
          recommendation_count?: number
          reviewed_manually_count?: number
          rule_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      appeal_analyses: {
        Row: {
          analyzer_version: string
          appeal_id: string
          claim_type: string
          confidence: number
          created_at: string
          drift_report: Json
          dual_approvers: string[] | null
          id: string
          pattern_report: Json | null
          rationale: Json
          recommendation: string
          requires_dual_approval: boolean
          sub_claim_type: string
          suggested_template_id: string | null
        }
        Insert: {
          analyzer_version: string
          appeal_id: string
          claim_type: string
          confidence: number
          created_at?: string
          drift_report: Json
          dual_approvers?: string[] | null
          id?: string
          pattern_report?: Json | null
          rationale: Json
          recommendation: string
          requires_dual_approval?: boolean
          sub_claim_type: string
          suggested_template_id?: string | null
        }
        Update: {
          analyzer_version?: string
          appeal_id?: string
          claim_type?: string
          confidence?: number
          created_at?: string
          drift_report?: Json
          dual_approvers?: string[] | null
          id?: string
          pattern_report?: Json | null
          rationale?: Json
          recommendation?: string
          requires_dual_approval?: boolean
          sub_claim_type?: string
          suggested_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appeal_analyses_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: true
            referencedRelation: "practitioner_notice_appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      appeal_decisions: {
        Row: {
          analysis_id: string
          appeal_id: string
          decided_at: string
          decided_by: string
          decision_kind: string
          diff_summary: Json | null
          final_draft_id: string | null
          final_response_sha256: string | null
          id: string
          modification_note: string | null
          modification_reason_code: string | null
          second_approver: string | null
          second_approver_at: string | null
          second_approver_note: string | null
          sent_at: string | null
        }
        Insert: {
          analysis_id: string
          appeal_id: string
          decided_at?: string
          decided_by: string
          decision_kind: string
          diff_summary?: Json | null
          final_draft_id?: string | null
          final_response_sha256?: string | null
          id?: string
          modification_note?: string | null
          modification_reason_code?: string | null
          second_approver?: string | null
          second_approver_at?: string | null
          second_approver_note?: string | null
          sent_at?: string | null
        }
        Update: {
          analysis_id?: string
          appeal_id?: string
          decided_at?: string
          decided_by?: string
          decision_kind?: string
          diff_summary?: Json | null
          final_draft_id?: string | null
          final_response_sha256?: string | null
          id?: string
          modification_note?: string | null
          modification_reason_code?: string | null
          second_approver?: string | null
          second_approver_at?: string | null
          second_approver_note?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appeal_decisions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "appeal_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_decisions_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: true
            referencedRelation: "practitioner_notice_appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_decisions_final_draft_id_fkey"
            columns: ["final_draft_id"]
            isOneToOne: false
            referencedRelation: "appeal_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      appeal_drafts: {
        Row: {
          analysis_id: string
          appeal_id: string
          augmentation_used: boolean
          draft_text: string
          generated_at: string
          generated_by: string
          id: string
          self_check_findings: Json | null
          self_check_passed: boolean
          superseded_by: string | null
          template_id: string
          template_version: number
          version: number
        }
        Insert: {
          analysis_id: string
          appeal_id: string
          augmentation_used?: boolean
          draft_text: string
          generated_at?: string
          generated_by: string
          id?: string
          self_check_findings?: Json | null
          self_check_passed: boolean
          superseded_by?: string | null
          template_id: string
          template_version: number
          version?: number
        }
        Update: {
          analysis_id?: string
          appeal_id?: string
          augmentation_used?: boolean
          draft_text?: string
          generated_at?: string
          generated_by?: string
          id?: string
          self_check_findings?: Json | null
          self_check_passed?: boolean
          superseded_by?: string | null
          template_id?: string
          template_version?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "appeal_drafts_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "appeal_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_drafts_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "practitioner_notice_appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_drafts_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "appeal_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_drafts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "rebuttal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      appeal_patterns: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          details: Json
          id: string
          jurisdiction: string | null
          pattern_code: string
          pattern_scope: string
          practitioner_ids: string[] | null
          rule_ids: string[] | null
          severity: string
          status: string
          time_window_end: string
          time_window_start: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          details: Json
          id?: string
          jurisdiction?: string | null
          pattern_code: string
          pattern_scope: string
          practitioner_ids?: string[] | null
          rule_ids?: string[] | null
          severity: string
          status?: string
          time_window_end: string
          time_window_start: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          details?: Json
          id?: string
          jurisdiction?: string | null
          pattern_code?: string
          pattern_scope?: string
          practitioner_ids?: string[] | null
          rule_ids?: string[] | null
          severity?: string
          status?: string
          time_window_end?: string
          time_window_start?: string
        }
        Relationships: []
      }
      approver_assignments: {
        Row: {
          approver_role: string
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean | null
          unassigned_at: string | null
          unassigned_by: string | null
          user_id: string
        }
        Insert: {
          approver_role: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          unassigned_at?: string | null
          unassigned_by?: string | null
          user_id: string
        }
        Update: {
          approver_role?: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          unassigned_at?: string | null
          unassigned_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          phase: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id?: string
          phase: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          phase?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backfill_audit: {
        Row: {
          applied_at: string
          columns_loaded: Json
          id: string
          product_id: string | null
          run_id: string
          sku: string | null
          source_table: string
          target_table: string
        }
        Insert: {
          applied_at?: string
          columns_loaded?: Json
          id?: string
          product_id?: string | null
          run_id: string
          sku?: string | null
          source_table: string
          target_table: string
        }
        Update: {
          applied_at?: string
          columns_loaded?: Json
          id?: string
          product_id?: string | null
          run_id?: string
          sku?: string | null
          source_table?: string
          target_table?: string
        }
        Relationships: []
      }
      bio_optimization_history: {
        Row: {
          breakdown: Json | null
          compute_seq: number
          compute_version: string
          computed_at: string
          confidence: number
          created_at: string | null
          date: string
          id: string
          score: number
          source: string | null
          tier: number
          user_id: string
        }
        Insert: {
          breakdown?: Json | null
          compute_seq?: number
          compute_version: string
          computed_at?: string
          confidence: number
          created_at?: string | null
          date?: string
          id?: string
          score: number
          source?: string | null
          tier: number
          user_id: string
        }
        Update: {
          breakdown?: Json | null
          compute_seq?: number
          compute_version?: string
          computed_at?: string
          confidence?: number
          created_at?: string | null
          date?: string
          id?: string
          score?: number
          source?: string | null
          tier?: number
          user_id?: string
        }
        Relationships: []
      }
      board_meetings: {
        Row: {
          actual_date: string | null
          agenda_md: string | null
          attendees: string[] | null
          created_at: string
          location_description: string | null
          meeting_code: string
          meeting_id: string
          meeting_type: string
          minutes_storage_path: string | null
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          agenda_md?: string | null
          attendees?: string[] | null
          created_at?: string
          location_description?: string | null
          meeting_code: string
          meeting_id?: string
          meeting_type: string
          minutes_storage_path?: string | null
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          agenda_md?: string | null
          attendees?: string[] | null
          created_at?: string
          location_description?: string | null
          meeting_code?: string
          meeting_id?: string
          meeting_type?: string
          minutes_storage_path?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      board_members: {
        Row: {
          access_revoked_at: string | null
          appointment_date: string
          auth_user_id: string | null
          board_reporting_scope: Json
          created_at: string
          departure_date: string | null
          display_name: string
          email_distribution: string
          email_primary: string
          member_id: string
          nda_effective_date: string | null
          nda_expires_at: string | null
          nda_status: Database["public"]["Enums"]["nda_status"]
          nda_vault_ref: string | null
          notes: string | null
          role: Database["public"]["Enums"]["board_member_role"]
          updated_at: string
        }
        Insert: {
          access_revoked_at?: string | null
          appointment_date: string
          auth_user_id?: string | null
          board_reporting_scope?: Json
          created_at?: string
          departure_date?: string | null
          display_name: string
          email_distribution: string
          email_primary: string
          member_id?: string
          nda_effective_date?: string | null
          nda_expires_at?: string | null
          nda_status?: Database["public"]["Enums"]["nda_status"]
          nda_vault_ref?: string | null
          notes?: string | null
          role: Database["public"]["Enums"]["board_member_role"]
          updated_at?: string
        }
        Update: {
          access_revoked_at?: string | null
          appointment_date?: string
          auth_user_id?: string | null
          board_reporting_scope?: Json
          created_at?: string
          departure_date?: string | null
          display_name?: string
          email_distribution?: string
          email_primary?: string
          member_id?: string
          nda_effective_date?: string | null
          nda_expires_at?: string | null
          nda_status?: Database["public"]["Enums"]["nda_status"]
          nda_vault_ref?: string | null
          notes?: string | null
          role?: Database["public"]["Enums"]["board_member_role"]
          updated_at?: string
        }
        Relationships: []
      }
      board_metrics: {
        Row: {
          active_customers: number
          arpu_monthly: number
          arr: number
          cac_payback_months: number
          cash_runway_months: number
          created_at: string | null
          gross_margin_pct: number
          id: string
          investor_highlights: string[] | null
          ltv_to_cac: number
          monthly_fcf: number
          mrr: number
          mrr_growth_mom: number | null
          net_revenue_retention: number | null
          portfolio_health: number
          report_quarter: string
          revenue_per_sku: number
          risk_factors: string[] | null
          rule_of_40: number
          total_revenue_pipeline: number
        }
        Insert: {
          active_customers: number
          arpu_monthly: number
          arr: number
          cac_payback_months: number
          cash_runway_months: number
          created_at?: string | null
          gross_margin_pct: number
          id?: string
          investor_highlights?: string[] | null
          ltv_to_cac: number
          monthly_fcf: number
          mrr: number
          mrr_growth_mom?: number | null
          net_revenue_retention?: number | null
          portfolio_health: number
          report_quarter: string
          revenue_per_sku: number
          risk_factors?: string[] | null
          rule_of_40: number
          total_revenue_pipeline: number
        }
        Update: {
          active_customers?: number
          arpu_monthly?: number
          arr?: number
          cac_payback_months?: number
          cash_runway_months?: number
          created_at?: string | null
          gross_margin_pct?: number
          id?: string
          investor_highlights?: string[] | null
          ltv_to_cac?: number
          monthly_fcf?: number
          mrr?: number
          mrr_growth_mom?: number | null
          net_revenue_retention?: number | null
          portfolio_health?: number
          report_quarter?: string
          revenue_per_sku?: number
          risk_factors?: string[] | null
          rule_of_40?: number
          total_revenue_pipeline?: number
        }
        Relationships: []
      }
      board_pack_ai_prompts: {
        Row: {
          created_at: string
          output_schema_json: Json
          prompt_id: string
          reviewed_at_cfo: string | null
          reviewed_by_cfo_id: string | null
          section_type: string
          status: string
          system_prompt_md: string
          token_budget: number
          version: number
        }
        Insert: {
          created_at?: string
          output_schema_json: Json
          prompt_id?: string
          reviewed_at_cfo?: string | null
          reviewed_by_cfo_id?: string | null
          section_type: string
          status?: string
          system_prompt_md: string
          token_budget?: number
          version: number
        }
        Update: {
          created_at?: string
          output_schema_json?: Json
          prompt_id?: string
          reviewed_at_cfo?: string | null
          reviewed_by_cfo_id?: string | null
          section_type?: string
          status?: string
          system_prompt_md?: string
          token_budget?: number
          version?: number
        }
        Relationships: []
      }
      board_pack_artifacts: {
        Row: {
          artifact_format: string
          artifact_id: string
          byte_size: number | null
          distribution_id: string | null
          pack_id: string
          rendered_at: string
          sha256_hash: string
          storage_path: string
        }
        Insert: {
          artifact_format: string
          artifact_id?: string
          byte_size?: number | null
          distribution_id?: string | null
          pack_id: string
          rendered_at?: string
          sha256_hash: string
          storage_path: string
        }
        Update: {
          artifact_format?: string
          artifact_id?: string
          byte_size?: number | null
          distribution_id?: string | null
          pack_id?: string
          rendered_at?: string
          sha256_hash?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_pack_artifacts_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "board_packs"
            referencedColumns: ["pack_id"]
          },
        ]
      }
      board_pack_distributions: {
        Row: {
          access_revoked_at: string | null
          distributed_at: string
          distribution_id: string
          email_notification_sent_at: string | null
          member_id: string
          pack_id: string
          revocation_reason: string | null
          watermark_token: string
        }
        Insert: {
          access_revoked_at?: string | null
          distributed_at?: string
          distribution_id?: string
          email_notification_sent_at?: string | null
          member_id: string
          pack_id: string
          revocation_reason?: string | null
          watermark_token: string
        }
        Update: {
          access_revoked_at?: string | null
          distributed_at?: string
          distribution_id?: string
          email_notification_sent_at?: string | null
          member_id?: string
          pack_id?: string
          revocation_reason?: string | null
          watermark_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_pack_distributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "board_pack_distributions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "board_packs"
            referencedColumns: ["pack_id"]
          },
        ]
      }
      board_pack_download_events: {
        Row: {
          acknowledgment_typed: boolean
          artifact_format: string
          byte_size_served: number | null
          distribution_id: string
          download_duration_ms: number | null
          downloaded_at: string
          event_id: string
          ip_address: unknown
          user_agent: string | null
          watermark_token_presented: string
          watermark_validated: boolean
        }
        Insert: {
          acknowledgment_typed?: boolean
          artifact_format: string
          byte_size_served?: number | null
          distribution_id: string
          download_duration_ms?: number | null
          downloaded_at?: string
          event_id?: string
          ip_address?: unknown
          user_agent?: string | null
          watermark_token_presented: string
          watermark_validated: boolean
        }
        Update: {
          acknowledgment_typed?: boolean
          artifact_format?: string
          byte_size_served?: number | null
          distribution_id?: string
          download_duration_ms?: number | null
          downloaded_at?: string
          event_id?: string
          ip_address?: unknown
          user_agent?: string | null
          watermark_token_presented?: string
          watermark_validated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "board_pack_download_events_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "board_pack_distributions"
            referencedColumns: ["distribution_id"]
          },
        ]
      }
      board_pack_kpi_snapshots: {
        Row: {
          aggregation_snapshot_id: string
          comparison_delta_pct: number | null
          computed_at: string
          computed_value_integer: number | null
          computed_value_json: Json | null
          computed_value_numeric: number | null
          kpi_id: string
          kpi_version: number
          prior_period_value: number | null
          provenance_json: Json
          snapshot_id: string
          unit: string
        }
        Insert: {
          aggregation_snapshot_id: string
          comparison_delta_pct?: number | null
          computed_at?: string
          computed_value_integer?: number | null
          computed_value_json?: Json | null
          computed_value_numeric?: number | null
          kpi_id: string
          kpi_version: number
          prior_period_value?: number | null
          provenance_json: Json
          snapshot_id?: string
          unit: string
        }
        Update: {
          aggregation_snapshot_id?: string
          comparison_delta_pct?: number | null
          computed_at?: string
          computed_value_integer?: number | null
          computed_value_json?: Json | null
          computed_value_numeric?: number | null
          kpi_id?: string
          kpi_version?: number
          prior_period_value?: number | null
          provenance_json?: Json
          snapshot_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_pack_kpi_snapshots_aggregation_snapshot_id_fkey"
            columns: ["aggregation_snapshot_id"]
            isOneToOne: false
            referencedRelation: "aggregation_snapshots"
            referencedColumns: ["snapshot_id"]
          },
          {
            foreignKeyName: "board_pack_kpi_snapshots_kpi_id_kpi_version_fkey"
            columns: ["kpi_id", "kpi_version"]
            isOneToOne: false
            referencedRelation: "kpi_library"
            referencedColumns: ["kpi_id", "version"]
          },
        ]
      }
      board_pack_sections: {
        Row: {
          ai_model: string | null
          ai_prompt_version: number | null
          ai_thinking_tokens: number | null
          cfo_reviewed_at: string | null
          cfo_reviewed_by: string | null
          commentary_md: string | null
          commentary_source: string
          content_json: Json
          created_at: string
          pack_id: string
          section_id: string
          section_order: number
          section_type: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          ai_prompt_version?: number | null
          ai_thinking_tokens?: number | null
          cfo_reviewed_at?: string | null
          cfo_reviewed_by?: string | null
          commentary_md?: string | null
          commentary_source?: string
          content_json: Json
          created_at?: string
          pack_id: string
          section_id?: string
          section_order: number
          section_type: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          ai_prompt_version?: number | null
          ai_thinking_tokens?: number | null
          cfo_reviewed_at?: string | null
          cfo_reviewed_by?: string | null
          commentary_md?: string | null
          commentary_source?: string
          content_json?: Json
          created_at?: string
          pack_id?: string
          section_id?: string
          section_order?: number
          section_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_pack_sections_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "board_packs"
            referencedColumns: ["pack_id"]
          },
        ]
      }
      board_pack_templates: {
        Row: {
          counsel_reviewed_at: string | null
          counsel_reviewer_id: string | null
          created_at: string
          default_board_scope: string[]
          section_schema_json: Json
          status: string
          template_id: string
          template_name: string
          updated_at: string
          version: number
        }
        Insert: {
          counsel_reviewed_at?: string | null
          counsel_reviewer_id?: string | null
          created_at?: string
          default_board_scope?: string[]
          section_schema_json: Json
          status?: string
          template_id?: string
          template_name: string
          updated_at?: string
          version: number
        }
        Update: {
          counsel_reviewed_at?: string | null
          counsel_reviewer_id?: string | null
          created_at?: string
          default_board_scope?: string[]
          section_schema_json?: Json
          status?: string
          template_id?: string
          template_name?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      board_packs: {
        Row: {
          aggregation_snapshot_id: string
          ceo_issued_at: string | null
          ceo_issued_by: string | null
          cfo_approved_at: string | null
          cfo_approved_by: string | null
          created_at: string
          created_by: string
          erratum_description_md: string | null
          meeting_id: string | null
          pack_id: string
          pack_title: string
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["aggregation_period_type"]
          short_code: string
          state: Database["public"]["Enums"]["pack_state"]
          supersedes_pack_id: string | null
          template_id: string
          template_version: number
          updated_at: string
        }
        Insert: {
          aggregation_snapshot_id: string
          ceo_issued_at?: string | null
          ceo_issued_by?: string | null
          cfo_approved_at?: string | null
          cfo_approved_by?: string | null
          created_at?: string
          created_by: string
          erratum_description_md?: string | null
          meeting_id?: string | null
          pack_id?: string
          pack_title: string
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["aggregation_period_type"]
          short_code: string
          state?: Database["public"]["Enums"]["pack_state"]
          supersedes_pack_id?: string | null
          template_id: string
          template_version: number
          updated_at?: string
        }
        Update: {
          aggregation_snapshot_id?: string
          ceo_issued_at?: string | null
          ceo_issued_by?: string | null
          cfo_approved_at?: string | null
          cfo_approved_by?: string | null
          created_at?: string
          created_by?: string
          erratum_description_md?: string | null
          meeting_id?: string | null
          pack_id?: string
          pack_title?: string
          period_end?: string
          period_start?: string
          period_type?: Database["public"]["Enums"]["aggregation_period_type"]
          short_code?: string
          state?: Database["public"]["Enums"]["pack_state"]
          supersedes_pack_id?: string | null
          template_id?: string
          template_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_packs_aggregation_snapshot_id_fkey"
            columns: ["aggregation_snapshot_id"]
            isOneToOne: false
            referencedRelation: "aggregation_snapshots"
            referencedColumns: ["snapshot_id"]
          },
          {
            foreignKeyName: "board_packs_supersedes_pack_id_fkey"
            columns: ["supersedes_pack_id"]
            isOneToOne: false
            referencedRelation: "board_packs"
            referencedColumns: ["pack_id"]
          },
          {
            foreignKeyName: "board_packs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "board_pack_templates"
            referencedColumns: ["template_id"]
          },
        ]
      }
      body_graphic_interactions: {
        Row: {
          created_at: string
          gender: string
          id: string
          interaction_type: string
          mode: string
          region_id: string
          session_id: string | null
          user_id: string
          view: string
        }
        Insert: {
          created_at?: string
          gender: string
          id?: string
          interaction_type: string
          mode: string
          region_id: string
          session_id?: string | null
          user_id: string
          view: string
        }
        Update: {
          created_at?: string
          gender?: string
          id?: string
          interaction_type?: string
          mode?: string
          region_id?: string
          session_id?: string | null
          user_id?: string
          view?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_graphic_interactions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "body_regions"
            referencedColumns: ["region_id"]
          },
        ]
      }
      body_graphics_preferences: {
        Row: {
          default_gender: string
          default_view: string
          preferred_measurement_unit: string
          preferred_size: string
          show_anatomical_detail: boolean
          show_region_labels: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          default_gender?: string
          default_view?: string
          preferred_measurement_unit?: string
          preferred_size?: string
          show_anatomical_detail?: boolean
          show_region_labels?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          default_gender?: string
          default_view?: string
          preferred_measurement_unit?: string
          preferred_size?: string
          show_anatomical_detail?: boolean
          show_region_labels?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_photo_sessions: {
        Row: {
          arnold_analysis: Json | null
          arnold_analyzed_at: string | null
          arnold_confidence: number | null
          arnold_error: string | null
          arnold_status: string
          asymmetry_report: Json | null
          avatar_parameters: Json | null
          back_full_path: string | null
          back_thumb_path: string | null
          calibrated_with_manual: boolean
          calibration_date: string | null
          calibration_source: string | null
          clothing_type: string | null
          composition_estimate: Json | null
          created_at: string
          extracted_measurements: Json | null
          front_full_path: string | null
          front_thumb_path: string | null
          future_me_parameters: Json | null
          id: string
          is_complete: boolean | null
          left_full_path: string | null
          left_thumb_path: string | null
          lighting_condition: string | null
          linked_entry_id: string | null
          notes: string | null
          poses_completed: string[]
          quality_issues: string[] | null
          right_full_path: string | null
          right_thumb_path: string | null
          scan_quality_score: number | null
          scan_status: string
          session_date: string
          share_expires_at: string | null
          shared_with_practitioner: boolean
          silhouette_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arnold_analysis?: Json | null
          arnold_analyzed_at?: string | null
          arnold_confidence?: number | null
          arnold_error?: string | null
          arnold_status?: string
          asymmetry_report?: Json | null
          avatar_parameters?: Json | null
          back_full_path?: string | null
          back_thumb_path?: string | null
          calibrated_with_manual?: boolean
          calibration_date?: string | null
          calibration_source?: string | null
          clothing_type?: string | null
          composition_estimate?: Json | null
          created_at?: string
          extracted_measurements?: Json | null
          front_full_path?: string | null
          front_thumb_path?: string | null
          future_me_parameters?: Json | null
          id?: string
          is_complete?: boolean | null
          left_full_path?: string | null
          left_thumb_path?: string | null
          lighting_condition?: string | null
          linked_entry_id?: string | null
          notes?: string | null
          poses_completed?: string[]
          quality_issues?: string[] | null
          right_full_path?: string | null
          right_thumb_path?: string | null
          scan_quality_score?: number | null
          scan_status?: string
          session_date?: string
          share_expires_at?: string | null
          shared_with_practitioner?: boolean
          silhouette_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arnold_analysis?: Json | null
          arnold_analyzed_at?: string | null
          arnold_confidence?: number | null
          arnold_error?: string | null
          arnold_status?: string
          asymmetry_report?: Json | null
          avatar_parameters?: Json | null
          back_full_path?: string | null
          back_thumb_path?: string | null
          calibrated_with_manual?: boolean
          calibration_date?: string | null
          calibration_source?: string | null
          clothing_type?: string | null
          composition_estimate?: Json | null
          created_at?: string
          extracted_measurements?: Json | null
          front_full_path?: string | null
          front_thumb_path?: string | null
          future_me_parameters?: Json | null
          id?: string
          is_complete?: boolean | null
          left_full_path?: string | null
          left_thumb_path?: string | null
          lighting_condition?: string | null
          linked_entry_id?: string | null
          notes?: string | null
          poses_completed?: string[]
          quality_issues?: string[] | null
          right_full_path?: string | null
          right_thumb_path?: string | null
          scan_quality_score?: number | null
          scan_status?: string
          session_date?: string
          share_expires_at?: string | null
          shared_with_practitioner?: boolean
          silhouette_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_photo_sessions_linked_entry_id_fkey"
            columns: ["linked_entry_id"]
            isOneToOne: false
            referencedRelation: "body_tracker_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      body_regions: {
        Row: {
          anatomical_group: string
          applicable_views: string[]
          display_name: string
          display_name_fr: string | null
          display_order: number
          is_bilateral: boolean
          parent_region: string | null
          region_id: string
          region_type: string
        }
        Insert: {
          anatomical_group: string
          applicable_views?: string[]
          display_name: string
          display_name_fr?: string | null
          display_order?: number
          is_bilateral?: boolean
          parent_region?: string | null
          region_id: string
          region_type: string
        }
        Update: {
          anatomical_group?: string
          applicable_views?: string[]
          display_name?: string
          display_name_fr?: string | null
          display_order?: number
          is_bilateral?: boolean
          parent_region?: string | null
          region_id?: string
          region_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_regions_parent_region_fkey"
            columns: ["parent_region"]
            isOneToOne: false
            referencedRelation: "body_regions"
            referencedColumns: ["region_id"]
          },
        ]
      }
      body_scan_measurements: {
        Row: {
          body_fat_pct_high: number | null
          body_fat_pct_low: number | null
          body_fat_pct_mid: number | null
          calibrated: boolean
          chest_circ_cm: number | null
          confidence_map: Json | null
          created_at: string
          estimation_method: string | null
          fat_mass_kg: number | null
          ffmi: number | null
          hip_circ_cm: number | null
          id: string
          inseam_cm: number | null
          lean_mass_kg: number | null
          left_bicep_circ_cm: number | null
          left_calf_circ_cm: number | null
          left_forearm_circ_cm: number | null
          left_thigh_circ_cm: number | null
          neck_circ_cm: number | null
          overall_confidence: number | null
          right_bicep_circ_cm: number | null
          right_calf_circ_cm: number | null
          right_forearm_circ_cm: number | null
          right_thigh_circ_cm: number | null
          scan_date: string
          session_id: string
          shoulder_circ_cm: number | null
          shoulder_to_waist_ratio: number | null
          torso_length_cm: number | null
          under_bust_circ_cm: number | null
          user_id: string
          waist_natural_circ_cm: number | null
          waist_navel_circ_cm: number | null
          waist_to_height_ratio: number | null
          waist_to_hip_ratio: number | null
        }
        Insert: {
          body_fat_pct_high?: number | null
          body_fat_pct_low?: number | null
          body_fat_pct_mid?: number | null
          calibrated?: boolean
          chest_circ_cm?: number | null
          confidence_map?: Json | null
          created_at?: string
          estimation_method?: string | null
          fat_mass_kg?: number | null
          ffmi?: number | null
          hip_circ_cm?: number | null
          id?: string
          inseam_cm?: number | null
          lean_mass_kg?: number | null
          left_bicep_circ_cm?: number | null
          left_calf_circ_cm?: number | null
          left_forearm_circ_cm?: number | null
          left_thigh_circ_cm?: number | null
          neck_circ_cm?: number | null
          overall_confidence?: number | null
          right_bicep_circ_cm?: number | null
          right_calf_circ_cm?: number | null
          right_forearm_circ_cm?: number | null
          right_thigh_circ_cm?: number | null
          scan_date: string
          session_id: string
          shoulder_circ_cm?: number | null
          shoulder_to_waist_ratio?: number | null
          torso_length_cm?: number | null
          under_bust_circ_cm?: number | null
          user_id: string
          waist_natural_circ_cm?: number | null
          waist_navel_circ_cm?: number | null
          waist_to_height_ratio?: number | null
          waist_to_hip_ratio?: number | null
        }
        Update: {
          body_fat_pct_high?: number | null
          body_fat_pct_low?: number | null
          body_fat_pct_mid?: number | null
          calibrated?: boolean
          chest_circ_cm?: number | null
          confidence_map?: Json | null
          created_at?: string
          estimation_method?: string | null
          fat_mass_kg?: number | null
          ffmi?: number | null
          hip_circ_cm?: number | null
          id?: string
          inseam_cm?: number | null
          lean_mass_kg?: number | null
          left_bicep_circ_cm?: number | null
          left_calf_circ_cm?: number | null
          left_forearm_circ_cm?: number | null
          left_thigh_circ_cm?: number | null
          neck_circ_cm?: number | null
          overall_confidence?: number | null
          right_bicep_circ_cm?: number | null
          right_calf_circ_cm?: number | null
          right_forearm_circ_cm?: number | null
          right_thigh_circ_cm?: number | null
          scan_date?: string
          session_id?: string
          shoulder_circ_cm?: number | null
          shoulder_to_waist_ratio?: number | null
          torso_length_cm?: number | null
          under_bust_circ_cm?: number | null
          user_id?: string
          waist_natural_circ_cm?: number | null
          waist_navel_circ_cm?: number | null
          waist_to_height_ratio?: number | null
          waist_to_hip_ratio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_scan_measurements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "body_photo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      body_tracker_activity: {
        Row: {
          active_calories: number | null
          bmr_calories: number | null
          cohort_percentile: number | null
          created_at: string
          entry_id: string
          id: string
          target_calories: number | null
          user_id: string
        }
        Insert: {
          active_calories?: number | null
          bmr_calories?: number | null
          cohort_percentile?: number | null
          created_at?: string
          entry_id: string
          id?: string
          target_calories?: number | null
          user_id: string
        }
        Update: {
          active_calories?: number | null
          bmr_calories?: number | null
          cohort_percentile?: number | null
          created_at?: string
          entry_id?: string
          id?: string
          target_calories?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_tracker_activity_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "body_tracker_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      body_tracker_chronic_risk: {
        Row: {
          arnold_summary: string | null
          assessment_date: string
          conditions: Json
          created_at: string
          data_sources_used: string[] | null
          id: string
          overall_grade: string | null
          overall_score: number | null
          user_id: string
        }
        Insert: {
          arnold_summary?: string | null
          assessment_date?: string
          conditions?: Json
          created_at?: string
          data_sources_used?: string[] | null
          id?: string
          overall_grade?: string | null
          overall_score?: number | null
          user_id: string
        }
        Update: {
          arnold_summary?: string | null
          assessment_date?: string
          conditions?: Json
          created_at?: string
          data_sources_used?: string[] | null
          id?: string
          overall_grade?: string | null
          overall_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      body_tracker_circumference: {
        Row: {
          chest: number | null
          created_at: string
          entry_id: string
          entry_unit: string
          hip: number | null
          id: string
          left_calf: number | null
          left_forearm: number | null
          left_upper_arm: number | null
          left_upper_thigh: number | null
          neck: number | null
          right_calf: number | null
          right_forearm: number | null
          right_upper_arm: number | null
          right_upper_thigh: number | null
          shoulder_width: number | null
          source: string
          scan_id: string | null
          deleted_at: string | null
          user_id: string
          waist: number | null
        }
        Insert: {
          chest?: number | null
          created_at?: string
          entry_id: string
          entry_unit?: string
          hip?: number | null
          id?: string
          left_calf?: number | null
          left_forearm?: number | null
          left_upper_arm?: number | null
          left_upper_thigh?: number | null
          neck?: number | null
          right_calf?: number | null
          right_forearm?: number | null
          right_upper_arm?: number | null
          right_upper_thigh?: number | null
          shoulder_width?: number | null
          source?: string
          scan_id?: string | null
          deleted_at?: string | null
          user_id: string
          waist?: number | null
        }
        Update: {
          chest?: number | null
          created_at?: string
          entry_id?: string
          entry_unit?: string
          hip?: number | null
          id?: string
          left_calf?: number | null
          left_forearm?: number | null
          left_upper_arm?: number | null
          left_upper_thigh?: number | null
          neck?: number | null
          right_calf?: number | null
          right_forearm?: number | null
          right_upper_arm?: number | null
          right_upper_thigh?: number | null
          shoulder_width?: number | null
          source?: string
          scan_id?: string | null
          deleted_at?: string | null
          user_id?: string
          waist?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_tracker_circumference_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "body_tracker_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      body_tracker_entries: {
        Row: {
          condition_context: string | null
          confidence: number | null
          created_at: string
          device_name: string | null
          entry_date: string
          id: string
          manual_source_id: string | null
          manual_source_tier: string | null
          notes: string | null
          scan_photo_url: string | null
          source: string
          time_of_day: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          condition_context?: string | null
          confidence?: number | null
          created_at?: string
          device_name?: string | null
          entry_date?: string
          id?: string
          manual_source_id?: string | null
          manual_source_tier?: string | null
          notes?: string | null
          scan_photo_url?: string | null
          source?: string
          time_of_day?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          condition_context?: string | null
          confidence?: number | null
          created_at?: string
          device_name?: string | null
          entry_date?: string
          id?: string
          manual_source_id?: string | null
          manual_source_tier?: string | null
          notes?: string | null
          scan_photo_url?: string | null
          source?: string
          time_of_day?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_tracker_journey_events: {
        Row: {
          created_at: string
          detail: string | null
          event_type: string
          id: string
          journey_id: string | null
          metadata: Json
          occurred_at: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          journey_id?: string | null
          metadata?: Json
          occurred_at?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          journey_id?: string | null
          metadata?: Json
          occurred_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_tracker_journey_events_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "body_tracker_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      body_tracker_journeys: {
        Row: {
          ended_at: string | null
          ending_snapshot: Json | null
          final_assessment: string | null
          id: string
          is_active: boolean
          journey_type: string
          milestones_completed: number
          started_at: string
          starting_snapshot: Json
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          ending_snapshot?: Json | null
          final_assessment?: string | null
          id?: string
          is_active?: boolean
          journey_type: string
          milestones_completed?: number
          started_at?: string
          starting_snapshot?: Json
          user_id: string
        }
        Update: {
          ended_at?: string | null
          ending_snapshot?: Json | null
          final_assessment?: string | null
          id?: string
          is_active?: boolean
          journey_type?: string
          milestones_completed?: number
          started_at?: string
          starting_snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      body_tracker_metabolic: {
        Row: {
          basal_metabolic_rate_kcal: number | null
          blood_oxygen_pct: number | null
          body_temperature_f: number | null
          bp_classification: string | null
          circadian_readiness: Json
          created_at: string
          diastolic_bp: number | null
          entry_id: string
          hrv_ms: number | null
          id: string
          max_hr_measured: number | null
          metabolic_age: number | null
          metabolic_capacity: number | null
          metabolic_momentum: number | null
          moderate_window_end: string | null
          moderate_window_start: string | null
          optimal_window_end: string | null
          optimal_window_start: string | null
          recovery_hr: number | null
          respiratory_rate: number | null
          resting_hr_bpm: number | null
          strain: number | null
          systolic_bp: number | null
          user_id: string
          vo2_max: number | null
        }
        Insert: {
          basal_metabolic_rate_kcal?: number | null
          blood_oxygen_pct?: number | null
          body_temperature_f?: number | null
          bp_classification?: string | null
          circadian_readiness?: Json
          created_at?: string
          diastolic_bp?: number | null
          entry_id: string
          hrv_ms?: number | null
          id?: string
          max_hr_measured?: number | null
          metabolic_age?: number | null
          metabolic_capacity?: number | null
          metabolic_momentum?: number | null
          moderate_window_end?: string | null
          moderate_window_start?: string | null
          optimal_window_end?: string | null
          optimal_window_start?: string | null
          recovery_hr?: number | null
          respiratory_rate?: number | null
          resting_hr_bpm?: number | null
          strain?: number | null
          systolic_bp?: number | null
          user_id: string
          vo2_max?: number | null
        }
        Update: {
          basal_metabolic_rate_kcal?: number | null
          blood_oxygen_pct?: number | null
          body_temperature_f?: number | null
          bp_classification?: string | null
          circadian_readiness?: Json
          created_at?: string
          diastolic_bp?: number | null
          entry_id?: string
          hrv_ms?: number | null
          id?: string
          max_hr_measured?: number | null
          metabolic_age?: number | null
          metabolic_capacity?: number | null
          metabolic_momentum?: number | null
          moderate_window_end?: string | null
          moderate_window_start?: string | null
          optimal_window_end?: string | null
          optimal_window_start?: string | null
          recovery_hr?: number | null
          respiratory_rate?: number | null
          resting_hr_bpm?: number | null
          strain?: number | null
          systolic_bp?: number | null
          user_id?: string
          vo2_max?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_tracker_metabolic_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "body_tracker_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      body_tracker_milestones: {
        Row: {
          achieved_at: string | null
          actual_days: number | null
          completed_date: string | null
          created_at: string
          current_value: number | null
          description: string | null
          expected_days: number | null
          grade: string | null
          helix_tokens_awarded: number | null
          id: string
          is_active: boolean
          maintained_since: string | null
          milestone_order: number
          milestone_type: string
          rate_preference: string | null
          start_date: string
          start_value: number | null
          status: string | null
          target_date: string | null
          target_unit: string | null
          target_value: number | null
          title: string
          total_milestones: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          actual_days?: number | null
          completed_date?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          expected_days?: number | null
          grade?: string | null
          helix_tokens_awarded?: number | null
          id?: string
          is_active?: boolean
          maintained_since?: string | null
          milestone_order?: number
          milestone_type: string
          rate_preference?: string | null
          start_date?: string
          start_value?: number | null
          status?: string | null
          target_date?: string | null
          target_unit?: string | null
          target_value?: number | null
          title: string
          total_milestones?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          actual_days?: number | null
          completed_date?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          expected_days?: number | null
          grade?: string | null
          helix_tokens_awarded?: number | null
          id?: string
          is_active?: boolean
          maintained_since?: string | null
          milestone_order?: number
          milestone_type?: string
          rate_preference?: string | null
          start_date?: string
          start_value?: number | null
          status?: string | null
          target_date?: string | null
          target_unit?: string | null
          target_value?: number | null
          title?: string
          total_milestones?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_tracker_photo_scans: {
        Row: {
          ai_confidence: string | null
          ai_model: string | null
          body_type: string | null
          created_at: string
          estimated_body_fat_max: number | null
          estimated_body_fat_min: number | null
          estimated_whr_max: number | null
          estimated_whr_min: number | null
          fat_distribution: string | null
          full_response: Json | null
          id: string
          muscle_development: Json | null
          scan_date: string
          user_id: string
        }
        Insert: {
          ai_confidence?: string | null
          ai_model?: string | null
          body_type?: string | null
          created_at?: string
          estimated_body_fat_max?: number | null
          estimated_body_fat_min?: number | null
          estimated_whr_max?: number | null
          estimated_whr_min?: number | null
          fat_distribution?: string | null
          full_response?: Json | null
          id?: string
          muscle_development?: Json | null
          scan_date?: string
          user_id: string
        }
        Update: {
          ai_confidence?: string | null
          ai_model?: string | null
          body_type?: string | null
          created_at?: string
          estimated_body_fat_max?: number | null
          estimated_body_fat_min?: number | null
          estimated_whr_max?: number | null
          estimated_whr_min?: number | null
          fat_distribution?: string | null
          full_response?: Json | null
          id?: string
          muscle_development?: Json | null
          scan_date?: string
          user_id?: string
        }
        Relationships: []
      }
      body_tracker_recommendations: {
        Row: {
          ai_model: string | null
          confidence_pct: number
          confidence_tier: number
          created_at: string
          dismissed_at: string | null
          generated_at: string
          id: string
          recommendation_text: string
          source_ids: string[]
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          confidence_pct: number
          confidence_tier: number
          created_at?: string
          dismissed_at?: string | null
          generated_at?: string
          id?: string
          recommendation_text: string
          source_ids?: string[]
          user_id: string
        }
        Update: {
          ai_model?: string | null
          confidence_pct?: number
          confidence_tier?: number
          created_at?: string
          dismissed_at?: string | null
          generated_at?: string
          id?: string
          recommendation_text?: string
          source_ids?: string[]
          user_id?: string
        }
        Relationships: []
      }
      body_tracker_scores: {
        Row: {
          body_score: number | null
          breakdown_jsonb: Json
          cardiovascular_grade: string | null
          composition_grade: string | null
          confidence_pct: number | null
          created_at: string
          id: string
          metabolic_grade: string | null
          muscle_grade: string | null
          score_date: string
          score_delta: number | null
          tier: string | null
          user_id: string
          weight_grade: string | null
        }
        Insert: {
          body_score?: number | null
          breakdown_jsonb?: Json
          cardiovascular_grade?: string | null
          composition_grade?: string | null
          confidence_pct?: number | null
          created_at?: string
          id?: string
          metabolic_grade?: string | null
          muscle_grade?: string | null
          score_date?: string
          score_delta?: number | null
          tier?: string | null
          user_id: string
          weight_grade?: string | null
        }
        Update: {
          body_score?: number | null
          breakdown_jsonb?: Json
          cardiovascular_grade?: string | null
          composition_grade?: string | null
          confidence_pct?: number | null
          created_at?: string
          id?: string
          metabolic_grade?: string | null
          muscle_grade?: string | null
          score_date?: string
          score_delta?: number | null
          tier?: string | null
          user_id?: string
          weight_grade?: string | null
        }
        Relationships: []
      }
      body_tracker_segmental_fat: {
        Row: {
          body_water_pct: number | null
          bone_mineral_density: number | null
          created_at: string
          entry_id: string
          fat_mass_lbs: number | null
          id: string
          left_arm_pct: number | null
          left_leg_pct: number | null
          right_arm_pct: number | null
          right_leg_pct: number | null
          subcutaneous_fat_pct: number | null
          total_body_fat_pct: number | null
          trunk_pct: number | null
          user_id: string
          visceral_fat_rating: number | null
        }
        Insert: {
          body_water_pct?: number | null
          bone_mineral_density?: number | null
          created_at?: string
          entry_id: string
          fat_mass_lbs?: number | null
          id?: string
          left_arm_pct?: number | null
          left_leg_pct?: number | null
          right_arm_pct?: number | null
          right_leg_pct?: number | null
          subcutaneous_fat_pct?: number | null
          total_body_fat_pct?: number | null
          trunk_pct?: number | null
          user_id: string
          visceral_fat_rating?: number | null
        }
        Update: {
          body_water_pct?: number | null
          bone_mineral_density?: number | null
          created_at?: string
          entry_id?: string
          fat_mass_lbs?: number | null
          id?: string
          left_arm_pct?: number | null
          left_leg_pct?: number | null
          right_arm_pct?: number | null
          right_leg_pct?: number | null
          subcutaneous_fat_pct?: number | null
          total_body_fat_pct?: number | null
          trunk_pct?: number | null
          user_id?: string
          visceral_fat_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_tracker_segmental_fat_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "body_tracker_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      body_tracker_segmental_muscle: {
        Row: {
          created_at: string
          entry_id: string
          grip_strength_left_lbs: number | null
          grip_strength_right_lbs: number | null
          id: string
          left_arm_lbs: number | null
          left_leg_lbs: number | null
          muscle_quality_score: number | null
          right_arm_lbs: number | null
          right_leg_lbs: number | null
          skeletal_muscle_mass_lbs: number | null
          smm_pct: number | null
          total_muscle_mass_lbs: number | null
          trunk_lbs: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          grip_strength_left_lbs?: number | null
          grip_strength_right_lbs?: number | null
          id?: string
          left_arm_lbs?: number | null
          left_leg_lbs?: number | null
          muscle_quality_score?: number | null
          right_arm_lbs?: number | null
          right_leg_lbs?: number | null
          skeletal_muscle_mass_lbs?: number | null
          smm_pct?: number | null
          total_muscle_mass_lbs?: number | null
          trunk_lbs?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          grip_strength_left_lbs?: number | null
          grip_strength_right_lbs?: number | null
          id?: string
          left_arm_lbs?: number | null
          left_leg_lbs?: number | null
          muscle_quality_score?: number | null
          right_arm_lbs?: number | null
          right_leg_lbs?: number | null
          skeletal_muscle_mass_lbs?: number | null
          smm_pct?: number | null
          total_muscle_mass_lbs?: number | null
          trunk_lbs?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_tracker_segmental_muscle_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "body_tracker_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      body_tracker_user_state: {
        Row: {
          active_journey: string | null
          avatar_gender_override: string | null
          journey_started_at: string | null
          journey_starting_snapshot: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active_journey?: string | null
          avatar_gender_override?: string | null
          journey_started_at?: string | null
          journey_starting_snapshot?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active_journey?: string | null
          avatar_gender_override?: string | null
          journey_started_at?: string | null
          journey_starting_snapshot?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_tracker_weight: {
        Row: {
          basal_metabolic_rate: number | null
          bmi: number | null
          body_fat_pct: number | null
          body_water_pct: number | null
          bone_mass_lbs: number | null
          chest_in: number | null
          created_at: string
          entry_id: string
          goal_weight_lbs: number | null
          hips_in: number | null
          id: string
          lean_body_mass_lbs: number | null
          left_arm_in: number | null
          left_calf_in: number | null
          left_thigh_in: number | null
          mineral_lbs: number | null
          neck_in: number | null
          protein_lbs: number | null
          right_arm_in: number | null
          right_calf_in: number | null
          right_thigh_in: number | null
          total_body_water_liters: number | null
          user_id: string
          visceral_fat_rating: number | null
          waist_in: number | null
          waist_to_hip_ratio: number | null
          weight_lbs: number | null
        }
        Insert: {
          basal_metabolic_rate?: number | null
          bmi?: number | null
          body_fat_pct?: number | null
          body_water_pct?: number | null
          bone_mass_lbs?: number | null
          chest_in?: number | null
          created_at?: string
          entry_id: string
          goal_weight_lbs?: number | null
          hips_in?: number | null
          id?: string
          lean_body_mass_lbs?: number | null
          left_arm_in?: number | null
          left_calf_in?: number | null
          left_thigh_in?: number | null
          mineral_lbs?: number | null
          neck_in?: number | null
          protein_lbs?: number | null
          right_arm_in?: number | null
          right_calf_in?: number | null
          right_thigh_in?: number | null
          total_body_water_liters?: number | null
          user_id: string
          visceral_fat_rating?: number | null
          waist_in?: number | null
          waist_to_hip_ratio?: number | null
          weight_lbs?: number | null
        }
        Update: {
          basal_metabolic_rate?: number | null
          bmi?: number | null
          body_fat_pct?: number | null
          body_water_pct?: number | null
          bone_mass_lbs?: number | null
          chest_in?: number | null
          created_at?: string
          entry_id?: string
          goal_weight_lbs?: number | null
          hips_in?: number | null
          id?: string
          lean_body_mass_lbs?: number | null
          left_arm_in?: number | null
          left_calf_in?: number | null
          left_thigh_in?: number | null
          mineral_lbs?: number | null
          neck_in?: number | null
          protein_lbs?: number | null
          right_arm_in?: number | null
          right_calf_in?: number | null
          right_thigh_in?: number | null
          total_body_water_liters?: number | null
          user_id?: string
          visceral_fat_rating?: number | null
          waist_in?: number | null
          waist_to_hip_ratio?: number | null
          weight_lbs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_tracker_weight_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "body_tracker_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      bos_compute_queue: {
        Row: {
          bypass_cooldown: boolean
          enqueued_at: string
          event_id: string | null
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          retry_count: number
          source: string
          user_id: string
        }
        Insert: {
          bypass_cooldown?: boolean
          enqueued_at?: string
          event_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          retry_count?: number
          source: string
          user_id: string
        }
        Update: {
          bypass_cooldown?: boolean
          enqueued_at?: string
          event_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          retry_count?: number
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      bos_write_telemetry: {
        Row: {
          caller_module: string
          error_message: string | null
          id: string
          is_canonical: boolean
          occurred_at: string
          success: boolean
          user_id: string | null
          write_target: string
        }
        Insert: {
          caller_module: string
          error_message?: string | null
          id?: string
          is_canonical: boolean
          occurred_at?: string
          success: boolean
          user_id?: string | null
          write_target: string
        }
        Update: {
          caller_module?: string
          error_message?: string | null
          id?: string
          is_canonical?: boolean
          occurred_at?: string
          success?: boolean
          user_id?: string | null
          write_target?: string
        }
        Relationships: []
      }
      botanical_formula_items: {
        Row: {
          dosage: string | null
          formula_id: string
          herb_id: string
          id: string
          ratio: string | null
          sequence_order: number
        }
        Insert: {
          dosage?: string | null
          formula_id: string
          herb_id: string
          id?: string
          ratio?: string | null
          sequence_order?: number
        }
        Update: {
          dosage?: string | null
          formula_id?: string
          herb_id?: string
          id?: string
          ratio?: string | null
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "botanical_formula_items_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "botanical_formulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "botanical_formula_items_herb_id_fkey"
            columns: ["herb_id"]
            isOneToOne: false
            referencedRelation: "herbs"
            referencedColumns: ["id"]
          },
        ]
      }
      botanical_formulas: {
        Row: {
          created_at: string
          formula_name: string
          id: string
          instructions: string | null
          notes: string | null
          patient_id: string | null
          practitioner_id: string
          preparation: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          formula_name: string
          id?: string
          instructions?: string | null
          notes?: string | null
          patient_id?: string | null
          practitioner_id: string
          preparation: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          formula_name?: string
          id?: string
          instructions?: string | null
          notes?: string | null
          patient_id?: string | null
          practitioner_id?: string
          preparation?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "botanical_formulas_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "botanical_formulas_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_agent_config: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      brand_agent_log: {
        Row: {
          action: string
          brand_id: string | null
          brand_name: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          products_added: number | null
          products_updated: number | null
          run_id: string
          tier: number | null
        }
        Insert: {
          action: string
          brand_id?: string | null
          brand_name?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          products_added?: number | null
          products_updated?: number | null
          run_id?: string
          tier?: number | null
        }
        Update: {
          action?: string
          brand_id?: string | null
          brand_name?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          products_added?: number | null
          products_updated?: number | null
          run_id?: string
          tier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_agent_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "supplement_brand_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_enrichment_state: {
        Row: {
          brand_id: string
          brand_name: string
          created_at: string | null
          enriched_product_count: number | null
          enrichment_notes: string | null
          enrichment_score: number | null
          enrichment_status: string
          id: string
          last_attempt_at: string | null
          last_success_at: string | null
          next_scheduled_at: string | null
          retry_count: number | null
          seed_product_count: number | null
          tier: number
          total_sku_target: number | null
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          brand_name: string
          created_at?: string | null
          enriched_product_count?: number | null
          enrichment_notes?: string | null
          enrichment_score?: number | null
          enrichment_status?: string
          id?: string
          last_attempt_at?: string | null
          last_success_at?: string | null
          next_scheduled_at?: string | null
          retry_count?: number | null
          seed_product_count?: number | null
          tier?: number
          total_sku_target?: number | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          brand_name?: string
          created_at?: string | null
          enriched_product_count?: number | null
          enrichment_notes?: string | null
          enrichment_score?: number | null
          enrichment_status?: string
          id?: string
          last_attempt_at?: string | null
          last_success_at?: string | null
          next_scheduled_at?: string | null
          retry_count?: number | null
          seed_product_count?: number | null
          tier?: number
          total_sku_target?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_enrichment_state_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "supplement_brand_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_components: {
        Row: {
          bundle_name: string
          cogs: number
          id: string
          msrp: number
          name: string
          score: number
          sku: string
          tier: string
        }
        Insert: {
          bundle_name: string
          cogs: number
          id?: string
          msrp: number
          name: string
          score: number
          sku: string
          tier: string
        }
        Update: {
          bundle_name?: string
          cogs?: number
          id?: string
          msrp?: number
          name?: string
          score?: number
          sku?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_components_bundle_name_fkey"
            columns: ["bundle_name"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["bundle_name"]
          },
          {
            foreignKeyName: "bundle_components_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      bundles: {
        Row: {
          annual_bundle_revenue: number
          annual_gross_profit: number
          avg_composite_score: number
          bundle_dtc_margin: number
          bundle_name: string
          bundle_price: number
          bundle_ws_margin: number
          bundle_ws_price: number
          created_at: string | null
          customer_savings: number
          description: string | null
          discount_rate: string
          id: string
          individual_total: number
          monthly_bundle_units: number
          monthly_gross_profit: number
          monthly_revenue: number
          quality_flag: string
          revenue_uplift_pct: number
          sku_count: number
          star_count: number
          strategy: string
          target_audience: string | null
          total_cogs: number
        }
        Insert: {
          annual_bundle_revenue: number
          annual_gross_profit: number
          avg_composite_score: number
          bundle_dtc_margin: number
          bundle_name: string
          bundle_price: number
          bundle_ws_margin: number
          bundle_ws_price: number
          created_at?: string | null
          customer_savings: number
          description?: string | null
          discount_rate: string
          id?: string
          individual_total: number
          monthly_bundle_units: number
          monthly_gross_profit: number
          monthly_revenue: number
          quality_flag: string
          revenue_uplift_pct: number
          sku_count: number
          star_count?: number
          strategy: string
          target_audience?: string | null
          total_cogs: number
        }
        Update: {
          annual_bundle_revenue?: number
          annual_gross_profit?: number
          avg_composite_score?: number
          bundle_dtc_margin?: number
          bundle_name?: string
          bundle_price?: number
          bundle_ws_margin?: number
          bundle_ws_price?: number
          created_at?: string | null
          customer_savings?: number
          description?: string | null
          discount_rate?: string
          id?: string
          individual_total?: number
          monthly_bundle_units?: number
          monthly_gross_profit?: number
          monthly_revenue?: number
          quality_flag?: string
          revenue_uplift_pct?: number
          sku_count?: number
          star_count?: number
          strategy?: string
          target_audience?: string | null
          total_cogs?: number
        }
        Relationships: []
      }
      caq_assessment_versions: {
        Row: {
          allergies: Json | null
          changes_from_previous: Json | null
          completed_at: string | null
          created_at: string | null
          demographics: Json | null
          emotional_symptoms: Json | null
          health_concerns: Json | null
          id: string
          is_retake: boolean | null
          lifestyle: Json | null
          medications: Json | null
          neuro_symptoms: Json | null
          physical_symptoms: Json | null
          previous_version_id: string | null
          started_at: string | null
          status: string
          supplements: Json | null
          updated_at: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          allergies?: Json | null
          changes_from_previous?: Json | null
          completed_at?: string | null
          created_at?: string | null
          demographics?: Json | null
          emotional_symptoms?: Json | null
          health_concerns?: Json | null
          id?: string
          is_retake?: boolean | null
          lifestyle?: Json | null
          medications?: Json | null
          neuro_symptoms?: Json | null
          physical_symptoms?: Json | null
          previous_version_id?: string | null
          started_at?: string | null
          status?: string
          supplements?: Json | null
          updated_at?: string | null
          user_id: string
          version_number?: number
        }
        Update: {
          allergies?: Json | null
          changes_from_previous?: Json | null
          completed_at?: string | null
          created_at?: string | null
          demographics?: Json | null
          emotional_symptoms?: Json | null
          health_concerns?: Json | null
          id?: string
          is_retake?: boolean | null
          lifestyle?: Json | null
          medications?: Json | null
          neuro_symptoms?: Json | null
          physical_symptoms?: Json | null
          previous_version_id?: string | null
          started_at?: string | null
          status?: string
          supplements?: Json | null
          updated_at?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "caq_assessment_versions_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "caq_assessment_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow_monthly: {
        Row: {
          capex_note: string | null
          cash_position: number
          created_at: string | null
          credit_interest: number
          credit_line_balance: number
          forecast_month: number
          health_flag: string
          id: string
          inflow_distributor: number
          inflow_dtc: number
          inflow_sub_prepay: number
          inflow_total: number
          inflow_wholesale: number
          label: string
          months_runway: number
          net_cash_flow: number
          outflow_capex: number
          outflow_cogs: number
          outflow_fixed_opex: number
          outflow_inventory: number
          outflow_tax: number
          outflow_total: number
          outflow_variable_opex: number
          receivables_balance: number
        }
        Insert: {
          capex_note?: string | null
          cash_position: number
          created_at?: string | null
          credit_interest?: number
          credit_line_balance?: number
          forecast_month: number
          health_flag: string
          id?: string
          inflow_distributor: number
          inflow_dtc: number
          inflow_sub_prepay: number
          inflow_total: number
          inflow_wholesale: number
          label: string
          months_runway: number
          net_cash_flow: number
          outflow_capex?: number
          outflow_cogs: number
          outflow_fixed_opex: number
          outflow_inventory: number
          outflow_tax?: number
          outflow_total: number
          outflow_variable_opex: number
          receivables_balance: number
        }
        Update: {
          capex_note?: string | null
          cash_position?: number
          created_at?: string | null
          credit_interest?: number
          credit_line_balance?: number
          forecast_month?: number
          health_flag?: string
          id?: string
          inflow_distributor?: number
          inflow_dtc?: number
          inflow_sub_prepay?: number
          inflow_total?: number
          inflow_wholesale?: number
          label?: string
          months_runway?: number
          net_cash_flow?: number
          outflow_capex?: number
          outflow_cogs?: number
          outflow_fixed_opex?: number
          outflow_inventory?: number
          outflow_tax?: number
          outflow_total?: number
          outflow_variable_opex?: number
          receivables_balance?: number
        }
        Relationships: []
      }
      cashflow_summary: {
        Row: {
          cash_conversion_cycle_days: number
          created_at: string | null
          dso_days: number
          ending_cash: number
          free_cash_flow: number
          id: string
          lowest_cash_amount: number
          lowest_cash_month: number
          monthly_fixed_opex: number
          opening_cash: number
          report_date: string
          stress_test_months: number
          total_capex: number
          total_tax_paid: number
        }
        Insert: {
          cash_conversion_cycle_days: number
          created_at?: string | null
          dso_days: number
          ending_cash: number
          free_cash_flow: number
          id?: string
          lowest_cash_amount: number
          lowest_cash_month: number
          monthly_fixed_opex: number
          opening_cash: number
          report_date?: string
          stress_test_months: number
          total_capex: number
          total_tax_paid: number
        }
        Update: {
          cash_conversion_cycle_days?: number
          created_at?: string | null
          dso_days?: number
          ending_cash?: number
          free_cash_flow?: number
          id?: string
          lowest_cash_amount?: number
          lowest_cash_month?: number
          monthly_fixed_opex?: number
          opening_cash?: number
          report_date?: string
          stress_test_months?: number
          total_capex?: number
          total_tax_paid?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          card_variant: string
          created_at: string
          display_order: number
          hero_image_url: string | null
          name: string
          slug: string
          tagline: string
          video_poster_url: string | null
          video_url: string | null
        }
        Insert: {
          card_variant?: string
          created_at?: string
          display_order?: number
          hero_image_url?: string | null
          name: string
          slug: string
          tagline: string
          video_poster_url?: string | null
          video_url?: string | null
        }
        Update: {
          card_variant?: string
          created_at?: string
          display_order?: number
          hero_image_url?: string | null
          name?: string
          slug?: string
          tagline?: string
          video_poster_url?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      channel_mix_scenarios: {
        Row: {
          annual_net_profit: number
          annual_revenue: number
          blended_net_margin_pct: number
          created_at: string | null
          description: string | null
          dist_mix: number
          dist_revenue_share: number | null
          dtc_mix: number
          dtc_revenue_share: number | null
          id: string
          monthly_cogs: number
          monthly_gross_profit: number
          monthly_net_profit: number
          monthly_revenue: number
          monthly_units: number
          monthly_variable_costs: number
          scenario: string
          ws_mix: number
          ws_revenue_share: number | null
        }
        Insert: {
          annual_net_profit: number
          annual_revenue: number
          blended_net_margin_pct: number
          created_at?: string | null
          description?: string | null
          dist_mix: number
          dist_revenue_share?: number | null
          dtc_mix: number
          dtc_revenue_share?: number | null
          id?: string
          monthly_cogs: number
          monthly_gross_profit: number
          monthly_net_profit: number
          monthly_revenue: number
          monthly_units: number
          monthly_variable_costs: number
          scenario: string
          ws_mix: number
          ws_revenue_share?: number | null
        }
        Update: {
          annual_net_profit?: number
          annual_revenue?: number
          blended_net_margin_pct?: number
          created_at?: string | null
          description?: string | null
          dist_mix?: number
          dist_revenue_share?: number | null
          dtc_mix?: number
          dtc_revenue_share?: number | null
          id?: string
          monthly_cogs?: number
          monthly_gross_profit?: number
          monthly_net_profit?: number
          monthly_revenue?: number
          monthly_units?: number
          monthly_variable_costs?: number
          scenario?: string
          ws_mix?: number
          ws_revenue_share?: number | null
        }
        Relationships: []
      }
      channel_verification_attempts: {
        Row: {
          attempt_id: string
          attempt_status: string
          attempt_token: string
          channel_id: string
          created_at: string
          evidence_json: Json
          expires_at: string
          failure_reason: string | null
          method: Database["public"]["Enums"]["verification_method"]
          resolved_at: string | null
        }
        Insert: {
          attempt_id?: string
          attempt_status?: string
          attempt_token: string
          channel_id: string
          created_at?: string
          evidence_json?: Json
          expires_at: string
          failure_reason?: string | null
          method: Database["public"]["Enums"]["verification_method"]
          resolved_at?: string | null
        }
        Update: {
          attempt_id?: string
          attempt_status?: string
          attempt_token?: string
          channel_id?: string
          created_at?: string
          evidence_json?: Json
          expires_at?: string
          failure_reason?: string | null
          method?: Database["public"]["Enums"]["verification_method"]
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_verification_attempts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "practitioner_verified_channels"
            referencedColumns: ["channel_id"]
          },
        ]
      }
      channel_volume_checks: {
        Row: {
          apparent_retail_volume_cents: number
          channel_id: string
          check_id: string
          check_period_end: string
          check_period_start: string
          created_at: string
          flag_triggered: boolean
          ratio_observed: number | null
          resolution_notes: string | null
          resolved: boolean
          wholesale_inventory_volume_cents: number
        }
        Insert: {
          apparent_retail_volume_cents: number
          channel_id: string
          check_id?: string
          check_period_end: string
          check_period_start: string
          created_at?: string
          flag_triggered?: boolean
          ratio_observed?: number | null
          resolution_notes?: string | null
          resolved?: boolean
          wholesale_inventory_volume_cents: number
        }
        Update: {
          apparent_retail_volume_cents?: number
          channel_id?: string
          check_id?: string
          check_period_end?: string
          check_period_start?: string
          created_at?: string
          flag_triggered?: boolean
          ratio_observed?: number | null
          resolution_notes?: string | null
          resolved?: boolean
          wholesale_inventory_volume_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_volume_checks_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "practitioner_verified_channels"
            referencedColumns: ["channel_id"]
          },
        ]
      }
      clinical_assessments: {
        Row: {
          allergies: string | null
          biological_sex: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          current_conditions: string[] | null
          current_medications: string | null
          current_supplements: string[] | null
          date_of_birth: string | null
          diet_type: string | null
          exercise_frequency: string | null
          height_cm: number | null
          id: string
          previous_herbal_experience: boolean | null
          primary_goals: string[] | null
          sleep_hours_avg: number | null
          stress_level: string | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          allergies?: string | null
          biological_sex?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_conditions?: string[] | null
          current_medications?: string | null
          current_supplements?: string[] | null
          date_of_birth?: string | null
          diet_type?: string | null
          exercise_frequency?: string | null
          height_cm?: number | null
          id?: string
          previous_herbal_experience?: boolean | null
          primary_goals?: string[] | null
          sleep_hours_avg?: number | null
          stress_level?: string | null
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          allergies?: string | null
          biological_sex?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_conditions?: string[] | null
          current_medications?: string | null
          current_supplements?: string[] | null
          date_of_birth?: string | null
          diet_type?: string | null
          exercise_frequency?: string | null
          height_cm?: number | null
          id?: string
          previous_herbal_experience?: boolean | null
          primary_goals?: string[] | null
          sleep_hours_avg?: number | null
          stress_level?: string | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cogs_delta_reports: {
        Row: {
          delta: number
          flag: string
          id: string
          name: string
          new_cogs: number
          new_dtc_margin: number
          old_cogs: number
          pct_change: string
          report_date: string | null
          sku: string
        }
        Insert: {
          delta: number
          flag?: string
          id?: string
          name: string
          new_cogs: number
          new_dtc_margin: number
          old_cogs: number
          pct_change: string
          report_date?: string | null
          sku: string
        }
        Update: {
          delta?: number
          flag?: string
          id?: string
          name?: string
          new_cogs?: number
          new_dtc_margin?: number
          old_cogs?: number
          pct_change?: string
          report_date?: string | null
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "cogs_delta_reports_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      cohort_retention: {
        Row: {
          arpc: number
          avg_cohort_ltv: number
          blended_cac: number
          cac_payback_month: number
          channel_analysis: Json
          cohort_data: Json
          created_at: string | null
          id: string
          ltv_to_cac_ratio: number
          m1_retention: string
          m12_retention: string
          m6_retention: string
          retention_scenarios: Json
          snapshot_date: string
        }
        Insert: {
          arpc: number
          avg_cohort_ltv: number
          blended_cac: number
          cac_payback_month: number
          channel_analysis?: Json
          cohort_data?: Json
          created_at?: string | null
          id?: string
          ltv_to_cac_ratio: number
          m1_retention: string
          m12_retention: string
          m6_retention: string
          retention_scenarios?: Json
          snapshot_date?: string
        }
        Update: {
          arpc?: number
          avg_cohort_ltv?: number
          blended_cac?: number
          cac_payback_month?: number
          channel_analysis?: Json
          cohort_data?: Json
          created_at?: string | null
          id?: string
          ltv_to_cac_ratio?: number
          m1_retention?: string
          m12_retention?: string
          m6_retention?: string
          retention_scenarios?: Json
          snapshot_date?: string
        }
        Relationships: []
      }
      commission_accruals: {
        Row: {
          accrual_amount_cents: number
          accrual_date: string
          accrual_id: string
          accrual_reason: string
          commission_rate_pct: number | null
          created_at: string
          practitioner_id: string
          reconciled_at: string | null
          reconciliation_run_id: string | null
          source_order_id: string | null
          source_order_item_id: string | null
          status: string
        }
        Insert: {
          accrual_amount_cents: number
          accrual_date?: string
          accrual_id?: string
          accrual_reason: string
          commission_rate_pct?: number | null
          created_at?: string
          practitioner_id: string
          reconciled_at?: string | null
          reconciliation_run_id?: string | null
          source_order_id?: string | null
          source_order_item_id?: string | null
          status?: string
        }
        Update: {
          accrual_amount_cents?: number
          accrual_date?: string
          accrual_id?: string
          accrual_reason?: string
          commission_rate_pct?: number | null
          created_at?: string
          practitioner_id?: string
          reconciled_at?: string | null
          reconciliation_run_id?: string | null
          source_order_id?: string | null
          source_order_item_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_accruals_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_accruals_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_accruals_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_accruals_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_accruals_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_accruals_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_accruals_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_accruals_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_accruals_source_order_item_id_fkey"
            columns: ["source_order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payouts: {
        Row: {
          annual_gross_profit: number
          annual_payouts: number
          annual_revenue: number
          avg_payout_per_partner: number
          commission_first_order: string
          commission_recurring: string
          cookie_days: number
          created_at: string | null
          effective_comm_rate: string
          gross_margin_after_comm: string
          id: string
          monthly_gross_profit: number
          monthly_payouts: number
          monthly_revenue: number
          partner_satisfaction: string
          partners: number
          tier: string
          type: string
        }
        Insert: {
          annual_gross_profit: number
          annual_payouts: number
          annual_revenue: number
          avg_payout_per_partner: number
          commission_first_order: string
          commission_recurring: string
          cookie_days: number
          created_at?: string | null
          effective_comm_rate: string
          gross_margin_after_comm: string
          id?: string
          monthly_gross_profit: number
          monthly_payouts: number
          monthly_revenue: number
          partner_satisfaction: string
          partners: number
          tier: string
          type: string
        }
        Update: {
          annual_gross_profit?: number
          annual_payouts?: number
          annual_revenue?: number
          avg_payout_per_partner?: number
          commission_first_order?: string
          commission_recurring?: string
          cookie_days?: number
          created_at?: string | null
          effective_comm_rate?: string
          gross_margin_after_comm?: string
          id?: string
          monthly_gross_profit?: number
          monthly_payouts?: number
          monthly_revenue?: number
          partner_satisfaction?: string
          partners?: number
          tier?: string
          type?: string
        }
        Relationships: []
      }
      commission_reconciliation_lines: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          line_id: string
          line_type: string
          related_violation_id: string | null
          run_id: string
          source_accrual_id: string | null
          source_order_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          line_id?: string
          line_type: string
          related_violation_id?: string | null
          run_id: string
          source_accrual_id?: string | null
          source_order_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          line_id?: string
          line_type?: string
          related_violation_id?: string | null
          run_id?: string
          source_accrual_id?: string | null
          source_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_reconciliation_lines_related_violation_id_fkey"
            columns: ["related_violation_id"]
            isOneToOne: false
            referencedRelation: "map_violations"
            referencedColumns: ["violation_id"]
          },
          {
            foreignKeyName: "commission_reconciliation_lines_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "commission_reconciliation_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "commission_reconciliation_lines_source_accrual_id_fkey"
            columns: ["source_accrual_id"]
            isOneToOne: false
            referencedRelation: "commission_accruals"
            referencedColumns: ["accrual_id"]
          },
          {
            foreignKeyName: "commission_reconciliation_lines_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_reconciliation_runs: {
        Row: {
          gross_accrued_cents: number
          margin_floor_breach: boolean
          net_payable_cents: number
          notes: string | null
          period_end: string
          period_start: string
          practitioner_id: string
          run_at: string
          run_id: string
          status: string
          total_clawbacks_cents: number
          total_holds_cents: number
        }
        Insert: {
          gross_accrued_cents?: number
          margin_floor_breach?: boolean
          net_payable_cents?: number
          notes?: string | null
          period_end: string
          period_start: string
          practitioner_id: string
          run_at?: string
          run_id?: string
          status?: string
          total_clawbacks_cents?: number
          total_holds_cents?: number
        }
        Update: {
          gross_accrued_cents?: number
          margin_floor_breach?: boolean
          net_payable_cents?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          practitioner_id?: string
          run_at?: string
          run_id?: string
          status?: string
          total_clawbacks_cents?: number
          total_holds_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_reconciliation_runs_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_reconciliation_runs_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_reconciliation_runs_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_reconciliation_runs_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_reconciliation_runs_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_reconciliation_runs_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "commission_reconciliation_runs_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      competitor_pricing: {
        Row: {
          billing_cycle: string | null
          category: string
          competitor_name: string
          competitor_url: string | null
          created_at: string
          id: string
          observed_at: string
          observed_by_user_id: string | null
          price_cents: number
          product_description: string | null
          product_name: string
          source_notes: string | null
          updated_at: string
          viacura_comparable_domain_id: string | null
        }
        Insert: {
          billing_cycle?: string | null
          category: string
          competitor_name: string
          competitor_url?: string | null
          created_at?: string
          id?: string
          observed_at: string
          observed_by_user_id?: string | null
          price_cents: number
          product_description?: string | null
          product_name: string
          source_notes?: string | null
          updated_at?: string
          viacura_comparable_domain_id?: string | null
        }
        Update: {
          billing_cycle?: string | null
          category?: string
          competitor_name?: string
          competitor_url?: string | null
          created_at?: string
          id?: string
          observed_at?: string
          observed_by_user_id?: string | null
          price_cents?: number
          product_description?: string | null
          product_name?: string
          source_notes?: string | null
          updated_at?: string
          viacura_comparable_domain_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_pricing_viacura_comparable_domain_id_fkey"
            columns: ["viacura_comparable_domain_id"]
            isOneToOne: false
            referencedRelation: "pricing_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_audit_log: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          event_type: string
          id: number
          payload: Json
          prev_hash: string | null
          row_hash: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          event_type: string
          id?: number
          payload?: Json
          prev_hash?: string | null
          row_hash: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          event_type?: string
          id?: number
          payload?: Json
          prev_hash?: string | null
          row_hash?: string
        }
        Relationships: []
      }
      compliance_evidence: {
        Row: {
          collected_at: string
          collected_by: string
          created_at: string
          id: string
          legal_hold: boolean
          manifest_sha256: string
          retention_until: string
          signal_id: string | null
          wayback_url: string | null
        }
        Insert: {
          collected_at?: string
          collected_by?: string
          created_at?: string
          id?: string
          legal_hold?: boolean
          manifest_sha256: string
          retention_until: string
          signal_id?: string | null
          wayback_url?: string | null
        }
        Update: {
          collected_at?: string
          collected_by?: string
          created_at?: string
          id?: string
          legal_hold?: boolean
          manifest_sha256?: string
          retention_until?: string
          signal_id?: string | null
          wayback_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_evidence_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "social_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_evidence_artifacts: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          kind: string
          sha256: string
          size_bytes: number
          storage_key: string
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          kind: string
          sha256: string
          size_bytes?: number
          storage_key: string
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          kind?: string
          sha256?: string
          size_bytes?: number
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_evidence_artifacts_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "compliance_evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_findings: {
        Row: {
          assigned_to: string | null
          citation: string
          created_at: string
          escalated_to: string[] | null
          evidence_bundle_id: string | null
          excerpt: string
          finding_id: string
          id: string
          location: Json
          message: string
          remediation: Json
          resolution_note: string | null
          resolved_at: string | null
          rule_id: string
          severity: string
          source: string
          status: string
          surface: string
        }
        Insert: {
          assigned_to?: string | null
          citation: string
          created_at?: string
          escalated_to?: string[] | null
          evidence_bundle_id?: string | null
          excerpt: string
          finding_id: string
          id?: string
          location?: Json
          message: string
          remediation?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          rule_id: string
          severity: string
          source: string
          status?: string
          surface: string
        }
        Update: {
          assigned_to?: string | null
          citation?: string
          created_at?: string
          escalated_to?: string[] | null
          evidence_bundle_id?: string | null
          excerpt?: string
          finding_id?: string
          id?: string
          location?: Json
          message?: string
          remediation?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          rule_id?: string
          severity?: string
          source?: string
          status?: string
          surface?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_findings_evidence_bundle_id_fkey"
            columns: ["evidence_bundle_id"]
            isOneToOne: false
            referencedRelation: "compliance_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_findings_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_frameworks: {
        Row: {
          active: boolean
          attestation_language: string
          attestor_role: string
          display_name: string
          first_introduced_at: string
          id: string
          notes: string | null
          registry_version: string
        }
        Insert: {
          active?: boolean
          attestation_language: string
          attestor_role: string
          display_name: string
          first_introduced_at?: string
          id: string
          notes?: string | null
          registry_version: string
        }
        Update: {
          active?: boolean
          attestation_language?: string
          attestor_role?: string
          display_name?: string
          first_introduced_at?: string
          id?: string
          notes?: string | null
          registry_version?: string
        }
        Relationships: []
      }
      compliance_gate_a_signoffs: {
        Row: {
          framework_id: string
          gate_key: string
          id: string
          metadata: Json
          note: string | null
          signed_at: string
          signed_by: string
          signoff_status: string
          subject_id: string
          subject_type: string
        }
        Insert: {
          framework_id: string
          gate_key?: string
          id?: string
          metadata?: Json
          note?: string | null
          signed_at?: string
          signed_by: string
          signoff_status: string
          subject_id: string
          subject_type: string
        }
        Update: {
          framework_id?: string
          gate_key?: string
          id?: string
          metadata?: Json
          note?: string | null
          signed_at?: string
          signed_by?: string
          signoff_status?: string
          subject_id?: string
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_gate_a_signoffs_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "compliance_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_incidents: {
        Row: {
          closed_at: string | null
          created_at: string
          dev_side_escape: boolean
          id: string
          incident_id: string
          narrative: string | null
          opened_at: string
          opened_by: string
          owner: string | null
          related_finding_ids: string[]
          root_cause: string | null
          severity: string
          title: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          dev_side_escape?: boolean
          id?: string
          incident_id: string
          narrative?: string | null
          opened_at?: string
          opened_by: string
          owner?: string | null
          related_finding_ids?: string[]
          root_cause?: string | null
          severity: string
          title: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          dev_side_escape?: boolean
          id?: string
          incident_id?: string
          narrative?: string | null
          opened_at?: string
          opened_by?: string
          owner?: string | null
          related_finding_ids?: string[]
          root_cause?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      compliance_rules: {
        Row: {
          citation: string
          created_at: string
          description: string
          enabled: boolean
          id: string
          last_reviewed: string
          pillar: string
          reviewed_by: string | null
          severity: string
          surfaces: string[]
          threshold_config: Json | null
          updated_at: string
        }
        Insert: {
          citation: string
          created_at?: string
          description: string
          enabled?: boolean
          id: string
          last_reviewed: string
          pillar: string
          reviewed_by?: string | null
          severity: string
          surfaces: string[]
          threshold_config?: Json | null
          updated_at?: string
        }
        Update: {
          citation?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          last_reviewed?: string
          pillar?: string
          reviewed_by?: string | null
          severity?: string
          surfaces?: string[]
          threshold_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      compliance_waivers: {
        Row: {
          approved_by: string
          created_at: string
          effective_from: string
          expires_at: string | null
          id: string
          reason: string
          revoked: boolean
          revoked_at: string | null
          revoked_by: string | null
          rule_id: string
          scope: Json
        }
        Insert: {
          approved_by: string
          created_at?: string
          effective_from?: string
          expires_at?: string | null
          id?: string
          reason: string
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          rule_id: string
          scope?: Json
        }
        Update: {
          approved_by?: string
          created_at?: string
          effective_from?: string
          expires_at?: string | null
          id?: string
          reason?: string
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          rule_id?: string
          scope?: Json
        }
        Relationships: [
          {
            foreignKeyName: "compliance_waivers_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_ledger: {
        Row: {
          consent_type: string
          created_at: string
          evidence: Json | null
          granted: boolean
          granted_at: string
          id: string
          ip_address: unknown
          revoked_at: string | null
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          evidence?: Json | null
          granted: boolean
          granted_at?: string
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          evidence?: Json | null
          granted?: boolean
          granted_at?: string
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      consumer_counterfeit_reports: {
        Row: {
          concern_description: string
          consumer_notified_at: string | null
          determination_summary: string | null
          evaluation_ids: string[] | null
          id: string
          image_storage_keys: string[]
          order_number: string | null
          phi_redaction_applied: boolean
          purchase_date: string | null
          purchase_location: string | null
          report_id: string
          status: string
          submitted_at: string
          submitted_by_email: string | null
          submitted_by_user_id: string | null
        }
        Insert: {
          concern_description: string
          consumer_notified_at?: string | null
          determination_summary?: string | null
          evaluation_ids?: string[] | null
          id?: string
          image_storage_keys: string[]
          order_number?: string | null
          phi_redaction_applied?: boolean
          purchase_date?: string | null
          purchase_location?: string | null
          report_id: string
          status?: string
          submitted_at?: string
          submitted_by_email?: string | null
          submitted_by_user_id?: string | null
        }
        Update: {
          concern_description?: string
          consumer_notified_at?: string | null
          determination_summary?: string | null
          evaluation_ids?: string[] | null
          id?: string
          image_storage_keys?: string[]
          order_number?: string | null
          phi_redaction_applied?: boolean
          purchase_date?: string | null
          purchase_location?: string | null
          report_id?: string
          status?: string
          submitted_at?: string
          submitted_by_email?: string | null
          submitted_by_user_id?: string | null
        }
        Relationships: []
      }
      counterfeit_determinations: {
        Row: {
          cited_reference_ids: string[]
          confidence: number
          created_at: string
          evaluation_id: string
          human_review_required: boolean
          id: string
          matched_sku: string | null
          mismatch_flags: string[]
          reasoning_trace: Json
          verdict: string
        }
        Insert: {
          cited_reference_ids: string[]
          confidence: number
          created_at?: string
          evaluation_id: string
          human_review_required?: boolean
          id?: string
          matched_sku?: string | null
          mismatch_flags?: string[]
          reasoning_trace: Json
          verdict: string
        }
        Update: {
          cited_reference_ids?: string[]
          confidence?: number
          created_at?: string
          evaluation_id?: string
          human_review_required?: boolean
          id?: string
          matched_sku?: string | null
          mismatch_flags?: string[]
          reasoning_trace?: Json
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterfeit_determinations_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: true
            referencedRelation: "counterfeit_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      counterfeit_dispositions: {
        Row: {
          confirmation_note: string | null
          decided_at: string
          decided_by: string
          determination_id: string
          disagreed_with_model: boolean
          disposition: string
          id: string
          second_approver: string | null
          second_approver_at: string | null
        }
        Insert: {
          confirmation_note?: string | null
          decided_at?: string
          decided_by: string
          determination_id: string
          disagreed_with_model?: boolean
          disposition: string
          id?: string
          second_approver?: string | null
          second_approver_at?: string | null
        }
        Update: {
          confirmation_note?: string | null
          decided_at?: string
          decided_by?: string
          determination_id?: string
          disagreed_with_model?: boolean
          disposition?: string
          id?: string
          second_approver?: string | null
          second_approver_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counterfeit_dispositions_determination_id_fkey"
            columns: ["determination_id"]
            isOneToOne: true
            referencedRelation: "counterfeit_determinations"
            referencedColumns: ["id"]
          },
        ]
      }
      counterfeit_evaluations: {
        Row: {
          candidate_skus: string[] | null
          content_safety_reason: string | null
          content_safety_skip: boolean
          duration_ms: number | null
          evaluated_at: string
          evaluation_id: string
          id: string
          image_perceptual_hash: string
          image_sha256: string
          image_storage_key: string
          model_version: string
          ocr_output: Json | null
          phi_redacted: boolean
          raw_vision_output: Json | null
          reference_corpus_version: string
          source: string
          source_reference: Json
        }
        Insert: {
          candidate_skus?: string[] | null
          content_safety_reason?: string | null
          content_safety_skip?: boolean
          duration_ms?: number | null
          evaluated_at?: string
          evaluation_id: string
          id?: string
          image_perceptual_hash: string
          image_sha256: string
          image_storage_key: string
          model_version: string
          ocr_output?: Json | null
          phi_redacted?: boolean
          raw_vision_output?: Json | null
          reference_corpus_version: string
          source: string
          source_reference: Json
        }
        Update: {
          candidate_skus?: string[] | null
          content_safety_reason?: string | null
          content_safety_skip?: boolean
          duration_ms?: number | null
          evaluated_at?: string
          evaluation_id?: string
          id?: string
          image_perceptual_hash?: string
          image_sha256?: string
          image_storage_key?: string
          model_version?: string
          ocr_output?: Json | null
          phi_redacted?: boolean
          raw_vision_output?: Json | null
          reference_corpus_version?: string
          source?: string
          source_reference?: Json
        }
        Relationships: []
      }
      counterfeit_exemplars: {
        Row: {
          confirmed_at: string
          confirmed_by: string
          created_at: string
          curation_note: string | null
          id: string
          perceptual_hash: string
          sha256: string
          source_platform: string | null
          storage_key: string
          takedown_request_id: string | null
          tier: number
        }
        Insert: {
          confirmed_at: string
          confirmed_by: string
          created_at?: string
          curation_note?: string | null
          id?: string
          perceptual_hash: string
          sha256: string
          source_platform?: string | null
          storage_key: string
          takedown_request_id?: string | null
          tier: number
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string
          created_at?: string
          curation_note?: string | null
          id?: string
          perceptual_hash?: string
          sha256?: string
          source_platform?: string | null
          storage_key?: string
          takedown_request_id?: string | null
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "counterfeit_exemplars_takedown_request_id_fkey"
            columns: ["takedown_request_id"]
            isOneToOne: false
            referencedRelation: "takedown_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      counterfeit_reference_corpus: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          artifact_kind: string
          created_at: string
          id: string
          metadata: Json | null
          perceptual_hash: string
          retired: boolean
          retired_at: string | null
          sha256: string
          sku: string
          storage_key: string
          version: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          artifact_kind: string
          created_at?: string
          id?: string
          metadata?: Json | null
          perceptual_hash: string
          retired?: boolean
          retired_at?: string | null
          sha256: string
          sku: string
          storage_key: string
          version: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          artifact_kind?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          perceptual_hash?: string
          retired?: boolean
          retired_at?: string | null
          sha256?: string
          sku?: string
          storage_key?: string
          version?: string
        }
        Relationships: []
      }
      counterfeit_test_buys: {
        Row: {
          arrived_at: string | null
          budget_usd: number
          closed_at: string | null
          id: string
          initiated_at: string
          initiated_by: string
          linked_takedown_id: string | null
          ordered_at: string | null
          outcome: string | null
          post_receipt_evaluation_id: string | null
          received_photo_storage_keys: string[] | null
          target_evaluation_id: string | null
          target_listing_url: string
        }
        Insert: {
          arrived_at?: string | null
          budget_usd: number
          closed_at?: string | null
          id?: string
          initiated_at?: string
          initiated_by: string
          linked_takedown_id?: string | null
          ordered_at?: string | null
          outcome?: string | null
          post_receipt_evaluation_id?: string | null
          received_photo_storage_keys?: string[] | null
          target_evaluation_id?: string | null
          target_listing_url: string
        }
        Update: {
          arrived_at?: string | null
          budget_usd?: number
          closed_at?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string
          linked_takedown_id?: string | null
          ordered_at?: string | null
          outcome?: string | null
          post_receipt_evaluation_id?: string | null
          received_photo_storage_keys?: string[] | null
          target_evaluation_id?: string | null
          target_listing_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterfeit_test_buys_linked_takedown_id_fkey"
            columns: ["linked_takedown_id"]
            isOneToOne: false
            referencedRelation: "takedown_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterfeit_test_buys_post_receipt_evaluation_id_fkey"
            columns: ["post_receipt_evaluation_id"]
            isOneToOne: false
            referencedRelation: "counterfeit_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterfeit_test_buys_target_evaluation_id_fkey"
            columns: ["target_evaluation_id"]
            isOneToOne: false
            referencedRelation: "counterfeit_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_formulation_development_fees: {
        Row: {
          admin_fee_retained_cents: number | null
          created_at: string
          custom_formulation_id: string
          development_fee_cents: number
          id: string
          medical_review_fee_cents: number
          paid_at: string | null
          refund_amount_cents: number | null
          refund_reason: string | null
          refunded: boolean
          refunded_at: string | null
          stripe_payment_intent_id: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          admin_fee_retained_cents?: number | null
          created_at?: string
          custom_formulation_id: string
          development_fee_cents?: number
          id?: string
          medical_review_fee_cents?: number
          paid_at?: string | null
          refund_amount_cents?: number | null
          refund_reason?: string | null
          refunded?: boolean
          refunded_at?: string | null
          stripe_payment_intent_id?: string | null
          total_cents: number
          updated_at?: string
        }
        Update: {
          admin_fee_retained_cents?: number | null
          created_at?: string
          custom_formulation_id?: string
          development_fee_cents?: number
          id?: string
          medical_review_fee_cents?: number
          paid_at?: string | null
          refund_amount_cents?: number | null
          refund_reason?: string | null
          refunded?: boolean
          refunded_at?: string | null
          stripe_payment_intent_id?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_formulation_development_fees_custom_formulation_id_fkey"
            columns: ["custom_formulation_id"]
            isOneToOne: true
            referencedRelation: "custom_formulations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_formulation_ingredients: {
        Row: {
          created_at: string
          custom_formulation_id: string
          dose_per_serving: number
          dose_unit: string
          id: string
          ingredient_form: string | null
          ingredient_id: string
          is_active_ingredient: boolean
          percent_daily_value: number | null
          sort_order: number
          source_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_formulation_id: string
          dose_per_serving: number
          dose_unit: string
          id?: string
          ingredient_form?: string | null
          ingredient_id: string
          is_active_ingredient?: boolean
          percent_daily_value?: number | null
          sort_order?: number
          source_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_formulation_id?: string
          dose_per_serving?: number
          dose_unit?: string
          id?: string
          ingredient_form?: string | null
          ingredient_id?: string
          is_active_ingredient?: boolean
          percent_daily_value?: number | null
          sort_order?: number
          source_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_formulation_ingredients_custom_formulation_id_fkey"
            columns: ["custom_formulation_id"]
            isOneToOne: false
            referencedRelation: "custom_formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_formulation_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_library"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_formulation_medical_reviews: {
        Row: {
          clinical_appropriateness_assessment: string | null
          created_at: string
          custom_formulation_id: string
          decision: string
          decision_notes: string
          dose_appropriateness_assessment: string | null
          id: string
          intended_use_concerns: string | null
          interaction_concerns: string | null
          pediatric_safety_review: Json | null
          pregnancy_safety_review: Json | null
          review_duration_seconds: number | null
          reviewed_at: string
          reviewer_user_id: string
          revision_items: Json
        }
        Insert: {
          clinical_appropriateness_assessment?: string | null
          created_at?: string
          custom_formulation_id: string
          decision: string
          decision_notes: string
          dose_appropriateness_assessment?: string | null
          id?: string
          intended_use_concerns?: string | null
          interaction_concerns?: string | null
          pediatric_safety_review?: Json | null
          pregnancy_safety_review?: Json | null
          review_duration_seconds?: number | null
          reviewed_at?: string
          reviewer_user_id: string
          revision_items?: Json
        }
        Update: {
          clinical_appropriateness_assessment?: string | null
          created_at?: string
          custom_formulation_id?: string
          decision?: string
          decision_notes?: string
          dose_appropriateness_assessment?: string | null
          id?: string
          intended_use_concerns?: string | null
          interaction_concerns?: string | null
          pediatric_safety_review?: Json | null
          pregnancy_safety_review?: Json | null
          review_duration_seconds?: number | null
          reviewed_at?: string
          reviewer_user_id?: string
          revision_items?: Json
        }
        Relationships: [
          {
            foreignKeyName: "custom_formulation_medical_reviews_custom_formulation_id_fkey"
            columns: ["custom_formulation_id"]
            isOneToOne: false
            referencedRelation: "custom_formulations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_formulation_regulatory_reviews: {
        Row: {
          allergen_statement_verified: boolean | null
          created_at: string
          custom_formulation_id: string
          decision: string
          decision_notes: string
          fda_disclaimer_required: boolean | null
          id: string
          label_claim_language_verified: boolean | null
          manufacturer_of_record_verified: boolean | null
          ndi_status_verified: boolean | null
          prohibited_category_check_passed: boolean
          review_duration_seconds: number | null
          reviewed_at: string
          reviewer_user_id: string
          revision_items: Json
        }
        Insert: {
          allergen_statement_verified?: boolean | null
          created_at?: string
          custom_formulation_id: string
          decision: string
          decision_notes: string
          fda_disclaimer_required?: boolean | null
          id?: string
          label_claim_language_verified?: boolean | null
          manufacturer_of_record_verified?: boolean | null
          ndi_status_verified?: boolean | null
          prohibited_category_check_passed: boolean
          review_duration_seconds?: number | null
          reviewed_at?: string
          reviewer_user_id: string
          revision_items?: Json
        }
        Update: {
          allergen_statement_verified?: boolean | null
          created_at?: string
          custom_formulation_id?: string
          decision?: string
          decision_notes?: string
          fda_disclaimer_required?: boolean | null
          id?: string
          label_claim_language_verified?: boolean | null
          manufacturer_of_record_verified?: boolean | null
          ndi_status_verified?: boolean | null
          prohibited_category_check_passed?: boolean
          review_duration_seconds?: number | null
          reviewed_at?: string
          reviewer_user_id?: string
          revision_items?: Json
        }
        Relationships: [
          {
            foreignKeyName: "custom_formulation_regulatory_review_custom_formulation_id_fkey"
            columns: ["custom_formulation_id"]
            isOneToOne: false
            referencedRelation: "custom_formulations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_formulation_stability_tests: {
        Row: {
          assigned_expiration_date_method: string | null
          batch_number: string | null
          conducted_by_user_id: string | null
          created_at: string
          custom_formulation_id: string
          dissolution_results: Json
          heavy_metals_results: Json
          id: string
          initial_test_date: string | null
          microbiological_results: Json
          notes: string | null
          potency_results: Json
          production_order_id: string | null
          shelf_life_months: number | null
          status: string
          test_protocol: string
          test_scheduled_dates: string[]
          updated_at: string
        }
        Insert: {
          assigned_expiration_date_method?: string | null
          batch_number?: string | null
          conducted_by_user_id?: string | null
          created_at?: string
          custom_formulation_id: string
          dissolution_results?: Json
          heavy_metals_results?: Json
          id?: string
          initial_test_date?: string | null
          microbiological_results?: Json
          notes?: string | null
          potency_results?: Json
          production_order_id?: string | null
          shelf_life_months?: number | null
          status?: string
          test_protocol: string
          test_scheduled_dates: string[]
          updated_at?: string
        }
        Update: {
          assigned_expiration_date_method?: string | null
          batch_number?: string | null
          conducted_by_user_id?: string | null
          created_at?: string
          custom_formulation_id?: string
          dissolution_results?: Json
          heavy_metals_results?: Json
          id?: string
          initial_test_date?: string | null
          microbiological_results?: Json
          notes?: string | null
          potency_results?: Json
          production_order_id?: string | null
          shelf_life_months?: number | null
          status?: string
          test_protocol?: string
          test_scheduled_dates?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_formulation_stability_tests_custom_formulation_id_fkey"
            columns: ["custom_formulation_id"]
            isOneToOne: false
            referencedRelation: "custom_formulations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_formulations: {
        Row: {
          approved_at: string | null
          automated_validation_issues: Json
          automated_validation_run_at: string | null
          capsule_size: string | null
          created_at: string
          delivery_form: string
          development_fee_invoice_id: string | null
          development_fee_paid: boolean
          development_fee_paid_at: string | null
          enrollment_id: string
          estimated_cogs_per_unit_cents: number | null
          exclusive_to_practitioner_id: string
          flavor_if_applicable: string | null
          id: string
          intended_adult_use: boolean
          intended_pediatric_use: boolean
          intended_pregnancy_use: boolean
          intended_primary_indication: string
          internal_description: string | null
          internal_name: string
          is_current_version: boolean
          medical_review_id: string | null
          parent_formulation_id: string | null
          passed_automated_validation: boolean
          practitioner_id: string
          product_catalog_id: string | null
          proposed_structure_function_claims: string[]
          regulatory_review_id: string | null
          servings_per_container: number
          status: string
          units_per_serving: number
          updated_at: string
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          automated_validation_issues?: Json
          automated_validation_run_at?: string | null
          capsule_size?: string | null
          created_at?: string
          delivery_form: string
          development_fee_invoice_id?: string | null
          development_fee_paid?: boolean
          development_fee_paid_at?: string | null
          enrollment_id: string
          estimated_cogs_per_unit_cents?: number | null
          exclusive_to_practitioner_id: string
          flavor_if_applicable?: string | null
          id?: string
          intended_adult_use?: boolean
          intended_pediatric_use?: boolean
          intended_pregnancy_use?: boolean
          intended_primary_indication: string
          internal_description?: string | null
          internal_name: string
          is_current_version?: boolean
          medical_review_id?: string | null
          parent_formulation_id?: string | null
          passed_automated_validation?: boolean
          practitioner_id: string
          product_catalog_id?: string | null
          proposed_structure_function_claims?: string[]
          regulatory_review_id?: string | null
          servings_per_container: number
          status?: string
          units_per_serving: number
          updated_at?: string
          version_number?: number
        }
        Update: {
          approved_at?: string | null
          automated_validation_issues?: Json
          automated_validation_run_at?: string | null
          capsule_size?: string | null
          created_at?: string
          delivery_form?: string
          development_fee_invoice_id?: string | null
          development_fee_paid?: boolean
          development_fee_paid_at?: string | null
          enrollment_id?: string
          estimated_cogs_per_unit_cents?: number | null
          exclusive_to_practitioner_id?: string
          flavor_if_applicable?: string | null
          id?: string
          intended_adult_use?: boolean
          intended_pediatric_use?: boolean
          intended_pregnancy_use?: boolean
          intended_primary_indication?: string
          internal_description?: string | null
          internal_name?: string
          is_current_version?: boolean
          medical_review_id?: string | null
          parent_formulation_id?: string | null
          passed_automated_validation?: boolean
          practitioner_id?: string
          product_catalog_id?: string | null
          proposed_structure_function_claims?: string[]
          regulatory_review_id?: string | null
          servings_per_container?: number
          status?: string
          units_per_serving?: number
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_formulations_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "level_4_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_formulations_exclusive_to_practitioner_id_fkey"
            columns: ["exclusive_to_practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_exclusive_to_practitioner_id_fkey"
            columns: ["exclusive_to_practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_exclusive_to_practitioner_id_fkey"
            columns: ["exclusive_to_practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_exclusive_to_practitioner_id_fkey"
            columns: ["exclusive_to_practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_formulations_exclusive_to_practitioner_id_fkey"
            columns: ["exclusive_to_practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_exclusive_to_practitioner_id_fkey"
            columns: ["exclusive_to_practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_exclusive_to_practitioner_id_fkey"
            columns: ["exclusive_to_practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_parent_formulation_id_fkey"
            columns: ["parent_formulation_id"]
            isOneToOne: false
            referencedRelation: "custom_formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_formulations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_formulations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "custom_formulations_product_catalog_id_fkey"
            columns: ["product_catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_formulations_product_catalog_id_fkey"
            columns: ["product_catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_price_bindings: {
        Row: {
          authorized_by_proposal_id: string
          binding_expires_at: string | null
          bound_at: string
          bound_value_cents: number | null
          bound_value_percent: number | null
          created_at: string
          grandfathering_policy: string
          id: string
          practitioner_id: string | null
          pricing_domain_id: string
          status: string
          superseded_by_binding_id: string | null
          target_object_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          authorized_by_proposal_id: string
          binding_expires_at?: string | null
          bound_at?: string
          bound_value_cents?: number | null
          bound_value_percent?: number | null
          created_at?: string
          grandfathering_policy: string
          id?: string
          practitioner_id?: string | null
          pricing_domain_id: string
          status?: string
          superseded_by_binding_id?: string | null
          target_object_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          authorized_by_proposal_id?: string
          binding_expires_at?: string | null
          bound_at?: string
          bound_value_cents?: number | null
          bound_value_percent?: number | null
          created_at?: string
          grandfathering_policy?: string
          id?: string
          practitioner_id?: string | null
          pricing_domain_id?: string
          status?: string
          superseded_by_binding_id?: string | null
          target_object_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_price_bindings_authorized_by_proposal_id_fkey"
            columns: ["authorized_by_proposal_id"]
            isOneToOne: false
            referencedRelation: "pricing_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_bindings_pricing_domain_id_fkey"
            columns: ["pricing_domain_id"]
            isOneToOne: false
            referencedRelation: "pricing_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_bindings_superseded_by_binding_id_fkey"
            columns: ["superseded_by_binding_id"]
            isOneToOne: false
            referencedRelation: "customer_price_bindings"
            referencedColumns: ["id"]
          },
        ]
      }
      customs_authentication_guides: {
        Row: {
          cbp_feedback: string | null
          counsel_reviewed_at: string | null
          counsel_reviewed_by: string | null
          created_at: string
          created_by: string | null
          guide_id: string
          pdf_storage_path: string | null
          recordation_id: string
          status: Database["public"]["Enums"]["customs_guide_status"]
          submitted_to_cbp_at: string | null
          template_version: string
          updated_at: string
          version: number
        }
        Insert: {
          cbp_feedback?: string | null
          counsel_reviewed_at?: string | null
          counsel_reviewed_by?: string | null
          created_at?: string
          created_by?: string | null
          guide_id?: string
          pdf_storage_path?: string | null
          recordation_id: string
          status?: Database["public"]["Enums"]["customs_guide_status"]
          submitted_to_cbp_at?: string | null
          template_version: string
          updated_at?: string
          version?: number
        }
        Update: {
          cbp_feedback?: string | null
          counsel_reviewed_at?: string | null
          counsel_reviewed_by?: string | null
          created_at?: string
          created_by?: string | null
          guide_id?: string
          pdf_storage_path?: string | null
          recordation_id?: string
          status?: Database["public"]["Enums"]["customs_guide_status"]
          submitted_to_cbp_at?: string | null
          template_version?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customs_authentication_guides_recordation_id_fkey"
            columns: ["recordation_id"]
            isOneToOne: false
            referencedRelation: "customs_recordations"
            referencedColumns: ["recordation_id"]
          },
        ]
      }
      customs_counsel_reviews: {
        Row: {
          case_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          requested_at: string
          requested_by: string | null
          review_id: string
          review_kind: Database["public"]["Enums"]["customs_counsel_review_kind"]
          status: Database["public"]["Enums"]["customs_counsel_review_status"]
          target_row_id: string
          target_table: string
          trade_secrets_flag: boolean
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          requested_at?: string
          requested_by?: string | null
          review_id?: string
          review_kind: Database["public"]["Enums"]["customs_counsel_review_kind"]
          status?: Database["public"]["Enums"]["customs_counsel_review_status"]
          target_row_id: string
          target_table: string
          trade_secrets_flag?: boolean
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          requested_at?: string
          requested_by?: string | null
          review_id?: string
          review_kind?: Database["public"]["Enums"]["customs_counsel_review_kind"]
          status?: Database["public"]["Enums"]["customs_counsel_review_status"]
          target_row_id?: string
          target_table?: string
          trade_secrets_flag?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customs_counsel_reviews_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      customs_counsel_sessions: {
        Row: {
          aal_at_grant: string
          case_id: string | null
          expires_at: string
          granted_at: string
          granted_by: string
          ip_at_grant: unknown
          notes: string | null
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          session_id: string
          user_agent_at_grant: string | null
          user_id: string
        }
        Insert: {
          aal_at_grant: string
          case_id?: string | null
          expires_at: string
          granted_at?: string
          granted_by: string
          ip_at_grant?: unknown
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          session_id?: string
          user_agent_at_grant?: string | null
          user_id: string
        }
        Update: {
          aal_at_grant?: string
          case_id?: string | null
          expires_at?: string
          granted_at?: string
          granted_by?: string
          ip_at_grant?: unknown
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          session_id?: string
          user_agent_at_grant?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customs_counsel_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      customs_detention_images: {
        Row: {
          content_type: string
          detention_id: string
          file_size_bytes: number | null
          filename: string
          image_id: string
          last_integrity_verified_at: string | null
          last_integrity_verified_ok: boolean | null
          notes: string | null
          sha256: string
          storage_path: string
          trade_secrets_flag: boolean
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          content_type: string
          detention_id: string
          file_size_bytes?: number | null
          filename: string
          image_id?: string
          last_integrity_verified_at?: string | null
          last_integrity_verified_ok?: boolean | null
          notes?: string | null
          sha256: string
          storage_path: string
          trade_secrets_flag?: boolean
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          detention_id?: string
          file_size_bytes?: number | null
          filename?: string
          image_id?: string
          last_integrity_verified_at?: string | null
          last_integrity_verified_ok?: boolean | null
          notes?: string | null
          sha256?: string
          storage_path?: string
          trade_secrets_flag?: boolean
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_detention_images_detention_id_fkey"
            columns: ["detention_id"]
            isOneToOne: false
            referencedRelation: "customs_detentions"
            referencedColumns: ["detention_id"]
          },
        ]
      }
      customs_detentions: {
        Row: {
          ai_disclaimer: string
          ai_drafted: boolean
          assigned_to: string | null
          bill_of_lading_vault_ref: string | null
          carrier: string | null
          case_id: string | null
          cbp_contact_email: string | null
          cbp_contact_name: string | null
          cbp_notice_reference: string | null
          cbp_port_code: string | null
          cbp_port_name: string | null
          consignee_name_vault_ref: string | null
          counsel_reviewed_at: string | null
          counsel_reviewed_by: string | null
          country_of_origin: string | null
          created_at: string
          declared_value_cents: number | null
          detention_30day_deadline_date: string
          detention_date: string
          detention_id: string
          hts_code: string | null
          importer_address_vault_ref: string | null
          importer_ein_vault_ref: string | null
          importer_name_vault_ref: string | null
          merchandise_description: string | null
          msrp_genuine_value_cents: number | null
          notice_date: string
          quantity: number | null
          recordation_id: string | null
          response_deadline_date: string
          response_submitted_at: string | null
          response_text: string | null
          rightsholder_determination:
            | Database["public"]["Enums"]["customs_determination"]
            | null
          rightsholder_determination_rationale: string | null
          sample_bond_amount_cents: number | null
          sample_received_at: string | null
          sample_requested: boolean
          sample_returned_at: string | null
          shipper_name_vault_ref: string | null
          status: Database["public"]["Enums"]["customs_detention_status"]
          trade_secrets_flag: boolean
          updated_at: string
        }
        Insert: {
          ai_disclaimer: string
          ai_drafted?: boolean
          assigned_to?: string | null
          bill_of_lading_vault_ref?: string | null
          carrier?: string | null
          case_id?: string | null
          cbp_contact_email?: string | null
          cbp_contact_name?: string | null
          cbp_notice_reference?: string | null
          cbp_port_code?: string | null
          cbp_port_name?: string | null
          consignee_name_vault_ref?: string | null
          counsel_reviewed_at?: string | null
          counsel_reviewed_by?: string | null
          country_of_origin?: string | null
          created_at?: string
          declared_value_cents?: number | null
          detention_30day_deadline_date: string
          detention_date: string
          detention_id?: string
          hts_code?: string | null
          importer_address_vault_ref?: string | null
          importer_ein_vault_ref?: string | null
          importer_name_vault_ref?: string | null
          merchandise_description?: string | null
          msrp_genuine_value_cents?: number | null
          notice_date: string
          quantity?: number | null
          recordation_id?: string | null
          response_deadline_date: string
          response_submitted_at?: string | null
          response_text?: string | null
          rightsholder_determination?:
            | Database["public"]["Enums"]["customs_determination"]
            | null
          rightsholder_determination_rationale?: string | null
          sample_bond_amount_cents?: number | null
          sample_received_at?: string | null
          sample_requested?: boolean
          sample_returned_at?: string | null
          shipper_name_vault_ref?: string | null
          status?: Database["public"]["Enums"]["customs_detention_status"]
          trade_secrets_flag?: boolean
          updated_at?: string
        }
        Update: {
          ai_disclaimer?: string
          ai_drafted?: boolean
          assigned_to?: string | null
          bill_of_lading_vault_ref?: string | null
          carrier?: string | null
          case_id?: string | null
          cbp_contact_email?: string | null
          cbp_contact_name?: string | null
          cbp_notice_reference?: string | null
          cbp_port_code?: string | null
          cbp_port_name?: string | null
          consignee_name_vault_ref?: string | null
          counsel_reviewed_at?: string | null
          counsel_reviewed_by?: string | null
          country_of_origin?: string | null
          created_at?: string
          declared_value_cents?: number | null
          detention_30day_deadline_date?: string
          detention_date?: string
          detention_id?: string
          hts_code?: string | null
          importer_address_vault_ref?: string | null
          importer_ein_vault_ref?: string | null
          importer_name_vault_ref?: string | null
          merchandise_description?: string | null
          msrp_genuine_value_cents?: number | null
          notice_date?: string
          quantity?: number | null
          recordation_id?: string | null
          response_deadline_date?: string
          response_submitted_at?: string | null
          response_text?: string | null
          rightsholder_determination?:
            | Database["public"]["Enums"]["customs_determination"]
            | null
          rightsholder_determination_rationale?: string | null
          sample_bond_amount_cents?: number | null
          sample_received_at?: string | null
          sample_requested?: boolean
          sample_returned_at?: string | null
          shipper_name_vault_ref?: string | null
          status?: Database["public"]["Enums"]["customs_detention_status"]
          trade_secrets_flag?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customs_detentions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "customs_detentions_recordation_id_fkey"
            columns: ["recordation_id"]
            isOneToOne: false
            referencedRelation: "customs_recordations"
            referencedColumns: ["recordation_id"]
          },
        ]
      }
      customs_e_allegations: {
        Row: {
          ai_disclaimer: string
          ai_drafted: boolean
          allegation_body: string | null
          case_id: string | null
          cbp_allegation_number: string | null
          conduct_description: string | null
          counsel_reviewed_at: string | null
          counsel_reviewed_by: string | null
          created_at: string
          e_allegation_id: string
          evidence_summary: string | null
          notes: string | null
          posture: Database["public"]["Enums"]["customs_e_allegation_posture"]
          status: Database["public"]["Enums"]["customs_e_allegation_status"]
          submitted_at: string | null
          submitted_by: string | null
          trade_secrets_flag: boolean
          updated_at: string
          violator_identity_vault_ref: string | null
        }
        Insert: {
          ai_disclaimer: string
          ai_drafted?: boolean
          allegation_body?: string | null
          case_id?: string | null
          cbp_allegation_number?: string | null
          conduct_description?: string | null
          counsel_reviewed_at?: string | null
          counsel_reviewed_by?: string | null
          created_at?: string
          e_allegation_id?: string
          evidence_summary?: string | null
          notes?: string | null
          posture?: Database["public"]["Enums"]["customs_e_allegation_posture"]
          status?: Database["public"]["Enums"]["customs_e_allegation_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          trade_secrets_flag?: boolean
          updated_at?: string
          violator_identity_vault_ref?: string | null
        }
        Update: {
          ai_disclaimer?: string
          ai_drafted?: boolean
          allegation_body?: string | null
          case_id?: string | null
          cbp_allegation_number?: string | null
          conduct_description?: string | null
          counsel_reviewed_at?: string | null
          counsel_reviewed_by?: string | null
          created_at?: string
          e_allegation_id?: string
          evidence_summary?: string | null
          notes?: string | null
          posture?: Database["public"]["Enums"]["customs_e_allegation_posture"]
          status?: Database["public"]["Enums"]["customs_e_allegation_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          trade_secrets_flag?: boolean
          updated_at?: string
          violator_identity_vault_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_e_allegations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      customs_fee_ledger: {
        Row: {
          amount_cents: number
          currency: string
          external_reference: string | null
          fee_entry_id: string
          fee_type: Database["public"]["Enums"]["customs_fee_type"]
          notes: string | null
          posted_at: string
          posted_by: string | null
          recordation_id: string | null
        }
        Insert: {
          amount_cents: number
          currency?: string
          external_reference?: string | null
          fee_entry_id?: string
          fee_type: Database["public"]["Enums"]["customs_fee_type"]
          notes?: string | null
          posted_at?: string
          posted_by?: string | null
          recordation_id?: string | null
        }
        Update: {
          amount_cents?: number
          currency?: string
          external_reference?: string | null
          fee_entry_id?: string
          fee_type?: Database["public"]["Enums"]["customs_fee_type"]
          notes?: string | null
          posted_at?: string
          posted_by?: string | null
          recordation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_fee_ledger_recordation_id_fkey"
            columns: ["recordation_id"]
            isOneToOne: false
            referencedRelation: "customs_recordations"
            referencedColumns: ["recordation_id"]
          },
        ]
      }
      customs_fines_imposed: {
        Row: {
          created_at: string
          fine_amount_cents: number | null
          fine_id: string
          fine_notice_date: string | null
          importer_address_vault_ref: string | null
          importer_name_vault_ref: string | null
          msrp_genuine_cents: number
          notes: string | null
          seizure_id: string | null
          status: string | null
          trade_secrets_flag: boolean
          violation_number: number
        }
        Insert: {
          created_at?: string
          fine_amount_cents?: number | null
          fine_id?: string
          fine_notice_date?: string | null
          importer_address_vault_ref?: string | null
          importer_name_vault_ref?: string | null
          msrp_genuine_cents: number
          notes?: string | null
          seizure_id?: string | null
          status?: string | null
          trade_secrets_flag?: boolean
          violation_number: number
        }
        Update: {
          created_at?: string
          fine_amount_cents?: number | null
          fine_id?: string
          fine_notice_date?: string | null
          importer_address_vault_ref?: string | null
          importer_name_vault_ref?: string | null
          msrp_genuine_cents?: number
          notes?: string | null
          seizure_id?: string | null
          status?: string | null
          trade_secrets_flag?: boolean
          violation_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "customs_fines_imposed_seizure_id_fkey"
            columns: ["seizure_id"]
            isOneToOne: false
            referencedRelation: "customs_seizures"
            referencedColumns: ["seizure_id"]
          },
        ]
      }
      customs_guide_sections: {
        Row: {
          ai_disclaimer: string
          ai_drafted: boolean
          body_md: string | null
          created_at: string
          display_order: number
          guide_id: string
          images_json: Json
          section_id: string
          section_type: Database["public"]["Enums"]["customs_guide_section_type"]
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_disclaimer: string
          ai_drafted?: boolean
          body_md?: string | null
          created_at?: string
          display_order: number
          guide_id: string
          images_json?: Json
          section_id?: string
          section_type: Database["public"]["Enums"]["customs_guide_section_type"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_disclaimer?: string
          ai_drafted?: boolean
          body_md?: string | null
          created_at?: string
          display_order?: number
          guide_id?: string
          images_json?: Json
          section_id?: string
          section_type?: Database["public"]["Enums"]["customs_guide_section_type"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customs_guide_sections_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "customs_authentication_guides"
            referencedColumns: ["guide_id"]
          },
        ]
      }
      customs_iprs_scan_results: {
        Row: {
          case_id: string | null
          content_hash: string | null
          created_at: string
          is_synthetic: boolean
          listing_source: string | null
          listing_title: string | null
          listing_title_normalized: string | null
          listing_url: string | null
          mark_distance_score: number | null
          observed_price_cents: number | null
          recordation_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scan_date: string
          scan_result_id: string
          scanned_at: string
          seller_identifier_vault_ref: string | null
          status: Database["public"]["Enums"]["customs_iprs_result_status"]
          trade_secrets_flag: boolean
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          content_hash?: string | null
          created_at?: string
          is_synthetic?: boolean
          listing_source?: string | null
          listing_title?: string | null
          listing_title_normalized?: string | null
          listing_url?: string | null
          mark_distance_score?: number | null
          observed_price_cents?: number | null
          recordation_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scan_date?: string
          scan_result_id?: string
          scanned_at?: string
          seller_identifier_vault_ref?: string | null
          status?: Database["public"]["Enums"]["customs_iprs_result_status"]
          trade_secrets_flag?: boolean
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          content_hash?: string | null
          created_at?: string
          is_synthetic?: boolean
          listing_source?: string | null
          listing_title?: string | null
          listing_title_normalized?: string | null
          listing_url?: string | null
          mark_distance_score?: number | null
          observed_price_cents?: number | null
          recordation_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scan_date?: string
          scan_result_id?: string
          scanned_at?: string
          seller_identifier_vault_ref?: string | null
          status?: Database["public"]["Enums"]["customs_iprs_result_status"]
          trade_secrets_flag?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customs_iprs_scan_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "customs_iprs_scan_results_recordation_id_fkey"
            columns: ["recordation_id"]
            isOneToOne: false
            referencedRelation: "customs_recordations"
            referencedColumns: ["recordation_id"]
          },
        ]
      }
      customs_moiety_claims: {
        Row: {
          awarded_amount_cents: number | null
          awarded_at: string | null
          cbp_claim_number: string | null
          claim_cap_cents: number
          claim_percentage: number
          created_at: string
          e_allegation_id: string | null
          eapa_case_number: string | null
          estimated_net_recovery_cents: number | null
          filed_at: string | null
          moiety_claim_id: string
          notes: string | null
          recovery_type: string | null
          status: Database["public"]["Enums"]["customs_moiety_claim_status"]
          trade_secrets_flag: boolean
          updated_at: string
        }
        Insert: {
          awarded_amount_cents?: number | null
          awarded_at?: string | null
          cbp_claim_number?: string | null
          claim_cap_cents?: number
          claim_percentage?: number
          created_at?: string
          e_allegation_id?: string | null
          eapa_case_number?: string | null
          estimated_net_recovery_cents?: number | null
          filed_at?: string | null
          moiety_claim_id?: string
          notes?: string | null
          recovery_type?: string | null
          status?: Database["public"]["Enums"]["customs_moiety_claim_status"]
          trade_secrets_flag?: boolean
          updated_at?: string
        }
        Update: {
          awarded_amount_cents?: number | null
          awarded_at?: string | null
          cbp_claim_number?: string | null
          claim_cap_cents?: number
          claim_percentage?: number
          created_at?: string
          e_allegation_id?: string | null
          eapa_case_number?: string | null
          estimated_net_recovery_cents?: number | null
          filed_at?: string | null
          moiety_claim_id?: string
          notes?: string | null
          recovery_type?: string | null
          status?: Database["public"]["Enums"]["customs_moiety_claim_status"]
          trade_secrets_flag?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customs_moiety_claims_e_allegation_id_fkey"
            columns: ["e_allegation_id"]
            isOneToOne: false
            referencedRelation: "customs_e_allegations"
            referencedColumns: ["e_allegation_id"]
          },
        ]
      }
      customs_recordation_classes: {
        Row: {
          authorized_manufacturers: string[]
          class_description: string
          class_row_id: string
          countries_of_manufacture: string[]
          created_at: string
          fee_cents: number
          international_class: number
          recordation_id: string
          renewal_fee_cents: number
          trade_secrets_flag: boolean
        }
        Insert: {
          authorized_manufacturers?: string[]
          class_description: string
          class_row_id?: string
          countries_of_manufacture?: string[]
          created_at?: string
          fee_cents?: number
          international_class: number
          recordation_id: string
          renewal_fee_cents?: number
          trade_secrets_flag?: boolean
        }
        Update: {
          authorized_manufacturers?: string[]
          class_description?: string
          class_row_id?: string
          countries_of_manufacture?: string[]
          created_at?: string
          fee_cents?: number
          international_class?: number
          recordation_id?: string
          renewal_fee_cents?: number
          trade_secrets_flag?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customs_recordation_classes_recordation_id_fkey"
            columns: ["recordation_id"]
            isOneToOne: false
            referencedRelation: "customs_recordations"
            referencedColumns: ["recordation_id"]
          },
        ]
      }
      customs_recordation_products: {
        Row: {
          linked_at: string
          linked_by: string | null
          notes: string | null
          recordation_id: string
          recordation_product_id: string
          sku: string
          trade_secrets_flag: boolean
        }
        Insert: {
          linked_at?: string
          linked_by?: string | null
          notes?: string | null
          recordation_id: string
          recordation_product_id?: string
          sku: string
          trade_secrets_flag?: boolean
        }
        Update: {
          linked_at?: string
          linked_by?: string | null
          notes?: string | null
          recordation_id?: string
          recordation_product_id?: string
          sku?: string
          trade_secrets_flag?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customs_recordation_products_recordation_id_fkey"
            columns: ["recordation_id"]
            isOneToOne: false
            referencedRelation: "customs_recordations"
            referencedColumns: ["recordation_id"]
          },
          {
            foreignKeyName: "customs_recordation_products_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      customs_recordations: {
        Row: {
          cbp_expiration_date: string | null
          cbp_grace_expiration_date: string | null
          cbp_recordation_date: string | null
          cbp_recordation_number: string | null
          ceo_approval_required: boolean
          ceo_approved_at: string | null
          ceo_approved_by: string | null
          copyright_registration_date: string | null
          copyright_registration_number: string | null
          counsel_reviewed_at: string | null
          counsel_reviewed_by: string | null
          created_at: string
          created_by: string | null
          iprr_confirmation_vault_ref: string | null
          mark_image_vault_ref: string | null
          mark_text: string | null
          notes: string | null
          recordation_id: string
          recordation_type: Database["public"]["Enums"]["customs_recordation_type"]
          renewal_fee_cents: number | null
          status: Database["public"]["Enums"]["customs_recordation_status"]
          submitted_at: string | null
          total_fee_cents: number | null
          total_ic_count: number | null
          trade_secrets_flag: boolean
          updated_at: string
          uspto_registration_date: string | null
          uspto_registration_number: string | null
          uspto_renewal_date: string | null
        }
        Insert: {
          cbp_expiration_date?: string | null
          cbp_grace_expiration_date?: string | null
          cbp_recordation_date?: string | null
          cbp_recordation_number?: string | null
          ceo_approval_required?: boolean
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          copyright_registration_date?: string | null
          copyright_registration_number?: string | null
          counsel_reviewed_at?: string | null
          counsel_reviewed_by?: string | null
          created_at?: string
          created_by?: string | null
          iprr_confirmation_vault_ref?: string | null
          mark_image_vault_ref?: string | null
          mark_text?: string | null
          notes?: string | null
          recordation_id?: string
          recordation_type: Database["public"]["Enums"]["customs_recordation_type"]
          renewal_fee_cents?: number | null
          status?: Database["public"]["Enums"]["customs_recordation_status"]
          submitted_at?: string | null
          total_fee_cents?: number | null
          total_ic_count?: number | null
          trade_secrets_flag?: boolean
          updated_at?: string
          uspto_registration_date?: string | null
          uspto_registration_number?: string | null
          uspto_renewal_date?: string | null
        }
        Update: {
          cbp_expiration_date?: string | null
          cbp_grace_expiration_date?: string | null
          cbp_recordation_date?: string | null
          cbp_recordation_number?: string | null
          ceo_approval_required?: boolean
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          copyright_registration_date?: string | null
          copyright_registration_number?: string | null
          counsel_reviewed_at?: string | null
          counsel_reviewed_by?: string | null
          created_at?: string
          created_by?: string | null
          iprr_confirmation_vault_ref?: string | null
          mark_image_vault_ref?: string | null
          mark_text?: string | null
          notes?: string | null
          recordation_id?: string
          recordation_type?: Database["public"]["Enums"]["customs_recordation_type"]
          renewal_fee_cents?: number | null
          status?: Database["public"]["Enums"]["customs_recordation_status"]
          submitted_at?: string | null
          total_fee_cents?: number | null
          total_ic_count?: number | null
          trade_secrets_flag?: boolean
          updated_at?: string
          uspto_registration_date?: string | null
          uspto_registration_number?: string | null
          uspto_renewal_date?: string | null
        }
        Relationships: []
      }
      customs_seizures: {
        Row: {
          case_id: string | null
          cbp_disclosure_complete: boolean
          cbp_disclosure_deadline_date: string
          cbp_disclosure_received_at: string | null
          civil_fine_imposed: boolean
          created_at: string
          destruction_date: string | null
          destruction_method: string | null
          detention_id: string | null
          forfeiture_notice_end_date: string | null
          forfeiture_notice_published_url: string | null
          forfeiture_notice_start_date: string | null
          importer_prior_violations: number
          notes: string | null
          seized_at: string
          seizure_date: string
          seizure_id: string
          seizure_notice_date: string | null
          seizure_notice_reference: string | null
          status: Database["public"]["Enums"]["customs_seizure_status"]
          trade_secrets_flag: boolean
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          cbp_disclosure_complete?: boolean
          cbp_disclosure_deadline_date: string
          cbp_disclosure_received_at?: string | null
          civil_fine_imposed?: boolean
          created_at?: string
          destruction_date?: string | null
          destruction_method?: string | null
          detention_id?: string | null
          forfeiture_notice_end_date?: string | null
          forfeiture_notice_published_url?: string | null
          forfeiture_notice_start_date?: string | null
          importer_prior_violations?: number
          notes?: string | null
          seized_at: string
          seizure_date: string
          seizure_id?: string
          seizure_notice_date?: string | null
          seizure_notice_reference?: string | null
          status?: Database["public"]["Enums"]["customs_seizure_status"]
          trade_secrets_flag?: boolean
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          cbp_disclosure_complete?: boolean
          cbp_disclosure_deadline_date?: string
          cbp_disclosure_received_at?: string | null
          civil_fine_imposed?: boolean
          created_at?: string
          destruction_date?: string | null
          destruction_method?: string | null
          detention_id?: string | null
          forfeiture_notice_end_date?: string | null
          forfeiture_notice_published_url?: string | null
          forfeiture_notice_start_date?: string | null
          importer_prior_violations?: number
          notes?: string | null
          seized_at?: string
          seizure_date?: string
          seizure_id?: string
          seizure_notice_date?: string | null
          seizure_notice_reference?: string | null
          status?: Database["public"]["Enums"]["customs_seizure_status"]
          trade_secrets_flag?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customs_seizures_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "customs_seizures_detention_id_fkey"
            columns: ["detention_id"]
            isOneToOne: false
            referencedRelation: "customs_detentions"
            referencedColumns: ["detention_id"]
          },
        ]
      }
      customs_trainings: {
        Row: {
          ai_disclaimer: string
          ai_drafted: boolean
          attendance_estimate: number | null
          cbp_contact_email: string | null
          created_at: string
          created_by: string | null
          deck_storage_path: string | null
          delivered_at: string | null
          format: Database["public"]["Enums"]["customs_training_format"]
          notes: string | null
          port_code: string | null
          port_name: string | null
          request_email_vault_ref: string | null
          requested_at: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["customs_training_status"]
          training_id: string
          updated_at: string
        }
        Insert: {
          ai_disclaimer: string
          ai_drafted?: boolean
          attendance_estimate?: number | null
          cbp_contact_email?: string | null
          created_at?: string
          created_by?: string | null
          deck_storage_path?: string | null
          delivered_at?: string | null
          format: Database["public"]["Enums"]["customs_training_format"]
          notes?: string | null
          port_code?: string | null
          port_name?: string | null
          request_email_vault_ref?: string | null
          requested_at?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["customs_training_status"]
          training_id?: string
          updated_at?: string
        }
        Update: {
          ai_disclaimer?: string
          ai_drafted?: boolean
          attendance_estimate?: number | null
          cbp_contact_email?: string | null
          created_at?: string
          created_by?: string | null
          deck_storage_path?: string | null
          delivered_at?: string | null
          format?: Database["public"]["Enums"]["customs_training_format"]
          notes?: string | null
          port_code?: string | null
          port_name?: string | null
          request_email_vault_ref?: string | null
          requested_at?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["customs_training_status"]
          training_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          activity_allSubmitted_at: string | null
          activity_level_score: number | null
          activity_source: string | null
          breakfast_carbs: number | null
          breakfast_fat: number | null
          breakfast_healthy_fat: number | null
          breakfast_protein: number | null
          breakfast_score: number | null
          breakfast_skipped: boolean | null
          breakfast_sugar: number | null
          cardio_active: boolean | null
          cardio_duration_min: number | null
          check_in_date: string
          created_at: string
          day_score: number | null
          dinner_carbs: number | null
          dinner_fat: number | null
          dinner_healthy_fat: number | null
          dinner_protein: number | null
          dinner_score: number | null
          dinner_skipped: boolean | null
          dinner_sugar: number | null
          energy_allSubmitted_at: string | null
          energy_recovery_score: number | null
          exercise_allSubmitted_at: string | null
          hydration_glasses: number | null
          id: string
          lunch_carbs: number | null
          lunch_fat: number | null
          lunch_healthy_fat: number | null
          lunch_protein: number | null
          lunch_score: number | null
          lunch_skipped: boolean | null
          lunch_sugar: number | null
          recovery_source: string | null
          resistance_active: boolean | null
          resistance_duration_min: number | null
          score_calculated_at: string | null
          sleep_allSubmitted_at: string | null
          sleep_hours: number | null
          sleep_quality_score: number | null
          sleep_source: string | null
          snacks_carbs: number | null
          snacks_fat: number | null
          snacks_healthy_fat: number | null
          snacks_protein: number | null
          snacks_score: number | null
          snacks_skipped: boolean | null
          snacks_sugar: number | null
          stress_allSubmitted_at: string | null
          stress_level_score: number | null
          stress_source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_allSubmitted_at?: string | null
          activity_level_score?: number | null
          activity_source?: string | null
          breakfast_carbs?: number | null
          breakfast_fat?: number | null
          breakfast_healthy_fat?: number | null
          breakfast_protein?: number | null
          breakfast_score?: number | null
          breakfast_skipped?: boolean | null
          breakfast_sugar?: number | null
          cardio_active?: boolean | null
          cardio_duration_min?: number | null
          check_in_date?: string
          created_at?: string
          day_score?: number | null
          dinner_carbs?: number | null
          dinner_fat?: number | null
          dinner_healthy_fat?: number | null
          dinner_protein?: number | null
          dinner_score?: number | null
          dinner_skipped?: boolean | null
          dinner_sugar?: number | null
          energy_allSubmitted_at?: string | null
          energy_recovery_score?: number | null
          exercise_allSubmitted_at?: string | null
          hydration_glasses?: number | null
          id?: string
          lunch_carbs?: number | null
          lunch_fat?: number | null
          lunch_healthy_fat?: number | null
          lunch_protein?: number | null
          lunch_score?: number | null
          lunch_skipped?: boolean | null
          lunch_sugar?: number | null
          recovery_source?: string | null
          resistance_active?: boolean | null
          resistance_duration_min?: number | null
          score_calculated_at?: string | null
          sleep_allSubmitted_at?: string | null
          sleep_hours?: number | null
          sleep_quality_score?: number | null
          sleep_source?: string | null
          snacks_carbs?: number | null
          snacks_fat?: number | null
          snacks_healthy_fat?: number | null
          snacks_protein?: number | null
          snacks_score?: number | null
          snacks_skipped?: boolean | null
          snacks_sugar?: number | null
          stress_allSubmitted_at?: string | null
          stress_level_score?: number | null
          stress_source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_allSubmitted_at?: string | null
          activity_level_score?: number | null
          activity_source?: string | null
          breakfast_carbs?: number | null
          breakfast_fat?: number | null
          breakfast_healthy_fat?: number | null
          breakfast_protein?: number | null
          breakfast_score?: number | null
          breakfast_skipped?: boolean | null
          breakfast_sugar?: number | null
          cardio_active?: boolean | null
          cardio_duration_min?: number | null
          check_in_date?: string
          created_at?: string
          day_score?: number | null
          dinner_carbs?: number | null
          dinner_fat?: number | null
          dinner_healthy_fat?: number | null
          dinner_protein?: number | null
          dinner_score?: number | null
          dinner_skipped?: boolean | null
          dinner_sugar?: number | null
          energy_allSubmitted_at?: string | null
          energy_recovery_score?: number | null
          exercise_allSubmitted_at?: string | null
          hydration_glasses?: number | null
          id?: string
          lunch_carbs?: number | null
          lunch_fat?: number | null
          lunch_healthy_fat?: number | null
          lunch_protein?: number | null
          lunch_score?: number | null
          lunch_skipped?: boolean | null
          lunch_sugar?: number | null
          recovery_source?: string | null
          resistance_active?: boolean | null
          resistance_duration_min?: number | null
          score_calculated_at?: string | null
          sleep_allSubmitted_at?: string | null
          sleep_hours?: number | null
          sleep_quality_score?: number | null
          sleep_source?: string | null
          snacks_carbs?: number | null
          snacks_fat?: number | null
          snacks_healthy_fat?: number | null
          snacks_protein?: number | null
          snacks_score?: number | null
          snacks_skipped?: boolean | null
          snacks_sugar?: number | null
          stress_allSubmitted_at?: string | null
          stress_level_score?: number | null
          stress_source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_scores: {
        Row: {
          bio_optimization_score: number | null
          created_at: string | null
          daily_composite: number | null
          data_source: string | null
          date: string
          exercise_minutes: number | null
          exercise_score: number | null
          id: string
          recovery_hrv: number | null
          recovery_score: number | null
          regimen_score: number | null
          sleep_hours: number | null
          sleep_score: number | null
          steps_count: number | null
          steps_score: number | null
          strain_score: number | null
          strain_value: number | null
          updated_at: string | null
          user_id: string | null
          wearable_type: string | null
        }
        Insert: {
          bio_optimization_score?: number | null
          created_at?: string | null
          daily_composite?: number | null
          data_source?: string | null
          date?: string
          exercise_minutes?: number | null
          exercise_score?: number | null
          id?: string
          recovery_hrv?: number | null
          recovery_score?: number | null
          regimen_score?: number | null
          sleep_hours?: number | null
          sleep_score?: number | null
          steps_count?: number | null
          steps_score?: number | null
          strain_score?: number | null
          strain_value?: number | null
          updated_at?: string | null
          user_id?: string | null
          wearable_type?: string | null
        }
        Update: {
          bio_optimization_score?: number | null
          created_at?: string | null
          daily_composite?: number | null
          data_source?: string | null
          date?: string
          exercise_minutes?: number | null
          exercise_score?: number | null
          id?: string
          recovery_hrv?: number | null
          recovery_score?: number | null
          regimen_score?: number | null
          sleep_hours?: number | null
          sleep_score?: number | null
          steps_count?: number | null
          steps_score?: number | null
          strain_score?: number | null
          strain_value?: number | null
          updated_at?: string | null
          user_id?: string | null
          wearable_type?: string | null
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          protocol_date: string
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          protocol_date?: string
          task_type?: Database["public"]["Enums"]["task_type"]
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          protocol_date?: string
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_events: {
        Row: {
          cascade_actions: string[] | null
          cascade_completed: boolean | null
          created_at: string | null
          error: string | null
          event_data: Json
          event_type: string
          id: string
          processing_completed_at: string | null
          processing_started_at: string | null
          user_id: string | null
        }
        Insert: {
          cascade_actions?: string[] | null
          cascade_completed?: boolean | null
          created_at?: string | null
          error?: string | null
          event_data?: Json
          event_type: string
          id?: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          user_id?: string | null
        }
        Update: {
          cascade_actions?: string[] | null
          cascade_completed?: boolean | null
          created_at?: string | null
          error?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      decision_rights_rules: {
        Row: {
          advisory_approvers: string[]
          applies_to_categories: string[]
          created_at: string
          id: string
          is_active: boolean
          max_affected_customers: number | null
          max_percent_change: number | null
          min_affected_customers: number | null
          min_percent_change: number | null
          required_approvers: string[]
          requires_board_approval: boolean
          requires_board_notification: boolean
          sort_order: number
          target_decision_sla_hours: number | null
          tier: string
          updated_at: string
        }
        Insert: {
          advisory_approvers?: string[]
          applies_to_categories?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          max_affected_customers?: number | null
          max_percent_change?: number | null
          min_affected_customers?: number | null
          min_percent_change?: number | null
          required_approvers: string[]
          requires_board_approval?: boolean
          requires_board_notification?: boolean
          sort_order: number
          target_decision_sla_hours?: number | null
          tier: string
          updated_at?: string
        }
        Update: {
          advisory_approvers?: string[]
          applies_to_categories?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          max_affected_customers?: number | null
          max_percent_change?: number | null
          min_affected_customers?: number | null
          min_percent_change?: number | null
          required_approvers?: string[]
          requires_board_approval?: boolean
          requires_board_notification?: boolean
          sort_order?: number
          target_decision_sla_hours?: number | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      dsar_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          id: string
          jurisdiction: string
          notes: string | null
          opened_at: string
          request_type: string
          sla_due_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          id?: string
          jurisdiction: string
          notes?: string | null
          opened_at?: string
          request_type: string
          sla_due_at: string
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          jurisdiction?: string
          notes?: string | null
          opened_at?: string
          request_type?: string
          sla_due_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_otps: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_hash: string
          type: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_hash: string
          type: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          type?: string
        }
        Relationships: []
      }
      engagement_score_snapshots: {
        Row: {
          assessment_engagement_score: number
          calculation_method_version: string
          created_at: string
          helix_activity_count: number
          id: string
          outcome_trajectory_score: number
          period_end_date: string
          period_start_date: string
          protocol_adherence_score: number
          score: number
          tracking_consistency_score: number
          user_id: string
        }
        Insert: {
          assessment_engagement_score: number
          calculation_method_version?: string
          created_at?: string
          helix_activity_count?: number
          id?: string
          outcome_trajectory_score: number
          period_end_date: string
          period_start_date: string
          protocol_adherence_score: number
          score: number
          tracking_consistency_score: number
          user_id: string
        }
        Update: {
          assessment_engagement_score?: number
          calculation_method_version?: string
          created_at?: string
          helix_activity_count?: number
          id?: string
          outcome_trajectory_score?: number
          period_end_date?: string
          period_start_date?: string
          protocol_adherence_score?: number
          score?: number
          tracking_consistency_score?: number
          user_id?: string
        }
        Relationships: []
      }
      executive_dashboard: {
        Row: {
          annual_net_profit: number
          annual_revenue: number
          avg_cogs_ratio: number
          avg_dtc_margin: number
          bundle_monthly_revenue: number
          cogs_flags: number
          core_skus: number
          dist_viable_pct: number
          dtc_viable_pct: number
          id: string
          monthly_net_profit: number
          monthly_revenue: number
          net_margin_pct: number
          portfolio_health_score: number
          premium_bundles: number
          pricing_alerts: number
          report_date: string | null
          risks_identified: number
          scenario: string
          star_skus: number
          sunset_skus: number
          total_bundles: number
          total_skus: number
          watch_skus: number
          ws_viable_pct: number
        }
        Insert: {
          annual_net_profit: number
          annual_revenue: number
          avg_cogs_ratio: number
          avg_dtc_margin: number
          bundle_monthly_revenue: number
          cogs_flags: number
          core_skus: number
          dist_viable_pct: number
          dtc_viable_pct: number
          id?: string
          monthly_net_profit: number
          monthly_revenue: number
          net_margin_pct: number
          portfolio_health_score: number
          premium_bundles: number
          pricing_alerts: number
          report_date?: string | null
          risks_identified: number
          scenario: string
          star_skus: number
          sunset_skus: number
          total_bundles: number
          total_skus: number
          watch_skus: number
          ws_viable_pct: number
        }
        Update: {
          annual_net_profit?: number
          annual_revenue?: number
          avg_cogs_ratio?: number
          avg_dtc_margin?: number
          bundle_monthly_revenue?: number
          cogs_flags?: number
          core_skus?: number
          dist_viable_pct?: number
          dtc_viable_pct?: number
          id?: string
          monthly_net_profit?: number
          monthly_revenue?: number
          net_margin_pct?: number
          portfolio_health_score?: number
          premium_bundles?: number
          pricing_alerts?: number
          report_date?: string | null
          risks_identified?: number
          scenario?: string
          star_skus?: number
          sunset_skus?: number
          total_bundles?: number
          total_skus?: number
          watch_skus?: number
          ws_viable_pct?: number
        }
        Relationships: []
      }
      executive_recommendations: {
        Row: {
          area: string
          created_at: string | null
          dashboard_id: string | null
          id: string
          impact: string
          priority: number
          recommendation: string
        }
        Insert: {
          area: string
          created_at?: string | null
          dashboard_id?: string | null
          id?: string
          impact: string
          priority: number
          recommendation: string
        }
        Update: {
          area?: string
          created_at?: string | null
          dashboard_id?: string | null
          id?: string
          impact?: string
          priority?: number
          recommendation?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_recommendations_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_reporting_audit_log: {
        Row: {
          action_category: string
          action_verb: string
          actor_role: string | null
          actor_user_id: string | null
          after_state_json: Json | null
          audit_id: string
          before_state_json: Json | null
          context_json: Json | null
          ip_address: unknown
          member_id: string | null
          occurred_at: string
          pack_id: string | null
          target_id: string | null
          target_table: string
          user_agent: string | null
        }
        Insert: {
          action_category: string
          action_verb: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_state_json?: Json | null
          audit_id?: string
          before_state_json?: Json | null
          context_json?: Json | null
          ip_address?: unknown
          member_id?: string | null
          occurred_at?: string
          pack_id?: string | null
          target_id?: string | null
          target_table: string
          user_agent?: string | null
        }
        Update: {
          action_category?: string
          action_verb?: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_state_json?: Json | null
          audit_id?: string
          before_state_json?: Json | null
          context_json?: Json | null
          ip_address?: unknown
          member_id?: string | null
          occurred_at?: string
          pack_id?: string | null
          target_id?: string | null
          target_table?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_reporting_audit_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "executive_reporting_audit_log_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "board_packs"
            referencedColumns: ["pack_id"]
          },
        ]
      }
      executive_risks: {
        Row: {
          action: string
          category: string
          created_at: string | null
          dashboard_id: string | null
          detail: string | null
          id: string
          risk: string
          severity: string
        }
        Insert: {
          action: string
          category: string
          created_at?: string | null
          dashboard_id?: string | null
          detail?: string | null
          id?: string
          risk: string
          severity: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string | null
          dashboard_id?: string | null
          detail?: string | null
          id?: string
          risk?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_risks_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          accepted_at: string | null
          birth_date: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          invitation_token: string | null
          invited_at: string | null
          is_active: boolean
          member_type: string
          member_user_id: string | null
          permissions: Json
          primary_user_id: string
          relationship: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          birth_date?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          invitation_token?: string | null
          invited_at?: string | null
          is_active?: boolean
          member_type: string
          member_user_id?: string | null
          permissions?: Json
          primary_user_id: string
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          invitation_token?: string | null
          invited_at?: string | null
          is_active?: boolean
          member_type?: string
          member_user_id?: string | null
          permissions?: Json
          primary_user_id?: string
          relationship?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      farma_tokens: {
        Row: {
          balance: number
          id: string
          lifetime_earned: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          lifetime_earned?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          lifetime_earned?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farma_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmceutica_ingredients: {
        Row: {
          category: string
          created_at: string | null
          delivery_method: string
          id: string
          name: string
          name_normalized: string
          notes: string | null
          search_vector: unknown
        }
        Insert: {
          category: string
          created_at?: string | null
          delivery_method?: string
          id?: string
          name: string
          name_normalized?: string
          notes?: string | null
          search_vector?: unknown
        }
        Update: {
          category?: string
          created_at?: string | null
          delivery_method?: string
          id?: string
          name?: string
          name_normalized?: string
          notes?: string | null
          search_vector?: unknown
        }
        Relationships: []
      }
      feature_flag_audit: {
        Row: {
          change_reason: string | null
          change_type: string
          changed_at: string
          changed_by: string
          feature_id: string
          id: string
          ip_address: string | null
          new_state: Json | null
          previous_state: Json | null
          user_agent: string | null
        }
        Insert: {
          change_reason?: string | null
          change_type: string
          changed_at?: string
          changed_by: string
          feature_id: string
          id?: string
          ip_address?: string | null
          new_state?: Json | null
          previous_state?: Json | null
          user_agent?: string | null
        }
        Update: {
          change_reason?: string | null
          change_type?: string
          changed_at?: string
          changed_by?: string
          feature_id?: string
          id?: string
          ip_address?: string | null
          new_state?: Json | null
          previous_state?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_audit_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string
          evaluation_count_24h: number
          feature_owner: string | null
          gate_behavior: string
          id: string
          is_active: boolean
          kill_switch_engaged: boolean
          kill_switch_engaged_at: string | null
          kill_switch_engaged_by: string | null
          kill_switch_reason: string | null
          last_evaluated_at: string | null
          launch_phase_id: string | null
          minimum_tier_level: number
          requires_family_tier: boolean
          requires_genex360: boolean
          rollout_cohort_ids: string[]
          rollout_percentage: number | null
          rollout_strategy: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_name: string
          evaluation_count_24h?: number
          feature_owner?: string | null
          gate_behavior?: string
          id: string
          is_active?: boolean
          kill_switch_engaged?: boolean
          kill_switch_engaged_at?: string | null
          kill_switch_engaged_by?: string | null
          kill_switch_reason?: string | null
          last_evaluated_at?: string | null
          launch_phase_id?: string | null
          minimum_tier_level: number
          requires_family_tier?: boolean
          requires_genex360?: boolean
          rollout_cohort_ids?: string[]
          rollout_percentage?: number | null
          rollout_strategy?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          evaluation_count_24h?: number
          feature_owner?: string | null
          gate_behavior?: string
          id?: string
          is_active?: boolean
          kill_switch_engaged?: boolean
          kill_switch_engaged_at?: string | null
          kill_switch_engaged_by?: string | null
          kill_switch_reason?: string | null
          last_evaluated_at?: string | null
          launch_phase_id?: string | null
          minimum_tier_level?: number
          requires_family_tier?: boolean
          requires_genex360?: boolean
          rollout_cohort_ids?: string[]
          rollout_percentage?: number | null
          rollout_strategy?: string
        }
        Relationships: [
          {
            foreignKeyName: "features_launch_phase_id_fkey"
            columns: ["launch_phase_id"]
            isOneToOne: false
            referencedRelation: "launch_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "features_minimum_tier_level_fkey"
            columns: ["minimum_tier_level"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["tier_level"]
          },
        ]
      }
      forecast_milestones: {
        Row: {
          created_at: string | null
          forecast_month: number
          id: string
          label: string
          milestone: string
        }
        Insert: {
          created_at?: string | null
          forecast_month: number
          id?: string
          label: string
          milestone: string
        }
        Update: {
          created_at?: string | null
          forecast_month?: number
          id?: string
          label?: string
          milestone?: string
        }
        Relationships: []
      }
      forecast_monthly: {
        Row: {
          bundle_revenue: number
          calendar_month: number
          cogs: number
          created_at: string | null
          cumulative_net_profit: number
          cumulative_revenue: number
          dist_revenue: number
          dtc_revenue: number
          forecast_month: number
          gross_profit: number
          id: string
          label: string
          net_margin_pct: number
          net_profit: number
          new_sku_revenue: number
          seasonality_index: number
          sku_revenue: number
          total_revenue: number
          variable_costs: number
          ws_revenue: number
        }
        Insert: {
          bundle_revenue: number
          calendar_month: number
          cogs: number
          created_at?: string | null
          cumulative_net_profit: number
          cumulative_revenue: number
          dist_revenue: number
          dtc_revenue: number
          forecast_month: number
          gross_profit: number
          id?: string
          label: string
          net_margin_pct: number
          net_profit: number
          new_sku_revenue?: number
          seasonality_index: number
          sku_revenue: number
          total_revenue: number
          variable_costs: number
          ws_revenue: number
        }
        Update: {
          bundle_revenue?: number
          calendar_month?: number
          cogs?: number
          created_at?: string | null
          cumulative_net_profit?: number
          cumulative_revenue?: number
          dist_revenue?: number
          dtc_revenue?: number
          forecast_month?: number
          gross_profit?: number
          id?: string
          label?: string
          net_margin_pct?: number
          net_profit?: number
          new_sku_revenue?: number
          seasonality_index?: number
          sku_revenue?: number
          total_revenue?: number
          variable_costs?: number
          ws_revenue?: number
        }
        Relationships: []
      }
      framework_consistency_flags: {
        Row: {
          created_at: string
          description: string
          id: string
          inconsistency_kind: string
          other_packet_id: string | null
          packet_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          shared_evidence_path: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          inconsistency_kind: string
          other_packet_id?: string | null
          packet_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          shared_evidence_path: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          inconsistency_kind?: string
          other_packet_id?: string | null
          packet_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shared_evidence_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_consistency_flags_other_packet_id_fkey"
            columns: ["other_packet_id"]
            isOneToOne: false
            referencedRelation: "framework_packets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_consistency_flags_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "framework_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_packets: {
        Row: {
          framework_id: string
          framework_registry_version: string
          generated_at: string
          generated_by: string
          id: string
          legacy_soc2_packet_id: string | null
          legal_hold: boolean
          packet_uuid: string
          period_end: string
          period_start: string
          retention_until: string
          root_hash: string
          scope_declaration: Json
          signature_jwt: string
          signing_key_id: string
          size_bytes: number
          status: string
          storage_key: string
          storage_sha256: string
          superseded_by: string | null
        }
        Insert: {
          framework_id: string
          framework_registry_version: string
          generated_at?: string
          generated_by: string
          id?: string
          legacy_soc2_packet_id?: string | null
          legal_hold?: boolean
          packet_uuid: string
          period_end: string
          period_start: string
          retention_until: string
          root_hash: string
          scope_declaration: Json
          signature_jwt: string
          signing_key_id: string
          size_bytes: number
          status?: string
          storage_key: string
          storage_sha256: string
          superseded_by?: string | null
        }
        Update: {
          framework_id?: string
          framework_registry_version?: string
          generated_at?: string
          generated_by?: string
          id?: string
          legacy_soc2_packet_id?: string | null
          legal_hold?: boolean
          packet_uuid?: string
          period_end?: string
          period_start?: string
          retention_until?: string
          root_hash?: string
          scope_declaration?: Json
          signature_jwt?: string
          signing_key_id?: string
          size_bytes?: number
          status?: string
          storage_key?: string
          storage_sha256?: string
          superseded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "framework_packets_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "compliance_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_packets_legacy_soc2_packet_id_fkey"
            columns: ["legacy_soc2_packet_id"]
            isOneToOne: false
            referencedRelation: "soc2_packets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_packets_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "framework_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_registry_flags: {
        Row: {
          control_ref: string
          description: string
          first_seen_at: string
          flag_kind: string
          framework_id: string
          id: string
          last_seen_at: string
          registry_version: string
          related_control_ref: string | null
          related_framework_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          control_ref: string
          description: string
          first_seen_at?: string
          flag_kind: string
          framework_id: string
          id?: string
          last_seen_at?: string
          registry_version: string
          related_control_ref?: string | null
          related_framework_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          control_ref?: string
          description?: string
          first_seen_at?: string
          flag_kind?: string
          framework_id?: string
          id?: string
          last_seen_at?: string
          registry_version?: string
          related_control_ref?: string | null
          related_framework_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_registry_flags_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "compliance_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_registry_flags_related_framework_id_fkey"
            columns: ["related_framework_id"]
            isOneToOne: false
            referencedRelation: "compliance_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      genetic_profiles: {
        Row: {
          additional_genes: Json | null
          comt_status: string | null
          created_at: string | null
          cyp2d6_status: string | null
          id: string
          mthfr_status: string | null
          report_date: string | null
          source_lab: string | null
          user_id: string
        }
        Insert: {
          additional_genes?: Json | null
          comt_status?: string | null
          created_at?: string | null
          cyp2d6_status?: string | null
          id?: string
          mthfr_status?: string | null
          report_date?: string | null
          source_lab?: string | null
          user_id: string
        }
        Update: {
          additional_genes?: Json | null
          comt_status?: string | null
          created_at?: string | null
          cyp2d6_status?: string | null
          id?: string
          mthfr_status?: string | null
          report_date?: string | null
          source_lab?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "genetic_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      genex360_products: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          family_member_discount_percent: number
          gifted_months: number
          gifted_tier_id: string | null
          id: string
          is_active: boolean
          panel_count: number
          panels_included: string[]
          price_cents: number
          sort_order: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          unlocks_full_precision: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          family_member_discount_percent?: number
          gifted_months: number
          gifted_tier_id?: string | null
          id: string
          is_active?: boolean
          panel_count: number
          panels_included: string[]
          price_cents: number
          sort_order: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          unlocks_full_precision?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          family_member_discount_percent?: number
          gifted_months?: number
          gifted_tier_id?: string | null
          id?: string
          is_active?: boolean
          panel_count?: number
          panels_included?: string[]
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          unlocks_full_precision?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "genex360_products_gifted_tier_id_fkey"
            columns: ["gifted_tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      genex360_purchase_currency_details: {
        Row: {
          created_at: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          detail_id: string
          fx_rate_to_usd_at_order_time: number
          inclusive_of_tax: boolean
          market_code: Database["public"]["Enums"]["market_code"]
          purchase_id: string
          shipping_cents: number
          stripe_payment_intent_id: string | null
          stripe_tax_calculation_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          vat_invoice_id: string | null
        }
        Insert: {
          created_at?: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          detail_id?: string
          fx_rate_to_usd_at_order_time: number
          inclusive_of_tax: boolean
          market_code: Database["public"]["Enums"]["market_code"]
          purchase_id: string
          shipping_cents?: number
          stripe_payment_intent_id?: string | null
          stripe_tax_calculation_id?: string | null
          subtotal_cents: number
          tax_cents?: number
          total_cents: number
          vat_invoice_id?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: Database["public"]["Enums"]["currency_code"]
          detail_id?: string
          fx_rate_to_usd_at_order_time?: number
          inclusive_of_tax?: boolean
          market_code?: Database["public"]["Enums"]["market_code"]
          purchase_id?: string
          shipping_cents?: number
          stripe_payment_intent_id?: string | null
          stripe_tax_calculation_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          vat_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "genex360_purchase_currency_details_vat_invoice_id_fkey"
            columns: ["vat_invoice_id"]
            isOneToOne: false
            referencedRelation: "international_vat_invoices"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      genex360_purchases: {
        Row: {
          created_at: string
          family_discount_applied_percent: number
          family_member_id: string | null
          gift_ends_at: string | null
          gift_membership_id: string | null
          gift_starts_at: string | null
          id: string
          kit_shipped_at: string | null
          kit_tracking_number: string | null
          lab_processing_started_at: string | null
          lifecycle_status: string
          metadata: Json
          order_id: string | null
          payment_status: string
          paypal_order_id: string | null
          price_paid_cents: number
          product_id: string
          sample_received_at: string | null
          stripe_payment_intent_id: string | null
          test_results_delivered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_discount_applied_percent?: number
          family_member_id?: string | null
          gift_ends_at?: string | null
          gift_membership_id?: string | null
          gift_starts_at?: string | null
          id?: string
          kit_shipped_at?: string | null
          kit_tracking_number?: string | null
          lab_processing_started_at?: string | null
          lifecycle_status?: string
          metadata?: Json
          order_id?: string | null
          payment_status?: string
          paypal_order_id?: string | null
          price_paid_cents: number
          product_id: string
          sample_received_at?: string | null
          stripe_payment_intent_id?: string | null
          test_results_delivered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_discount_applied_percent?: number
          family_member_id?: string | null
          gift_ends_at?: string | null
          gift_membership_id?: string | null
          gift_starts_at?: string | null
          id?: string
          kit_shipped_at?: string | null
          kit_tracking_number?: string | null
          lab_processing_started_at?: string | null
          lifecycle_status?: string
          metadata?: Json
          order_id?: string | null
          payment_status?: string
          paypal_order_id?: string | null
          price_paid_cents?: number
          product_id?: string
          sample_received_at?: string | null
          stripe_payment_intent_id?: string | null
          test_results_delivered_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "genex360_purchases_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genex360_purchases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genex360_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "genex360_products"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_configuration_log: {
        Row: {
          change_justification: string
          change_type: string
          changed_at: string
          changed_by: string
          id: string
          new_state: Json | null
          previous_state: Json | null
          target_id: string
          target_table: string
        }
        Insert: {
          change_justification: string
          change_type: string
          changed_at?: string
          changed_by: string
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          target_id: string
          target_table: string
        }
        Update: {
          change_justification?: string
          change_type?: string
          changed_at?: string
          changed_by?: string
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          target_id?: string
          target_table?: string
        }
        Relationships: []
      }
      governance_notifications_queue: {
        Row: {
          created_at: string
          dispatch_error: string | null
          dispatched_at: string | null
          id: string
          notification_type: string
          payload: Json
          proposal_id: string | null
          recipient_email: string | null
          recipient_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          dispatch_error?: string | null
          dispatched_at?: string | null
          id?: string
          notification_type: string
          payload?: Json
          proposal_id?: string | null
          recipient_email?: string | null
          recipient_user_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          dispatch_error?: string | null
          dispatched_at?: string | null
          id?: string
          notification_type?: string
          payload?: Json
          proposal_id?: string | null
          recipient_email?: string | null
          recipient_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_notifications_queue_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "pricing_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          hrv_source: string | null
          hrv_value: number | null
          id: string
          last_synced: string | null
          metric_date: string
          recovery_state: string | null
          sleep_score: number | null
          steps_count: number | null
          user_id: string
        }
        Insert: {
          hrv_source?: string | null
          hrv_value?: number | null
          id?: string
          last_synced?: string | null
          metric_date?: string
          recovery_state?: string | null
          sleep_score?: number | null
          steps_count?: number | null
          user_id: string
        }
        Update: {
          hrv_source?: string | null
          hrv_value?: number | null
          id?: string
          last_synced?: string | null
          metric_date?: string
          recovery_state?: string | null
          sleep_score?: number | null
          steps_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_scores: {
        Row: {
          calculation_version: string | null
          created_at: string | null
          id: string
          score: number
          user_id: string
        }
        Insert: {
          calculation_version?: string | null
          created_at?: string | null
          id?: string
          score: number
          user_id: string
        }
        Update: {
          calculation_version?: string | null
          created_at?: string | null
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      helix_achievement_unlocks: {
        Row: {
          achievement_id: string | null
          id: string
          tokens_awarded: number | null
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          id?: string
          tokens_awarded?: number | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          id?: string
          tokens_awarded?: number | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helix_achievement_unlocks_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "helix_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      helix_achievements: {
        Row: {
          category: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          requirement: Json
          token_reward: number | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requirement?: Json
          token_reward?: number | null
        }
        Update: {
          category?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requirement?: Json
          token_reward?: number | null
        }
        Relationships: []
      }
      helix_balances: {
        Row: {
          current_balance: number | null
          current_tier: string | null
          id: string
          lifetime_earned: number | null
          lifetime_redeemed: number | null
          multiplier: number | null
          tier_points: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          current_balance?: number | null
          current_tier?: string | null
          id?: string
          lifetime_earned?: number | null
          lifetime_redeemed?: number | null
          multiplier?: number | null
          tier_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          current_balance?: number | null
          current_tier?: string | null
          id?: string
          lifetime_earned?: number | null
          lifetime_redeemed?: number | null
          multiplier?: number | null
          tier_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      helix_challenge_participants: {
        Row: {
          challenge_id: string | null
          completion_date: string | null
          current_progress: number | null
          id: string
          joined_at: string | null
          status: string | null
          target_value: number | null
          tokens_awarded: number | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          completion_date?: string | null
          current_progress?: number | null
          id?: string
          joined_at?: string | null
          status?: string | null
          target_value?: number | null
          tokens_awarded?: number | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          completion_date?: string | null
          current_progress?: number | null
          id?: string
          joined_at?: string | null
          status?: string | null
          target_value?: number | null
          tokens_awarded?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helix_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "helix_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      helix_challenges: {
        Row: {
          challenge_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          is_community: boolean | null
          name: string
          start_date: string | null
          target_unit: string | null
          target_value: number | null
          token_reward: number
        }
        Insert: {
          challenge_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_community?: boolean | null
          name: string
          start_date?: string | null
          target_unit?: string | null
          target_value?: number | null
          token_reward: number
        }
        Update: {
          challenge_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_community?: boolean | null
          name?: string
          start_date?: string | null
          target_unit?: string | null
          target_value?: number | null
          token_reward?: number
        }
        Relationships: []
      }
      helix_earning_event_types: {
        Row: {
          base_points: number
          category: string
          created_at: string
          description: string | null
          display_name: string
          frequency_limit: string | null
          id: string
          is_active: boolean
          requires_consumer_tier: number
        }
        Insert: {
          base_points: number
          category: string
          created_at?: string
          description?: string | null
          display_name: string
          frequency_limit?: string | null
          id: string
          is_active?: boolean
          requires_consumer_tier?: number
        }
        Update: {
          base_points?: number
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          frequency_limit?: string | null
          id?: string
          is_active?: boolean
          requires_consumer_tier?: number
        }
        Relationships: []
      }
      helix_family_pool_config: {
        Row: {
          configured_at: string
          created_at: string
          id: string
          last_changed_at: string
          pool_type: string
          primary_user_id: string
          updated_at: string
        }
        Insert: {
          configured_at?: string
          created_at?: string
          id?: string
          last_changed_at?: string
          pool_type?: string
          primary_user_id: string
          updated_at?: string
        }
        Update: {
          configured_at?: string
          created_at?: string
          id?: string
          last_changed_at?: string
          pool_type?: string
          primary_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      helix_leaderboard: {
        Row: {
          challenge_id: string | null
          display_name: string | null
          id: string
          rank: number | null
          score: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          display_name?: string | null
          id?: string
          rank?: number | null
          score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          display_name?: string | null
          id?: string
          rank?: number | null
          score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helix_leaderboard_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "helix_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      helix_redemption_catalog: {
        Row: {
          created_at: string
          credit_dollars_cents: number | null
          description: string | null
          discount_percent: number | null
          display_name: string
          id: string
          is_active: boolean
          points_cost: number
          redemption_limit_per_user: number | null
          redemption_type: string
          sort_order: number
          stock_limit: number | null
          stock_remaining: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          credit_dollars_cents?: number | null
          description?: string | null
          discount_percent?: number | null
          display_name: string
          id: string
          is_active?: boolean
          points_cost: number
          redemption_limit_per_user?: number | null
          redemption_type: string
          sort_order?: number
          stock_limit?: number | null
          stock_remaining?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          credit_dollars_cents?: number | null
          description?: string | null
          discount_percent?: number | null
          display_name?: string
          id?: string
          is_active?: boolean
          points_cost?: number
          redemption_limit_per_user?: number | null
          redemption_type?: string
          sort_order?: number
          stock_limit?: number | null
          stock_remaining?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      helix_redemptions: {
        Row: {
          application_context: Json
          catalog_item_id: string | null
          created_at: string | null
          id: string
          order_id: string | null
          reward_description: string | null
          reward_type: string
          status: string | null
          tokens_spent: number
          user_id: string | null
        }
        Insert: {
          application_context?: Json
          catalog_item_id?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          reward_description?: string | null
          reward_type: string
          status?: string | null
          tokens_spent: number
          user_id?: string | null
        }
        Update: {
          application_context?: Json
          catalog_item_id?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          reward_description?: string | null
          reward_type?: string
          status?: string | null
          tokens_spent?: number
          user_id?: string | null
        }
        Relationships: []
      }
      helix_referral_codes: {
        Row: {
          code: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      helix_referrals: {
        Row: {
          created_at: string | null
          first_purchase_at: string | null
          first_purchase_genex360_at: string | null
          id: string
          referral_code: string | null
          referred_email: string
          referred_tokens_awarded: number | null
          referred_user_id: string | null
          referrer_id: string | null
          referrer_tokens_awarded: number | null
          signed_up_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          first_purchase_at?: string | null
          first_purchase_genex360_at?: string | null
          id?: string
          referral_code?: string | null
          referred_email: string
          referred_tokens_awarded?: number | null
          referred_user_id?: string | null
          referrer_id?: string | null
          referrer_tokens_awarded?: number | null
          signed_up_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          first_purchase_at?: string | null
          first_purchase_genex360_at?: string | null
          id?: string
          referral_code?: string | null
          referred_email?: string
          referred_tokens_awarded?: number | null
          referred_user_id?: string | null
          referrer_id?: string | null
          referrer_tokens_awarded?: number | null
          signed_up_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      helix_streaks: {
        Row: {
          current_count: number | null
          id: string
          last_logged_date: string | null
          longest_count: number | null
          streak_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          current_count?: number | null
          id?: string
          last_logged_date?: string | null
          longest_count?: number | null
          streak_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          current_count?: number | null
          id?: string
          last_logged_date?: string | null
          longest_count?: number | null
          streak_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      helix_tiers: {
        Row: {
          benefits: Json | null
          min_engagement_points: number
          min_points: number
          multiplier: number
          required_membership_tier_id: string | null
          tier: string
          tier_description: string | null
          tier_icon_lucide_name: string | null
        }
        Insert: {
          benefits?: Json | null
          min_engagement_points?: number
          min_points: number
          multiplier: number
          required_membership_tier_id?: string | null
          tier: string
          tier_description?: string | null
          tier_icon_lucide_name?: string | null
        }
        Update: {
          benefits?: Json | null
          min_engagement_points?: number
          min_points?: number
          multiplier?: number
          required_membership_tier_id?: string | null
          tier?: string
          tier_description?: string | null
          tier_icon_lucide_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helix_tiers_required_membership_tier_id_fkey"
            columns: ["required_membership_tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      helix_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string | null
          description: string | null
          event_type_id: string | null
          helix_tier_at_time: string | null
          id: string
          metadata: Json
          multiplier_applied: number | null
          pool_type: string | null
          related_entity_id: string | null
          source: string
          source_user_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          event_type_id?: string | null
          helix_tier_at_time?: string | null
          id?: string
          metadata?: Json
          multiplier_applied?: number | null
          pool_type?: string | null
          related_entity_id?: string | null
          source: string
          source_user_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          event_type_id?: string | null
          helix_tier_at_time?: string | null
          id?: string
          metadata?: Json
          multiplier_applied?: number | null
          pool_type?: string | null
          related_entity_id?: string | null
          source?: string
          source_user_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helix_transactions_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "helix_earning_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      herbs: {
        Row: {
          category: string | null
          common_name: string
          contraindications: string | null
          created_at: string | null
          description: string | null
          id: string
          rating: number | null
          scientific_name: string | null
          typical_ratio: string | null
        }
        Insert: {
          category?: string | null
          common_name: string
          contraindications?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          rating?: number | null
          scientific_name?: string | null
          typical_ratio?: string | null
        }
        Update: {
          category?: string | null
          common_name?: string
          contraindications?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          rating?: number | null
          scientific_name?: string | null
          typical_ratio?: string | null
        }
        Relationships: []
      }
      hipaa_breach_determinations: {
        Row: {
          assessed_by: string
          assessment_date: string
          breach_risk_factors: Json
          created_at: string
          determination: string
          id: string
          incident_id: string
          individuals_affected_count: number | null
          media_notification_sent_at: string | null
          notification_required: boolean
          notification_sent_at: string | null
          ocr_notification_sent_at: string | null
          rationale: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          assessed_by: string
          assessment_date: string
          breach_risk_factors: Json
          created_at?: string
          determination: string
          id?: string
          incident_id: string
          individuals_affected_count?: number | null
          media_notification_sent_at?: string | null
          notification_required?: boolean
          notification_sent_at?: string | null
          ocr_notification_sent_at?: string | null
          rationale: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          assessed_by?: string
          assessment_date?: string
          breach_risk_factors?: Json
          created_at?: string
          determination?: string
          id?: string
          incident_id?: string
          individuals_affected_count?: number | null
          media_notification_sent_at?: string | null
          notification_required?: boolean
          notification_sent_at?: string | null
          ocr_notification_sent_at?: string | null
          rationale?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hipaa_breach_determinations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "compliance_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      hipaa_contingency_plan_tests: {
        Row: {
          corrective_actions: Json | null
          id: string
          outcome_summary: string
          recorded_at: string
          recorded_by: string
          scope: string
          storage_key: string | null
          test_date: string
          test_kind: string
        }
        Insert: {
          corrective_actions?: Json | null
          id?: string
          outcome_summary: string
          recorded_at?: string
          recorded_by: string
          scope: string
          storage_key?: string | null
          test_date: string
          test_kind: string
        }
        Update: {
          corrective_actions?: Json | null
          id?: string
          outcome_summary?: string
          recorded_at?: string
          recorded_by?: string
          scope?: string
          storage_key?: string | null
          test_date?: string
          test_kind?: string
        }
        Relationships: []
      }
      hipaa_device_media_events: {
        Row: {
          device_id: string
          event_date: string
          event_kind: string
          id: string
          method: string | null
          notes: string | null
          recorded_at: string
          responsible_party: string | null
        }
        Insert: {
          device_id: string
          event_date: string
          event_kind: string
          id?: string
          method?: string | null
          notes?: string | null
          recorded_at?: string
          responsible_party?: string | null
        }
        Update: {
          device_id?: string
          event_date?: string
          event_kind?: string
          id?: string
          method?: string | null
          notes?: string | null
          recorded_at?: string
          responsible_party?: string | null
        }
        Relationships: []
      }
      hipaa_emergency_access_invocations: {
        Row: {
          closed_at: string | null
          id: string
          invoked_at: string
          invoked_by: string
          justification: string
          recorded_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          scope_of_access: string
        }
        Insert: {
          closed_at?: string | null
          id?: string
          invoked_at: string
          invoked_by: string
          justification: string
          recorded_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scope_of_access: string
        }
        Update: {
          closed_at?: string | null
          id?: string
          invoked_at?: string
          invoked_by?: string
          justification?: string
          recorded_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scope_of_access?: string
        }
        Relationships: []
      }
      hipaa_risk_analyses: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          methodology_summary: string
          scope_summary: string
          sha256: string
          storage_key: string
          uploaded_by: string
          valid_from: string
          valid_until: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          methodology_summary: string
          scope_summary: string
          sha256: string
          storage_key: string
          uploaded_by: string
          valid_from: string
          valid_until?: string | null
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          methodology_summary?: string
          scope_summary?: string
          sha256?: string
          storage_key?: string
          uploaded_by?: string
          valid_from?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: []
      }
      hipaa_sanction_actions: {
        Row: {
          action_date: string
          action_kind: string
          id: string
          recorded_at: string
          recorded_by: string
          triggering_incident_id: string | null
          workforce_member_pseudonym: string
        }
        Insert: {
          action_date: string
          action_kind: string
          id?: string
          recorded_at?: string
          recorded_by: string
          triggering_incident_id?: string | null
          workforce_member_pseudonym: string
        }
        Update: {
          action_date?: string
          action_kind?: string
          id?: string
          recorded_at?: string
          recorded_by?: string
          triggering_incident_id?: string | null
          workforce_member_pseudonym?: string
        }
        Relationships: [
          {
            foreignKeyName: "hipaa_sanction_actions_triggering_incident_id_fkey"
            columns: ["triggering_incident_id"]
            isOneToOne: false
            referencedRelation: "compliance_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      hipaa_sanction_policies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          effective_from: string
          effective_until: string | null
          id: string
          sha256: string
          storage_key: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          effective_from: string
          effective_until?: string | null
          id?: string
          sha256: string
          storage_key: string
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          sha256?: string
          storage_key?: string
          version?: number
        }
        Relationships: []
      }
      hipaa_workforce_training: {
        Row: {
          completion_date: string
          expiry_date: string | null
          id: string
          recorded_at: string
          recorded_by: string
          score_percent: number | null
          training_module: string
          workforce_member_pseudonym: string
        }
        Insert: {
          completion_date: string
          expiry_date?: string | null
          id?: string
          recorded_at?: string
          recorded_by: string
          score_percent?: number | null
          training_module: string
          workforce_member_pseudonym: string
        }
        Update: {
          completion_date?: string
          expiry_date?: string | null
          id?: string
          recorded_at?: string
          recorded_by?: string
          score_percent?: number | null
          training_module?: string
          workforce_member_pseudonym?: string
        }
        Relationships: []
      }
      hounddog_collector_state: {
        Row: {
          enabled: boolean
          id: string
          last_cursor: string | null
          last_tick_at: string | null
          notes: string | null
          provider_kind: string
          rate_limit_per_seconds: number
          rate_limit_requests: number
          tos_version_pinned: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id: string
          last_cursor?: string | null
          last_tick_at?: string | null
          notes?: string | null
          provider_kind?: string
          rate_limit_per_seconds?: number
          rate_limit_requests?: number
          tos_version_pinned?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: string
          last_cursor?: string | null
          last_tick_at?: string | null
          notes?: string | null
          provider_kind?: string
          rate_limit_per_seconds?: number
          rate_limit_requests?: number
          tos_version_pinned?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ingredient_library: {
        Row: {
          added_at: string
          added_by: string | null
          allowed_claim_language: string[] | null
          alternate_names: string[]
          available_forms: string[]
          category: string
          common_name: string
          contains_allergen_egg: boolean
          contains_allergen_fish: boolean
          contains_allergen_milk: boolean
          contains_allergen_peanut: boolean
          contains_allergen_sesame: boolean
          contains_allergen_shellfish: boolean
          contains_allergen_soy: boolean
          contains_allergen_tree_nut: boolean
          contains_allergen_wheat: boolean
          dose_unit: string
          excluded_reason: string | null
          fda_safety_concern_listed: boolean
          fda_warning_letter_issued: boolean
          gras_affirmation_date: string | null
          gras_notice_number: string | null
          id: string
          inclusion_justification: string | null
          is_available_for_custom_formulation: boolean
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          mechanism_summary: string | null
          minimum_effective_dose_mg: number | null
          minimum_source_quantity_kg: number | null
          ndi_notification_number: string | null
          pregnancy_category: string | null
          primary_indications: string[]
          regulatory_status: string
          scientific_name: string | null
          structure_function_claim_allowed: boolean
          subcategory: string | null
          supplier_notes: string | null
          tolerable_upper_limit_adult_mg: number | null
          tolerable_upper_limit_pediatric_mg: number | null
          typical_cogs_cents_per_mg: number | null
          typical_dose_mg: number | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          allowed_claim_language?: string[] | null
          alternate_names?: string[]
          available_forms?: string[]
          category: string
          common_name: string
          contains_allergen_egg?: boolean
          contains_allergen_fish?: boolean
          contains_allergen_milk?: boolean
          contains_allergen_peanut?: boolean
          contains_allergen_sesame?: boolean
          contains_allergen_shellfish?: boolean
          contains_allergen_soy?: boolean
          contains_allergen_tree_nut?: boolean
          contains_allergen_wheat?: boolean
          dose_unit: string
          excluded_reason?: string | null
          fda_safety_concern_listed?: boolean
          fda_warning_letter_issued?: boolean
          gras_affirmation_date?: string | null
          gras_notice_number?: string | null
          id: string
          inclusion_justification?: string | null
          is_available_for_custom_formulation?: boolean
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          mechanism_summary?: string | null
          minimum_effective_dose_mg?: number | null
          minimum_source_quantity_kg?: number | null
          ndi_notification_number?: string | null
          pregnancy_category?: string | null
          primary_indications?: string[]
          regulatory_status: string
          scientific_name?: string | null
          structure_function_claim_allowed?: boolean
          subcategory?: string | null
          supplier_notes?: string | null
          tolerable_upper_limit_adult_mg?: number | null
          tolerable_upper_limit_pediatric_mg?: number | null
          typical_cogs_cents_per_mg?: number | null
          typical_dose_mg?: number | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          allowed_claim_language?: string[] | null
          alternate_names?: string[]
          available_forms?: string[]
          category?: string
          common_name?: string
          contains_allergen_egg?: boolean
          contains_allergen_fish?: boolean
          contains_allergen_milk?: boolean
          contains_allergen_peanut?: boolean
          contains_allergen_sesame?: boolean
          contains_allergen_shellfish?: boolean
          contains_allergen_soy?: boolean
          contains_allergen_tree_nut?: boolean
          contains_allergen_wheat?: boolean
          dose_unit?: string
          excluded_reason?: string | null
          fda_safety_concern_listed?: boolean
          fda_warning_letter_issued?: boolean
          gras_affirmation_date?: string | null
          gras_notice_number?: string | null
          id?: string
          inclusion_justification?: string | null
          is_available_for_custom_formulation?: boolean
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          mechanism_summary?: string | null
          minimum_effective_dose_mg?: number | null
          minimum_source_quantity_kg?: number | null
          ndi_notification_number?: string | null
          pregnancy_category?: string | null
          primary_indications?: string[]
          regulatory_status?: string
          scientific_name?: string | null
          structure_function_claim_allowed?: boolean
          subcategory?: string | null
          supplier_notes?: string | null
          tolerable_upper_limit_adult_mg?: number | null
          tolerable_upper_limit_pediatric_mg?: number | null
          typical_cogs_cents_per_mg?: number | null
          typical_dose_mg?: number | null
        }
        Relationships: []
      }
      ingredient_library_interactions: {
        Row: {
          added_at: string
          added_by: string | null
          blocks_formulation: boolean
          clinical_significance: string | null
          id: string
          ingredient_a_id: string
          ingredient_b_id: string
          mechanism: string
          severity: string
          source_reference: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          blocks_formulation?: boolean
          clinical_significance?: string | null
          id?: string
          ingredient_a_id: string
          ingredient_b_id: string
          mechanism: string
          severity: string
          source_reference?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          blocks_formulation?: boolean
          clinical_significance?: string | null
          id?: string
          ingredient_a_id?: string
          ingredient_b_id?: string
          mechanism?: string
          severity?: string
          source_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_library_interactions_ingredient_a_id_fkey"
            columns: ["ingredient_a_id"]
            isOneToOne: false
            referencedRelation: "ingredient_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_library_interactions_ingredient_b_id_fkey"
            columns: ["ingredient_b_id"]
            isOneToOne: false
            referencedRelation: "ingredient_library"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          created_at: string
          delivery_method: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_method?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_method?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integrity_checks: {
        Row: {
          duration: string
          failed: number
          failed_details: Json | null
          id: string
          overall_status: string
          passed: number
          run_date: string
          total_checks: number
          warning_details: Json | null
          warnings: number
        }
        Insert: {
          duration: string
          failed: number
          failed_details?: Json | null
          id?: string
          overall_status: string
          passed: number
          run_date?: string
          total_checks: number
          warning_details?: Json | null
          warnings: number
        }
        Update: {
          duration?: string
          failed?: number
          failed_details?: Json | null
          id?: string
          overall_status?: string
          passed?: number
          run_date?: string
          total_checks?: number
          warning_details?: Json | null
          warnings?: number
        }
        Relationships: []
      }
      interaction_notifications: {
        Row: {
          id: string
          is_read: boolean | null
          message: string
          portal: string
          rule_id: string | null
          sent_at: string | null
          severity: string
          user_id: string
        }
        Insert: {
          id?: string
          is_read?: boolean | null
          message: string
          portal: string
          rule_id?: string | null
          sent_at?: string | null
          severity: string
          user_id: string
        }
        Update: {
          id?: string
          is_read?: boolean | null
          message?: string
          portal?: string
          rule_id?: string | null
          sent_at?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_overrides: {
        Row: {
          clinical_notes: string
          id: string
          interaction_id: string
          notified_patient: boolean | null
          override_at: string | null
          override_type: string
          patient_user_id: string
          practitioner_user_id: string
        }
        Insert: {
          clinical_notes: string
          id?: string
          interaction_id: string
          notified_patient?: boolean | null
          override_at?: string | null
          override_type: string
          patient_user_id: string
          practitioner_user_id: string
        }
        Update: {
          clinical_notes?: string
          id?: string
          interaction_id?: string
          notified_patient?: boolean | null
          override_at?: string | null
          override_type?: string
          patient_user_id?: string
          practitioner_user_id?: string
        }
        Relationships: []
      }
      interaction_rules: {
        Row: {
          agent_a: string
          agent_a_type: string
          agent_b: string
          agent_b_type: string
          blocks_protocol: boolean
          clinical_effect: string
          consumer_message: string
          created_at: string | null
          evidence_level: string
          id: string
          interaction_type: string
          is_active: boolean
          mechanism: string
          practitioner_message: string
          rationale_template: string
          recommendation: string
          requires_hcp_review: boolean
          rule_id: string
          severity: string
          tags: string[] | null
          timing_note: string | null
        }
        Insert: {
          agent_a: string
          agent_a_type: string
          agent_b: string
          agent_b_type: string
          blocks_protocol?: boolean
          clinical_effect: string
          consumer_message: string
          created_at?: string | null
          evidence_level?: string
          id?: string
          interaction_type: string
          is_active?: boolean
          mechanism: string
          practitioner_message: string
          rationale_template: string
          recommendation: string
          requires_hcp_review?: boolean
          rule_id: string
          severity: string
          tags?: string[] | null
          timing_note?: string | null
        }
        Update: {
          agent_a?: string
          agent_a_type?: string
          agent_b?: string
          agent_b_type?: string
          blocks_protocol?: boolean
          clinical_effect?: string
          consumer_message?: string
          created_at?: string | null
          evidence_level?: string
          id?: string
          interaction_type?: string
          is_active?: boolean
          mechanism?: string
          practitioner_message?: string
          rationale_template?: string
          recommendation?: string
          requires_hcp_review?: boolean
          rule_id?: string
          severity?: string
          tags?: string[] | null
          timing_note?: string | null
        }
        Relationships: []
      }
      international_audit_log: {
        Row: {
          action_category: string
          action_verb: string
          actor_role: string | null
          actor_user_id: string | null
          after_state_json: Json | null
          audit_id: string
          before_state_json: Json | null
          currency_code: Database["public"]["Enums"]["currency_code"] | null
          ip_address: unknown
          market_code: Database["public"]["Enums"]["market_code"] | null
          occurred_at: string
          target_id: string | null
          target_table: string | null
          typed_confirmation_text: string | null
          user_agent: string | null
        }
        Insert: {
          action_category: string
          action_verb: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_state_json?: Json | null
          audit_id?: string
          before_state_json?: Json | null
          currency_code?: Database["public"]["Enums"]["currency_code"] | null
          ip_address?: unknown
          market_code?: Database["public"]["Enums"]["market_code"] | null
          occurred_at?: string
          target_id?: string | null
          target_table?: string | null
          typed_confirmation_text?: string | null
          user_agent?: string | null
        }
        Update: {
          action_category?: string
          action_verb?: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_state_json?: Json | null
          audit_id?: string
          before_state_json?: Json | null
          currency_code?: Database["public"]["Enums"]["currency_code"] | null
          ip_address?: unknown
          market_code?: Database["public"]["Enums"]["market_code"] | null
          occurred_at?: string
          target_id?: string | null
          target_table?: string | null
          typed_confirmation_text?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      international_country_to_market: {
        Row: {
          country_code: string
          created_at: string
          eu_member_state: boolean
          market_code: Database["public"]["Enums"]["market_code"]
        }
        Insert: {
          country_code: string
          created_at?: string
          eu_member_state?: boolean
          market_code: Database["public"]["Enums"]["market_code"]
        }
        Update: {
          country_code?: string
          created_at?: string
          eu_member_state?: boolean
          market_code?: Database["public"]["Enums"]["market_code"]
        }
        Relationships: []
      }
      international_fx_drift_findings: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          detected_at: string
          drift_pct: number
          finding_id: string
          implied_usd_cents: number
          market_code: Database["public"]["Enums"]["market_code"]
          market_msrp_cents: number
          resolution: string | null
          sku: string
          status: string
          us_msrp_cents: number
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          detected_at?: string
          drift_pct: number
          finding_id?: string
          implied_usd_cents: number
          market_code: Database["public"]["Enums"]["market_code"]
          market_msrp_cents: number
          resolution?: string | null
          sku: string
          status?: string
          us_msrp_cents: number
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          detected_at?: string
          drift_pct?: number
          finding_id?: string
          implied_usd_cents?: number
          market_code?: Database["public"]["Enums"]["market_code"]
          market_msrp_cents?: number
          resolution?: string | null
          sku?: string
          status?: string
          us_msrp_cents?: number
        }
        Relationships: []
      }
      international_fx_rate_history: {
        Row: {
          base_currency: Database["public"]["Enums"]["currency_code"]
          quote_currency: Database["public"]["Enums"]["currency_code"]
          rate: number
          rate_date: string
          rate_id: string
          rate_source: string
          retrieved_at: string
        }
        Insert: {
          base_currency: Database["public"]["Enums"]["currency_code"]
          quote_currency: Database["public"]["Enums"]["currency_code"]
          rate: number
          rate_date: string
          rate_id?: string
          rate_source: string
          retrieved_at?: string
        }
        Update: {
          base_currency?: Database["public"]["Enums"]["currency_code"]
          quote_currency?: Database["public"]["Enums"]["currency_code"]
          rate?: number
          rate_date?: string
          rate_id?: string
          rate_source?: string
          retrieved_at?: string
        }
        Relationships: []
      }
      international_market_config: {
        Row: {
          currency_code: Database["public"]["Enums"]["currency_code"]
          default_language: string
          display_tax_label: string
          enforce_88_ending: boolean
          inclusive_of_tax: boolean
          market_code: Database["public"]["Enums"]["market_code"]
          shipping_available: boolean
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          currency_code: Database["public"]["Enums"]["currency_code"]
          default_language?: string
          display_tax_label: string
          enforce_88_ending?: boolean
          inclusive_of_tax: boolean
          market_code: Database["public"]["Enums"]["market_code"]
          shipping_available?: boolean
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          currency_code?: Database["public"]["Enums"]["currency_code"]
          default_language?: string
          display_tax_label?: string
          enforce_88_ending?: boolean
          inclusive_of_tax?: boolean
          market_code?: Database["public"]["Enums"]["market_code"]
          shipping_available?: boolean
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      international_refunds: {
        Row: {
          fx_rate_at_refund: number
          order_id: string
          original_purchase_currency: Database["public"]["Enums"]["currency_code"]
          refund_amount_cents: number
          refund_id: string
          refund_reason: string | null
          refunded_at: string
          refunded_by_user_id: string | null
          status: string
          stripe_refund_id: string
          usd_equivalent_cents_at_refund: number
        }
        Insert: {
          fx_rate_at_refund: number
          order_id: string
          original_purchase_currency: Database["public"]["Enums"]["currency_code"]
          refund_amount_cents: number
          refund_id?: string
          refund_reason?: string | null
          refunded_at?: string
          refunded_by_user_id?: string | null
          status?: string
          stripe_refund_id: string
          usd_equivalent_cents_at_refund: number
        }
        Update: {
          fx_rate_at_refund?: number
          order_id?: string
          original_purchase_currency?: Database["public"]["Enums"]["currency_code"]
          refund_amount_cents?: number
          refund_id?: string
          refund_reason?: string | null
          refunded_at?: string
          refunded_by_user_id?: string | null
          status?: string
          stripe_refund_id?: string
          usd_equivalent_cents_at_refund?: number
        }
        Relationships: []
      }
      international_settlement_daily_reports: {
        Row: {
          discrepancy_flag: boolean
          generated_at: string
          per_currency_json: Json
          report_date: string
          report_id: string
          total_fx_spread_impact_cents: number
          total_usd_settled_cents: number
        }
        Insert: {
          discrepancy_flag?: boolean
          generated_at?: string
          per_currency_json: Json
          report_date: string
          report_id?: string
          total_fx_spread_impact_cents: number
          total_usd_settled_cents: number
        }
        Update: {
          discrepancy_flag?: boolean
          generated_at?: string
          per_currency_json?: Json
          report_date?: string
          report_id?: string
          total_fx_spread_impact_cents?: number
          total_usd_settled_cents?: number
        }
        Relationships: []
      }
      international_tax_registrations: {
        Row: {
          compliance_contact_email: string
          compliance_contact_phone: string | null
          created_at: string
          effective_date: string
          expiration_date: string | null
          jurisdiction_code: string
          next_renewal_statement_due: string | null
          notes: string | null
          registered_entity_name: string
          registration_certificate_sha256: string | null
          registration_certificate_vault_ref: string | null
          registration_id: string
          registration_number: string
          registration_type: string
          status: Database["public"]["Enums"]["tax_registration_status"]
          stripe_tax_registration_id: string | null
          updated_at: string
        }
        Insert: {
          compliance_contact_email: string
          compliance_contact_phone?: string | null
          created_at?: string
          effective_date: string
          expiration_date?: string | null
          jurisdiction_code: string
          next_renewal_statement_due?: string | null
          notes?: string | null
          registered_entity_name: string
          registration_certificate_sha256?: string | null
          registration_certificate_vault_ref?: string | null
          registration_id?: string
          registration_number: string
          registration_type: string
          status?: Database["public"]["Enums"]["tax_registration_status"]
          stripe_tax_registration_id?: string | null
          updated_at?: string
        }
        Update: {
          compliance_contact_email?: string
          compliance_contact_phone?: string | null
          created_at?: string
          effective_date?: string
          expiration_date?: string | null
          jurisdiction_code?: string
          next_renewal_statement_due?: string | null
          notes?: string | null
          registered_entity_name?: string
          registration_certificate_sha256?: string | null
          registration_certificate_vault_ref?: string | null
          registration_id?: string
          registration_number?: string
          registration_type?: string
          status?: Database["public"]["Enums"]["tax_registration_status"]
          stripe_tax_registration_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      international_vat_invoice_sequences: {
        Row: {
          current_value: number
          last_issued_at: string | null
          prefix: string
          sequence_name: string
          updated_at: string
        }
        Insert: {
          current_value?: number
          last_issued_at?: string | null
          prefix?: string
          sequence_name: string
          updated_at?: string
        }
        Update: {
          current_value?: number
          last_issued_at?: string | null
          prefix?: string
          sequence_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      international_vat_invoices: {
        Row: {
          created_at: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          customer_address: string
          customer_name: string
          customer_vat_number: string | null
          customer_vat_validated: boolean | null
          gross_amount_cents: number
          invoice_id: string
          invoice_number: string
          invoice_pdf_sha256: string | null
          invoice_pdf_vault_ref: string | null
          issue_date: string
          jurisdiction_code: string
          net_amount_cents: number
          order_id: string
          reverse_charge_applied: boolean
          status: Database["public"]["Enums"]["vat_invoice_status"]
          superseded_by_invoice_id: string | null
          supplier_vat_number: string
          supply_date: string
          vat_amount_cents: number
          vat_rate_pct: number
          voided_reason: string | null
        }
        Insert: {
          created_at?: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          customer_address: string
          customer_name: string
          customer_vat_number?: string | null
          customer_vat_validated?: boolean | null
          gross_amount_cents: number
          invoice_id?: string
          invoice_number: string
          invoice_pdf_sha256?: string | null
          invoice_pdf_vault_ref?: string | null
          issue_date?: string
          jurisdiction_code: string
          net_amount_cents: number
          order_id: string
          reverse_charge_applied?: boolean
          status?: Database["public"]["Enums"]["vat_invoice_status"]
          superseded_by_invoice_id?: string | null
          supplier_vat_number: string
          supply_date: string
          vat_amount_cents: number
          vat_rate_pct: number
          voided_reason?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: Database["public"]["Enums"]["currency_code"]
          customer_address?: string
          customer_name?: string
          customer_vat_number?: string | null
          customer_vat_validated?: boolean | null
          gross_amount_cents?: number
          invoice_id?: string
          invoice_number?: string
          invoice_pdf_sha256?: string | null
          invoice_pdf_vault_ref?: string | null
          issue_date?: string
          jurisdiction_code?: string
          net_amount_cents?: number
          order_id?: string
          reverse_charge_applied?: boolean
          status?: Database["public"]["Enums"]["vat_invoice_status"]
          superseded_by_invoice_id?: string | null
          supplier_vat_number?: string
          supply_date?: string
          vat_amount_cents?: number
          vat_rate_pct?: number
          voided_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "international_vat_invoices_superseded_by_invoice_id_fkey"
            columns: ["superseded_by_invoice_id"]
            isOneToOne: false
            referencedRelation: "international_vat_invoices"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      international_vat_number_validations: {
        Row: {
          jurisdiction_code: string
          order_id: string | null
          validated_at: string
          validation_id: string
          validation_response_raw: Json | null
          validation_result: string
          validation_service: string
          vat_number: string
        }
        Insert: {
          jurisdiction_code: string
          order_id?: string | null
          validated_at?: string
          validation_id?: string
          validation_response_raw?: Json | null
          validation_result: string
          validation_service: string
          vat_number: string
        }
        Update: {
          jurisdiction_code?: string
          order_id?: string | null
          validated_at?: string
          validation_id?: string
          validation_response_raw?: Json | null
          validation_result?: string
          validation_service?: string
          vat_number?: string
        }
        Relationships: []
      }
      inventory_reorder: {
        Row: {
          annual_demand: number
          annual_holding_cost: number
          annual_ordering_cost: number
          avg_inventory: number
          avg_inventory_value: number
          avg_monthly_demand: number
          category: string
          cogs: number
          created_at: string | null
          daily_demand: number
          days_until_reorder: number
          demand_cv: number
          eoq: number
          id: string
          inventory_turns: number
          lead_time_days: number
          max_stock: number
          moq: number
          name: string
          next_order_qty: number
          next_order_value: number
          orders_per_year: number
          peak_monthly_demand: number
          po_urgency: string
          reorder_point: number
          safety_stock: number
          shelf_life_months: number
          shelf_life_risk: string
          sku: string
          stockout_risk: string
          total_inventory_cost: number
          weeks_of_supply: number
        }
        Insert: {
          annual_demand: number
          annual_holding_cost: number
          annual_ordering_cost: number
          avg_inventory: number
          avg_inventory_value: number
          avg_monthly_demand: number
          category: string
          cogs: number
          created_at?: string | null
          daily_demand: number
          days_until_reorder: number
          demand_cv: number
          eoq: number
          id?: string
          inventory_turns: number
          lead_time_days: number
          max_stock: number
          moq: number
          name: string
          next_order_qty: number
          next_order_value: number
          orders_per_year: number
          peak_monthly_demand: number
          po_urgency: string
          reorder_point: number
          safety_stock: number
          shelf_life_months: number
          shelf_life_risk: string
          sku: string
          stockout_risk: string
          total_inventory_cost: number
          weeks_of_supply: number
        }
        Update: {
          annual_demand?: number
          annual_holding_cost?: number
          annual_ordering_cost?: number
          avg_inventory?: number
          avg_inventory_value?: number
          avg_monthly_demand?: number
          category?: string
          cogs?: number
          created_at?: string | null
          daily_demand?: number
          days_until_reorder?: number
          demand_cv?: number
          eoq?: number
          id?: string
          inventory_turns?: number
          lead_time_days?: number
          max_stock?: number
          moq?: number
          name?: string
          next_order_qty?: number
          next_order_value?: number
          orders_per_year?: number
          peak_monthly_demand?: number
          po_urgency?: string
          reorder_point?: number
          safety_stock?: number
          shelf_life_months?: number
          shelf_life_risk?: string
          sku?: string
          stockout_risk?: string
          total_inventory_cost?: number
          weeks_of_supply?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reorder_sku_fkey"
            columns: ["sku"]
            isOneToOne: true
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      iprs_scan_config: {
        Row: {
          agent_enabled: boolean
          config_id: boolean
          last_heartbeat_at: string | null
          last_scan_at: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          agent_enabled?: boolean
          config_id?: boolean
          last_heartbeat_at?: string | null
          last_scan_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          agent_enabled?: boolean
          config_id?: boolean
          last_heartbeat_at?: string | null
          last_scan_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      iso_internal_audits: {
        Row: {
          audit_date: string
          audit_ref: string
          auditor: string
          auditor_is_independent: boolean
          id: string
          major_findings_count: number
          minor_findings_count: number
          observations_count: number
          recorded_at: string
          recorded_by: string
          scope: string
          storage_key: string | null
          summary: string
        }
        Insert: {
          audit_date: string
          audit_ref: string
          auditor: string
          auditor_is_independent?: boolean
          id?: string
          major_findings_count?: number
          minor_findings_count?: number
          observations_count?: number
          recorded_at?: string
          recorded_by: string
          scope: string
          storage_key?: string | null
          summary: string
        }
        Update: {
          audit_date?: string
          audit_ref?: string
          auditor?: string
          auditor_is_independent?: boolean
          id?: string
          major_findings_count?: number
          minor_findings_count?: number
          observations_count?: number
          recorded_at?: string
          recorded_by?: string
          scope?: string
          storage_key?: string | null
          summary?: string
        }
        Relationships: []
      }
      iso_isms_scope_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          effective_from: string
          effective_until: string | null
          exclusions: Json
          id: string
          included_boundaries: Json
          recorded_at: string
          recorded_by: string
          scope_description: string
          storage_key: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          effective_from: string
          effective_until?: string | null
          exclusions?: Json
          id?: string
          included_boundaries?: Json
          recorded_at?: string
          recorded_by: string
          scope_description: string
          storage_key?: string | null
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          effective_from?: string
          effective_until?: string | null
          exclusions?: Json
          id?: string
          included_boundaries?: Json
          recorded_at?: string
          recorded_by?: string
          scope_description?: string
          storage_key?: string | null
          version?: number
        }
        Relationships: []
      }
      iso_management_reviews: {
        Row: {
          action_items: Json
          attendees: string
          decisions: Json
          id: string
          inputs_summary: string
          recorded_at: string
          recorded_by: string
          review_date: string
          signed_off_at: string | null
          signed_off_by: string | null
          storage_key: string | null
        }
        Insert: {
          action_items?: Json
          attendees: string
          decisions?: Json
          id?: string
          inputs_summary: string
          recorded_at?: string
          recorded_by: string
          review_date: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          storage_key?: string | null
        }
        Update: {
          action_items?: Json
          attendees?: string
          decisions?: Json
          id?: string
          inputs_summary?: string
          recorded_at?: string
          recorded_by?: string
          review_date?: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          storage_key?: string | null
        }
        Relationships: []
      }
      iso_nonconformities: {
        Row: {
          actual_closure_date: string | null
          corrective_action: string | null
          description: string
          id: string
          nc_ref: string
          owner: string | null
          recorded_at: string
          recorded_by: string
          root_cause: string | null
          severity: string
          source: string
          source_ref: string | null
          status: string
          target_date: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          actual_closure_date?: string | null
          corrective_action?: string | null
          description: string
          id?: string
          nc_ref: string
          owner?: string | null
          recorded_at?: string
          recorded_by: string
          root_cause?: string | null
          severity: string
          source: string
          source_ref?: string | null
          status: string
          target_date?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          actual_closure_date?: string | null
          corrective_action?: string | null
          description?: string
          id?: string
          nc_ref?: string
          owner?: string | null
          recorded_at?: string
          recorded_by?: string
          root_cause?: string | null
          severity?: string
          source?: string
          source_ref?: string | null
          status?: string
          target_date?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      iso_risk_register: {
        Row: {
          asset: string | null
          description: string
          id: string
          identified_at: string
          impact: number
          inherent_risk: number | null
          last_reviewed_at: string | null
          likelihood: number
          next_review_date: string | null
          owner: string | null
          recorded_at: string
          recorded_by: string
          residual_impact: number | null
          residual_likelihood: number | null
          residual_risk: number | null
          risk_ref: string
          status: string
          threat: string
          treatment_option: string
          vulnerability: string
        }
        Insert: {
          asset?: string | null
          description: string
          id?: string
          identified_at: string
          impact: number
          inherent_risk?: number | null
          last_reviewed_at?: string | null
          likelihood: number
          next_review_date?: string | null
          owner?: string | null
          recorded_at?: string
          recorded_by: string
          residual_impact?: number | null
          residual_likelihood?: number | null
          residual_risk?: number | null
          risk_ref: string
          status: string
          threat: string
          treatment_option: string
          vulnerability: string
        }
        Update: {
          asset?: string | null
          description?: string
          id?: string
          identified_at?: string
          impact?: number
          inherent_risk?: number | null
          last_reviewed_at?: string | null
          likelihood?: number
          next_review_date?: string | null
          owner?: string | null
          recorded_at?: string
          recorded_by?: string
          residual_impact?: number | null
          residual_likelihood?: number | null
          residual_risk?: number | null
          risk_ref?: string
          status?: string
          threat?: string
          treatment_option?: string
          vulnerability?: string
        }
        Relationships: []
      }
      iso_risk_treatments: {
        Row: {
          actual_completion: string | null
          control_refs: Json
          id: string
          planned_completion: string
          recorded_at: string
          recorded_by: string
          responsible_party: string | null
          risk_id: string
          status: string
          treatment_description: string
        }
        Insert: {
          actual_completion?: string | null
          control_refs?: Json
          id?: string
          planned_completion: string
          recorded_at?: string
          recorded_by: string
          responsible_party?: string | null
          risk_id: string
          status: string
          treatment_description: string
        }
        Update: {
          actual_completion?: string | null
          control_refs?: Json
          id?: string
          planned_completion?: string
          recorded_at?: string
          recorded_by?: string
          responsible_party?: string | null
          risk_id?: string
          status?: string
          treatment_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "iso_risk_treatments_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "iso_risk_register"
            referencedColumns: ["id"]
          },
        ]
      }
      iso_statements_of_applicability: {
        Row: {
          applicability: string
          approved_at: string | null
          approved_by: string | null
          control_ref: string
          effective_from: string
          effective_until: string | null
          id: string
          implementation_status: string
          justification: string
          recorded_at: string
          recorded_by: string
          responsible_party: string | null
          version: number
        }
        Insert: {
          applicability: string
          approved_at?: string | null
          approved_by?: string | null
          control_ref: string
          effective_from: string
          effective_until?: string | null
          id?: string
          implementation_status: string
          justification: string
          recorded_at?: string
          recorded_by: string
          responsible_party?: string | null
          version: number
        }
        Update: {
          applicability?: string
          approved_at?: string | null
          approved_by?: string | null
          control_ref?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          implementation_status?: string
          justification?: string
          recorded_at?: string
          recorded_by?: string
          responsible_party?: string | null
          version?: number
        }
        Relationships: []
      }
      jeffery_directives: {
        Row: {
          acknowledged_at: string | null
          author_id: string
          completed_at: string | null
          created_at: string
          id: string
          instruction: string
          jeffery_acknowledgment: string | null
          jeffery_progress: Json | null
          priority: string
          scope: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          author_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          instruction: string
          jeffery_acknowledgment?: string | null
          jeffery_progress?: Json | null
          priority?: string
          scope?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          author_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          instruction?: string
          jeffery_acknowledgment?: string | null
          jeffery_progress?: Json | null
          priority?: string
          scope?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      jeffery_knowledge_entries: {
        Row: {
          admin_notes: string | null
          admin_verified: boolean | null
          confidence: number | null
          created_at: string
          entry_data: Json
          entry_summary: string | null
          entry_title: string
          entry_type: string
          id: string
          message_id: string | null
          source_name: string | null
          source_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_verified?: boolean | null
          confidence?: number | null
          created_at?: string
          entry_data: Json
          entry_summary?: string | null
          entry_title: string
          entry_type: string
          id?: string
          message_id?: string | null
          source_name?: string | null
          source_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_verified?: boolean | null
          confidence?: number | null
          created_at?: string
          entry_data?: Json
          entry_summary?: string | null
          entry_title?: string
          entry_type?: string
          id?: string
          message_id?: string | null
          source_name?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jeffery_knowledge_entries_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "jeffery_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      jeffery_learning_log: {
        Row: {
          applied_to_agents: string[] | null
          config_changes: Json | null
          created_at: string
          id: string
          lesson: string
          lesson_category: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          applied_to_agents?: string[] | null
          config_changes?: Json | null
          created_at?: string
          id?: string
          lesson: string
          lesson_category?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          applied_to_agents?: string[] | null
          config_changes?: Json | null
          created_at?: string
          id?: string
          lesson?: string
          lesson_category?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: []
      }
      jeffery_message_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          directive_acknowledged: boolean | null
          directive_acknowledged_at: string | null
          id: string
          is_directive: boolean
          message_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          directive_acknowledged?: boolean | null
          directive_acknowledged_at?: string | null
          id?: string
          is_directive?: boolean
          message_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          directive_acknowledged?: boolean | null
          directive_acknowledged_at?: string | null
          id?: string
          is_directive?: boolean
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jeffery_message_comments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "jeffery_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      jeffery_messages: {
        Row: {
          applied_action: Json | null
          applied_at: string | null
          category: string
          created_at: string
          detail: Json
          id: string
          proposed_action: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          source_agent: string | null
          source_context: Json | null
          status: string
          summary: string
          title: string
        }
        Insert: {
          applied_action?: Json | null
          applied_at?: string | null
          category: string
          created_at?: string
          detail?: Json
          id?: string
          proposed_action?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          source_agent?: string | null
          source_context?: Json | null
          status?: string
          summary: string
          title: string
        }
        Update: {
          applied_action?: Json | null
          applied_at?: string | null
          category?: string
          created_at?: string
          detail?: Json
          id?: string
          proposed_action?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          source_agent?: string | null
          source_context?: Json | null
          status?: string
          summary?: string
          title?: string
        }
        Relationships: []
      }
      kit_registrations: {
        Row: {
          id: string
          kit_barcode: string
          panel_type: string
          registered_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          kit_barcode: string
          panel_type: string
          registered_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          kit_barcode?: string
          panel_type?: string
          registered_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kit_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      kpi_library: {
        Row: {
          comparison_kpi_ids: string[]
          computation_type: string
          created_at: string
          definition_md: string
          direction_of_good: string
          display_format: string
          display_name: string
          kpi_id: string
          owner_role: string
          source_prompt: string
          source_query_sha256: string
          source_table: string
          status: string
          unit: string
          updated_at: string
          version: number
        }
        Insert: {
          comparison_kpi_ids?: string[]
          computation_type: string
          created_at?: string
          definition_md: string
          direction_of_good: string
          display_format: string
          display_name: string
          kpi_id: string
          owner_role: string
          source_prompt: string
          source_query_sha256: string
          source_table: string
          status?: string
          unit: string
          updated_at?: string
          version: number
        }
        Update: {
          comparison_kpi_ids?: string[]
          computation_type?: string
          created_at?: string
          definition_md?: string
          direction_of_good?: string
          display_format?: string
          display_name?: string
          kpi_id?: string
          owner_role?: string
          source_prompt?: string
          source_query_sha256?: string
          source_table?: string
          status?: string
          unit?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      launch_phases: {
        Row: {
          activation_status: string
          actual_activation_date: string | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          metadata: Json
          phase_type: string
          sort_order: number
          target_activation_date: string | null
          updated_at: string
        }
        Insert: {
          activation_status?: string
          actual_activation_date?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          id: string
          metadata?: Json
          phase_type: string
          sort_order: number
          target_activation_date?: string | null
          updated_at?: string
        }
        Update: {
          activation_status?: string
          actual_activation_date?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          metadata?: Json
          phase_type?: string
          sort_order?: number
          target_activation_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legal_case_settlements: {
        Row: {
          approval_tier: string
          approved_at: string | null
          approved_by: string | null
          case_id: string
          ceo_approved_at: string | null
          ceo_approved_by: string | null
          cfo_approved_at: string | null
          cfo_approved_by: string | null
          currency: string
          drafted_by_counsel_id: string | null
          executed_at: string | null
          future_conduct_obligations_json: Json
          monetary_amount_cents: number
          nda_required: boolean
          nda_vault_ref: string | null
          notes: string | null
          payment_method: string | null
          payment_received_at: string | null
          release_scope: string
          settlement_date: string
          settlement_id: string
        }
        Insert: {
          approval_tier: string
          approved_at?: string | null
          approved_by?: string | null
          case_id: string
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          cfo_approved_at?: string | null
          cfo_approved_by?: string | null
          currency?: string
          drafted_by_counsel_id?: string | null
          executed_at?: string | null
          future_conduct_obligations_json?: Json
          monetary_amount_cents?: number
          nda_required?: boolean
          nda_vault_ref?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_received_at?: string | null
          release_scope?: string
          settlement_date: string
          settlement_id?: string
        }
        Update: {
          approval_tier?: string
          approved_at?: string | null
          approved_by?: string | null
          case_id?: string
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          cfo_approved_at?: string | null
          cfo_approved_by?: string | null
          currency?: string
          drafted_by_counsel_id?: string | null
          executed_at?: string | null
          future_conduct_obligations_json?: Json
          monetary_amount_cents?: number
          nda_required?: boolean
          nda_vault_ref?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_received_at?: string | null
          release_scope?: string
          settlement_date?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_case_settlements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "legal_case_settlements_drafted_by_counsel_id_fkey"
            columns: ["drafted_by_counsel_id"]
            isOneToOne: false
            referencedRelation: "legal_outside_counsel"
            referencedColumns: ["counsel_id"]
          },
        ]
      }
      legal_case_timeline: {
        Row: {
          actor_user_id: string | null
          case_id: string
          event_at: string
          event_description: string
          event_id: string
          event_type: string
          metadata_json: Json
          related_entity_id: string | null
          related_entity_type: string | null
        }
        Insert: {
          actor_user_id?: string | null
          case_id: string
          event_at?: string
          event_description: string
          event_id?: string
          event_type: string
          metadata_json?: Json
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Update: {
          actor_user_id?: string | null
          case_id?: string
          event_at?: string
          event_description?: string
          event_id?: string
          event_type?: string
          metadata_json?: Json
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_case_timeline_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      legal_counsel_engagements: {
        Row: {
          activated_at: string | null
          approved_budget_cents: number | null
          briefing_packet_vault_ref: string | null
          case_id: string
          ceo_approved_at: string | null
          ceo_approved_by: string | null
          cfo_approved_at: string | null
          cfo_approved_by: string | null
          completed_at: string | null
          counsel_id: string
          engagement_id: string
          estimated_budget_cents: number
          notes: string | null
          proposed_at: string
          proposed_by: string | null
          scope_description: string
          status: Database["public"]["Enums"]["counsel_engagement_status"]
          total_invoiced_cents: number
        }
        Insert: {
          activated_at?: string | null
          approved_budget_cents?: number | null
          briefing_packet_vault_ref?: string | null
          case_id: string
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          cfo_approved_at?: string | null
          cfo_approved_by?: string | null
          completed_at?: string | null
          counsel_id: string
          engagement_id?: string
          estimated_budget_cents: number
          notes?: string | null
          proposed_at?: string
          proposed_by?: string | null
          scope_description: string
          status?: Database["public"]["Enums"]["counsel_engagement_status"]
          total_invoiced_cents?: number
        }
        Update: {
          activated_at?: string | null
          approved_budget_cents?: number | null
          briefing_packet_vault_ref?: string | null
          case_id?: string
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          cfo_approved_at?: string | null
          cfo_approved_by?: string | null
          completed_at?: string | null
          counsel_id?: string
          engagement_id?: string
          estimated_budget_cents?: number
          notes?: string | null
          proposed_at?: string
          proposed_by?: string | null
          scope_description?: string
          status?: Database["public"]["Enums"]["counsel_engagement_status"]
          total_invoiced_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_counsel_engagements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "legal_counsel_engagements_counsel_id_fkey"
            columns: ["counsel_id"]
            isOneToOne: false
            referencedRelation: "legal_outside_counsel"
            referencedColumns: ["counsel_id"]
          },
        ]
      }
      legal_counterparties: {
        Row: {
          contact_info_vault_ref: string | null
          counterparty_id: string
          counterparty_type: Database["public"]["Enums"]["counterparty_type"]
          display_label: string
          disputed_identity: boolean
          first_seen_at: string
          identity_confidence: number
          jurisdictions: string[] | null
          last_activity_at: string
          marketplace_handles: Json
          notes: string | null
          primary_jurisdiction: string | null
          total_cases_count: number
          total_settlement_cents: number
          verified_business_reg_id: string | null
          verified_domain: string | null
        }
        Insert: {
          contact_info_vault_ref?: string | null
          counterparty_id?: string
          counterparty_type?: Database["public"]["Enums"]["counterparty_type"]
          display_label: string
          disputed_identity?: boolean
          first_seen_at?: string
          identity_confidence?: number
          jurisdictions?: string[] | null
          last_activity_at?: string
          marketplace_handles?: Json
          notes?: string | null
          primary_jurisdiction?: string | null
          total_cases_count?: number
          total_settlement_cents?: number
          verified_business_reg_id?: string | null
          verified_domain?: string | null
        }
        Update: {
          contact_info_vault_ref?: string | null
          counterparty_id?: string
          counterparty_type?: Database["public"]["Enums"]["counterparty_type"]
          display_label?: string
          disputed_identity?: boolean
          first_seen_at?: string
          identity_confidence?: number
          jurisdictions?: string[] | null
          last_activity_at?: string
          marketplace_handles?: Json
          notes?: string | null
          primary_jurisdiction?: string | null
          total_cases_count?: number
          total_settlement_cents?: number
          verified_business_reg_id?: string | null
          verified_domain?: string | null
        }
        Relationships: []
      }
      legal_counterparty_merge_history: {
        Row: {
          merge_id: string
          merge_reason: string
          merged_at: string
          merged_by: string
          merged_counterparty_id: string
          merged_identifiers_json: Json | null
          surviving_counterparty_id: string
          unmerge_reason: string | null
          unmerged_at: string | null
          unmerged_by: string | null
        }
        Insert: {
          merge_id?: string
          merge_reason: string
          merged_at?: string
          merged_by: string
          merged_counterparty_id: string
          merged_identifiers_json?: Json | null
          surviving_counterparty_id: string
          unmerge_reason?: string | null
          unmerged_at?: string | null
          unmerged_by?: string | null
        }
        Update: {
          merge_id?: string
          merge_reason?: string
          merged_at?: string
          merged_by?: string
          merged_counterparty_id?: string
          merged_identifiers_json?: Json | null
          surviving_counterparty_id?: string
          unmerge_reason?: string | null
          unmerged_at?: string | null
          unmerged_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_counterparty_merge_history_surviving_counterparty_id_fkey"
            columns: ["surviving_counterparty_id"]
            isOneToOne: false
            referencedRelation: "legal_counterparties"
            referencedColumns: ["counterparty_id"]
          },
        ]
      }
      legal_dmca_counter_notices: {
        Row: {
          counter_notice_content_vault_ref: string | null
          counter_notice_id: string
          notes: string | null
          original_filing_id: string
          received_at: string
          resolved_at: string | null
          response_action: string | null
          response_deadline: string
        }
        Insert: {
          counter_notice_content_vault_ref?: string | null
          counter_notice_id?: string
          notes?: string | null
          original_filing_id: string
          received_at?: string
          resolved_at?: string | null
          response_action?: string | null
          response_deadline: string
        }
        Update: {
          counter_notice_content_vault_ref?: string | null
          counter_notice_id?: string
          notes?: string | null
          original_filing_id?: string
          received_at?: string
          resolved_at?: string | null
          response_action?: string | null
          response_deadline?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_dmca_counter_notices_original_fk"
            columns: ["original_filing_id"]
            isOneToOne: false
            referencedRelation: "legal_dmca_filings"
            referencedColumns: ["filing_id"]
          },
        ]
      }
      legal_dmca_filings: {
        Row: {
          copyright_registration: string | null
          copyrighted_work_ref: string
          counter_notice_filing_id: string | null
          enforcement_action_id: string
          filed_at: string | null
          filing_id: string
          host_platform: string
          infringing_url: string
          notes: string | null
          platform_ticket_id: string | null
          signing_officer: string
          statutory_elements_json: Json
          takedown_effected_at: string | null
        }
        Insert: {
          copyright_registration?: string | null
          copyrighted_work_ref: string
          counter_notice_filing_id?: string | null
          enforcement_action_id: string
          filed_at?: string | null
          filing_id?: string
          host_platform: string
          infringing_url: string
          notes?: string | null
          platform_ticket_id?: string | null
          signing_officer: string
          statutory_elements_json: Json
          takedown_effected_at?: string | null
        }
        Update: {
          copyright_registration?: string | null
          copyrighted_work_ref?: string
          counter_notice_filing_id?: string | null
          enforcement_action_id?: string
          filed_at?: string | null
          filing_id?: string
          host_platform?: string
          infringing_url?: string
          notes?: string | null
          platform_ticket_id?: string | null
          signing_officer?: string
          statutory_elements_json?: Json
          takedown_effected_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_dmca_filings_counter_notice_filing_id_fkey"
            columns: ["counter_notice_filing_id"]
            isOneToOne: false
            referencedRelation: "legal_dmca_counter_notices"
            referencedColumns: ["counter_notice_id"]
          },
          {
            foreignKeyName: "legal_dmca_filings_enforcement_action_id_fkey"
            columns: ["enforcement_action_id"]
            isOneToOne: false
            referencedRelation: "legal_enforcement_actions"
            referencedColumns: ["action_id"]
          },
        ]
      }
      legal_enforcement_actions: {
        Row: {
          action_id: string
          action_type: Database["public"]["Enums"]["enforcement_action_type"]
          approval_confirmation_text: string | null
          approved_at: string | null
          approved_by: string | null
          case_id: string
          created_at: string
          draft_content_sha256: string | null
          draft_storage_path: string | null
          drafted_at: string
          drafted_by: string | null
          external_reference_id: string | null
          final_content_sha256: string | null
          final_storage_path: string | null
          metadata_json: Json
          notes: string | null
          response_classification: string | null
          response_deadline: string | null
          response_received_at: string | null
          sent_at: string | null
          sent_via: string | null
          status: Database["public"]["Enums"]["enforcement_action_status"]
          target_listing_url: string | null
          target_platform: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          action_id?: string
          action_type: Database["public"]["Enums"]["enforcement_action_type"]
          approval_confirmation_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          case_id: string
          created_at?: string
          draft_content_sha256?: string | null
          draft_storage_path?: string | null
          drafted_at?: string
          drafted_by?: string | null
          external_reference_id?: string | null
          final_content_sha256?: string | null
          final_storage_path?: string | null
          metadata_json?: Json
          notes?: string | null
          response_classification?: string | null
          response_deadline?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          status?: Database["public"]["Enums"]["enforcement_action_status"]
          target_listing_url?: string | null
          target_platform?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          action_id?: string
          action_type?: Database["public"]["Enums"]["enforcement_action_type"]
          approval_confirmation_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          case_id?: string
          created_at?: string
          draft_content_sha256?: string | null
          draft_storage_path?: string | null
          drafted_at?: string
          drafted_by?: string | null
          external_reference_id?: string | null
          final_content_sha256?: string | null
          final_storage_path?: string | null
          metadata_json?: Json
          notes?: string | null
          response_classification?: string | null
          response_deadline?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          status?: Database["public"]["Enums"]["enforcement_action_status"]
          target_listing_url?: string | null
          target_platform?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_enforcement_actions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "legal_enforcement_actions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "legal_templates_library"
            referencedColumns: ["template_id"]
          },
        ]
      }
      legal_investigation_cases: {
        Row: {
          affected_brand_ids: string[]
          affected_product_ids: string[]
          assigned_reviewer_id: string | null
          bucket: Database["public"]["Enums"]["legal_case_bucket"]
          bucket_confidence_score: number | null
          case_id: string
          case_label: string
          classified_at: string | null
          closed_at: string | null
          counterparty_id: string | null
          created_at: string
          estimated_damages_cents: number | null
          has_customs_activity: boolean
          has_medical_claim_flag: boolean
          intake_at: string
          medical_director_reviewed_at: string | null
          metadata_json: Json
          notes: string | null
          priority: Database["public"]["Enums"]["legal_case_priority"]
          resolved_at: string | null
          retention_until: string | null
          source_violation_id: string | null
          state: Database["public"]["Enums"]["legal_case_state"]
          updated_at: string
        }
        Insert: {
          affected_brand_ids?: string[]
          affected_product_ids?: string[]
          assigned_reviewer_id?: string | null
          bucket?: Database["public"]["Enums"]["legal_case_bucket"]
          bucket_confidence_score?: number | null
          case_id?: string
          case_label: string
          classified_at?: string | null
          closed_at?: string | null
          counterparty_id?: string | null
          created_at?: string
          estimated_damages_cents?: number | null
          has_customs_activity?: boolean
          has_medical_claim_flag?: boolean
          intake_at?: string
          medical_director_reviewed_at?: string | null
          metadata_json?: Json
          notes?: string | null
          priority?: Database["public"]["Enums"]["legal_case_priority"]
          resolved_at?: string | null
          retention_until?: string | null
          source_violation_id?: string | null
          state?: Database["public"]["Enums"]["legal_case_state"]
          updated_at?: string
        }
        Update: {
          affected_brand_ids?: string[]
          affected_product_ids?: string[]
          assigned_reviewer_id?: string | null
          bucket?: Database["public"]["Enums"]["legal_case_bucket"]
          bucket_confidence_score?: number | null
          case_id?: string
          case_label?: string
          classified_at?: string | null
          closed_at?: string | null
          counterparty_id?: string | null
          created_at?: string
          estimated_damages_cents?: number | null
          has_customs_activity?: boolean
          has_medical_claim_flag?: boolean
          intake_at?: string
          medical_director_reviewed_at?: string | null
          metadata_json?: Json
          notes?: string | null
          priority?: Database["public"]["Enums"]["legal_case_priority"]
          resolved_at?: string | null
          retention_until?: string | null
          source_violation_id?: string | null
          state?: Database["public"]["Enums"]["legal_case_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_investigation_cases_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "legal_counterparties"
            referencedColumns: ["counterparty_id"]
          },
        ]
      }
      legal_investigation_evidence: {
        Row: {
          artifact_type: Database["public"]["Enums"]["evidence_artifact_type"]
          captured_at: string
          captured_by: string | null
          captured_via: string | null
          case_id: string
          chain_of_custody_json: Json
          content_sha256: string
          description: string | null
          evidence_id: string
          file_size_bytes: number | null
          mime_type: string | null
          redacted_for_filing: boolean
          redacted_storage_path: string | null
          storage_path: string
        }
        Insert: {
          artifact_type: Database["public"]["Enums"]["evidence_artifact_type"]
          captured_at?: string
          captured_by?: string | null
          captured_via?: string | null
          case_id: string
          chain_of_custody_json?: Json
          content_sha256: string
          description?: string | null
          evidence_id?: string
          file_size_bytes?: number | null
          mime_type?: string | null
          redacted_for_filing?: boolean
          redacted_storage_path?: string | null
          storage_path: string
        }
        Update: {
          artifact_type?: Database["public"]["Enums"]["evidence_artifact_type"]
          captured_at?: string
          captured_by?: string | null
          captured_via?: string | null
          case_id?: string
          chain_of_custody_json?: Json
          content_sha256?: string
          description?: string | null
          evidence_id?: string
          file_size_bytes?: number | null
          mime_type?: string | null
          redacted_for_filing?: boolean
          redacted_storage_path?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_investigation_evidence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      legal_marketplace_complaints: {
        Row: {
          complaint_id: string
          complaint_type: string
          counter_notice_received: boolean
          counter_notice_received_at: string | null
          enforcement_action_id: string
          listing_removed_at: string | null
          listing_url: string
          listing_verified_removed_at: string | null
          notes: string | null
          platform: string
          platform_complaint_id: string | null
          platform_response_at: string | null
          platform_response_text: string | null
          platform_status: string | null
          submitted_at: string | null
        }
        Insert: {
          complaint_id?: string
          complaint_type: string
          counter_notice_received?: boolean
          counter_notice_received_at?: string | null
          enforcement_action_id: string
          listing_removed_at?: string | null
          listing_url: string
          listing_verified_removed_at?: string | null
          notes?: string | null
          platform: string
          platform_complaint_id?: string | null
          platform_response_at?: string | null
          platform_response_text?: string | null
          platform_status?: string | null
          submitted_at?: string | null
        }
        Update: {
          complaint_id?: string
          complaint_type?: string
          counter_notice_received?: boolean
          counter_notice_received_at?: string | null
          enforcement_action_id?: string
          listing_removed_at?: string | null
          listing_url?: string
          listing_verified_removed_at?: string | null
          notes?: string | null
          platform?: string
          platform_complaint_id?: string | null
          platform_response_at?: string | null
          platform_response_text?: string | null
          platform_status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_marketplace_complaints_enforcement_action_id_fkey"
            columns: ["enforcement_action_id"]
            isOneToOne: false
            referencedRelation: "legal_enforcement_actions"
            referencedColumns: ["action_id"]
          },
        ]
      }
      legal_marketplace_integrations: {
        Row: {
          api_access_available: boolean
          api_credentials_vault_ref: string | null
          complaint_submission_url: string | null
          created_at: string
          enrolled_in_ip_program: boolean
          enrollment_reference: string | null
          integration_id: string
          last_verified_at: string | null
          notes: string | null
          platform: string
          updated_at: string
        }
        Insert: {
          api_access_available?: boolean
          api_credentials_vault_ref?: string | null
          complaint_submission_url?: string | null
          created_at?: string
          enrolled_in_ip_program?: boolean
          enrollment_reference?: string | null
          integration_id?: string
          last_verified_at?: string | null
          notes?: string | null
          platform: string
          updated_at?: string
        }
        Update: {
          api_access_available?: boolean
          api_credentials_vault_ref?: string | null
          complaint_submission_url?: string | null
          created_at?: string
          enrolled_in_ip_program?: boolean
          enrollment_reference?: string | null
          integration_id?: string
          last_verified_at?: string | null
          notes?: string | null
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_operations_audit_log: {
        Row: {
          action_category: string
          action_verb: string
          actor_role: string | null
          actor_user_id: string | null
          after_state_json: Json | null
          audit_id: string
          before_state_json: Json | null
          case_id: string | null
          context_json: Json | null
          hash_verified: boolean | null
          ip_address: unknown
          occurred_at: string
          target_id: string | null
          target_table: string
          user_agent: string | null
        }
        Insert: {
          action_category: string
          action_verb: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_state_json?: Json | null
          audit_id?: string
          before_state_json?: Json | null
          case_id?: string | null
          context_json?: Json | null
          hash_verified?: boolean | null
          ip_address?: unknown
          occurred_at?: string
          target_id?: string | null
          target_table: string
          user_agent?: string | null
        }
        Update: {
          action_category?: string
          action_verb?: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_state_json?: Json | null
          audit_id?: string
          before_state_json?: Json | null
          case_id?: string | null
          context_json?: Json | null
          hash_verified?: boolean | null
          ip_address?: unknown
          occurred_at?: string
          target_id?: string | null
          target_table?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_operations_audit_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      legal_outside_counsel: {
        Row: {
          active: boolean
          attorney_name: string
          billing_rate_cents: number | null
          contact_info_vault_ref: string
          counsel_id: string
          created_at: string
          engagement_letter_vault_ref: string | null
          firm_name: string
          jurisdictions: string[]
          notes: string | null
          performance_history_json: Json
          retainer_amount_cents: number | null
          retainer_required: boolean
          specialty: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          attorney_name: string
          billing_rate_cents?: number | null
          contact_info_vault_ref: string
          counsel_id?: string
          created_at?: string
          engagement_letter_vault_ref?: string | null
          firm_name: string
          jurisdictions?: string[]
          notes?: string | null
          performance_history_json?: Json
          retainer_amount_cents?: number | null
          retainer_required?: boolean
          specialty?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          attorney_name?: string
          billing_rate_cents?: number | null
          contact_info_vault_ref?: string
          counsel_id?: string
          created_at?: string
          engagement_letter_vault_ref?: string | null
          firm_name?: string
          jurisdictions?: string[]
          notes?: string | null
          performance_history_json?: Json
          retainer_amount_cents?: number | null
          retainer_required?: boolean
          specialty?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      legal_privilege_grants: {
        Row: {
          active: boolean
          case_id: string
          grant_id: string
          granted_at: string
          granted_by: string
          notes: string | null
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          case_id: string
          grant_id?: string
          granted_at?: string
          granted_by: string
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          case_id?: string
          grant_id?: string
          granted_at?: string
          granted_by?: string
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_privilege_grants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      legal_privileged_communications: {
        Row: {
          attachment_vault_refs: string[]
          body_vault_ref: string
          case_id: string
          comm_id: string
          communication_at: string
          direction: Database["public"]["Enums"]["privileged_comms_direction"]
          engagement_id: string | null
          from_identifier_vault_ref: string | null
          notes: string | null
          privilege_scope: string
          subject: string | null
          to_identifier_vault_refs: string[]
        }
        Insert: {
          attachment_vault_refs?: string[]
          body_vault_ref: string
          case_id: string
          comm_id?: string
          communication_at?: string
          direction: Database["public"]["Enums"]["privileged_comms_direction"]
          engagement_id?: string | null
          from_identifier_vault_ref?: string | null
          notes?: string | null
          privilege_scope?: string
          subject?: string | null
          to_identifier_vault_refs?: string[]
        }
        Update: {
          attachment_vault_refs?: string[]
          body_vault_ref?: string
          case_id?: string
          comm_id?: string
          communication_at?: string
          direction?: Database["public"]["Enums"]["privileged_comms_direction"]
          engagement_id?: string | null
          from_identifier_vault_ref?: string | null
          notes?: string | null
          privilege_scope?: string
          subject?: string | null
          to_identifier_vault_refs?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "legal_privileged_communications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_investigation_cases"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "legal_privileged_communications_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "legal_counsel_engagements"
            referencedColumns: ["engagement_id"]
          },
        ]
      }
      legal_templates_library: {
        Row: {
          applicable_buckets: Database["public"]["Enums"]["legal_case_bucket"][]
          applicable_jurisdictions: string[]
          created_at: string
          last_counsel_review_at: string | null
          last_counsel_reviewer: string | null
          markdown_body: string
          notes: string | null
          required_merge_fields: string[]
          status: Database["public"]["Enums"]["template_status"]
          template_family: string
          template_id: string
          version: string
        }
        Insert: {
          applicable_buckets: Database["public"]["Enums"]["legal_case_bucket"][]
          applicable_jurisdictions?: string[]
          created_at?: string
          last_counsel_review_at?: string | null
          last_counsel_reviewer?: string | null
          markdown_body: string
          notes?: string | null
          required_merge_fields?: string[]
          status?: Database["public"]["Enums"]["template_status"]
          template_family: string
          template_id?: string
          version: string
        }
        Update: {
          applicable_buckets?: Database["public"]["Enums"]["legal_case_bucket"][]
          applicable_jurisdictions?: string[]
          created_at?: string
          last_counsel_review_at?: string | null
          last_counsel_reviewer?: string | null
          markdown_body?: string
          notes?: string | null
          required_merge_fields?: string[]
          status?: Database["public"]["Enums"]["template_status"]
          template_family?: string
          template_id?: string
          version?: string
        }
        Relationships: []
      }
      level_4_enrollments: {
        Row: {
          created_at: string
          enrolled_at: string
          exclusive_use_agreement_signed: boolean
          exclusive_use_agreement_signed_at: string | null
          exclusive_use_agreement_url: string | null
          first_formulation_approved_at: string | null
          first_formulation_production_delivered_at: string | null
          id: string
          level_3_delivered_order_id: string | null
          level_3_delivered_verified_at: string | null
          level_3_enrollment_id: string | null
          lifetime_formulations_approved: number
          lifetime_formulations_developed: number
          lifetime_production_orders: number
          lifetime_production_revenue_cents: number
          master_practitioner_cert_id: string | null
          master_practitioner_verified_at: string | null
          metadata: Json
          practitioner_id: string
          status: string
          suspended_at: string | null
          suspended_reason: string | null
          terminated_at: string | null
          terminated_reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enrolled_at?: string
          exclusive_use_agreement_signed?: boolean
          exclusive_use_agreement_signed_at?: string | null
          exclusive_use_agreement_url?: string | null
          first_formulation_approved_at?: string | null
          first_formulation_production_delivered_at?: string | null
          id?: string
          level_3_delivered_order_id?: string | null
          level_3_delivered_verified_at?: string | null
          level_3_enrollment_id?: string | null
          lifetime_formulations_approved?: number
          lifetime_formulations_developed?: number
          lifetime_production_orders?: number
          lifetime_production_revenue_cents?: number
          master_practitioner_cert_id?: string | null
          master_practitioner_verified_at?: string | null
          metadata?: Json
          practitioner_id: string
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          terminated_at?: string | null
          terminated_reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enrolled_at?: string
          exclusive_use_agreement_signed?: boolean
          exclusive_use_agreement_signed_at?: string | null
          exclusive_use_agreement_url?: string | null
          first_formulation_approved_at?: string | null
          first_formulation_production_delivered_at?: string | null
          id?: string
          level_3_delivered_order_id?: string | null
          level_3_delivered_verified_at?: string | null
          level_3_enrollment_id?: string | null
          lifetime_formulations_approved?: number
          lifetime_formulations_developed?: number
          lifetime_production_orders?: number
          lifetime_production_revenue_cents?: number
          master_practitioner_cert_id?: string | null
          master_practitioner_verified_at?: string | null
          metadata?: Json
          practitioner_id?: string
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          terminated_at?: string | null
          terminated_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_4_enrollments_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: true
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "level_4_enrollments_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: true
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "level_4_enrollments_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: true
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "level_4_enrollments_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: true
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_4_enrollments_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: true
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "level_4_enrollments_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: true
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "level_4_enrollments_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: true
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      level_4_parameters: {
        Row: {
          admin_fee_on_refund_cents: number
          development_fee_cents: number
          expedited_surcharge_percent: number
          id: string
          manufacturing_overhead_percent: number
          markup_percent: number
          medical_review_fee_cents: number
          minimum_order_value_cents: number
          moq_per_formulation: number
          packaging_labor_percent: number
          qa_qc_percent: number
          updated_at: string
        }
        Insert: {
          admin_fee_on_refund_cents?: number
          development_fee_cents?: number
          expedited_surcharge_percent?: number
          id?: string
          manufacturing_overhead_percent?: number
          markup_percent?: number
          medical_review_fee_cents?: number
          minimum_order_value_cents?: number
          moq_per_formulation?: number
          packaging_labor_percent?: number
          qa_qc_percent?: number
          updated_at?: string
        }
        Update: {
          admin_fee_on_refund_cents?: number
          development_fee_cents?: number
          expedited_surcharge_percent?: number
          id?: string
          manufacturing_overhead_percent?: number
          markup_percent?: number
          medical_review_fee_cents?: number
          minimum_order_value_cents?: number
          moq_per_formulation?: number
          packaging_labor_percent?: number
          qa_qc_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      manual_customers: {
        Row: {
          created_at: string
          display_name: string
          id_verification_doc_path: string
          manual_customer_id: string
          practitioner_id: string
          relationship_notes: string | null
          verified_by_admin_at: string | null
          verified_by_admin_user: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id_verification_doc_path: string
          manual_customer_id?: string
          practitioner_id: string
          relationship_notes?: string | null
          verified_by_admin_at?: string | null
          verified_by_admin_user?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id_verification_doc_path?: string
          manual_customer_id?: string
          practitioner_id?: string
          relationship_notes?: string | null
          verified_by_admin_at?: string | null
          verified_by_admin_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_customers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "manual_customers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "manual_customers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "manual_customers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_customers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "manual_customers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "manual_customers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      map_compliance_scores: {
        Row: {
          black_violations_90d: number
          calculated_at: string
          calculated_date: string
          days_since_last_violation: number
          map_compliance_tier: string
          orange_violations_90d: number
          practitioner_id: string
          red_violations_90d: number
          score: number
          score_id: string
          self_reported_remediations: number
          yellow_violations_90d: number
        }
        Insert: {
          black_violations_90d?: number
          calculated_at?: string
          calculated_date?: string
          days_since_last_violation?: number
          map_compliance_tier: string
          orange_violations_90d?: number
          practitioner_id: string
          red_violations_90d?: number
          score: number
          score_id?: string
          self_reported_remediations?: number
          yellow_violations_90d?: number
        }
        Update: {
          black_violations_90d?: number
          calculated_at?: string
          calculated_date?: string
          days_since_last_violation?: number
          map_compliance_tier?: string
          orange_violations_90d?: number
          practitioner_id?: string
          red_violations_90d?: number
          score?: number
          score_id?: string
          self_reported_remediations?: number
          yellow_violations_90d?: number
        }
        Relationships: [
          {
            foreignKeyName: "map_compliance_scores_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_compliance_scores_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_compliance_scores_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_compliance_scores_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_compliance_scores_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_compliance_scores_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_compliance_scores_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      map_policies: {
        Row: {
          created_at: string
          ingredient_cost_floor_cents: number
          map_enforcement_start_date: string
          map_exemption_window_end: string | null
          map_exemption_window_start: string | null
          map_minimum_discount_pct_allowed: number
          map_price_cents: number
          map_published_url: string | null
          msrp_cents: number
          policy_id: string
          product_id: string
          tier: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          ingredient_cost_floor_cents: number
          map_enforcement_start_date: string
          map_exemption_window_end?: string | null
          map_exemption_window_start?: string | null
          map_minimum_discount_pct_allowed?: number
          map_price_cents: number
          map_published_url?: string | null
          msrp_cents: number
          policy_id?: string
          product_id: string
          tier: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          ingredient_cost_floor_cents?: number
          map_enforcement_start_date?: string
          map_exemption_window_end?: string | null
          map_exemption_window_start?: string | null
          map_minimum_discount_pct_allowed?: number
          map_price_cents?: number
          map_published_url?: string | null
          msrp_cents?: number
          policy_id?: string
          product_id?: string
          tier?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "map_policies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      map_policy_change_log: {
        Row: {
          admin_2fa_verified_at: string
          change_id: string
          change_type: string
          changed_by: string
          created_at: string
          justification: string
          new_value: Json
          policy_id: string
          previous_value: Json | null
        }
        Insert: {
          admin_2fa_verified_at: string
          change_id?: string
          change_type: string
          changed_by: string
          created_at?: string
          justification: string
          new_value: Json
          policy_id: string
          previous_value?: Json | null
        }
        Update: {
          admin_2fa_verified_at?: string
          change_id?: string
          change_type?: string
          changed_by?: string
          created_at?: string
          justification?: string
          new_value?: Json
          policy_id?: string
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "map_policy_change_log_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "map_policies"
            referencedColumns: ["policy_id"]
          },
        ]
      }
      map_price_observations: {
        Row: {
          created_at: string
          flash_sale_ends_at: string | null
          is_flash_sale: boolean
          observation_id: string
          observed_at: string
          observed_price_cents: number
          observer_confidence: number
          parser_version: string
          phase: number
          post_context_storage_path: string | null
          practitioner_confidence: number | null
          practitioner_id: string | null
          product_id: string
          raw_html_storage_path: string | null
          screenshot_storage_path: string | null
          source: string
          source_url: string
        }
        Insert: {
          created_at?: string
          flash_sale_ends_at?: string | null
          is_flash_sale?: boolean
          observation_id?: string
          observed_at?: string
          observed_price_cents: number
          observer_confidence: number
          parser_version: string
          phase?: number
          post_context_storage_path?: string | null
          practitioner_confidence?: number | null
          practitioner_id?: string | null
          product_id: string
          raw_html_storage_path?: string | null
          screenshot_storage_path?: string | null
          source: string
          source_url: string
        }
        Update: {
          created_at?: string
          flash_sale_ends_at?: string | null
          is_flash_sale?: boolean
          observation_id?: string
          observed_at?: string
          observed_price_cents?: number
          observer_confidence?: number
          parser_version?: string
          phase?: number
          post_context_storage_path?: string | null
          practitioner_confidence?: number | null
          practitioner_id?: string | null
          product_id?: string
          raw_html_storage_path?: string | null
          screenshot_storage_path?: string | null
          source?: string
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_price_observations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_price_observations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_price_observations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_price_observations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_price_observations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_price_observations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_price_observations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_price_observations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      map_remediation_evidence: {
        Row: {
          created_at: string
          evidence_id: string
          practitioner_id: string
          practitioner_notes: string | null
          scanned_price_cents: number | null
          screenshot_storage_path: string
          url_scanned: string
          verified_at: string | null
          verified_by_system: boolean
          violation_id: string
        }
        Insert: {
          created_at?: string
          evidence_id?: string
          practitioner_id: string
          practitioner_notes?: string | null
          scanned_price_cents?: number | null
          screenshot_storage_path: string
          url_scanned: string
          verified_at?: string | null
          verified_by_system?: boolean
          violation_id: string
        }
        Update: {
          created_at?: string
          evidence_id?: string
          practitioner_id?: string
          practitioner_notes?: string | null
          scanned_price_cents?: number | null
          screenshot_storage_path?: string
          url_scanned?: string
          verified_at?: string | null
          verified_by_system?: boolean
          violation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_remediation_evidence_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_remediation_evidence_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_remediation_evidence_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_remediation_evidence_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_remediation_evidence_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_remediation_evidence_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_remediation_evidence_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_remediation_evidence_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "map_violations"
            referencedColumns: ["violation_id"]
          },
        ]
      }
      map_violations: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          discount_pct_below_map: number
          dismissal_reason: string | null
          dismissed_at: string | null
          escalated_at: string | null
          grace_period_ends_at: string
          map_price_cents: number
          notified_at: string | null
          observation_id: string
          observed_price_cents: number
          policy_id: string
          practitioner_id: string | null
          product_id: string
          remediated_at: string | null
          remediation_deadline_at: string
          severity: string
          source_url: string | null
          status: string
          updated_at: string
          violation_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          discount_pct_below_map: number
          dismissal_reason?: string | null
          dismissed_at?: string | null
          escalated_at?: string | null
          grace_period_ends_at: string
          map_price_cents: number
          notified_at?: string | null
          observation_id: string
          observed_price_cents: number
          policy_id: string
          practitioner_id?: string | null
          product_id: string
          remediated_at?: string | null
          remediation_deadline_at: string
          severity: string
          source_url?: string | null
          status?: string
          updated_at?: string
          violation_id?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          discount_pct_below_map?: number
          dismissal_reason?: string | null
          dismissed_at?: string | null
          escalated_at?: string | null
          grace_period_ends_at?: string
          map_price_cents?: number
          notified_at?: string | null
          observation_id?: string
          observed_price_cents?: number
          policy_id?: string
          practitioner_id?: string | null
          product_id?: string
          remediated_at?: string | null
          remediation_deadline_at?: string
          severity?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          violation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_violations_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "map_price_observations"
            referencedColumns: ["observation_id"]
          },
          {
            foreignKeyName: "map_violations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "map_policies"
            referencedColumns: ["policy_id"]
          },
          {
            foreignKeyName: "map_violations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_violations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_violations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_violations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_violations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_violations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_violations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_violations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      map_vip_exemption_sensitive_notes: {
        Row: {
          content_hash: string
          created_at: string
          created_by: string
          encrypted_content: string
          note_id: string
          vip_exemption_id: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          created_by: string
          encrypted_content: string
          note_id?: string
          vip_exemption_id: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          created_by?: string
          encrypted_content?: string
          note_id?: string
          vip_exemption_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_vip_exemption_sensitive_notes_vip_exemption_id_fkey"
            columns: ["vip_exemption_id"]
            isOneToOne: false
            referencedRelation: "map_vip_exemptions"
            referencedColumns: ["vip_exemption_id"]
          },
        ]
      }
      map_vip_exemptions: {
        Row: {
          auto_expiry_at: string
          created_at: string
          customer_client_id: string | null
          customer_verification_doc_path: string | null
          exempted_price_cents: number
          exemption_end_at: string
          exemption_start_at: string
          ingredient_cost_floor_cents: number
          last_order_at: string | null
          manual_customer_id: string | null
          practitioner_id: string
          product_id: string
          reason: Database["public"]["Enums"]["map_vip_exemption_reason"]
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: Database["public"]["Enums"]["map_vip_exemption_status"]
          tier: string
          updated_at: string
          vip_exemption_id: string
        }
        Insert: {
          auto_expiry_at?: string
          created_at?: string
          customer_client_id?: string | null
          customer_verification_doc_path?: string | null
          exempted_price_cents: number
          exemption_end_at: string
          exemption_start_at?: string
          ingredient_cost_floor_cents: number
          last_order_at?: string | null
          manual_customer_id?: string | null
          practitioner_id: string
          product_id: string
          reason: Database["public"]["Enums"]["map_vip_exemption_reason"]
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["map_vip_exemption_status"]
          tier: string
          updated_at?: string
          vip_exemption_id?: string
        }
        Update: {
          auto_expiry_at?: string
          created_at?: string
          customer_client_id?: string | null
          customer_verification_doc_path?: string | null
          exempted_price_cents?: number
          exemption_end_at?: string
          exemption_start_at?: string
          ingredient_cost_floor_cents?: number
          last_order_at?: string | null
          manual_customer_id?: string | null
          practitioner_id?: string
          product_id?: string
          reason?: Database["public"]["Enums"]["map_vip_exemption_reason"]
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["map_vip_exemption_status"]
          tier?: string
          updated_at?: string
          vip_exemption_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_vip_exemptions_manual_customer_id_fkey"
            columns: ["manual_customer_id"]
            isOneToOne: false
            referencedRelation: "manual_customers"
            referencedColumns: ["manual_customer_id"]
          },
          {
            foreignKeyName: "map_vip_exemptions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_vip_exemptions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_vip_exemptions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_vip_exemptions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_vip_exemptions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_vip_exemptions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_vip_exemptions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_vip_exemptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      map_waiver_evidence: {
        Row: {
          evidence_id: string
          evidence_type: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
          waiver_id: string
        }
        Insert: {
          evidence_id?: string
          evidence_type: string
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
          waiver_id: string
        }
        Update: {
          evidence_id?: string
          evidence_type?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
          waiver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_waiver_evidence_waiver_id_fkey"
            columns: ["waiver_id"]
            isOneToOne: false
            referencedRelation: "map_waivers"
            referencedColumns: ["waiver_id"]
          },
        ]
      }
      map_waiver_skus: {
        Row: {
          created_at: string
          ingredient_cost_floor_cents: number
          product_id: string
          tier: string
          waived_price_cents: number
          waiver_id: string
          waiver_sku_id: string
        }
        Insert: {
          created_at?: string
          ingredient_cost_floor_cents: number
          product_id: string
          tier: string
          waived_price_cents: number
          waiver_id: string
          waiver_sku_id?: string
        }
        Update: {
          created_at?: string
          ingredient_cost_floor_cents?: number
          product_id?: string
          tier?: string
          waived_price_cents?: number
          waiver_id?: string
          waiver_sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_waiver_skus_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_waiver_skus_waiver_id_fkey"
            columns: ["waiver_id"]
            isOneToOne: false
            referencedRelation: "map_waivers"
            referencedColumns: ["waiver_id"]
          },
        ]
      }
      map_waivers: {
        Row: {
          created_at: string
          justification: string
          practitioner_id: string
          rejection_reason: string | null
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          scope_description: string
          scope_physical_locations: Json | null
          scope_urls: Json
          status: Database["public"]["Enums"]["map_waiver_status"]
          updated_at: string
          waiver_end_at: string
          waiver_id: string
          waiver_start_at: string
          waiver_type: Database["public"]["Enums"]["map_waiver_type"]
        }
        Insert: {
          created_at?: string
          justification: string
          practitioner_id: string
          rejection_reason?: string | null
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope_description: string
          scope_physical_locations?: Json | null
          scope_urls?: Json
          status?: Database["public"]["Enums"]["map_waiver_status"]
          updated_at?: string
          waiver_end_at: string
          waiver_id?: string
          waiver_start_at: string
          waiver_type: Database["public"]["Enums"]["map_waiver_type"]
        }
        Update: {
          created_at?: string
          justification?: string
          practitioner_id?: string
          rejection_reason?: string | null
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope_description?: string
          scope_physical_locations?: Json | null
          scope_urls?: Json
          status?: Database["public"]["Enums"]["map_waiver_status"]
          updated_at?: string
          waiver_end_at?: string
          waiver_id?: string
          waiver_start_at?: string
          waiver_type?: Database["public"]["Enums"]["map_waiver_type"]
        }
        Relationships: [
          {
            foreignKeyName: "map_waivers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_waivers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_waivers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_waivers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_waivers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_waivers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "map_waivers_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      margin_waterfall: {
        Row: {
          category: string
          channel: string
          channel_overhead: number
          cogs_amount: number
          created_at: string | null
          flag: string
          fulfillment: number
          id: string
          marketing_cac: number
          name: string
          net_margin: number
          net_margin_pct: number
          payment_processing: number
          platform_fees: number
          returns_chargebacks: number
          revenue: number
          sku: string
        }
        Insert: {
          category: string
          channel: string
          channel_overhead: number
          cogs_amount: number
          created_at?: string | null
          flag?: string
          fulfillment: number
          id?: string
          marketing_cac: number
          name: string
          net_margin: number
          net_margin_pct: number
          payment_processing: number
          platform_fees: number
          returns_chargebacks: number
          revenue: number
          sku: string
        }
        Update: {
          category?: string
          channel?: string
          channel_overhead?: number
          cogs_amount?: number
          created_at?: string | null
          flag?: string
          fulfillment?: number
          id?: string
          marketing_cac?: number
          name?: string
          net_margin?: number
          net_margin_pct?: number
          payment_processing?: number
          platform_fees?: number
          returns_chargebacks?: number
          revenue?: number
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "margin_waterfall_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      marketing_copy_conversions: {
        Row: {
          conversion_kind: string
          id: string
          occurred_at: string
          preceding_slot_id: string | null
          time_from_impression_seconds: number | null
          visitor_id: string
        }
        Insert: {
          conversion_kind: string
          id?: string
          occurred_at?: string
          preceding_slot_id?: string | null
          time_from_impression_seconds?: number | null
          visitor_id: string
        }
        Update: {
          conversion_kind?: string
          id?: string
          occurred_at?: string
          preceding_slot_id?: string | null
          time_from_impression_seconds?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      marketing_copy_impressions: {
        Row: {
          id: string
          is_returning_visitor: boolean
          referrer_category: string | null
          rendered_at: string
          slot_id: string
          viewport: string | null
          visitor_id: string
        }
        Insert: {
          id?: string
          is_returning_visitor?: boolean
          referrer_category?: string | null
          rendered_at?: string
          slot_id: string
          viewport?: string | null
          visitor_id: string
        }
        Update: {
          id?: string
          is_returning_visitor?: boolean
          referrer_category?: string | null
          rendered_at?: string
          slot_id?: string
          viewport?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_copy_impressions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "marketing_copy_variants"
            referencedColumns: ["slot_id"]
          },
        ]
      }
      marketing_copy_test_rounds: {
        Row: {
          active_slot_ids: string[]
          ended_at: string | null
          ended_reason: string | null
          id: string
          paused_at: string | null
          resumed_at: string | null
          started_at: string
          surface: string
          test_id: string
          winner_slot_id: string | null
        }
        Insert: {
          active_slot_ids: string[]
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          paused_at?: string | null
          resumed_at?: string | null
          started_at?: string
          surface: string
          test_id: string
          winner_slot_id?: string | null
        }
        Update: {
          active_slot_ids?: string[]
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          paused_at?: string | null
          resumed_at?: string | null
          started_at?: string
          surface?: string
          test_id?: string
          winner_slot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_copy_test_rounds_winner_slot_id_fkey"
            columns: ["winner_slot_id"]
            isOneToOne: false
            referencedRelation: "marketing_copy_variants"
            referencedColumns: ["slot_id"]
          },
        ]
      }
      marketing_copy_variant_events: {
        Row: {
          actor_user_id: string | null
          event_detail: Json | null
          event_kind: string
          id: string
          occurred_at: string
          variant_id: string
        }
        Insert: {
          actor_user_id?: string | null
          event_detail?: Json | null
          event_kind: string
          id?: string
          occurred_at?: string
          variant_id: string
        }
        Update: {
          actor_user_id?: string | null
          event_detail?: Json | null
          event_kind?: string
          id?: string
          occurred_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_copy_variant_events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "marketing_copy_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_copy_variants: {
        Row: {
          active_in_test: boolean
          archived: boolean
          archived_at: string | null
          created_at: string
          cta_destination: string | null
          cta_label: string
          framing: string
          headline_text: string
          id: string
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          slot_id: string
          steve_approval_at: string | null
          steve_approval_by: string | null
          steve_approval_note: string | null
          subheadline_text: string
          surface: string
          updated_at: string
          variant_label: string
          word_count_validated: boolean
        }
        Insert: {
          active_in_test?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          cta_destination?: string | null
          cta_label: string
          framing: string
          headline_text: string
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          slot_id: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          steve_approval_note?: string | null
          subheadline_text: string
          surface?: string
          updated_at?: string
          variant_label: string
          word_count_validated?: boolean
        }
        Update: {
          active_in_test?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          cta_destination?: string | null
          cta_label?: string
          framing?: string
          headline_text?: string
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          slot_id?: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          steve_approval_note?: string | null
          subheadline_text?: string
          surface?: string
          updated_at?: string
          variant_label?: string
          word_count_validated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "marketing_copy_variants_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      marshall_vision_config: {
        Row: {
          key: string
          notes: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      master_skus: {
        Row: {
          category: string
          cogs: number
          cogs_ratio: number
          created_at: string | null
          dist_margin: number
          distributor: number
          dtc_margin: number
          id: string
          msrp: number
          name: string
          sku: string
          updated_at: string | null
          wholesale: number
          ws_margin: number
        }
        Insert: {
          category: string
          cogs: number
          cogs_ratio: number
          created_at?: string | null
          dist_margin: number
          distributor: number
          dtc_margin: number
          id?: string
          msrp: number
          name: string
          sku: string
          updated_at?: string | null
          wholesale: number
          ws_margin: number
        }
        Update: {
          category?: string
          cogs?: number
          cogs_ratio?: number
          created_at?: string | null
          dist_margin?: number
          distributor?: number
          dtc_margin?: number
          id?: string
          msrp?: number
          name?: string
          sku?: string
          updated_at?: string | null
          wholesale?: number
          ws_margin?: number
        }
        Relationships: []
      }
      master_skus_market_pricing: {
        Row: {
          created_at: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          effective_from: string | null
          effective_until: string | null
          governance_rejection_reason: string | null
          inclusive_of_tax: boolean
          is_available_in_market: boolean
          margin_floor_met_at_msrp: boolean | null
          market_availability_default_reasoning: string | null
          market_code: Database["public"]["Enums"]["market_code"]
          msrp_cents: number
          price_approved_at: string | null
          price_approved_by_user_id: string | null
          price_set_at: string | null
          price_set_by_user_id: string | null
          pricing_id: string
          sku: string
          status: Database["public"]["Enums"]["pricing_status"]
          tax_code: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          effective_from?: string | null
          effective_until?: string | null
          governance_rejection_reason?: string | null
          inclusive_of_tax?: boolean
          is_available_in_market?: boolean
          margin_floor_met_at_msrp?: boolean | null
          market_availability_default_reasoning?: string | null
          market_code: Database["public"]["Enums"]["market_code"]
          msrp_cents: number
          price_approved_at?: string | null
          price_approved_by_user_id?: string | null
          price_set_at?: string | null
          price_set_by_user_id?: string | null
          pricing_id?: string
          sku: string
          status?: Database["public"]["Enums"]["pricing_status"]
          tax_code: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          currency_code?: Database["public"]["Enums"]["currency_code"]
          effective_from?: string | null
          effective_until?: string | null
          governance_rejection_reason?: string | null
          inclusive_of_tax?: boolean
          is_available_in_market?: boolean
          margin_floor_met_at_msrp?: boolean | null
          market_availability_default_reasoning?: string | null
          market_code?: Database["public"]["Enums"]["market_code"]
          msrp_cents?: number
          price_approved_at?: string | null
          price_approved_by_user_id?: string | null
          price_set_at?: string | null
          price_set_by_user_id?: string | null
          pricing_id?: string
          sku?: string
          status?: Database["public"]["Enums"]["pricing_status"]
          tax_code?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          ai_analysis: Json | null
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          description: string | null
          external_id: string | null
          fat_g: number | null
          genetics_guide_flags: Json | null
          id: string
          log_method: string
          logged_at: string | null
          macro_sliders: Json | null
          meal_date: string
          meal_score: number | null
          meal_type: string
          photo_url: string | null
          protein_g: number | null
          quality_rating: number | null
          source_app: string | null
          sync_connection_id: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          fat_g?: number | null
          genetics_guide_flags?: Json | null
          id?: string
          log_method: string
          logged_at?: string | null
          macro_sliders?: Json | null
          meal_date?: string
          meal_score?: number | null
          meal_type: string
          photo_url?: string | null
          protein_g?: number | null
          quality_rating?: number | null
          source_app?: string | null
          sync_connection_id?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          fat_g?: number | null
          genetics_guide_flags?: Json | null
          id?: string
          log_method?: string
          logged_at?: string | null
          macro_sliders?: Json | null
          meal_date?: string
          meal_score?: number | null
          meal_type?: string
          photo_url?: string | null
          protein_g?: number | null
          quality_rating?: number | null
          source_app?: string | null
          sync_connection_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      medication_interactions: {
        Row: {
          blocked_from_protocol: boolean | null
          citations: string[] | null
          clinical_effect: string | null
          consumer_notified: boolean | null
          created_at: string | null
          evidence_level: string | null
          id: string
          interacts_with_name: string
          interacts_with_sku_id: string | null
          interacts_with_source: string | null
          interacts_with_type: string
          mechanism: string
          medication_dosage: string | null
          medication_drug_class: string | null
          medication_name: string
          mitigation: string | null
          naturopath_notified: boolean | null
          onset_timing: string | null
          practitioner_notified: boolean | null
          practitioner_override: boolean | null
          practitioner_override_by: string | null
          practitioner_override_date: string | null
          practitioner_override_notes: string | null
          severity: string
          updated_at: string | null
          user_acknowledged: boolean | null
          user_acknowledged_at: string | null
          user_id: string | null
        }
        Insert: {
          blocked_from_protocol?: boolean | null
          citations?: string[] | null
          clinical_effect?: string | null
          consumer_notified?: boolean | null
          created_at?: string | null
          evidence_level?: string | null
          id?: string
          interacts_with_name: string
          interacts_with_sku_id?: string | null
          interacts_with_source?: string | null
          interacts_with_type: string
          mechanism: string
          medication_dosage?: string | null
          medication_drug_class?: string | null
          medication_name: string
          mitigation?: string | null
          naturopath_notified?: boolean | null
          onset_timing?: string | null
          practitioner_notified?: boolean | null
          practitioner_override?: boolean | null
          practitioner_override_by?: string | null
          practitioner_override_date?: string | null
          practitioner_override_notes?: string | null
          severity: string
          updated_at?: string | null
          user_acknowledged?: boolean | null
          user_acknowledged_at?: string | null
          user_id?: string | null
        }
        Update: {
          blocked_from_protocol?: boolean | null
          citations?: string[] | null
          clinical_effect?: string | null
          consumer_notified?: boolean | null
          created_at?: string | null
          evidence_level?: string | null
          id?: string
          interacts_with_name?: string
          interacts_with_sku_id?: string | null
          interacts_with_source?: string | null
          interacts_with_type?: string
          mechanism?: string
          medication_dosage?: string | null
          medication_drug_class?: string | null
          medication_name?: string
          mitigation?: string | null
          naturopath_notified?: boolean | null
          onset_timing?: string | null
          practitioner_notified?: boolean | null
          practitioner_override?: boolean | null
          practitioner_override_by?: string | null
          practitioner_override_date?: string | null
          practitioner_override_notes?: string | null
          severity?: string
          updated_at?: string | null
          user_acknowledged?: boolean | null
          user_acknowledged_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      membership_tiers: {
        Row: {
          additional_adult_price_cents: number | null
          additional_children_chunk_price_cents: number | null
          annual_price_cents: number
          annual_savings_cents: number | null
          base_adults_included: number
          base_children_included: number
          children_chunk_size: number | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          is_family_tier: boolean
          max_adults_allowed: number
          monthly_price_cents: number
          sort_order: number
          stripe_annual_price_id: string | null
          stripe_monthly_price_id: string | null
          stripe_product_id: string | null
          tier_level: number
          updated_at: string
        }
        Insert: {
          additional_adult_price_cents?: number | null
          additional_children_chunk_price_cents?: number | null
          annual_price_cents: number
          annual_savings_cents?: number | null
          base_adults_included?: number
          base_children_included?: number
          children_chunk_size?: number | null
          created_at?: string
          description?: string | null
          display_name: string
          id: string
          is_active?: boolean
          is_family_tier?: boolean
          max_adults_allowed?: number
          monthly_price_cents: number
          sort_order: number
          stripe_annual_price_id?: string | null
          stripe_monthly_price_id?: string | null
          stripe_product_id?: string | null
          tier_level: number
          updated_at?: string
        }
        Update: {
          additional_adult_price_cents?: number | null
          additional_children_chunk_price_cents?: number | null
          annual_price_cents?: number
          annual_savings_cents?: number | null
          base_adults_included?: number
          base_children_included?: number
          children_chunk_size?: number | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_family_tier?: boolean
          max_adults_allowed?: number
          monthly_price_cents?: number
          sort_order?: number
          stripe_annual_price_id?: string | null
          stripe_monthly_price_id?: string | null
          stripe_product_id?: string | null
          tier_level?: number
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          additional_adults: number
          additional_children_chunks: number
          billing_cycle: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          expires_at: string | null
          gift_source_id: string | null
          id: string
          is_annual_prepay: boolean
          metadata: Json
          payment_method: string | null
          paypal_subscription_id: string | null
          rc_entitlement_id: string | null
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          tier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_adults?: number
          additional_children_chunks?: number
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          gift_source_id?: string | null
          id?: string
          is_annual_prepay?: boolean
          metadata?: Json
          payment_method?: string | null
          paypal_subscription_id?: string | null
          rc_entitlement_id?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          tier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_adults?: number
          additional_children_chunks?: number
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          gift_source_id?: string | null
          id?: string
          is_annual_prepay?: boolean
          metadata?: Json
          payment_method?: string | null
          paypal_subscription_id?: string | null
          rc_entitlement_id?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          tier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_sync_log: {
        Row: {
          advisor_snapshot_id: string | null
          applied_at: string | null
          id: string
          issues_fixed: number | null
          issues_found: number | null
          migration_name: string
          notes: string | null
          post_check_at: string | null
          post_check_status: string | null
        }
        Insert: {
          advisor_snapshot_id?: string | null
          applied_at?: string | null
          id?: string
          issues_fixed?: number | null
          issues_found?: number | null
          migration_name: string
          notes?: string | null
          post_check_at?: string | null
          post_check_status?: string | null
        }
        Update: {
          advisor_snapshot_id?: string | null
          applied_at?: string | null
          id?: string
          issues_fixed?: number | null
          issues_found?: number | null
          migration_name?: string
          notes?: string | null
          post_check_at?: string | null
          post_check_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "migration_sync_log_advisor_snapshot_id_fkey"
            columns: ["advisor_snapshot_id"]
            isOneToOne: false
            referencedRelation: "advisor_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      naturopath_profiles: {
        Row: {
          accepting_patients: boolean
          bio: string | null
          created_at: string
          id: string
          license_number: string | null
          license_state: string | null
          license_type: string | null
          metadata: Json
          practice_address: string | null
          practice_city: string | null
          practice_name: string | null
          practice_phone: string | null
          practice_state: string | null
          practice_zip: string | null
          profile_photo_url: string | null
          specialties: string[]
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          accepting_patients?: boolean
          bio?: string | null
          created_at?: string
          id?: string
          license_number?: string | null
          license_state?: string | null
          license_type?: string | null
          metadata?: Json
          practice_address?: string | null
          practice_city?: string | null
          practice_name?: string | null
          practice_phone?: string | null
          practice_state?: string | null
          practice_zip?: string | null
          profile_photo_url?: string | null
          specialties?: string[]
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          accepting_patients?: boolean
          bio?: string | null
          created_at?: string
          id?: string
          license_number?: string | null
          license_state?: string | null
          license_type?: string | null
          metadata?: Json
          practice_address?: string | null
          practice_city?: string | null
          practice_name?: string | null
          practice_phone?: string | null
          practice_state?: string | null
          practice_zip?: string | null
          profile_photo_url?: string | null
          specialties?: string[]
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      notification_batch_queue: {
        Row: {
          context_ref: string
          defer_reason: string
          dispatch_digest_id: string | null
          dispatched_at: string | null
          event_code: string
          legal_ops_recipient_id: string | null
          practitioner_id: string | null
          priority: Database["public"]["Enums"]["notification_priority"]
          queue_id: string
          queued_at: string
        }
        Insert: {
          context_ref: string
          defer_reason: string
          dispatch_digest_id?: string | null
          dispatched_at?: string | null
          event_code: string
          legal_ops_recipient_id?: string | null
          practitioner_id?: string | null
          priority: Database["public"]["Enums"]["notification_priority"]
          queue_id?: string
          queued_at?: string
        }
        Update: {
          context_ref?: string
          defer_reason?: string
          dispatch_digest_id?: string | null
          dispatched_at?: string | null
          event_code?: string
          legal_ops_recipient_id?: string | null
          practitioner_id?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          queue_id?: string
          queued_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_batch_queue_event_code_fkey"
            columns: ["event_code"]
            isOneToOne: false
            referencedRelation: "notification_event_registry"
            referencedColumns: ["event_code"]
          },
          {
            foreignKeyName: "notification_batch_queue_legal_ops_recipient_id_fkey"
            columns: ["legal_ops_recipient_id"]
            isOneToOne: false
            referencedRelation: "notification_legal_ops_recipients"
            referencedColumns: ["recipient_id"]
          },
        ]
      }
      notification_channel_credentials: {
        Row: {
          apns_device_tokens: Json
          created_at: string
          credential_id: string
          fcm_device_tokens: Json
          is_legal_ops: boolean
          practitioner_id: string
          push_subscriptions: Json
          slack_access_token_vault_ref: string | null
          slack_default_channel_id: string | null
          slack_installed_at: string | null
          slack_is_dm: boolean | null
          slack_workspace_id: string | null
          slack_workspace_name: string | null
          sms_opt_in_completed_at: string | null
          sms_opt_in_verification_sid: string | null
          sms_pending_verification_code: string | null
          sms_phone_number: string | null
          sms_verification_sent_at: string | null
          updated_at: string
        }
        Insert: {
          apns_device_tokens?: Json
          created_at?: string
          credential_id?: string
          fcm_device_tokens?: Json
          is_legal_ops?: boolean
          practitioner_id: string
          push_subscriptions?: Json
          slack_access_token_vault_ref?: string | null
          slack_default_channel_id?: string | null
          slack_installed_at?: string | null
          slack_is_dm?: boolean | null
          slack_workspace_id?: string | null
          slack_workspace_name?: string | null
          sms_opt_in_completed_at?: string | null
          sms_opt_in_verification_sid?: string | null
          sms_pending_verification_code?: string | null
          sms_phone_number?: string | null
          sms_verification_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          apns_device_tokens?: Json
          created_at?: string
          credential_id?: string
          fcm_device_tokens?: Json
          is_legal_ops?: boolean
          practitioner_id?: string
          push_subscriptions?: Json
          slack_access_token_vault_ref?: string | null
          slack_default_channel_id?: string | null
          slack_installed_at?: string | null
          slack_is_dm?: boolean | null
          slack_workspace_id?: string | null
          slack_workspace_name?: string | null
          sms_opt_in_completed_at?: string | null
          sms_opt_in_verification_sid?: string | null
          sms_pending_verification_code?: string | null
          sms_phone_number?: string | null
          sms_verification_sent_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_event_registry: {
        Row: {
          attorney_work_product: boolean
          created_at: string
          deep_link_path_template: string | null
          default_channels: Database["public"]["Enums"]["notification_channel"][]
          default_enabled: boolean
          default_priority: Database["public"]["Enums"]["notification_priority"]
          description: string
          display_name: string
          emission_source: string | null
          event_code: string
          external_body_template: string
          in_app_body_template: string | null
          legal_ops_scope: boolean
          organizational_compliance_required: boolean
          phi_redaction_rules: Json
          push_body_template: string | null
          push_title_template: string | null
          rate_limit_override: number | null
          reemission_allowed: boolean
          slack_blocks_template: Json | null
          sms_body_template: string | null
          source_prompt: string | null
          updated_at: string
        }
        Insert: {
          attorney_work_product?: boolean
          created_at?: string
          deep_link_path_template?: string | null
          default_channels?: Database["public"]["Enums"]["notification_channel"][]
          default_enabled?: boolean
          default_priority?: Database["public"]["Enums"]["notification_priority"]
          description: string
          display_name: string
          emission_source?: string | null
          event_code: string
          external_body_template: string
          in_app_body_template?: string | null
          legal_ops_scope?: boolean
          organizational_compliance_required?: boolean
          phi_redaction_rules?: Json
          push_body_template?: string | null
          push_title_template?: string | null
          rate_limit_override?: number | null
          reemission_allowed?: boolean
          slack_blocks_template?: Json | null
          sms_body_template?: string | null
          source_prompt?: string | null
          updated_at?: string
        }
        Update: {
          attorney_work_product?: boolean
          created_at?: string
          deep_link_path_template?: string | null
          default_channels?: Database["public"]["Enums"]["notification_channel"][]
          default_enabled?: boolean
          default_priority?: Database["public"]["Enums"]["notification_priority"]
          description?: string
          display_name?: string
          emission_source?: string | null
          event_code?: string
          external_body_template?: string
          in_app_body_template?: string | null
          legal_ops_scope?: boolean
          organizational_compliance_required?: boolean
          phi_redaction_rules?: Json
          push_body_template?: string | null
          push_title_template?: string | null
          rate_limit_override?: number | null
          reemission_allowed?: boolean
          slack_blocks_template?: Json | null
          sms_body_template?: string | null
          source_prompt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_events_inbox: {
        Row: {
          context_data: Json
          context_ref: string
          emitted_at: string
          event_code: string
          inbox_id: string
          last_error: string | null
          legal_ops: boolean
          practitioner_ids: string[]
          priority_override:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          processed_at: string | null
          processing_attempts: number
          processing_started_at: string | null
          source_prompt_of_emitter: string | null
        }
        Insert: {
          context_data?: Json
          context_ref: string
          emitted_at?: string
          event_code: string
          inbox_id?: string
          last_error?: string | null
          legal_ops?: boolean
          practitioner_ids?: string[]
          priority_override?:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          processed_at?: string | null
          processing_attempts?: number
          processing_started_at?: string | null
          source_prompt_of_emitter?: string | null
        }
        Update: {
          context_data?: Json
          context_ref?: string
          emitted_at?: string
          event_code?: string
          inbox_id?: string
          last_error?: string | null
          legal_ops?: boolean
          practitioner_ids?: string[]
          priority_override?:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          processed_at?: string | null
          processing_attempts?: number
          processing_started_at?: string | null
          source_prompt_of_emitter?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_inbox_event_code_fkey"
            columns: ["event_code"]
            isOneToOne: false
            referencedRelation: "notification_event_registry"
            referencedColumns: ["event_code"]
          },
        ]
      }
      notification_legal_ops_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          event_code: string
          in_app_enabled: boolean
          opt_out_cosigned_at: string | null
          opt_out_cosigned_by_user_id: string | null
          opt_out_pending: boolean
          opt_out_reason: string | null
          opt_out_requested_at: string | null
          preference_id: string
          priority_override:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          push_enabled: boolean
          recipient_id: string
          slack_enabled: boolean
          sms_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          event_code: string
          in_app_enabled?: boolean
          opt_out_cosigned_at?: string | null
          opt_out_cosigned_by_user_id?: string | null
          opt_out_pending?: boolean
          opt_out_reason?: string | null
          opt_out_requested_at?: string | null
          preference_id?: string
          priority_override?:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          push_enabled?: boolean
          recipient_id: string
          slack_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          event_code?: string
          in_app_enabled?: boolean
          opt_out_cosigned_at?: string | null
          opt_out_cosigned_by_user_id?: string | null
          opt_out_pending?: boolean
          opt_out_reason?: string | null
          opt_out_requested_at?: string | null
          preference_id?: string
          priority_override?:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          push_enabled?: boolean
          recipient_id?: string
          slack_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_legal_ops_preferences_event_code_fkey"
            columns: ["event_code"]
            isOneToOne: false
            referencedRelation: "notification_event_registry"
            referencedColumns: ["event_code"]
          },
          {
            foreignKeyName: "notification_legal_ops_preferences_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "notification_legal_ops_recipients"
            referencedColumns: ["recipient_id"]
          },
        ]
      }
      notification_legal_ops_recipients: {
        Row: {
          created_at: string
          designated_alternate_user_id: string | null
          designation_notes: string | null
          effective_from: string
          recipient_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          designated_alternate_user_id?: string | null
          designation_notes?: string | null
          effective_from?: string
          recipient_id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          designated_alternate_user_id?: string | null
          designation_notes?: string | null
          effective_from?: string
          recipient_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_phi_redaction_failures: {
        Row: {
          body_attempted: string
          channel: Database["public"]["Enums"]["notification_channel"]
          event_code: string
          failure_id: string
          intended_recipient: string | null
          occurred_at: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          template_version: string | null
          violations_json: Json
        }
        Insert: {
          body_attempted: string
          channel: Database["public"]["Enums"]["notification_channel"]
          event_code: string
          failure_id?: string
          intended_recipient?: string | null
          occurred_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          template_version?: string | null
          violations_json: Json
        }
        Update: {
          body_attempted?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          event_code?: string
          failure_id?: string
          intended_recipient?: string | null
          occurred_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          template_version?: string | null
          violations_json?: Json
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          event_code: string
          in_app_enabled: boolean
          practitioner_id: string
          preference_id: string
          priority_override:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          push_enabled: boolean
          slack_enabled: boolean
          sms_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          event_code: string
          in_app_enabled?: boolean
          practitioner_id: string
          preference_id?: string
          priority_override?:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          push_enabled?: boolean
          slack_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          event_code?: string
          in_app_enabled?: boolean
          practitioner_id?: string
          preference_id?: string
          priority_override?:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          push_enabled?: boolean
          slack_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_event_code_fkey"
            columns: ["event_code"]
            isOneToOne: false
            referencedRelation: "notification_event_registry"
            referencedColumns: ["event_code"]
          },
        ]
      }
      notification_quiet_hours: {
        Row: {
          active: boolean
          created_at: string
          day_of_week: number
          end_local_time: string
          practitioner_id: string
          quiet_hours_id: string
          start_local_time: string
          timezone: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          day_of_week: number
          end_local_time: string
          practitioner_id: string
          quiet_hours_id?: string
          start_local_time: string
          timezone?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          day_of_week?: number
          end_local_time?: string
          practitioner_id?: string
          quiet_hours_id?: string
          start_local_time?: string
          timezone?: string
        }
        Relationships: []
      }
      notification_sms_opt_in_log: {
        Row: {
          action: string
          ip_address: unknown
          log_id: string
          message_body_sent: string | null
          message_sid: string | null
          occurred_at: string
          phone_number: string
          practitioner_id: string
          reply_body: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          ip_address?: unknown
          log_id?: string
          message_body_sent?: string | null
          message_sid?: string | null
          occurred_at?: string
          phone_number: string
          practitioner_id: string
          reply_body?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          ip_address?: unknown
          log_id?: string
          message_body_sent?: string | null
          message_sid?: string | null
          occurred_at?: string
          phone_number?: string
          practitioner_id?: string
          reply_body?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          message: string | null
          notification_type: string
          read: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          notification_type: string
          read?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          notification_type?: string
          read?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_dispatched: {
        Row: {
          attorney_work_product_bypass: boolean
          carrier_message_id: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          context_ref: string | null
          delivery_receipt_json: Json | null
          delivery_status: string
          dispatch_id: string
          dispatcher_version: string | null
          event_code: string
          external_body_rendered: string | null
          inbox_id: string | null
          legal_ops_recipient_id: string | null
          occurred_at: string
          phi_redaction_result: Json | null
          priority_resolved:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          recipient_practitioner_id: string | null
          retry_count: number
        }
        Insert: {
          attorney_work_product_bypass?: boolean
          carrier_message_id?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          context_ref?: string | null
          delivery_receipt_json?: Json | null
          delivery_status: string
          dispatch_id?: string
          dispatcher_version?: string | null
          event_code: string
          external_body_rendered?: string | null
          inbox_id?: string | null
          legal_ops_recipient_id?: string | null
          occurred_at?: string
          phi_redaction_result?: Json | null
          priority_resolved?:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          recipient_practitioner_id?: string | null
          retry_count?: number
        }
        Update: {
          attorney_work_product_bypass?: boolean
          carrier_message_id?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          context_ref?: string | null
          delivery_receipt_json?: Json | null
          delivery_status?: string
          dispatch_id?: string
          dispatcher_version?: string | null
          event_code?: string
          external_body_rendered?: string | null
          inbox_id?: string | null
          legal_ops_recipient_id?: string | null
          occurred_at?: string
          phi_redaction_result?: Json | null
          priority_resolved?:
            | Database["public"]["Enums"]["notification_priority"]
            | null
          recipient_practitioner_id?: string | null
          retry_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "notifications_dispatched_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "notification_events_inbox"
            referencedColumns: ["inbox_id"]
          },
          {
            foreignKeyName: "notifications_dispatched_legal_ops_recipient_id_fkey"
            columns: ["legal_ops_recipient_id"]
            isOneToOne: false
            referencedRelation: "notification_legal_ops_recipients"
            referencedColumns: ["recipient_id"]
          },
        ]
      }
      nutrition_logs: {
        Row: {
          ai_latency_ms: number | null
          ai_model: string | null
          ai_notes: string | null
          calories: number | null
          carbs_g: number | null
          confidence: number | null
          confirmed_at: string | null
          context_note: string | null
          created_at: string
          data_source: string | null
          discarded_at: string | null
          fiber_g: number | null
          good_fat_g: number | null
          healthy_fat_g: number | null
          id: string
          logged_at: string
          meal_type: string
          photo_url: string | null
          protein_g: number | null
          raw_input: string | null
          saturated_fat_g: number | null
          serving_description: string | null
          source: string
          status: string
          sugar_g: number | null
          total_fat_g: number | null
          updated_at: string
          user_edited: boolean
          user_id: string
        }
        Insert: {
          ai_latency_ms?: number | null
          ai_model?: string | null
          ai_notes?: string | null
          calories?: number | null
          carbs_g?: number | null
          confidence?: number | null
          confirmed_at?: string | null
          context_note?: string | null
          created_at?: string
          data_source?: string | null
          discarded_at?: string | null
          fiber_g?: number | null
          good_fat_g?: number | null
          healthy_fat_g?: number | null
          id?: string
          logged_at?: string
          meal_type: string
          photo_url?: string | null
          protein_g?: number | null
          raw_input?: string | null
          saturated_fat_g?: number | null
          serving_description?: string | null
          source: string
          status?: string
          sugar_g?: number | null
          total_fat_g?: number | null
          updated_at?: string
          user_edited?: boolean
          user_id: string
        }
        Update: {
          ai_latency_ms?: number | null
          ai_model?: string | null
          ai_notes?: string | null
          calories?: number | null
          carbs_g?: number | null
          confidence?: number | null
          confirmed_at?: string | null
          context_note?: string | null
          created_at?: string
          data_source?: string | null
          discarded_at?: string | null
          fiber_g?: number | null
          good_fat_g?: number | null
          healthy_fat_g?: number | null
          id?: string
          logged_at?: string
          meal_type?: string
          photo_url?: string | null
          protein_g?: number | null
          raw_input?: string | null
          saturated_fat_g?: number | null
          serving_description?: string | null
          source?: string
          status?: string
          sugar_g?: number | null
          total_fat_g?: number | null
          updated_at?: string
          user_edited?: boolean
          user_id?: string
        }
        Relationships: []
      }
      order_currency_details: {
        Row: {
          b2b_customer: boolean
          created_at: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          customer_vat_number: string | null
          customer_vat_validated_at: string | null
          customer_vat_validation_status: string | null
          detail_id: string
          discount_cents: number
          fx_rate_date: string
          fx_rate_source: string
          fx_rate_to_usd_at_order_time: number
          inclusive_of_tax: boolean
          market_code: Database["public"]["Enums"]["market_code"]
          order_id: string
          reverse_charge_applied: boolean
          shipping_cents: number
          stripe_payment_intent_id: string | null
          stripe_tax_calculation_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          vat_invoice_id: string | null
        }
        Insert: {
          b2b_customer?: boolean
          created_at?: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          customer_vat_number?: string | null
          customer_vat_validated_at?: string | null
          customer_vat_validation_status?: string | null
          detail_id?: string
          discount_cents?: number
          fx_rate_date: string
          fx_rate_source: string
          fx_rate_to_usd_at_order_time: number
          inclusive_of_tax: boolean
          market_code: Database["public"]["Enums"]["market_code"]
          order_id: string
          reverse_charge_applied?: boolean
          shipping_cents?: number
          stripe_payment_intent_id?: string | null
          stripe_tax_calculation_id?: string | null
          subtotal_cents: number
          tax_cents?: number
          total_cents: number
          vat_invoice_id?: string | null
        }
        Update: {
          b2b_customer?: boolean
          created_at?: string
          currency_code?: Database["public"]["Enums"]["currency_code"]
          customer_vat_number?: string | null
          customer_vat_validated_at?: string | null
          customer_vat_validation_status?: string | null
          detail_id?: string
          discount_cents?: number
          fx_rate_date?: string
          fx_rate_source?: string
          fx_rate_to_usd_at_order_time?: number
          inclusive_of_tax?: boolean
          market_code?: Database["public"]["Enums"]["market_code"]
          order_id?: string
          reverse_charge_applied?: boolean
          shipping_cents?: number
          stripe_payment_intent_id?: string | null
          stripe_tax_calculation_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          vat_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_currency_details_vat_invoice_id_fkey"
            columns: ["vat_invoice_id"]
            isOneToOne: false
            referencedRelation: "international_vat_invoices"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          shipping_address: Json | null
          status: string
          stripe_payment_id: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shipping_address?: Json | null
          status?: string
          stripe_payment_id?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shipping_address?: Json | null
          status?: string
          stripe_payment_id?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_stack_components: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          quantity: number
          sku: string
          sort_order: number
          stack_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          quantity?: number
          sku: string
          sort_order?: number
          stack_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          quantity?: number
          sku?: string
          sort_order?: number
          stack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_stack_components_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
          {
            foreignKeyName: "outcome_stack_components_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "outcome_stacks"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_stacks: {
        Row: {
          bundle_discount_percent: number
          created_at: string
          description: string
          display_name: string
          hero_image_url: string | null
          id: string
          is_active: boolean
          outcome_category: string
          sort_order: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          bundle_discount_percent?: number
          created_at?: string
          description: string
          display_name: string
          hero_image_url?: string | null
          id: string
          is_active?: boolean
          outcome_category: string
          sort_order: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          bundle_discount_percent?: number
          created_at?: string
          description?: string
          display_name?: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          outcome_category?: string
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outcome_timeline_cta: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          created_at: string
          cta_destination: string
          cta_label: string
          cta_lead_text: string
          id: string
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          steve_approval_at: string | null
          steve_approval_by: string | null
          updated_at: string
          variant_set_id: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          cta_destination: string
          cta_label: string
          cta_lead_text: string
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          updated_at?: string
          variant_set_id: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          cta_destination?: string
          cta_label?: string
          cta_lead_text?: string
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          updated_at?: string
          variant_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_timeline_cta_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_timeline_cta_variant_set_id_fkey"
            columns: ["variant_set_id"]
            isOneToOne: false
            referencedRelation: "outcome_timeline_variant_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_timeline_events: {
        Row: {
          actor_user_id: string | null
          event_detail: Json | null
          event_kind: string
          id: string
          occurred_at: string
          row_id: string
          surface: string
        }
        Insert: {
          actor_user_id?: string | null
          event_detail?: Json | null
          event_kind: string
          id?: string
          occurred_at?: string
          row_id: string
          surface: string
        }
        Update: {
          actor_user_id?: string | null
          event_detail?: Json | null
          event_kind?: string
          id?: string
          occurred_at?: string
          row_id?: string
          surface?: string
        }
        Relationships: []
      }
      outcome_timeline_phases: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          created_at: string
          display_order: number
          id: string
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          phase_body: string
          phase_id: string
          phase_subtitle: string
          phase_title: string
          steve_approval_at: string | null
          steve_approval_by: string | null
          steve_approval_note: string | null
          updated_at: string
          variant_set_id: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          phase_body: string
          phase_id: string
          phase_subtitle: string
          phase_title: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          steve_approval_note?: string | null
          updated_at?: string
          variant_set_id: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          phase_body?: string
          phase_id?: string
          phase_subtitle?: string
          phase_title?: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          steve_approval_note?: string | null
          updated_at?: string
          variant_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_timeline_phases_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_timeline_phases_variant_set_id_fkey"
            columns: ["variant_set_id"]
            isOneToOne: false
            referencedRelation: "outcome_timeline_variant_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_timeline_qualifier: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          created_at: string
          id: string
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          qualifier_text: string
          steve_approval_at: string | null
          steve_approval_by: string | null
          updated_at: string
          variant_set_id: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          qualifier_text: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          updated_at?: string
          variant_set_id: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          qualifier_text?: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          updated_at?: string
          variant_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_timeline_qualifier_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_timeline_qualifier_variant_set_id_fkey"
            columns: ["variant_set_id"]
            isOneToOne: false
            referencedRelation: "outcome_timeline_variant_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_timeline_section_blocks: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          block_kind: string
          block_text: string
          created_at: string
          id: string
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          steve_approval_at: string | null
          steve_approval_by: string | null
          updated_at: string
          variant_set_id: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          block_kind: string
          block_text: string
          created_at?: string
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          updated_at?: string
          variant_set_id: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          block_kind?: string
          block_text?: string
          created_at?: string
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          updated_at?: string
          variant_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_timeline_section_bloc_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_timeline_section_blocks_variant_set_id_fkey"
            columns: ["variant_set_id"]
            isOneToOne: false
            referencedRelation: "outcome_timeline_variant_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_timeline_variant_sets: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          created_at: string
          id: string
          variant_set_code: string
          variant_set_label: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          id?: string
          variant_set_code: string
          variant_set_label: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          id?: string
          variant_set_code?: string
          variant_set_label?: string
        }
        Relationships: []
      }
      patient_practitioner_relationships: {
        Row: {
          consent_share_engagement_score: boolean
          consent_share_labs: boolean
          consent_share_protocol: boolean
          created_at: string
          ended_at: string | null
          id: string
          patient_user_id: string
          practitioner_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          consent_share_engagement_score?: boolean
          consent_share_labs?: boolean
          consent_share_protocol?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          patient_user_id: string
          practitioner_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          consent_share_engagement_score?: boolean
          consent_share_labs?: boolean
          consent_share_protocol?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          patient_user_id?: string
          practitioner_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_practitioner_relationships_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "patient_practitioner_relationships_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "patient_practitioner_relationships_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "patient_practitioner_relationships_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_practitioner_relationships_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "patient_practitioner_relationships_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "patient_practitioner_relationships_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      payout_batch_lines: {
        Row: {
          batch_id: string
          created_at: string
          failed_reason: string | null
          hold_reason: string | null
          line_id: string
          net_payable_cents: number
          paid_at: string | null
          payout_method_id: string | null
          practitioner_id: string
          rail_used: Database["public"]["Enums"]["payout_rail"] | null
          reconciliation_run_id: string
          status: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          failed_reason?: string | null
          hold_reason?: string | null
          line_id?: string
          net_payable_cents: number
          paid_at?: string | null
          payout_method_id?: string | null
          practitioner_id: string
          rail_used?: Database["public"]["Enums"]["payout_rail"] | null
          reconciliation_run_id: string
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          failed_reason?: string | null
          hold_reason?: string | null
          line_id?: string
          net_payable_cents?: number
          paid_at?: string | null
          payout_method_id?: string | null
          practitioner_id?: string
          rail_used?: Database["public"]["Enums"]["payout_rail"] | null
          reconciliation_run_id?: string
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_batch_lines_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payout_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "payout_batch_lines_payout_method_id_fkey"
            columns: ["payout_method_id"]
            isOneToOne: false
            referencedRelation: "practitioner_payout_methods"
            referencedColumns: ["method_id"]
          },
          {
            foreignKeyName: "payout_batch_lines_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_batch_lines_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_batch_lines_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_batch_lines_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_batch_lines_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_batch_lines_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_batch_lines_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_batch_lines_reconciliation_run_id_fkey"
            columns: ["reconciliation_run_id"]
            isOneToOne: false
            referencedRelation: "commission_reconciliation_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      payout_batches: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          batch_id: string
          batch_label: string
          completed_at: string | null
          created_at: string
          created_by: string
          executed_at: string | null
          period_end: string
          period_start: string
          status: string
          total_held_cents: number
          total_held_count: number
          total_lines_count: number
          total_payout_cents: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string
          batch_label: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          executed_at?: string | null
          period_end: string
          period_start: string
          status?: string
          total_held_cents?: number
          total_held_count?: number
          total_lines_count?: number
          total_payout_cents?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string
          batch_label?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          executed_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_held_cents?: number
          total_held_count?: number
          total_lines_count?: number
          total_payout_cents?: number
        }
        Relationships: []
      }
      payout_disputes: {
        Row: {
          created_at: string
          dispute_id: string
          dispute_reason: string
          practitioner_explanation: string
          practitioner_id: string
          reconciliation_line_id: string
          resolution_notes: string | null
          resolved_amount_cents: number | null
          resolved_at: string | null
          reviewer_id: string | null
          status: string
          supporting_docs_paths: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispute_id?: string
          dispute_reason: string
          practitioner_explanation: string
          practitioner_id: string
          reconciliation_line_id: string
          resolution_notes?: string | null
          resolved_amount_cents?: number | null
          resolved_at?: string | null
          reviewer_id?: string | null
          status?: string
          supporting_docs_paths?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          dispute_reason?: string
          practitioner_explanation?: string
          practitioner_id?: string
          reconciliation_line_id?: string
          resolution_notes?: string | null
          resolved_amount_cents?: number | null
          resolved_at?: string | null
          reviewer_id?: string | null
          status?: string
          supporting_docs_paths?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_disputes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_disputes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_disputes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_disputes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_disputes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_disputes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_disputes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_disputes_reconciliation_line_id_fkey"
            columns: ["reconciliation_line_id"]
            isOneToOne: false
            referencedRelation: "commission_reconciliation_lines"
            referencedColumns: ["line_id"]
          },
        ]
      }
      payout_transactions: {
        Row: {
          amount_cents: number
          batch_line_id: string
          currency: string
          external_response_json: Json | null
          external_status: string | null
          external_transaction_id: string
          fee_cents: number | null
          initiated_at: string
          practitioner_id: string
          rail: Database["public"]["Enums"]["payout_rail"]
          settled_at: string | null
          txn_id: string
        }
        Insert: {
          amount_cents: number
          batch_line_id: string
          currency?: string
          external_response_json?: Json | null
          external_status?: string | null
          external_transaction_id: string
          fee_cents?: number | null
          initiated_at?: string
          practitioner_id: string
          rail: Database["public"]["Enums"]["payout_rail"]
          settled_at?: string | null
          txn_id?: string
        }
        Update: {
          amount_cents?: number
          batch_line_id?: string
          currency?: string
          external_response_json?: Json | null
          external_status?: string | null
          external_transaction_id?: string
          fee_cents?: number | null
          initiated_at?: string
          practitioner_id?: string
          rail?: Database["public"]["Enums"]["payout_rail"]
          settled_at?: string | null
          txn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_transactions_batch_line_id_fkey"
            columns: ["batch_line_id"]
            isOneToOne: false
            referencedRelation: "payout_batch_lines"
            referencedColumns: ["line_id"]
          },
          {
            foreignKeyName: "payout_transactions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_transactions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_transactions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_transactions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_transactions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_transactions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "payout_transactions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      peptide_delivery_options: {
        Row: {
          bioavailability_estimate: number
          created_at: string | null
          delivery_form: string
          dose_amount: number | null
          dose_frequency: string | null
          dose_unit: string | null
          id: string
          is_available: boolean | null
          onset_timeline: string | null
          peptide_id: string
          price_range_high: number | null
          price_range_low: number | null
          protocol: string | null
        }
        Insert: {
          bioavailability_estimate: number
          created_at?: string | null
          delivery_form: string
          dose_amount?: number | null
          dose_frequency?: string | null
          dose_unit?: string | null
          id?: string
          is_available?: boolean | null
          onset_timeline?: string | null
          peptide_id: string
          price_range_high?: number | null
          price_range_low?: number | null
          protocol?: string | null
        }
        Update: {
          bioavailability_estimate?: number
          created_at?: string | null
          delivery_form?: string
          dose_amount?: number | null
          dose_frequency?: string | null
          dose_unit?: string | null
          id?: string
          is_available?: boolean | null
          onset_timeline?: string | null
          peptide_id?: string
          price_range_high?: number | null
          price_range_low?: number | null
          protocol?: string | null
        }
        Relationships: []
      }
      peptide_detected_patterns: {
        Row: {
          confidence: number
          detected_at: string | null
          id: string
          pattern_id: string
          pattern_label: string
          pattern_sublabel: string | null
          signals: string[]
          user_id: string
        }
        Insert: {
          confidence: number
          detected_at?: string | null
          id?: string
          pattern_id: string
          pattern_label: string
          pattern_sublabel?: string | null
          signals: string[]
          user_id: string
        }
        Update: {
          confidence?: number
          detected_at?: string | null
          id?: string
          pattern_id?: string
          pattern_label?: string
          pattern_sublabel?: string | null
          signals?: string[]
          user_id?: string
        }
        Relationships: []
      }
      peptide_protocol_rules: {
        Row: {
          action_note: string | null
          action_pattern: string
          action_peptide: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: string
          requires_supervision: boolean | null
          rule_id: string
          solo_protocol: boolean | null
          trigger_field: string
          trigger_operator: string
          trigger_sex: string | null
          trigger_type: string
          trigger_value: string
        }
        Insert: {
          action_note?: string | null
          action_pattern: string
          action_peptide?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string
          requires_supervision?: boolean | null
          rule_id: string
          solo_protocol?: boolean | null
          trigger_field: string
          trigger_operator?: string
          trigger_sex?: string | null
          trigger_type: string
          trigger_value: string
        }
        Update: {
          action_note?: string | null
          action_pattern?: string
          action_peptide?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string
          requires_supervision?: boolean | null
          rule_id?: string
          solo_protocol?: boolean | null
          trigger_field?: string
          trigger_operator?: string
          trigger_sex?: string | null
          trigger_type?: string
          trigger_value?: string
        }
        Relationships: []
      }
      peptide_registry: {
        Row: {
          category_color: string | null
          category_icon: string | null
          category_id: number
          category_name: string
          created_at: string | null
          delivery_form: string | null
          description: string | null
          evidence_level: string
          genex_panel: string | null
          genex_synergy_description: string | null
          genex_target_variants: string[] | null
          how_it_works: string | null
          id: string
          ingredient_tags: string[] | null
          inspired_by: string | null
          is_farmceutica: boolean
          is_investigational: boolean | null
          key_highlights: string[] | null
          market_launch: string | null
          mechanism_of_action: string
          peptide_id: string
          peptide_type: string | null
          performance_metrics: Json | null
          price_range: string | null
          product_name: string
          product_number: number
          requires_practitioner_consult: boolean
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          category_color?: string | null
          category_icon?: string | null
          category_id: number
          category_name: string
          created_at?: string | null
          delivery_form?: string | null
          description?: string | null
          evidence_level: string
          genex_panel?: string | null
          genex_synergy_description?: string | null
          genex_target_variants?: string[] | null
          how_it_works?: string | null
          id?: string
          ingredient_tags?: string[] | null
          inspired_by?: string | null
          is_farmceutica?: boolean
          is_investigational?: boolean | null
          key_highlights?: string[] | null
          market_launch?: string | null
          mechanism_of_action: string
          peptide_id: string
          peptide_type?: string | null
          performance_metrics?: Json | null
          price_range?: string | null
          product_name: string
          product_number?: number
          requires_practitioner_consult?: boolean
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          category_color?: string | null
          category_icon?: string | null
          category_id?: number
          category_name?: string
          created_at?: string | null
          delivery_form?: string | null
          description?: string | null
          evidence_level?: string
          genex_panel?: string | null
          genex_synergy_description?: string | null
          genex_target_variants?: string[] | null
          how_it_works?: string | null
          id?: string
          ingredient_tags?: string[] | null
          inspired_by?: string | null
          is_farmceutica?: boolean
          is_investigational?: boolean | null
          key_highlights?: string[] | null
          market_launch?: string | null
          mechanism_of_action?: string
          peptide_id?: string
          peptide_type?: string | null
          performance_metrics?: Json | null
          price_range?: string | null
          product_name?: string
          product_number?: number
          requires_practitioner_consult?: boolean
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      peptide_rules: {
        Row: {
          created_at: string | null
          cycle_off_weeks: number | null
          cycle_on_weeks: number | null
          delivery_form: string
          dosage: string
          evidence_level: string
          frequency: string
          id: string
          is_active: boolean | null
          mechanism: string
          pattern_id: string
          peptide_name: string
          priority: string
          rationale_template: string
          requires_supervision: boolean | null
          rule_id: string
          tier: string
          timing: string[] | null
        }
        Insert: {
          created_at?: string | null
          cycle_off_weeks?: number | null
          cycle_on_weeks?: number | null
          delivery_form: string
          dosage: string
          evidence_level?: string
          frequency: string
          id?: string
          is_active?: boolean | null
          mechanism: string
          pattern_id: string
          peptide_name: string
          priority?: string
          rationale_template: string
          requires_supervision?: boolean | null
          rule_id: string
          tier: string
          timing?: string[] | null
        }
        Update: {
          created_at?: string | null
          cycle_off_weeks?: number | null
          cycle_on_weeks?: number | null
          delivery_form?: string
          dosage?: string
          evidence_level?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          mechanism?: string
          pattern_id?: string
          peptide_name?: string
          priority?: string
          rationale_template?: string
          requires_supervision?: boolean | null
          rule_id?: string
          tier?: string
          timing?: string[] | null
        }
        Relationships: []
      }
      peptide_stack_protocols: {
        Row: {
          confidence_pct: number
          confidence_tier: number
          created_at: string | null
          expires_at: string | null
          generated_at: string | null
          generation_time_ms: number | null
          id: string
          patterns_detected: string[]
          protocol_rationale: string | null
          stack_narrative: string | null
          status: string
          total_peptides: number | null
          trigger_type: string | null
          user_id: string
          version: number
        }
        Insert: {
          confidence_pct?: number
          confidence_tier?: number
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          generation_time_ms?: number | null
          id?: string
          patterns_detected: string[]
          protocol_rationale?: string | null
          stack_narrative?: string | null
          status?: string
          total_peptides?: number | null
          trigger_type?: string | null
          user_id: string
          version?: number
        }
        Update: {
          confidence_pct?: number
          confidence_tier?: number
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          generation_time_ms?: number | null
          id?: string
          patterns_detected?: string[]
          protocol_rationale?: string | null
          stack_narrative?: string | null
          status?: string
          total_peptides?: number | null
          trigger_type?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      peptide_stack_recommendations: {
        Row: {
          contraindications: string[] | null
          created_at: string | null
          cycle_off_weeks: number | null
          cycle_on_weeks: number | null
          delivery_form: string
          dosage: string
          evidence_level: string | null
          frequency: string
          id: string
          interaction_check: string | null
          is_accepted: boolean | null
          is_dismissed: boolean | null
          mechanism: string | null
          peptide_name: string
          priority: string
          protocol_id: string
          rank: number
          rationale: string
          requires_supervision: boolean | null
          synergy_with: string[] | null
          target_patterns: string[] | null
          timing: string[] | null
          user_id: string
        }
        Insert: {
          contraindications?: string[] | null
          created_at?: string | null
          cycle_off_weeks?: number | null
          cycle_on_weeks?: number | null
          delivery_form: string
          dosage: string
          evidence_level?: string | null
          frequency: string
          id?: string
          interaction_check?: string | null
          is_accepted?: boolean | null
          is_dismissed?: boolean | null
          mechanism?: string | null
          peptide_name: string
          priority: string
          protocol_id: string
          rank: number
          rationale: string
          requires_supervision?: boolean | null
          synergy_with?: string[] | null
          target_patterns?: string[] | null
          timing?: string[] | null
          user_id: string
        }
        Update: {
          contraindications?: string[] | null
          created_at?: string | null
          cycle_off_weeks?: number | null
          cycle_on_weeks?: number | null
          delivery_form?: string
          dosage?: string
          evidence_level?: string | null
          frequency?: string
          id?: string
          interaction_check?: string | null
          is_accepted?: boolean | null
          is_dismissed?: boolean | null
          mechanism?: string | null
          peptide_name?: string
          priority?: string
          protocol_id?: string
          rank?: number
          rationale?: string
          requires_supervision?: boolean | null
          synergy_with?: string[] | null
          target_patterns?: string[] | null
          timing?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peptide_stack_recommendations_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "peptide_stack_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      peptide_stack_templates: {
        Row: {
          created_at: string | null
          id: string
          narrative_template: string
          pattern_count: number
          pattern_ids: string[]
          pattern_key: string
          rationale_template: string
          recommendations: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          narrative_template: string
          pattern_count?: number
          pattern_ids: string[]
          pattern_key: string
          rationale_template: string
          recommendations: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          narrative_template?: string
          pattern_count?: number
          pattern_ids?: string[]
          pattern_key?: string
          rationale_template?: string
          recommendations?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      photo_share_permissions: {
        Row: {
          expires_at: string
          granted_at: string
          id: string
          note: string | null
          photo_session_id: string
          photo_session_user_id: string
          practitioner_id: string
          revoked_at: string | null
        }
        Insert: {
          expires_at: string
          granted_at?: string
          id?: string
          note?: string | null
          photo_session_id: string
          photo_session_user_id: string
          practitioner_id: string
          revoked_at?: string | null
        }
        Update: {
          expires_at?: string
          granted_at?: string
          id?: string
          note?: string | null
          photo_session_id?: string
          photo_session_user_id?: string
          practitioner_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_share_permissions_photo_session_id_fkey"
            columns: ["photo_session_id"]
            isOneToOne: false
            referencedRelation: "body_photo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_trends: {
        Row: {
          active_customers: number | null
          annual_net_profit: number | null
          annual_revenue: number | null
          avg_cogs_ratio: number | null
          avg_dtc_margin: number | null
          bundle_revenue: number | null
          cohort_ltv: number | null
          created_at: string | null
          current_arr: number | null
          current_mrr: number | null
          ending_cash: number | null
          forecast_annual_revenue: number | null
          free_cash_flow: number | null
          id: string
          integrity_failed: number | null
          integrity_passed: number | null
          inventory_value: number | null
          ltv_to_cac: number | null
          net_margin_pct: number | null
          overall_trend: string | null
          portfolio_health_score: number | null
          risk_count: number | null
          snapshot_date: string
          star_skus: number | null
          sunset_skus: number | null
          supplier_hhi: number | null
          total_subscribers: number | null
          urgent_reorders: number | null
          watch_skus: number | null
        }
        Insert: {
          active_customers?: number | null
          annual_net_profit?: number | null
          annual_revenue?: number | null
          avg_cogs_ratio?: number | null
          avg_dtc_margin?: number | null
          bundle_revenue?: number | null
          cohort_ltv?: number | null
          created_at?: string | null
          current_arr?: number | null
          current_mrr?: number | null
          ending_cash?: number | null
          forecast_annual_revenue?: number | null
          free_cash_flow?: number | null
          id?: string
          integrity_failed?: number | null
          integrity_passed?: number | null
          inventory_value?: number | null
          ltv_to_cac?: number | null
          net_margin_pct?: number | null
          overall_trend?: string | null
          portfolio_health_score?: number | null
          risk_count?: number | null
          snapshot_date: string
          star_skus?: number | null
          sunset_skus?: number | null
          supplier_hhi?: number | null
          total_subscribers?: number | null
          urgent_reorders?: number | null
          watch_skus?: number | null
        }
        Update: {
          active_customers?: number | null
          annual_net_profit?: number | null
          annual_revenue?: number | null
          avg_cogs_ratio?: number | null
          avg_dtc_margin?: number | null
          bundle_revenue?: number | null
          cohort_ltv?: number | null
          created_at?: string | null
          current_arr?: number | null
          current_mrr?: number | null
          ending_cash?: number | null
          forecast_annual_revenue?: number | null
          free_cash_flow?: number | null
          id?: string
          integrity_failed?: number | null
          integrity_passed?: number | null
          inventory_value?: number | null
          ltv_to_cac?: number | null
          net_margin_pct?: number | null
          overall_trend?: string | null
          portfolio_health_score?: number | null
          risk_count?: number | null
          snapshot_date?: string
          star_skus?: number | null
          sunset_skus?: number | null
          supplier_hhi?: number | null
          total_subscribers?: number | null
          urgent_reorders?: number | null
          watch_skus?: number | null
        }
        Relationships: []
      }
      practitioner_notice_appeals: {
        Row: {
          claim_type: string
          id: string
          notice_id: string
          rebuttal: string
          resolution: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          submitted_at: string
          submitted_by: string
          supporting_links: string[] | null
        }
        Insert: {
          claim_type: string
          id?: string
          notice_id: string
          rebuttal: string
          resolution?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          submitted_at?: string
          submitted_by: string
          supporting_links?: string[] | null
        }
        Update: {
          claim_type?: string
          id?: string
          notice_id?: string
          rebuttal?: string
          resolution?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          submitted_at?: string
          submitted_by?: string
          supporting_links?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_notice_appeals_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "practitioner_notices"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioner_notices: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          finding_id: string | null
          id: string
          notice_id: string
          practitioner_id: string
          remediated_at: string | null
          remediation_due_at: string
          resolution_note: string | null
          severity: string
          status: string
          strike_applied: boolean
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          finding_id?: string | null
          id?: string
          notice_id: string
          practitioner_id: string
          remediated_at?: string | null
          remediation_due_at: string
          resolution_note?: string | null
          severity: string
          status?: string
          strike_applied?: boolean
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          finding_id?: string | null
          id?: string
          notice_id?: string
          practitioner_id?: string
          remediated_at?: string | null
          remediation_due_at?: string
          resolution_note?: string | null
          severity?: string
          status?: string
          strike_applied?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_notices_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "compliance_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_notices_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_notices_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_notices_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_notices_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_notices_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_notices_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_notices_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      practitioner_operations_audit_log: {
        Row: {
          action_category: string
          action_verb: string
          actor_role: string | null
          actor_user_id: string | null
          after_state_json: Json | null
          audit_id: string
          before_state_json: Json | null
          context_json: Json | null
          ip_address: unknown
          occurred_at: string
          practitioner_id: string | null
          target_id: string | null
          target_table: string
          user_agent: string | null
        }
        Insert: {
          action_category: string
          action_verb: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_state_json?: Json | null
          audit_id?: string
          before_state_json?: Json | null
          context_json?: Json | null
          ip_address?: unknown
          occurred_at?: string
          practitioner_id?: string | null
          target_id?: string | null
          target_table: string
          user_agent?: string | null
        }
        Update: {
          action_category?: string
          action_verb?: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_state_json?: Json | null
          audit_id?: string
          before_state_json?: Json | null
          context_json?: Json | null
          ip_address?: unknown
          occurred_at?: string
          practitioner_id?: string | null
          target_id?: string | null
          target_table?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_operations_audit_log_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_operations_audit_log_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_operations_audit_log_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_operations_audit_log_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_operations_audit_log_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_operations_audit_log_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_operations_audit_log_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      practitioner_payout_methods: {
        Row: {
          created_at: string
          display_label: string
          last_used_at: string | null
          metadata_json: Json
          method_id: string
          paypal_email: string | null
          practitioner_id: string
          priority: number
          rail: Database["public"]["Enums"]["payout_rail"]
          status: Database["public"]["Enums"]["payout_method_status"]
          stripe_connect_account_id: string | null
          updated_at: string
          verified_at: string | null
          wire_instructions_vault_ref: string | null
        }
        Insert: {
          created_at?: string
          display_label: string
          last_used_at?: string | null
          metadata_json?: Json
          method_id?: string
          paypal_email?: string | null
          practitioner_id: string
          priority?: number
          rail: Database["public"]["Enums"]["payout_rail"]
          status?: Database["public"]["Enums"]["payout_method_status"]
          stripe_connect_account_id?: string | null
          updated_at?: string
          verified_at?: string | null
          wire_instructions_vault_ref?: string | null
        }
        Update: {
          created_at?: string
          display_label?: string
          last_used_at?: string | null
          metadata_json?: Json
          method_id?: string
          paypal_email?: string | null
          practitioner_id?: string
          priority?: number
          rail?: Database["public"]["Enums"]["payout_rail"]
          status?: Database["public"]["Enums"]["payout_method_status"]
          stripe_connect_account_id?: string | null
          updated_at?: string
          verified_at?: string | null
          wire_instructions_vault_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_payout_methods_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_payout_methods_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_payout_methods_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_payout_methods_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_payout_methods_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_payout_methods_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_payout_methods_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      practitioner_social_handles: {
        Row: {
          active: boolean
          created_at: string
          handle: string
          handle_external_id: string | null
          id: string
          platform: string
          practitioner_id: string
          verification_method: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          handle: string
          handle_external_id?: string | null
          id?: string
          platform: string
          practitioner_id: string
          verification_method: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          handle?: string
          handle_external_id?: string | null
          id?: string
          platform?: string
          practitioner_id?: string
          verification_method?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_social_handles_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_social_handles_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_social_handles_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_social_handles_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_social_handles_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_social_handles_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_social_handles_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      practitioner_statements: {
        Row: {
          emailed_at: string | null
          generated_at: string
          net_payable_cents: number
          payout_transaction_id: string | null
          period_end: string
          period_start: string
          practitioner_id: string
          statement_id: string
          storage_path: string
          template_version: string
          ytd_paid_cents: number
        }
        Insert: {
          emailed_at?: string | null
          generated_at?: string
          net_payable_cents: number
          payout_transaction_id?: string | null
          period_end: string
          period_start: string
          practitioner_id: string
          statement_id?: string
          storage_path: string
          template_version: string
          ytd_paid_cents: number
        }
        Update: {
          emailed_at?: string | null
          generated_at?: string
          net_payable_cents?: number
          payout_transaction_id?: string | null
          period_end?: string
          period_start?: string
          practitioner_id?: string
          statement_id?: string
          storage_path?: string
          template_version?: string
          ytd_paid_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_statements_payout_transaction_id_fkey"
            columns: ["payout_transaction_id"]
            isOneToOne: false
            referencedRelation: "payout_transactions"
            referencedColumns: ["txn_id"]
          },
          {
            foreignKeyName: "practitioner_statements_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_statements_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_statements_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_statements_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_statements_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_statements_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_statements_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      practitioner_strikes: {
        Row: {
          applied_at: string
          expires_at: string
          id: string
          notes: string | null
          notice_id: string
          practitioner_id: string
          reversed: boolean
          reversed_at: string | null
          reversed_by: string | null
          strike_number: number
        }
        Insert: {
          applied_at?: string
          expires_at: string
          id?: string
          notes?: string | null
          notice_id: string
          practitioner_id: string
          reversed?: boolean
          reversed_at?: string | null
          reversed_by?: string | null
          strike_number: number
        }
        Update: {
          applied_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          notice_id?: string
          practitioner_id?: string
          reversed?: boolean
          reversed_at?: string | null
          reversed_by?: string | null
          strike_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_strikes_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "practitioner_notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_strikes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_strikes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_strikes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_strikes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_strikes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_strikes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_strikes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      practitioner_tax_documents: {
        Row: {
          country_of_residence: string
          created_at: string
          encrypted_pii_vault_ref: string
          expires_at: string | null
          form_type: Database["public"]["Enums"]["tax_form_type"]
          legal_name_redacted: string | null
          practitioner_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["tax_info_status"]
          storage_path: string
          submitted_at: string | null
          tax_doc_id: string
        }
        Insert: {
          country_of_residence: string
          created_at?: string
          encrypted_pii_vault_ref: string
          expires_at?: string | null
          form_type: Database["public"]["Enums"]["tax_form_type"]
          legal_name_redacted?: string | null
          practitioner_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["tax_info_status"]
          storage_path: string
          submitted_at?: string | null
          tax_doc_id?: string
        }
        Update: {
          country_of_residence?: string
          created_at?: string
          encrypted_pii_vault_ref?: string
          expires_at?: string | null
          form_type?: Database["public"]["Enums"]["tax_form_type"]
          legal_name_redacted?: string | null
          practitioner_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["tax_info_status"]
          storage_path?: string
          submitted_at?: string | null
          tax_doc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_tax_documents_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_tax_documents_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_tax_documents_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_tax_documents_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_tax_documents_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_tax_documents_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_tax_documents_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      practitioner_verified_channels: {
        Row: {
          channel_display_name: string
          channel_id: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          channel_url: string
          created_at: string
          metadata_json: Json
          notes: string | null
          oauth_token_vault_ref: string | null
          practitioner_id: string
          re_verify_due_at: string | null
          state: Database["public"]["Enums"]["channel_state"]
          updated_at: string
          verification_method:
            | Database["public"]["Enums"]["verification_method"]
            | null
          verified_at: string | null
        }
        Insert: {
          channel_display_name: string
          channel_id?: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          channel_url: string
          created_at?: string
          metadata_json?: Json
          notes?: string | null
          oauth_token_vault_ref?: string | null
          practitioner_id: string
          re_verify_due_at?: string | null
          state?: Database["public"]["Enums"]["channel_state"]
          updated_at?: string
          verification_method?:
            | Database["public"]["Enums"]["verification_method"]
            | null
          verified_at?: string | null
        }
        Update: {
          channel_display_name?: string
          channel_id?: string
          channel_type?: Database["public"]["Enums"]["channel_type"]
          channel_url?: string
          created_at?: string
          metadata_json?: Json
          notes?: string | null
          oauth_token_vault_ref?: string | null
          practitioner_id?: string
          re_verify_due_at?: string | null
          state?: Database["public"]["Enums"]["channel_state"]
          updated_at?: string
          verification_method?:
            | Database["public"]["Enums"]["verification_method"]
            | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_verified_channels_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_verified_channels_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_verified_channels_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_verified_channels_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_verified_channels_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_verified_channels_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "practitioner_verified_channels_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      practitioners: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      precheck_clearance_receipts: {
        Row: {
          draft_hash_sha256: string
          expires_at: string
          id: string
          issued_at: string
          jwt_compact: string
          practitioner_id: string
          receipt_id: string
          revoked: boolean
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          session_id: string
          signing_key_id: string
        }
        Insert: {
          draft_hash_sha256: string
          expires_at: string
          id?: string
          issued_at?: string
          jwt_compact: string
          practitioner_id: string
          receipt_id: string
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          session_id: string
          signing_key_id: string
        }
        Update: {
          draft_hash_sha256?: string
          expires_at?: string
          id?: string
          issued_at?: string
          jwt_compact?: string
          practitioner_id?: string
          receipt_id?: string
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          session_id?: string
          signing_key_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "precheck_clearance_receipts_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_clearance_receipts_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_clearance_receipts_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_clearance_receipts_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precheck_clearance_receipts_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_clearance_receipts_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_clearance_receipts_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_clearance_receipts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      precheck_extension_grants: {
        Row: {
          client_id: string
          id: string
          installed_at: string
          last_used_at: string | null
          practitioner_id: string
          revoked: boolean
          revoked_at: string | null
          user_agent: string | null
        }
        Insert: {
          client_id: string
          id?: string
          installed_at?: string
          last_used_at?: string | null
          practitioner_id: string
          revoked?: boolean
          revoked_at?: string | null
          user_agent?: string | null
        }
        Update: {
          client_id?: string
          id?: string
          installed_at?: string
          last_used_at?: string | null
          practitioner_id?: string
          revoked?: boolean
          revoked_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precheck_extension_grants_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_extension_grants_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_extension_grants_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_extension_grants_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precheck_extension_grants_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_extension_grants_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_extension_grants_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      precheck_findings: {
        Row: {
          confidence: number
          created_at: string
          id: string
          remediation_kind: string
          remediation_suggestion_hash: string | null
          round: number
          rule_id: string
          session_id: string
          severity: string
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          remediation_kind: string
          remediation_suggestion_hash?: string | null
          round?: number
          rule_id: string
          session_id: string
          severity: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          remediation_kind?: string
          remediation_suggestion_hash?: string | null
          round?: number
          rule_id?: string
          session_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "precheck_findings_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precheck_findings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      precheck_good_faith_events: {
        Row: {
          created_at: string
          finding_id: string
          id: string
          jaccard_similarity: number | null
          match_kind: string
          outcome: string
          practitioner_id: string
          receipt_id: string | null
          severity_after: string | null
          severity_before: string | null
        }
        Insert: {
          created_at?: string
          finding_id: string
          id?: string
          jaccard_similarity?: number | null
          match_kind: string
          outcome: string
          practitioner_id: string
          receipt_id?: string | null
          severity_after?: string | null
          severity_before?: string | null
        }
        Update: {
          created_at?: string
          finding_id?: string
          id?: string
          jaccard_similarity?: number | null
          match_kind?: string
          outcome?: string
          practitioner_id?: string
          receipt_id?: string | null
          severity_after?: string | null
          severity_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precheck_good_faith_events_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "compliance_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precheck_good_faith_events_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_good_faith_events_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_good_faith_events_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_good_faith_events_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precheck_good_faith_events_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_good_faith_events_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_good_faith_events_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_good_faith_events_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "precheck_clearance_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      precheck_sessions: {
        Row: {
          cleared_at: string | null
          closed_at: string | null
          created_at: string
          draft_hash_sha256: string
          final_findings_summary: Json | null
          id: string
          normalization_version: string
          practitioner_id: string
          recursion_count: number
          rule_registry_version: string
          session_id: string
          source: string
          status: string
          target_platform: string | null
          updated_at: string
        }
        Insert: {
          cleared_at?: string | null
          closed_at?: string | null
          created_at?: string
          draft_hash_sha256: string
          final_findings_summary?: Json | null
          id?: string
          normalization_version: string
          practitioner_id: string
          recursion_count?: number
          rule_registry_version: string
          session_id: string
          source: string
          status?: string
          target_platform?: string | null
          updated_at?: string
        }
        Update: {
          cleared_at?: string | null
          closed_at?: string | null
          created_at?: string
          draft_hash_sha256?: string
          final_findings_summary?: Json | null
          id?: string
          normalization_version?: string
          practitioner_id?: string
          recursion_count?: number
          rule_registry_version?: string
          session_id?: string
          source?: string
          status?: string
          target_platform?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "precheck_sessions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_sessions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_sessions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_sessions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precheck_sessions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_sessions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "precheck_sessions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      precheck_signing_keys: {
        Row: {
          active: boolean
          alg: string
          created_at: string
          id: string
          private_key_ref: string
          public_key_jwk: Json
          public_key_pem: string
          retired_at: string | null
          rotation_of: string | null
        }
        Insert: {
          active?: boolean
          alg?: string
          created_at?: string
          id: string
          private_key_ref: string
          public_key_jwk: Json
          public_key_pem: string
          retired_at?: string | null
          rotation_of?: string | null
        }
        Update: {
          active?: boolean
          alg?: string
          created_at?: string
          id?: string
          private_key_ref?: string
          public_key_jwk?: Json
          public_key_pem?: string
          retired_at?: string | null
          rotation_of?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precheck_signing_keys_rotation_of_fkey"
            columns: ["rotation_of"]
            isOneToOne: false
            referencedRelation: "precheck_signing_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_consume_failures: {
        Row: {
          failed_at: string
          failure_message: string | null
          id: string
          metadata: Json
          order_id: string
          order_number: string | null
          sku: string | null
          token_id: string | null
        }
        Insert: {
          failed_at?: string
          failure_message?: string | null
          id?: string
          metadata?: Json
          order_id: string
          order_number?: string | null
          sku?: string | null
          token_id?: string | null
        }
        Update: {
          failed_at?: string
          failure_message?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          order_number?: string | null
          sku?: string | null
          token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_consume_failures_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_consume_failures_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "prescription_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_tokens: {
        Row: {
          clinical_notes: string | null
          consumed_at: string | null
          dosage_instructions: string | null
          expires_at: string
          id: string
          issued_at: string
          metadata: Json
          patient_user_id: string
          practitioner_user_id: string
          quantity_authorized: number
          quantity_consumed: number
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by_user_id: string | null
          sku: string
          status: string
        }
        Insert: {
          clinical_notes?: string | null
          consumed_at?: string | null
          dosage_instructions?: string | null
          expires_at: string
          id?: string
          issued_at?: string
          metadata?: Json
          patient_user_id: string
          practitioner_user_id: string
          quantity_authorized?: number
          quantity_consumed?: number
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          sku: string
          status?: string
        }
        Update: {
          clinical_notes?: string | null
          consumed_at?: string | null
          dosage_instructions?: string | null
          expires_at?: string
          id?: string
          issued_at?: string
          metadata?: Json
          patient_user_id?: string
          practitioner_user_id?: string
          quantity_authorized?: number
          quantity_consumed?: number
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          sku?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_tokens_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      price_change_history: {
        Row: {
          applied_at: string
          applied_by_user_id: string | null
          change_action: string
          created_at: string
          id: string
          new_value_cents: number | null
          new_value_percent: number | null
          previous_value_cents: number | null
          previous_value_percent: number | null
          pricing_domain_id: string
          proposal_id: string
          target_object_id: string
        }
        Insert: {
          applied_at?: string
          applied_by_user_id?: string | null
          change_action: string
          created_at?: string
          id?: string
          new_value_cents?: number | null
          new_value_percent?: number | null
          previous_value_cents?: number | null
          previous_value_percent?: number | null
          pricing_domain_id: string
          proposal_id: string
          target_object_id: string
        }
        Update: {
          applied_at?: string
          applied_by_user_id?: string | null
          change_action?: string
          created_at?: string
          id?: string
          new_value_cents?: number | null
          new_value_percent?: number | null
          previous_value_cents?: number | null
          previous_value_percent?: number | null
          pricing_domain_id?: string
          proposal_id?: string
          target_object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_change_history_pricing_domain_id_fkey"
            columns: ["pricing_domain_id"]
            isOneToOne: false
            referencedRelation: "pricing_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_change_history_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "pricing_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_domains: {
        Row: {
          affected_customer_query_template: string | null
          category: string
          created_at: string
          default_grandfathering_policy: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          pending_dependency: string | null
          requires_grandfathering: boolean
          sort_order: number
          target_column: string
          target_id_column: string
          target_id_type: string
          target_table: string
        }
        Insert: {
          affected_customer_query_template?: string | null
          category: string
          created_at?: string
          default_grandfathering_policy?: string | null
          description?: string | null
          display_name: string
          id: string
          is_active?: boolean
          pending_dependency?: string | null
          requires_grandfathering?: boolean
          sort_order: number
          target_column: string
          target_id_column?: string
          target_id_type?: string
          target_table: string
        }
        Update: {
          affected_customer_query_template?: string | null
          category?: string
          created_at?: string
          default_grandfathering_policy?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          pending_dependency?: string | null
          requires_grandfathering?: boolean
          sort_order?: number
          target_column?: string
          target_id_column?: string
          target_id_type?: string
          target_table?: string
        }
        Relationships: []
      }
      pricing_proposals: {
        Row: {
          activated_at: string | null
          auto_classified_tier: string
          change_type: string
          competitive_analysis: string | null
          current_value_cents: number | null
          current_value_percent: number | null
          emergency_justification: string | null
          estimated_affected_customers: number | null
          estimated_annual_revenue_impact_cents: number | null
          expired_at: string | null
          expires_at: string
          grandfathering_override_justification: string | null
          grandfathering_policy: string
          id: string
          impact_tier: string
          initiated_at: string
          initiated_by: string
          is_emergency: boolean
          percent_change: number | null
          pricing_domain_id: string
          projected_churn_change_percent: number | null
          projected_ltv_cac_ratio_24mo_after: number | null
          projected_ltv_cac_ratio_24mo_before: number | null
          projected_ltv_change_percent: number | null
          proposal_number: number
          proposed_effective_date: string
          proposed_value_cents: number | null
          proposed_value_percent: number | null
          rationale: string
          raw_calculation_inputs: Json | null
          risks_and_mitigations: string | null
          rollback_justification: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          stakeholder_communication_plan: string | null
          status: string
          submitted_at: string | null
          summary: string
          target_object_ids: string[]
          tier_override_justification: string | null
          title: string
          unit_economics_snapshot_id: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          auto_classified_tier: string
          change_type: string
          competitive_analysis?: string | null
          current_value_cents?: number | null
          current_value_percent?: number | null
          emergency_justification?: string | null
          estimated_affected_customers?: number | null
          estimated_annual_revenue_impact_cents?: number | null
          expired_at?: string | null
          expires_at?: string
          grandfathering_override_justification?: string | null
          grandfathering_policy: string
          id?: string
          impact_tier: string
          initiated_at?: string
          initiated_by: string
          is_emergency?: boolean
          percent_change?: number | null
          pricing_domain_id: string
          projected_churn_change_percent?: number | null
          projected_ltv_cac_ratio_24mo_after?: number | null
          projected_ltv_cac_ratio_24mo_before?: number | null
          projected_ltv_change_percent?: number | null
          proposal_number?: number
          proposed_effective_date: string
          proposed_value_cents?: number | null
          proposed_value_percent?: number | null
          rationale: string
          raw_calculation_inputs?: Json | null
          risks_and_mitigations?: string | null
          rollback_justification?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          stakeholder_communication_plan?: string | null
          status?: string
          submitted_at?: string | null
          summary: string
          target_object_ids?: string[]
          tier_override_justification?: string | null
          title: string
          unit_economics_snapshot_id?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          auto_classified_tier?: string
          change_type?: string
          competitive_analysis?: string | null
          current_value_cents?: number | null
          current_value_percent?: number | null
          emergency_justification?: string | null
          estimated_affected_customers?: number | null
          estimated_annual_revenue_impact_cents?: number | null
          expired_at?: string | null
          expires_at?: string
          grandfathering_override_justification?: string | null
          grandfathering_policy?: string
          id?: string
          impact_tier?: string
          initiated_at?: string
          initiated_by?: string
          is_emergency?: boolean
          percent_change?: number | null
          pricing_domain_id?: string
          projected_churn_change_percent?: number | null
          projected_ltv_cac_ratio_24mo_after?: number | null
          projected_ltv_cac_ratio_24mo_before?: number | null
          projected_ltv_change_percent?: number | null
          proposal_number?: number
          proposed_effective_date?: string
          proposed_value_cents?: number | null
          proposed_value_percent?: number | null
          rationale?: string
          raw_calculation_inputs?: Json | null
          risks_and_mitigations?: string | null
          rollback_justification?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          stakeholder_communication_plan?: string | null
          status?: string
          submitted_at?: string | null
          summary?: string
          target_object_ids?: string[]
          tier_override_justification?: string | null
          title?: string
          unit_economics_snapshot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_proposals_pricing_domain_id_fkey"
            columns: ["pricing_domain_id"]
            isOneToOne: false
            referencedRelation: "pricing_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          alerts: string
          category: string
          changed: boolean
          cogs: number
          cogs_ratio: number
          created_at: string | null
          distributor: number
          dtc_margin: number
          id: string
          msrp: number
          name: string
          sku: string
          wholesale: number
          ws_margin: number
        }
        Insert: {
          alerts?: string
          category: string
          changed?: boolean
          cogs: number
          cogs_ratio: number
          created_at?: string | null
          distributor: number
          dtc_margin: number
          id?: string
          msrp: number
          name: string
          sku: string
          wholesale: number
          ws_margin: number
        }
        Update: {
          alerts?: string
          category?: string
          changed?: boolean
          cogs?: number
          cogs_ratio?: number
          created_at?: string | null
          distributor?: number
          dtc_margin?: number
          id?: string
          msrp?: number
          name?: string
          sku?: string
          wholesale?: number
          ws_margin?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_sku_fkey"
            columns: ["sku"]
            isOneToOne: true
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      product_catalog: {
        Row: {
          active: boolean | null
          category: string
          contraindication_tags: string[] | null
          created_at: string | null
          delivery_form: string | null
          description: string | null
          formulation_json: Json | null
          genetic_tags: string[] | null
          goal_tags: string[] | null
          id: string
          image_url: string | null
          lifestyle_tags: string[] | null
          master_sku: string | null
          name: string
          price: number
          priority_weight: number | null
          short_description: string | null
          sku: string
          subcategory: string | null
          symptom_tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          contraindication_tags?: string[] | null
          created_at?: string | null
          delivery_form?: string | null
          description?: string | null
          formulation_json?: Json | null
          genetic_tags?: string[] | null
          goal_tags?: string[] | null
          id?: string
          image_url?: string | null
          lifestyle_tags?: string[] | null
          master_sku?: string | null
          name: string
          price: number
          priority_weight?: number | null
          short_description?: string | null
          sku: string
          subcategory?: string | null
          symptom_tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          contraindication_tags?: string[] | null
          created_at?: string | null
          delivery_form?: string | null
          description?: string | null
          formulation_json?: Json | null
          genetic_tags?: string[] | null
          goal_tags?: string[] | null
          id?: string
          image_url?: string | null
          lifestyle_tags?: string[] | null
          master_sku?: string | null
          name?: string
          price?: number
          priority_weight?: number | null
          short_description?: string | null
          sku?: string
          subcategory?: string | null
          symptom_tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_master_sku_fkey"
            columns: ["master_sku"]
            isOneToOne: false
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      product_lookup_cache: {
        Row: {
          confidence: number | null
          expires_at: string | null
          fetched_at: string | null
          id: string
          product_data: Json
          query_normalized: string
        }
        Insert: {
          confidence?: number | null
          expires_at?: string | null
          fetched_at?: string | null
          id?: string
          product_data: Json
          query_normalized: string
        }
        Update: {
          confidence?: number | null
          expires_at?: string | null
          fetched_at?: string | null
          id?: string
          product_data?: Json
          query_normalized?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          bioavailability_pct: number | null
          category: string
          category_slug: string | null
          created_at: string
          description: string
          display_config: Json | null
          format: string | null
          gene_match_score: number | null
          id: string
          image_url: string | null
          image_urls: Json | null
          ingredients: Json | null
          master_sku: string | null
          name: string
          price: number
          price_msrp: number | null
          pricing_tier: string
          product_type: string | null
          requires_practitioner_order: boolean | null
          short_name: string
          sku: string
          slug: string | null
          snp_targets: Json | null
          status_tags: Json | null
          summary: string | null
          testing_meta: Json | null
        }
        Insert: {
          active?: boolean
          bioavailability_pct?: number | null
          category: string
          category_slug?: string | null
          created_at?: string
          description?: string
          display_config?: Json | null
          format?: string | null
          gene_match_score?: number | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          ingredients?: Json | null
          master_sku?: string | null
          name: string
          price?: number
          price_msrp?: number | null
          pricing_tier?: string
          product_type?: string | null
          requires_practitioner_order?: boolean | null
          short_name: string
          sku: string
          slug?: string | null
          snp_targets?: Json | null
          status_tags?: Json | null
          summary?: string | null
          testing_meta?: Json | null
        }
        Update: {
          active?: boolean
          bioavailability_pct?: number | null
          category?: string
          category_slug?: string | null
          created_at?: string
          description?: string
          display_config?: Json | null
          format?: string | null
          gene_match_score?: number | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          ingredients?: Json | null
          master_sku?: string | null
          name?: string
          price?: number
          price_msrp?: number | null
          pricing_tier?: string
          product_type?: string | null
          requires_practitioner_order?: boolean | null
          short_name?: string
          sku?: string
          slug?: string | null
          snp_targets?: Json | null
          status_tags?: Json | null
          summary?: string | null
          testing_meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "products_master_sku_fkey"
            columns: ["master_sku"]
            isOneToOne: false
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      products_dropped_backup_142e: {
        Row: {
          full_row: Json
          id: string
          original_id: string
          slug: string | null
          snapshot_at: string
        }
        Insert: {
          full_row: Json
          id?: string
          original_id: string
          slug?: string | null
          snapshot_at?: string
        }
        Update: {
          full_row?: Json
          id?: string
          original_id?: string
          slug?: string | null
          snapshot_at?: string
        }
        Relationships: []
      }
      products_dropped_backup_152w: {
        Row: {
          active: boolean
          bioavailability_pct: number | null
          category: string
          category_slug: string | null
          created_at: string
          description: string
          display_config: Json | null
          format: string | null
          gene_match_score: number | null
          id: string
          image_url: string | null
          image_urls: Json | null
          ingredients: Json | null
          master_sku: string | null
          name: string
          price: number
          price_msrp: number | null
          pricing_tier: string
          product_type: string | null
          requires_practitioner_order: boolean | null
          short_name: string
          sku: string
          slug: string | null
          snp_targets: Json | null
          status_tags: Json | null
          summary: string | null
          testing_meta: Json | null
        }
        Insert: {
          active?: boolean
          bioavailability_pct?: number | null
          category: string
          category_slug?: string | null
          created_at?: string
          description?: string
          display_config?: Json | null
          format?: string | null
          gene_match_score?: number | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          ingredients?: Json | null
          master_sku?: string | null
          name: string
          price?: number
          price_msrp?: number | null
          pricing_tier?: string
          product_type?: string | null
          requires_practitioner_order?: boolean | null
          short_name: string
          sku: string
          slug?: string | null
          snp_targets?: Json | null
          status_tags?: Json | null
          summary?: string | null
          testing_meta?: Json | null
        }
        Update: {
          active?: boolean
          bioavailability_pct?: number | null
          category?: string
          category_slug?: string | null
          created_at?: string
          description?: string
          display_config?: Json | null
          format?: string | null
          gene_match_score?: number | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          ingredients?: Json | null
          master_sku?: string | null
          name?: string
          price?: number
          price_msrp?: number | null
          pricing_tier?: string
          product_type?: string | null
          requires_practitioner_order?: boolean | null
          short_name?: string
          sku?: string
          slug?: string | null
          snp_targets?: Json | null
          status_tags?: Json | null
          summary?: string | null
          testing_meta?: Json | null
        }
        Relationships: []
      }
      products_image_audit: {
        Row: {
          applied_at: string
          applied_by: string
          id: string
          match_confidence: string
          match_source: string
          new_image_url: string
          previous_image_url: string | null
          product_id: string | null
          run_id: string | null
          sku: string
          variant_id: string | null
        }
        Insert: {
          applied_at?: string
          applied_by?: string
          id?: string
          match_confidence: string
          match_source: string
          new_image_url: string
          previous_image_url?: string | null
          product_id?: string | null
          run_id?: string | null
          sku: string
          variant_id?: string | null
        }
        Update: {
          applied_at?: string
          applied_by?: string
          id?: string
          match_confidence?: string
          match_source?: string
          new_image_url?: string
          previous_image_url?: string | null
          product_id?: string | null
          run_id?: string | null
          sku?: string
          variant_id?: string | null
        }
        Relationships: []
      }
      products_image_urls_backup_142d: {
        Row: {
          id: string
          prior_image_urls: Json | null
          product_id: string
          slug: string | null
          snapshot_at: string
        }
        Insert: {
          id?: string
          prior_image_urls?: Json | null
          product_id: string
          slug?: string | null
          snapshot_at?: string
        }
        Update: {
          id?: string
          prior_image_urls?: Json | null
          product_id?: string
          slug?: string | null
          snapshot_at?: string
        }
        Relationships: []
      }
      products_methylation_backup_142c: {
        Row: {
          full_row: Json
          id: string
          original_id: string
          snapshot_at: string
        }
        Insert: {
          full_row: Json
          id?: string
          original_id: string
          snapshot_at?: string
        }
        Update: {
          full_row?: Json
          id?: string
          original_id?: string
          snapshot_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assessment_completed: boolean | null
          avatar_url: string | null
          bio_optimization_calculated_at: string | null
          bio_optimization_opportunities: string[] | null
          bio_optimization_score: number | null
          bio_optimization_strengths: string[] | null
          bio_optimization_tier: string | null
          caq_completed_at: string | null
          constitutional_type: string | null
          created_at: string | null
          date_of_birth: string | null
          ethnicity: string[] | null
          family_history: Json | null
          full_name: string | null
          health_concerns: string[] | null
          id: string
          onboarding_completed: boolean | null
          role: string | null
          symptoms_emotional: Json | null
          symptoms_neurological: Json | null
          symptoms_physical: Json | null
          unit_system: string | null
          updated_at: string | null
          username: string | null
          vitality_score: number | null
        }
        Insert: {
          assessment_completed?: boolean | null
          avatar_url?: string | null
          bio_optimization_calculated_at?: string | null
          bio_optimization_opportunities?: string[] | null
          bio_optimization_score?: number | null
          bio_optimization_strengths?: string[] | null
          bio_optimization_tier?: string | null
          caq_completed_at?: string | null
          constitutional_type?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          ethnicity?: string[] | null
          family_history?: Json | null
          full_name?: string | null
          health_concerns?: string[] | null
          id: string
          onboarding_completed?: boolean | null
          role?: string | null
          symptoms_emotional?: Json | null
          symptoms_neurological?: Json | null
          symptoms_physical?: Json | null
          unit_system?: string | null
          updated_at?: string | null
          username?: string | null
          vitality_score?: number | null
        }
        Update: {
          assessment_completed?: boolean | null
          avatar_url?: string | null
          bio_optimization_calculated_at?: string | null
          bio_optimization_opportunities?: string[] | null
          bio_optimization_score?: number | null
          bio_optimization_strengths?: string[] | null
          bio_optimization_tier?: string | null
          caq_completed_at?: string | null
          constitutional_type?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          ethnicity?: string[] | null
          family_history?: Json | null
          full_name?: string | null
          health_concerns?: string[] | null
          id?: string
          onboarding_completed?: boolean | null
          role?: string | null
          symptoms_emotional?: Json | null
          symptoms_neurological?: Json | null
          symptoms_physical?: Json | null
          unit_system?: string | null
          updated_at?: string | null
          username?: string | null
          vitality_score?: number | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          kind: string
          max_redemptions: number | null
          min_subtotal_cents: number
          times_redeemed: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          kind: string
          max_redemptions?: number | null
          min_subtotal_cents?: number
          times_redeemed?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          kind?: string
          max_redemptions?: number | null
          min_subtotal_cents?: number
          times_redeemed?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      promotion_roi: {
        Row: {
          applies_to: string
          baseline_gross_profit: number
          baseline_revenue: number
          baseline_units: number
          breakeven_lift: string
          code: string
          commission_cost: number
          created_at: string | null
          discount: string
          duration: string
          effective_cac: number
          exceeds_breakeven: boolean
          gp_delta: number
          id: string
          marketing_cost: number
          net_new_customers: number
          promo_gross_profit: number
          promo_revenue: number
          promo_units: number
          promotion: string
          rating: string
          revenue_delta: number
          roi: number
          skus_affected: number
          type: string
          volume_lift: string
        }
        Insert: {
          applies_to: string
          baseline_gross_profit: number
          baseline_revenue: number
          baseline_units: number
          breakeven_lift: string
          code: string
          commission_cost?: number
          created_at?: string | null
          discount: string
          duration: string
          effective_cac: number
          exceeds_breakeven: boolean
          gp_delta: number
          id?: string
          marketing_cost: number
          net_new_customers: number
          promo_gross_profit: number
          promo_revenue: number
          promo_units: number
          promotion: string
          rating: string
          revenue_delta: number
          roi: number
          skus_affected: number
          type: string
          volume_lift: string
        }
        Update: {
          applies_to?: string
          baseline_gross_profit?: number
          baseline_revenue?: number
          baseline_units?: number
          breakeven_lift?: string
          code?: string
          commission_cost?: number
          created_at?: string | null
          discount?: string
          duration?: string
          effective_cac?: number
          exceeds_breakeven?: boolean
          gp_delta?: number
          id?: string
          marketing_cost?: number
          net_new_customers?: number
          promo_gross_profit?: number
          promo_revenue?: number
          promo_units?: number
          promotion?: string
          rating?: string
          revenue_delta?: number
          roi?: number
          skus_affected?: number
          type?: string
          volume_lift?: string
        }
        Relationships: []
      }
      proposal_approvals: {
        Row: {
          advisory_comment: string | null
          advisory_commented_at: string | null
          approver_role: string
          approver_user_id: string
          created_at: string
          decided_at: string | null
          decision: string | null
          decision_notes: string | null
          id: string
          is_advisory: boolean
          is_required: boolean
          notified_at: string | null
          proposal_id: string
          reminded_at: string | null
          updated_at: string
        }
        Insert: {
          advisory_comment?: string | null
          advisory_commented_at?: string | null
          approver_role: string
          approver_user_id: string
          created_at?: string
          decided_at?: string | null
          decision?: string | null
          decision_notes?: string | null
          id?: string
          is_advisory: boolean
          is_required: boolean
          notified_at?: string | null
          proposal_id: string
          reminded_at?: string | null
          updated_at?: string
        }
        Update: {
          advisory_comment?: string | null
          advisory_commented_at?: string | null
          approver_role?: string
          approver_user_id?: string
          created_at?: string
          decided_at?: string | null
          decision?: string | null
          decision_notes?: string | null
          id?: string
          is_advisory?: boolean
          is_required?: boolean
          notified_at?: string | null
          proposal_id?: string
          reminded_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_approvals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "pricing_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_comments: {
        Row: {
          author_user_id: string
          comment_body: string
          comment_type: string
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean
          proposal_id: string
          reply_to_comment_id: string | null
        }
        Insert: {
          author_user_id: string
          comment_body: string
          comment_type?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          proposal_id: string
          reply_to_comment_id?: string | null
        }
        Update: {
          author_user_id?: string
          comment_body?: string
          comment_type?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          proposal_id?: string
          reply_to_comment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_comments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "pricing_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_comments_reply_to_comment_id_fkey"
            columns: ["reply_to_comment_id"]
            isOneToOne: false
            referencedRelation: "proposal_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_ingredients: {
        Row: {
          added_at: string | null
          herb_id: string
          id: string
          percentage: number | null
          protocol_id: string
          ratio: string | null
          sequence_order: number | null
          volume_ml: number | null
        }
        Insert: {
          added_at?: string | null
          herb_id: string
          id?: string
          percentage?: number | null
          protocol_id: string
          ratio?: string | null
          sequence_order?: number | null
          volume_ml?: number | null
        }
        Update: {
          added_at?: string | null
          herb_id?: string
          id?: string
          percentage?: number | null
          protocol_id?: string
          ratio?: string | null
          sequence_order?: number | null
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_ingredients_herb_id_fkey"
            columns: ["herb_id"]
            isOneToOne: false
            referencedRelation: "herbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_ingredients_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_rules: {
        Row: {
          bioavailability_note: string | null
          created_at: string | null
          delivery_form: string
          dosage: string
          evidence_level: string
          frequency: string
          health_signals_template: string[]
          id: string
          is_active: boolean
          priority: string
          product_category: string
          product_name: string
          rationale_template: string
          rule_id: string
          rule_name: string
          timing: string[]
          trigger_field: string
          trigger_operator: string
          trigger_type: string
          trigger_value: string
        }
        Insert: {
          bioavailability_note?: string | null
          created_at?: string | null
          delivery_form: string
          dosage: string
          evidence_level?: string
          frequency?: string
          health_signals_template?: string[]
          id?: string
          is_active?: boolean
          priority?: string
          product_category: string
          product_name: string
          rationale_template: string
          rule_id: string
          rule_name: string
          timing?: string[]
          trigger_field: string
          trigger_operator: string
          trigger_type: string
          trigger_value: string
        }
        Update: {
          bioavailability_note?: string | null
          created_at?: string | null
          delivery_form?: string
          dosage?: string
          evidence_level?: string
          frequency?: string
          health_signals_template?: string[]
          id?: string
          is_active?: boolean
          priority?: string
          product_category?: string
          product_name?: string
          rationale_template?: string
          rule_id?: string
          rule_name?: string
          timing?: string[]
          trigger_field?: string
          trigger_operator?: string
          trigger_type?: string
          trigger_value?: string
        }
        Relationships: []
      }
      protocol_share_activity: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          id: string
          share_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          share_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_share_activity_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "protocol_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_shares: {
        Row: {
          accepted_at: string | null
          can_modify_protocol: boolean
          can_order_on_behalf: boolean
          can_recommend_products: boolean
          created_at: string
          expires_at: string | null
          id: string
          invite_code: string
          invite_email: string | null
          metadata: Json
          notes: string | null
          patient_id: string
          provider_id: string | null
          provider_type: string
          revoked_at: string | null
          share_bio_optimization_score: boolean
          share_caq_data: boolean
          share_genetic_results: boolean
          share_lab_results: boolean
          share_peptide_recommendations: boolean
          share_supplements: boolean
          share_wellness_analytics: boolean
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          can_modify_protocol?: boolean
          can_order_on_behalf?: boolean
          can_recommend_products?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_code: string
          invite_email?: string | null
          metadata?: Json
          notes?: string | null
          patient_id: string
          provider_id?: string | null
          provider_type: string
          revoked_at?: string | null
          share_bio_optimization_score?: boolean
          share_caq_data?: boolean
          share_genetic_results?: boolean
          share_lab_results?: boolean
          share_peptide_recommendations?: boolean
          share_supplements?: boolean
          share_wellness_analytics?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          can_modify_protocol?: boolean
          can_order_on_behalf?: boolean
          can_recommend_products?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          invite_email?: string | null
          metadata?: Json
          notes?: string | null
          patient_id?: string
          provider_id?: string | null
          provider_type?: string
          revoked_at?: string | null
          share_bio_optimization_score?: boolean
          share_caq_data?: boolean
          share_genetic_results?: boolean
          share_lab_results?: boolean
          share_peptide_recommendations?: boolean
          share_supplements?: boolean
          share_wellness_analytics?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      protocol_templates: {
        Row: {
          bio_improvements: string[]
          bio_score_delta: number
          bio_timeline_weeks: number
          confidence_tier: number
          created_at: string | null
          generation_note: string | null
          id: string
          pattern_count: number
          pattern_ids: string[]
          pattern_key: string
          rationale_template: string
          recommendations: Json
          template_type: string
          updated_at: string | null
        }
        Insert: {
          bio_improvements?: string[]
          bio_score_delta?: number
          bio_timeline_weeks?: number
          confidence_tier?: number
          created_at?: string | null
          generation_note?: string | null
          id?: string
          pattern_count?: number
          pattern_ids: string[]
          pattern_key: string
          rationale_template: string
          recommendations: Json
          template_type?: string
          updated_at?: string | null
        }
        Update: {
          bio_improvements?: string[]
          bio_score_delta?: number
          bio_timeline_weeks?: number
          confidence_tier?: number
          created_at?: string | null
          generation_note?: string | null
          id?: string
          pattern_count?: number
          pattern_ids?: string[]
          pattern_key?: string
          rationale_template?: string
          recommendations?: Json
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      protocols: {
        Row: {
          created_at: string | null
          dosage_instructions: string | null
          form: Database["public"]["Enums"]["form_type"]
          id: string
          patient_id: string | null
          protocol_name: string
          status: Database["public"]["Enums"]["protocol_status"]
          total_volume_ml: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dosage_instructions?: string | null
          form?: Database["public"]["Enums"]["form_type"]
          id?: string
          patient_id?: string | null
          protocol_name: string
          status?: Database["public"]["Enums"]["protocol_status"]
          total_volume_ml?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dosage_instructions?: string | null
          form?: Database["public"]["Enums"]["form_type"]
          id?: string
          patient_id?: string | null
          protocol_name?: string
          status?: Database["public"]["Enums"]["protocol_status"]
          total_volume_ml?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocols_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rebuttal_templates: {
        Row: {
          active: boolean
          approved_at: string | null
          approved_by: string | null
          body: string
          claim_type: string
          created_at: string
          disposition: string
          id: string
          jurisdiction: string
          language: string
          required_slots: string[]
          template_code: string
          version: number
        }
        Insert: {
          active?: boolean
          approved_at?: string | null
          approved_by?: string | null
          body: string
          claim_type: string
          created_at?: string
          disposition: string
          id?: string
          jurisdiction: string
          language?: string
          required_slots: string[]
          template_code: string
          version: number
        }
        Update: {
          active?: boolean
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          claim_type?: string
          created_at?: string
          disposition?: string
          id?: string
          jurisdiction?: string
          language?: string
          required_slots?: string[]
          template_code?: string
          version?: number
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          assessment_id: string | null
          category: string | null
          confidence_level: string | null
          confidence_score: number | null
          created_at: string | null
          dosage: string | null
          frequency: string | null
          id: string
          monthly_price: number | null
          priority_rank: number | null
          product_id: string | null
          product_name: string
          reason: string
          sku: string
          source: string | null
          status: string | null
          time_of_day: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          category?: string | null
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          monthly_price?: number | null
          priority_rank?: number | null
          product_id?: string | null
          product_name: string
          reason: string
          sku: string
          source?: string | null
          status?: string | null
          time_of_day?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          category?: string | null
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          monthly_price?: number | null
          priority_rank?: number | null
          product_id?: string | null
          product_name?: string
          reason?: string
          sku?: string
          source?: string | null
          status?: string | null
          time_of_day?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_alerts: {
        Row: {
          action_required: string | null
          created_at: string
          effective_date: string
          id: string
          ingredients_affected: string[]
          kelsey_severity: number | null
          kelsey_triaged_at: string | null
          resolved_at: string | null
          resolved_by: string | null
          skus_affected: string[]
          source: string
          summary: string | null
          title: string
          url: string
        }
        Insert: {
          action_required?: string | null
          created_at?: string
          effective_date: string
          id?: string
          ingredients_affected?: string[]
          kelsey_severity?: number | null
          kelsey_triaged_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          skus_affected?: string[]
          source: string
          summary?: string | null
          title: string
          url: string
        }
        Update: {
          action_required?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          ingredients_affected?: string[]
          kelsey_severity?: number | null
          kelsey_triaged_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          skus_affected?: string[]
          source?: string
          summary?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      regulatory_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          id: number
          ip_address: unknown
          jurisdiction_id: string | null
          justification: string | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: number
          ip_address?: unknown
          jurisdiction_id?: string | null
          justification?: string | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: number
          ip_address?: unknown
          jurisdiction_id?: string | null
          justification?: string | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_audit_log_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "regulatory_jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_claim_library: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          claim_hash: string
          claim_text: string
          claim_type: string
          created_at: string
          dose_condition: string | null
          id: string
          ingredient_id: string | null
          jurisdiction_id: string
          kelsey_rationale: string | null
          kelsey_reviewed_at: string | null
          kelsey_verdict: string | null
          retired_at: string | null
          sku_scope: string[]
          status: string
          substantiation_tier: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          claim_hash: string
          claim_text: string
          claim_type: string
          created_at?: string
          dose_condition?: string | null
          id?: string
          ingredient_id?: string | null
          jurisdiction_id: string
          kelsey_rationale?: string | null
          kelsey_reviewed_at?: string | null
          kelsey_verdict?: string | null
          retired_at?: string | null
          sku_scope?: string[]
          status: string
          substantiation_tier?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          claim_hash?: string
          claim_text?: string
          claim_type?: string
          created_at?: string
          dose_condition?: string | null
          id?: string
          ingredient_id?: string | null
          jurisdiction_id?: string
          kelsey_rationale?: string | null
          kelsey_reviewed_at?: string | null
          kelsey_verdict?: string | null
          retired_at?: string | null
          sku_scope?: string[]
          status?: string
          substantiation_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_claim_library_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_claim_library_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "regulatory_jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_disclaimer_events: {
        Row: {
          displayed: boolean
          id: number
          jurisdiction_id: string
          rendered_at: string
          suppression_attempt: boolean
          surface: string
          surface_id: string | null
          user_id: string | null
        }
        Insert: {
          displayed: boolean
          id?: number
          jurisdiction_id: string
          rendered_at?: string
          suppression_attempt?: boolean
          surface: string
          surface_id?: string | null
          user_id?: string | null
        }
        Update: {
          displayed?: boolean
          id?: number
          jurisdiction_id?: string
          rendered_at?: string
          suppression_attempt?: boolean
          surface?: string
          surface_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_disclaimer_events_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "regulatory_jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_disease_dictionary: {
        Row: {
          created_at: string
          icd10_code: string | null
          id: string
          jurisdiction_id: string | null
          notes: string | null
          severity_level: number
          term: string
          variant_group: string | null
        }
        Insert: {
          created_at?: string
          icd10_code?: string | null
          id?: string
          jurisdiction_id?: string | null
          notes?: string | null
          severity_level: number
          term: string
          variant_group?: string | null
        }
        Update: {
          created_at?: string
          icd10_code?: string | null
          id?: string
          jurisdiction_id?: string | null
          notes?: string | null
          severity_level?: number
          term?: string
          variant_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_disease_dictionary_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "regulatory_jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_ingredients: {
        Row: {
          contraindications: Json | null
          dose_max_mg_day: number | null
          dose_min_mg_day: number | null
          dose_unit: string | null
          id: string
          ingredient_id: string
          jurisdiction_id: string
          last_verified_at: string
          monograph_ref: string | null
          ndi_number: string | null
          ndi_response: string | null
          ndi_submitted_at: string | null
          notes: string | null
          status: string
          verified_by: string | null
        }
        Insert: {
          contraindications?: Json | null
          dose_max_mg_day?: number | null
          dose_min_mg_day?: number | null
          dose_unit?: string | null
          id?: string
          ingredient_id: string
          jurisdiction_id: string
          last_verified_at?: string
          monograph_ref?: string | null
          ndi_number?: string | null
          ndi_response?: string | null
          ndi_submitted_at?: string | null
          notes?: string | null
          status: string
          verified_by?: string | null
        }
        Update: {
          contraindications?: Json | null
          dose_max_mg_day?: number | null
          dose_min_mg_day?: number | null
          dose_unit?: string | null
          id?: string
          ingredient_id?: string
          jurisdiction_id?: string
          last_verified_at?: string
          monograph_ref?: string | null
          ndi_number?: string | null
          ndi_response?: string | null
          ndi_submitted_at?: string | null
          notes?: string | null
          status?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_ingredients_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "regulatory_jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_jurisdictions: {
        Row: {
          code: string
          created_at: string
          disclaimer_text: string | null
          id: string
          is_active: boolean
          name: string
          primary_agency: string
          statute_ref: string
        }
        Insert: {
          code: string
          created_at?: string
          disclaimer_text?: string | null
          id?: string
          is_active?: boolean
          name: string
          primary_agency: string
          statute_ref: string
        }
        Update: {
          code?: string
          created_at?: string
          disclaimer_text?: string | null
          id?: string
          is_active?: boolean
          name?: string
          primary_agency?: string
          statute_ref?: string
        }
        Relationships: []
      }
      regulatory_kelsey_reviews: {
        Row: {
          confidence: number | null
          id: string
          jurisdiction_id: string
          rationale: string
          reviewed_at: string
          reviewer_model: string
          rule_references: string[]
          stage_1_flags: Json
          stage_2_raw: Json | null
          subject_id: string
          subject_text_excerpt: string
          subject_text_hash: string
          subject_type: string
          suggested_rewrite: string | null
          verdict: string
        }
        Insert: {
          confidence?: number | null
          id?: string
          jurisdiction_id: string
          rationale: string
          reviewed_at?: string
          reviewer_model?: string
          rule_references?: string[]
          stage_1_flags?: Json
          stage_2_raw?: Json | null
          subject_id: string
          subject_text_excerpt: string
          subject_text_hash: string
          subject_type: string
          suggested_rewrite?: string | null
          verdict: string
        }
        Update: {
          confidence?: number | null
          id?: string
          jurisdiction_id?: string
          rationale?: string
          reviewed_at?: string
          reviewer_model?: string
          rule_references?: string[]
          stage_1_flags?: Json
          stage_2_raw?: Json | null
          subject_id?: string
          subject_text_excerpt?: string
          subject_text_hash?: string
          subject_type?: string
          suggested_rewrite?: string | null
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_kelsey_reviews_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "regulatory_jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_peptide_classifications: {
        Row: {
          can_make_sf_claims: boolean
          compliance_class: string
          id: string
          injectable_only: boolean
          rationale: string | null
          reviewed_at: string
          reviewed_by: string | null
          sku_id: string
        }
        Insert: {
          can_make_sf_claims?: boolean
          compliance_class: string
          id?: string
          injectable_only?: boolean
          rationale?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
          sku_id: string
        }
        Update: {
          can_make_sf_claims?: boolean
          compliance_class?: string
          id?: string
          injectable_only?: boolean
          rationale?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
          sku_id?: string
        }
        Relationships: []
      }
      regulatory_sku_jurisdiction_status: {
        Row: {
          din_hm: string | null
          id: string
          is_saleable: boolean
          jurisdiction_id: string
          last_verified_at: string
          license_class: string | null
          license_expires_at: string | null
          license_file_path: string | null
          license_issued_at: string | null
          npn: string | null
          site_license_chain: Json
          sku_id: string
        }
        Insert: {
          din_hm?: string | null
          id?: string
          is_saleable?: boolean
          jurisdiction_id: string
          last_verified_at?: string
          license_class?: string | null
          license_expires_at?: string | null
          license_file_path?: string | null
          license_issued_at?: string | null
          npn?: string | null
          site_license_chain?: Json
          sku_id: string
        }
        Update: {
          din_hm?: string | null
          id?: string
          is_saleable?: boolean
          jurisdiction_id?: string
          last_verified_at?: string
          license_class?: string | null
          license_expires_at?: string | null
          license_file_path?: string | null
          license_issued_at?: string | null
          npn?: string | null
          site_license_chain?: Json
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_sku_jurisdiction_status_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "regulatory_jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_substantiation: {
        Row: {
          citation: string
          claim_id: string
          doi: string | null
          evidence_type: string
          id: string
          loe_grade: string | null
          notes: string | null
          pdf_path: string | null
          reviewed_at: string
          reviewed_by: string | null
          url: string | null
        }
        Insert: {
          citation: string
          claim_id: string
          doi?: string | null
          evidence_type: string
          id?: string
          loe_grade?: string | null
          notes?: string | null
          pdf_path?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
          url?: string | null
        }
        Update: {
          citation?: string
          claim_id?: string
          doi?: string | null
          evidence_type?: string
          id?: string
          loe_grade?: string | null
          notes?: string | null
          pdf_path?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_substantiation_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "regulatory_claim_library"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          annual_net_profit: number
          annual_revenue: number
          created_at: string | null
          forecast_growth_pct: number | null
          forecast_total_revenue: number | null
          id: string
          net_margin_pct: number
          portfolio_health_score: number
          report_date: string
          report_size_kb: number | null
          risks_identified: number
          scenario: string
          star_skus: number
          total_bundles: number
          urgent_reorders: number | null
        }
        Insert: {
          annual_net_profit: number
          annual_revenue: number
          created_at?: string | null
          forecast_growth_pct?: number | null
          forecast_total_revenue?: number | null
          id?: string
          net_margin_pct: number
          portfolio_health_score: number
          report_date?: string
          report_size_kb?: number | null
          risks_identified: number
          scenario: string
          star_skus: number
          total_bundles: number
          urgent_reorders?: number | null
        }
        Update: {
          annual_net_profit?: number
          annual_revenue?: number
          created_at?: string | null
          forecast_growth_pct?: number | null
          forecast_total_revenue?: number | null
          id?: string
          net_margin_pct?: number
          portfolio_health_score?: number
          report_date?: string
          report_size_kb?: number | null
          risks_identified?: number
          scenario?: string
          star_skus?: number
          total_bundles?: number
          urgent_reorders?: number | null
        }
        Relationships: []
      }
      research_hub_alerts: {
        Row: {
          alert_type: string
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          title: string
          user_id: string
          user_item_id: string
        }
        Insert: {
          alert_type?: string
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          user_id: string
          user_item_id: string
        }
        Update: {
          alert_type?: string
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          user_id?: string
          user_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_hub_alerts_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "research_hub_user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      research_hub_categories: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string
          id: string
          is_default: boolean
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name: string
          id?: string
          is_default?: boolean
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          is_default?: boolean
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      research_hub_items: {
        Row: {
          author: string | null
          category_id: string
          created_at: string
          id: string
          image_url: string | null
          original_url: string | null
          published_at: string | null
          raw_metadata: Json
          source_name: string
          summary: string | null
          tags: string[]
          title: string
        }
        Insert: {
          author?: string | null
          category_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          original_url?: string | null
          published_at?: string | null
          raw_metadata?: Json
          source_name: string
          summary?: string | null
          tags?: string[]
          title: string
        }
        Update: {
          author?: string | null
          category_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          original_url?: string | null
          published_at?: string | null
          raw_metadata?: Json
          source_name?: string
          summary?: string | null
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_hub_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "research_hub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      research_hub_user_items: {
        Row: {
          id: string
          is_bookmarked: boolean
          is_dismissed: boolean
          is_read: boolean
          item_id: string
          matched_domains: string[]
          read_at: string | null
          relevance_reasons: Json
          relevance_score: number
          surfaced_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_bookmarked?: boolean
          is_dismissed?: boolean
          is_read?: boolean
          item_id: string
          matched_domains?: string[]
          read_at?: string | null
          relevance_reasons?: Json
          relevance_score?: number
          surfaced_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_bookmarked?: boolean
          is_dismissed?: boolean
          is_read?: boolean
          item_id?: string
          matched_domains?: string[]
          read_at?: string | null
          relevance_reasons?: Json
          relevance_score?: number
          surfaced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_hub_user_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "research_hub_items"
            referencedColumns: ["id"]
          },
        ]
      }
      research_hub_user_sources: {
        Row: {
          added_at: string
          category_id: string
          id: string
          is_active: boolean
          is_custom: boolean
          notify_alerts: boolean
          source_icon_url: string | null
          source_name: string
          source_type: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          category_id: string
          id?: string
          is_active?: boolean
          is_custom?: boolean
          notify_alerts?: boolean
          source_icon_url?: string | null
          source_name: string
          source_type: string
          source_url?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          category_id?: string
          id?: string
          is_active?: boolean
          is_custom?: boolean
          notify_alerts?: boolean
          source_icon_url?: string | null
          source_name?: string
          source_type?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_hub_user_sources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "research_hub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      research_hub_user_tabs: {
        Row: {
          activated_at: string
          category_id: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          activated_at?: string
          category_id: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          activated_at?: string
          category_id?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_hub_user_tabs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "research_hub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          claimed_at: string | null
          fulfillment_date: string | null
          id: string
          reward_id: string
          status: string | null
          tokens_spent: number
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          fulfillment_date?: string | null
          id?: string
          reward_id: string
          status?: string | null
          tokens_spent: number
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          fulfillment_date?: string | null
          id?: string
          reward_id?: string
          status?: string | null
          tokens_spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          available: boolean | null
          created_at: string | null
          description: string | null
          id: string
          limit_per_user: number | null
          reward_name: string
          reward_type: string
          token_cost: number
        }
        Insert: {
          available?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          limit_per_user?: number | null
          reward_name: string
          reward_type: string
          token_cost: number
        }
        Update: {
          available?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          limit_per_user?: number | null
          reward_name?: string
          reward_type?: string
          token_cost?: number
        }
        Relationships: []
      }
      rollout_cohorts: {
        Row: {
          cohort_type: string
          created_at: string
          definition: Json
          description: string | null
          display_name: string
          id: string
          is_active: boolean
        }
        Insert: {
          cohort_type: string
          created_at?: string
          definition: Json
          description?: string | null
          display_name: string
          id: string
          is_active?: boolean
        }
        Update: {
          cohort_type?: string
          created_at?: string
          definition?: Json
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      safety_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          herb_id: string | null
          id: string
          message: string
          protocol_id: string
          recommendation: string | null
          requires_monitoring: boolean | null
          severity: Database["public"]["Enums"]["alert_severity"]
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          herb_id?: string | null
          id?: string
          message: string
          protocol_id: string
          recommendation?: string | null
          requires_monitoring?: boolean | null
          severity?: Database["public"]["Enums"]["alert_severity"]
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          herb_id?: string | null
          id?: string
          message?: string
          protocol_id?: string
          recommendation?: string | null
          requires_monitoring?: boolean | null
          severity?: Database["public"]["Enums"]["alert_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "safety_alerts_herb_id_fkey"
            columns: ["herb_id"]
            isOneToOne: false
            referencedRelation: "herbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_alerts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_calibration_nudges: {
        Row: {
          acted_at: string | null
          dismissed_at: string | null
          first_shown_at: string
          id: string
          last_shown_at: string
          shown_count: number
          trigger_key: string
          user_id: string
        }
        Insert: {
          acted_at?: string | null
          dismissed_at?: string | null
          first_shown_at?: string
          id?: string
          last_shown_at?: string
          shown_count?: number
          trigger_key: string
          user_id: string
        }
        Update: {
          acted_at?: string | null
          dismissed_at?: string | null
          first_shown_at?: string
          id?: string
          last_shown_at?: string
          shown_count?: number
          trigger_key?: string
          user_id?: string
        }
        Relationships: []
      }
      scenario_categories: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          category_code: string
          category_description: string
          category_display_name: string
          created_at: string
          id: string
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          steve_approval_at: string | null
          steve_approval_by: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          category_code: string
          category_description: string
          category_display_name: string
          created_at?: string
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          category_code?: string
          category_description?: string
          category_display_name?: string
          created_at?: string
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_categories_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_copy_blocks: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          block_text: string
          created_at: string
          display_order: number
          id: string
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          persona_scoped_to: string | null
          slot_id: string
          steve_approval_at: string | null
          steve_approval_by: string | null
          surface: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          block_text: string
          created_at?: string
          display_order?: number
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          persona_scoped_to?: string | null
          slot_id: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          surface?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          block_text?: string
          created_at?: string
          display_order?: number
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          persona_scoped_to?: string | null
          slot_id?: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          surface?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_copy_blocks_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_copy_blocks_persona_scoped_to_fkey"
            columns: ["persona_scoped_to"]
            isOneToOne: false
            referencedRelation: "scenario_personas"
            referencedColumns: ["persona_code"]
          },
        ]
      }
      scenario_disclosures: {
        Row: {
          active: boolean
          created_at: string
          disclosure_placement: string
          disclosure_text: string
          font_weight_matches_body: boolean
          id: string
          renders_as_footnote: boolean
        }
        Insert: {
          active?: boolean
          created_at?: string
          disclosure_placement: string
          disclosure_text: string
          font_weight_matches_body?: boolean
          id?: string
          renders_as_footnote?: boolean
        }
        Update: {
          active?: boolean
          created_at?: string
          disclosure_placement?: string
          disclosure_text?: string
          font_weight_matches_body?: boolean
          id?: string
          renders_as_footnote?: boolean
        }
        Relationships: []
      }
      scenario_events: {
        Row: {
          actor_user_id: string | null
          event_detail: Json | null
          event_kind: string
          id: string
          occurred_at: string
          row_id: string
          surface: string
        }
        Insert: {
          actor_user_id?: string | null
          event_detail?: Json | null
          event_kind: string
          id?: string
          occurred_at?: string
          row_id: string
          surface: string
        }
        Update: {
          actor_user_id?: string | null
          event_detail?: Json | null
          event_kind?: string
          id?: string
          occurred_at?: string
          row_id?: string
          surface?: string
        }
        Relationships: []
      }
      scenario_personas: {
        Row: {
          active: boolean
          age_band: string
          archived: boolean
          archived_at: string | null
          created_at: string
          display_order: number
          dr_fadi_supplementary_consent_key: string | null
          health_concerns_consumer_language: string[]
          id: string
          lifestyle_descriptors: string[]
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          persona_code: string
          persona_display_name: string
          protocol_category_refs: string[]
          steve_approval_at: string | null
          steve_approval_by: string | null
          steve_approval_note: string | null
          tier_rationale: string
          tier_reached: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          age_band: string
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          display_order?: number
          dr_fadi_supplementary_consent_key?: string | null
          health_concerns_consumer_language: string[]
          id?: string
          lifestyle_descriptors: string[]
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          persona_code: string
          persona_display_name: string
          protocol_category_refs: string[]
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          steve_approval_note?: string | null
          tier_rationale: string
          tier_reached: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          age_band?: string
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          display_order?: number
          dr_fadi_supplementary_consent_key?: string | null
          health_concerns_consumer_language?: string[]
          id?: string
          lifestyle_descriptors?: string[]
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          persona_code?: string
          persona_display_name?: string
          protocol_category_refs?: string[]
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          steve_approval_note?: string | null
          tier_rationale?: string
          tier_reached?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_personas_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_flag_activations: {
        Row: {
          cancel_reason: string | null
          canceled_at: string | null
          canceled_by: string | null
          created_at: string
          executed_at: string | null
          execution_error: string | null
          execution_result: string | null
          execution_started_at: string | null
          feature_id: string
          id: string
          scheduled_by: string
          scheduled_for: string
          target_action: string
          target_value: Json
        }
        Insert: {
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          created_at?: string
          executed_at?: string | null
          execution_error?: string | null
          execution_result?: string | null
          execution_started_at?: string | null
          feature_id: string
          id?: string
          scheduled_by: string
          scheduled_for: string
          target_action: string
          target_value: Json
        }
        Update: {
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          created_at?: string
          executed_at?: string | null
          execution_error?: string | null
          execution_result?: string | null
          execution_started_at?: string | null
          feature_id?: string
          id?: string
          scheduled_by?: string
          scheduled_for?: string
          target_action?: string
          target_value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_flag_activations_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_connections: {
        Row: {
          active: boolean
          connected_at: string
          created_at: string
          disconnected_at: string | null
          disconnected_reason: string | null
          external_account_id: string
          external_account_label: string | null
          id: string
          last_event_at: string | null
          last_verified_at: string | null
          platform: string
          practitioner_id: string
          scopes_granted: string[]
          token_vault_ref: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          disconnected_reason?: string | null
          external_account_id: string
          external_account_label?: string | null
          id?: string
          last_event_at?: string | null
          last_verified_at?: string | null
          platform: string
          practitioner_id: string
          scopes_granted: string[]
          token_vault_ref: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          disconnected_reason?: string | null
          external_account_id?: string
          external_account_label?: string | null
          id?: string
          last_event_at?: string | null
          last_verified_at?: string | null
          platform?: string
          practitioner_id?: string
          scopes_granted?: string[]
          token_vault_ref?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_connections_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_connections_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_connections_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_connections_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_connections_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_connections_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_connections_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      scheduler_events: {
        Row: {
          connection_id: string | null
          error_message: string | null
          event_type: string
          external_event_id: string
          external_post_id: string | null
          id: string
          platform: string
          processed_at: string | null
          processing_status: string
          raw_payload: Json
          received_at: string
        }
        Insert: {
          connection_id?: string | null
          error_message?: string | null
          event_type: string
          external_event_id: string
          external_post_id?: string | null
          id?: string
          platform: string
          processed_at?: string | null
          processing_status?: string
          raw_payload: Json
          received_at?: string
        }
        Update: {
          connection_id?: string | null
          error_message?: string | null
          event_type?: string
          external_event_id?: string
          external_post_id?: string | null
          id?: string
          platform?: string
          processed_at?: string | null
          processing_status?: string
          raw_payload?: Json
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "scheduler_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_interceptions: {
        Row: {
          attempted_at: string
          error_message: string | null
          id: string
          mechanism: string
          platform: string
          platform_response: Json | null
          scan_id: string
          succeeded: boolean | null
        }
        Insert: {
          attempted_at?: string
          error_message?: string | null
          id?: string
          mechanism: string
          platform: string
          platform_response?: Json | null
          scan_id: string
          succeeded?: boolean | null
        }
        Update: {
          attempted_at?: string
          error_message?: string | null
          id?: string
          mechanism?: string
          platform?: string
          platform_response?: Json | null
          scan_id?: string
          succeeded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_interceptions_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scheduler_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_overrides: {
        Row: {
          finding_ids: string[]
          id: string
          ip_address: unknown
          justification: string
          pattern_flag_triggered: boolean
          practitioner_id: string
          scan_id: string
          signed_at: string
          user_agent: string | null
        }
        Insert: {
          finding_ids: string[]
          id?: string
          ip_address?: unknown
          justification: string
          pattern_flag_triggered?: boolean
          practitioner_id: string
          scan_id: string
          signed_at?: string
          user_agent?: string | null
        }
        Update: {
          finding_ids?: string[]
          id?: string
          ip_address?: unknown
          justification?: string
          pattern_flag_triggered?: boolean
          practitioner_id?: string
          scan_id?: string
          signed_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_overrides_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_overrides_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_overrides_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_overrides_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_overrides_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_overrides_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_overrides_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_overrides_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scheduler_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_platform_state_changes: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          id: string
          platform: string
          previous_mode: string
          proposal_reason: string
          proposed_at: string
          proposed_by: string
          proposed_mode: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          platform: string
          previous_mode: string
          proposal_reason: string
          proposed_at?: string
          proposed_by: string
          proposed_mode: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          platform?: string
          previous_mode?: string
          proposal_reason?: string
          proposed_at?: string
          proposed_by?: string
          proposed_mode?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
        }
        Relationships: []
      }
      scheduler_platform_states: {
        Row: {
          applied_change_id: string | null
          mode: string
          platform: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applied_change_id?: string | null
          mode?: string
          platform: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applied_change_id?: string | null
          mode?: string
          platform?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      scheduler_poll_state: {
        Row: {
          connection_id: string
          consecutive_errors: number
          id: string
          last_error_message: string | null
          last_poll_at: string | null
          last_poll_success_at: string | null
          next_poll_at: string
        }
        Insert: {
          connection_id: string
          consecutive_errors?: number
          id?: string
          last_error_message?: string | null
          last_poll_at?: string | null
          last_poll_success_at?: string | null
          next_poll_at?: string
        }
        Update: {
          connection_id?: string
          consecutive_errors?: number
          id?: string
          last_error_message?: string | null
          last_poll_at?: string | null
          last_poll_success_at?: string | null
          next_poll_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_poll_state_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "scheduler_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_scans: {
        Row: {
          connection_id: string
          content_hash_sha256: string
          decision: string
          event_id: string | null
          external_post_id: string
          findings_summary: Json | null
          id: string
          practitioner_id: string
          precheck_session_id: string | null
          receipt_issued_id: string | null
          receipt_reused_id: string | null
          rule_registry_version: string
          scan_id: string
          scanned_at: string
          scheduled_at: string
          target_platforms: string[]
          vision_determination_id: string | null
        }
        Insert: {
          connection_id: string
          content_hash_sha256: string
          decision: string
          event_id?: string | null
          external_post_id: string
          findings_summary?: Json | null
          id?: string
          practitioner_id: string
          precheck_session_id?: string | null
          receipt_issued_id?: string | null
          receipt_reused_id?: string | null
          rule_registry_version: string
          scan_id: string
          scanned_at?: string
          scheduled_at: string
          target_platforms: string[]
          vision_determination_id?: string | null
        }
        Update: {
          connection_id?: string
          content_hash_sha256?: string
          decision?: string
          event_id?: string | null
          external_post_id?: string
          findings_summary?: Json | null
          id?: string
          practitioner_id?: string
          precheck_session_id?: string | null
          receipt_issued_id?: string | null
          receipt_reused_id?: string | null
          rule_registry_version?: string
          scan_id?: string
          scanned_at?: string
          scheduled_at?: string
          target_platforms?: string[]
          vision_determination_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_scans_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "scheduler_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "scheduler_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_scans_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_scans_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_scans_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_scans_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_scans_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_scans_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_scans_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "scheduler_scans_precheck_session_id_fkey"
            columns: ["precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_scans_receipt_issued_id_fkey"
            columns: ["receipt_issued_id"]
            isOneToOne: false
            referencedRelation: "precheck_clearance_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_scans_receipt_reused_id_fkey"
            columns: ["receipt_reused_id"]
            isOneToOne: false
            referencedRelation: "precheck_clearance_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_scans_vision_determination_id_fkey"
            columns: ["vision_determination_id"]
            isOneToOne: false
            referencedRelation: "counterfeit_determinations"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_audit_log: {
        Row: {
          active_layers: string[]
          calculated_at: string | null
          confidence_pct: number
          confidence_tier: string
          created_at: string | null
          id: string
          input_snapshot: Json | null
          scores: Json
          trigger_event: string
          user_id: string
        }
        Insert: {
          active_layers: string[]
          calculated_at?: string | null
          confidence_pct: number
          confidence_tier: string
          created_at?: string | null
          id?: string
          input_snapshot?: Json | null
          scores: Json
          trigger_event: string
          user_id: string
        }
        Update: {
          active_layers?: string[]
          calculated_at?: string | null
          confidence_pct?: number
          confidence_tier?: string
          created_at?: string | null
          id?: string
          input_snapshot?: Json | null
          scores?: Json
          trigger_event?: string
          user_id?: string
        }
        Relationships: []
      }
      security_agent_config: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          affected_object: string | null
          affected_schema: string | null
          category: string
          created_at: string | null
          description: string
          finding_type: string
          id: string
          notes: string | null
          raw_finding: Json | null
          repair_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          scan_id: string
          scanned_at: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          affected_object?: string | null
          affected_schema?: string | null
          category: string
          created_at?: string | null
          description: string
          finding_type: string
          id?: string
          notes?: string | null
          raw_finding?: Json | null
          repair_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scan_id?: string
          scanned_at?: string | null
          severity: string
          status?: string
          title: string
        }
        Update: {
          affected_object?: string | null
          affected_schema?: string | null
          category?: string
          created_at?: string | null
          description?: string
          finding_type?: string
          id?: string
          notes?: string | null
          raw_finding?: Json | null
          repair_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scan_id?: string
          scanned_at?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      security_pending_repairs: {
        Row: {
          audit_log_id: string | null
          claude_analysis: string | null
          claude_confidence: number | null
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          proposed_sql: string
          repair_method: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string
          rollback_sql: string | null
          scan_id: string
          status: string
          title: string
        }
        Insert: {
          audit_log_id?: string | null
          claude_analysis?: string | null
          claude_confidence?: number | null
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          proposed_sql: string
          repair_method: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level: string
          rollback_sql?: string | null
          scan_id: string
          status?: string
          title: string
        }
        Update: {
          audit_log_id?: string | null
          claude_analysis?: string | null
          claude_confidence?: number | null
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          proposed_sql?: string
          repair_method?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          rollback_sql?: string | null
          scan_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_pending_repairs_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "security_audit_log"
            referencedColumns: ["id"]
          },
        ]
      }
      security_repair_log: {
        Row: {
          after_state: Json | null
          applied_by: string | null
          audit_log_id: string | null
          before_state: Json | null
          claude_analysis: string | null
          claude_confidence: number | null
          created_at: string | null
          error_message: string | null
          id: string
          repair_method: string
          repair_type: string
          repaired_at: string | null
          rollback_sql: string | null
          scan_id: string
          sql_executed: string | null
          sql_generated_by: string | null
          success: boolean
        }
        Insert: {
          after_state?: Json | null
          applied_by?: string | null
          audit_log_id?: string | null
          before_state?: Json | null
          claude_analysis?: string | null
          claude_confidence?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          repair_method: string
          repair_type: string
          repaired_at?: string | null
          rollback_sql?: string | null
          scan_id: string
          sql_executed?: string | null
          sql_generated_by?: string | null
          success?: boolean
        }
        Update: {
          after_state?: Json | null
          applied_by?: string | null
          audit_log_id?: string | null
          before_state?: Json | null
          claude_analysis?: string | null
          claude_confidence?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          repair_method?: string
          repair_type?: string
          repaired_at?: string | null
          rollback_sql?: string | null
          scan_id?: string
          sql_executed?: string | null
          sql_generated_by?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "security_repair_log_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "security_audit_log"
            referencedColumns: ["id"]
          },
        ]
      }
      sherlock_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          duration_ms: number | null
          id: string
          items_processed: number
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          items_processed?: number
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          items_processed?: number
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sherlock_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "sherlock_task_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      sherlock_agent_state: {
        Row: {
          alerts_generated_today: number
          config: Json
          current_task_id: string | null
          daily_reset_at: string
          escalations_today: number
          id: string
          is_active: boolean
          items_discovered_today: number
          last_heartbeat: string
          tasks_completed_today: number
        }
        Insert: {
          alerts_generated_today?: number
          config?: Json
          current_task_id?: string | null
          daily_reset_at?: string
          escalations_today?: number
          id?: string
          is_active?: boolean
          items_discovered_today?: number
          last_heartbeat?: string
          tasks_completed_today?: number
        }
        Update: {
          alerts_generated_today?: number
          config?: Json
          current_task_id?: string | null
          daily_reset_at?: string
          escalations_today?: number
          id?: string
          is_active?: boolean
          items_discovered_today?: number
          last_heartbeat?: string
          tasks_completed_today?: number
        }
        Relationships: [
          {
            foreignKeyName: "sherlock_agent_state_current_task_id_fkey"
            columns: ["current_task_id"]
            isOneToOne: false
            referencedRelation: "sherlock_task_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      sherlock_escalations: {
        Row: {
          created_at: string
          escalation_type: string
          id: string
          jeffery_response: Json | null
          payload: Json
          reason: string
          resolved_at: string | null
          status: string
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          escalation_type: string
          id?: string
          jeffery_response?: Json | null
          payload?: Json
          reason: string
          resolved_at?: string | null
          status?: string
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          escalation_type?: string
          id?: string
          jeffery_response?: Json | null
          payload?: Json
          reason?: string
          resolved_at?: string | null
          status?: string
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sherlock_escalations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "sherlock_task_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      sherlock_insights_cache: {
        Row: {
          body: string
          confidence: string
          created_at: string
          generated_at: string
          headline: string
          id: string
          model_id: string
          page: string
          practitioner_id: string
          prompt_version: string
          raw_response: Json | null
          suggested_action: string | null
        }
        Insert: {
          body: string
          confidence?: string
          created_at?: string
          generated_at?: string
          headline: string
          id?: string
          model_id?: string
          page: string
          practitioner_id: string
          prompt_version?: string
          raw_response?: Json | null
          suggested_action?: string | null
        }
        Update: {
          body?: string
          confidence?: string
          created_at?: string
          generated_at?: string
          headline?: string
          id?: string
          model_id?: string
          page?: string
          practitioner_id?: string
          prompt_version?: string
          raw_response?: Json | null
          suggested_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sherlock_insights_cache_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "sherlock_insights_cache_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "sherlock_insights_cache_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "sherlock_insights_cache_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sherlock_insights_cache_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "sherlock_insights_cache_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "sherlock_insights_cache_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      sherlock_task_queue: {
        Row: {
          assigned_at: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          payload: Json
          priority: number
          result: Json
          started_at: string | null
          status: string
          task_type: string
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          priority?: number
          result?: Json
          started_at?: string | null
          status?: string
          task_type: string
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          priority?: number
          result?: Json
          started_at?: string | null
          status?: string
          task_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sherlock_task_queue_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "research_hub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sherlock_trends: {
        Row: {
          created_at: string
          first_seen: string
          id: string
          is_active: boolean
          item_ids: string[]
          last_seen: string
          source_count: number
          topic: string
          topic_keywords: string[]
          trend_score: number
        }
        Insert: {
          created_at?: string
          first_seen?: string
          id?: string
          is_active?: boolean
          item_ids?: string[]
          last_seen?: string
          source_count?: number
          topic: string
          topic_keywords?: string[]
          trend_score?: number
        }
        Update: {
          created_at?: string
          first_seen?: string
          id?: string
          is_active?: boolean
          item_ids?: string[]
          last_seen?: string
          source_count?: number
          topic?: string
          topic_keywords?: string[]
          trend_score?: number
        }
        Relationships: []
      }
      shop_cart_items: {
        Row: {
          created_at: string
          delivery_form: string | null
          id: string
          metadata: Json
          product_name: string
          product_slug: string
          product_type: string
          quantity: number
          unit_price_cents: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_form?: string | null
          id?: string
          metadata?: Json
          product_name: string
          product_slug: string
          product_type?: string
          quantity?: number
          unit_price_cents?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_form?: string | null
          id?: string
          metadata?: Json
          product_name?: string
          product_slug?: string
          product_type?: string
          quantity?: number
          unit_price_cents?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_order_items: {
        Row: {
          created_at: string
          delivery_form: string | null
          id: string
          line_total_cents: number
          metadata: Json
          order_id: string
          product_name: string
          product_slug: string
          product_type: string
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          delivery_form?: string | null
          id?: string
          line_total_cents?: number
          metadata?: Json
          order_id: string
          product_name: string
          product_slug: string
          product_type: string
          quantity?: number
          unit_price_cents?: number
        }
        Update: {
          created_at?: string
          delivery_form?: string | null
          id?: string
          line_total_cents?: number
          metadata?: Json
          order_id?: string
          product_name?: string
          product_slug?: string
          product_type?: string
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_status_history: {
        Row: {
          carrier: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          order_id: string
          status: string
          title: string
          tracking_number: string | null
          tracking_url: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          order_id: string
          status: string
          title: string
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          status?: string
          title?: string
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          carrier: string | null
          created_at: string
          delivered_at: string | null
          discount_cents: number
          discount_code: string | null
          estimated_delivery_date: string | null
          id: string
          metadata: Json
          notes: string | null
          order_number: string
          portal_type: string
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_cents: number
          shipping_city: string | null
          shipping_country: string | null
          shipping_email: string | null
          shipping_first_name: string | null
          shipping_last_name: string | null
          shipping_phone: string | null
          shipping_state: string | null
          shipping_zip: string | null
          status: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          discount_cents?: number
          discount_code?: string | null
          estimated_delivery_date?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          order_number: string
          portal_type?: string
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_cents?: number
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_email?: string | null
          shipping_first_name?: string | null
          shipping_last_name?: string | null
          shipping_phone?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          discount_cents?: number
          discount_code?: string | null
          estimated_delivery_date?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          order_number?: string
          portal_type?: string
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_cents?: number
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_email?: string | null
          shipping_first_name?: string | null
          shipping_last_name?: string | null
          shipping_phone?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_refresh_audit_log: {
        Row: {
          action_category: string
          action_verb: string
          actor_role: string | null
          actor_user_id: string | null
          after_state_json: Json | null
          audit_id: string
          before_state_json: Json | null
          context_json: Json | null
          ip_address: unknown
          occurred_at: string
          sku: string | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action_category: string
          action_verb: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_state_json?: Json | null
          audit_id?: string
          before_state_json?: Json | null
          context_json?: Json | null
          ip_address?: unknown
          occurred_at?: string
          sku?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action_category?: string
          action_verb?: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_state_json?: Json | null
          audit_id?: string
          before_state_json?: Json | null
          context_json?: Json | null
          ip_address?: unknown
          occurred_at?: string
          sku?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      shop_refresh_reconciliation_findings: {
        Row: {
          canonical_payload_json: Json | null
          catalog_payload_json: Json | null
          created_at: string
          finding_id: string
          finding_type: Database["public"]["Enums"]["shop_finding_type"]
          reconciliation_run_id: string
          resolution_reason: string | null
          resolution_status: Database["public"]["Enums"]["shop_finding_resolution"]
          resolved_at: string | null
          resolved_by_user_id: string | null
          sku: string
        }
        Insert: {
          canonical_payload_json?: Json | null
          catalog_payload_json?: Json | null
          created_at?: string
          finding_id?: string
          finding_type: Database["public"]["Enums"]["shop_finding_type"]
          reconciliation_run_id: string
          resolution_reason?: string | null
          resolution_status?: Database["public"]["Enums"]["shop_finding_resolution"]
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          sku: string
        }
        Update: {
          canonical_payload_json?: Json | null
          catalog_payload_json?: Json | null
          created_at?: string
          finding_id?: string
          finding_type?: Database["public"]["Enums"]["shop_finding_type"]
          reconciliation_run_id?: string
          resolution_reason?: string | null
          resolution_status?: Database["public"]["Enums"]["shop_finding_resolution"]
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          sku?: string
        }
        Relationships: []
      }
      sku_rationalization: {
        Row: {
          actions: string[]
          category: string
          cogs: number
          cogs_ratio: number
          composite_score: number
          created_at: string | null
          dtc_margin: number
          id: string
          msrp: number
          name: string
          score_channel_breadth: number
          score_cogs_efficiency: number
          score_dtc_margin: number
          score_price_point: number
          score_revenue_contribution: number
          score_waterfall_health: number
          sku: string
          tier: string
          viable_channels: number
        }
        Insert: {
          actions?: string[]
          category: string
          cogs: number
          cogs_ratio: number
          composite_score: number
          created_at?: string | null
          dtc_margin: number
          id?: string
          msrp: number
          name: string
          score_channel_breadth: number
          score_cogs_efficiency: number
          score_dtc_margin: number
          score_price_point: number
          score_revenue_contribution: number
          score_waterfall_health: number
          sku: string
          tier: string
          viable_channels: number
        }
        Update: {
          actions?: string[]
          category?: string
          cogs?: number
          cogs_ratio?: number
          composite_score?: number
          created_at?: string | null
          dtc_margin?: number
          id?: string
          msrp?: number
          name?: string
          score_channel_breadth?: number
          score_cogs_efficiency?: number
          score_dtc_margin?: number
          score_price_point?: number
          score_revenue_contribution?: number
          score_waterfall_health?: number
          sku?: string
          tier?: string
          viable_channels?: number
        }
        Relationships: [
          {
            foreignKeyName: "sku_rationalization_sku_fkey"
            columns: ["sku"]
            isOneToOne: true
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      soc2_auditor_access_log: {
        Row: {
          action: string
          approver_steve: string | null
          approver_thomas: string | null
          grant_id: string
          id: number
          ip_address: unknown
          justification: string | null
          occurred_at: string
          packet_id: string | null
          resolved_pseudonym: string | null
          target_path: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          approver_steve?: string | null
          approver_thomas?: string | null
          grant_id: string
          id?: number
          ip_address?: unknown
          justification?: string | null
          occurred_at?: string
          packet_id?: string | null
          resolved_pseudonym?: string | null
          target_path?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          approver_steve?: string | null
          approver_thomas?: string | null
          grant_id?: string
          id?: number
          ip_address?: unknown
          justification?: string | null
          occurred_at?: string
          packet_id?: string | null
          resolved_pseudonym?: string | null
          target_path?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soc2_auditor_access_log_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "soc2_auditor_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soc2_auditor_access_log_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "soc2_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      soc2_auditor_grants: {
        Row: {
          access_count: number
          auditor_email: string
          auditor_firm: string
          expires_at: string
          framework_id: string | null
          granted_at: string
          granted_by: string
          id: string
          packet_ids: string[]
          revoked: boolean
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          access_count?: number
          auditor_email: string
          auditor_firm: string
          expires_at: string
          framework_id?: string | null
          granted_at?: string
          granted_by: string
          id?: string
          packet_ids: string[]
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          access_count?: number
          auditor_email?: string
          auditor_firm?: string
          expires_at?: string
          framework_id?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          packet_ids?: string[]
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soc2_auditor_grants_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "compliance_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      soc2_collector_config: {
        Row: {
          api_key_ref: string | null
          collector_id: string
          enabled: boolean
          last_heartbeat_at: string | null
          last_run_at: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          api_key_ref?: string | null
          collector_id: string
          enabled?: boolean
          last_heartbeat_at?: string | null
          last_run_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          api_key_ref?: string | null
          collector_id?: string
          enabled?: boolean
          last_heartbeat_at?: string | null
          last_run_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      soc2_collector_runs: {
        Row: {
          collector_id: string
          collector_version: string
          data_source: string
          deterministic_replay_proof: Json
          duration_ms: number
          executed_at: string
          id: string
          output_sha256: string
          packet_id: string
          parameters: Json
          query: string
          query_hash: string
          row_count: number
        }
        Insert: {
          collector_id: string
          collector_version: string
          data_source: string
          deterministic_replay_proof: Json
          duration_ms: number
          executed_at?: string
          id?: string
          output_sha256: string
          packet_id: string
          parameters: Json
          query: string
          query_hash: string
          row_count: number
        }
        Update: {
          collector_id?: string
          collector_version?: string
          data_source?: string
          deterministic_replay_proof?: Json
          duration_ms?: number
          executed_at?: string
          id?: string
          output_sha256?: string
          packet_id?: string
          parameters?: Json
          query?: string
          query_hash?: string
          row_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "soc2_collector_runs_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "soc2_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      soc2_distribution_attempts: {
        Row: {
          attempted_at: string
          error_message: string | null
          http_status: number | null
          id: string
          packet_id: string
          platform: string
          response_excerpt: string | null
          status: string
          uploaded_files_count: number | null
        }
        Insert: {
          attempted_at?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          packet_id: string
          platform: string
          response_excerpt?: string | null
          status: string
          uploaded_files_count?: number | null
        }
        Update: {
          attempted_at?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          packet_id?: string
          platform?: string
          response_excerpt?: string | null
          status?: string
          uploaded_files_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "soc2_distribution_attempts_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "soc2_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      soc2_distribution_targets: {
        Row: {
          api_key_ref: string | null
          api_url: string | null
          enabled: boolean
          notes: string | null
          platform: string
          updated_at: string
        }
        Insert: {
          api_key_ref?: string | null
          api_url?: string | null
          enabled?: boolean
          notes?: string | null
          platform: string
          updated_at?: string
        }
        Update: {
          api_key_ref?: string | null
          api_url?: string | null
          enabled?: boolean
          notes?: string | null
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      soc2_manual_evidence: {
        Row: {
          archived: boolean
          archived_at: string | null
          content_type: string
          controls: string[]
          id: string
          sha256: string
          signoff_at: string | null
          signoff_by: string | null
          size_bytes: number
          source_description: string
          storage_key: string
          superseded_by: string | null
          title: string
          uploaded_at: string
          uploaded_by: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          content_type: string
          controls: string[]
          id?: string
          sha256: string
          signoff_at?: string | null
          signoff_by?: string | null
          size_bytes: number
          source_description: string
          storage_key: string
          superseded_by?: string | null
          title: string
          uploaded_at?: string
          uploaded_by: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          content_type?: string
          controls?: string[]
          id?: string
          sha256?: string
          signoff_at?: string | null
          signoff_by?: string | null
          size_bytes?: number
          source_description?: string
          storage_key?: string
          superseded_by?: string | null
          title?: string
          uploaded_at?: string
          uploaded_by?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soc2_manual_evidence_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "soc2_manual_evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      soc2_packet_files: {
        Row: {
          collector_id: string | null
          content_type: string
          controls: string[]
          created_at: string
          deterministic_query_hash: string | null
          id: string
          packet_id: string
          relative_path: string
          sha256: string
          size_bytes: number
        }
        Insert: {
          collector_id?: string | null
          content_type: string
          controls: string[]
          created_at?: string
          deterministic_query_hash?: string | null
          id?: string
          packet_id: string
          relative_path: string
          sha256: string
          size_bytes: number
        }
        Update: {
          collector_id?: string | null
          content_type?: string
          controls?: string[]
          created_at?: string
          deterministic_query_hash?: string | null
          id?: string
          packet_id?: string
          relative_path?: string
          sha256?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "soc2_packet_files_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "soc2_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      soc2_packets: {
        Row: {
          attestation_type: string
          category_hashes: Json
          generated_at: string
          generated_by: string
          id: string
          legal_hold: boolean
          packet_uuid: string
          period_end: string
          period_start: string
          retention_until: string
          root_hash: string
          rule_registry_version: string
          signature_jwt: string
          signing_key_id: string
          size_bytes: number
          status: string
          storage_key: string
          storage_sha256: string
          superseded_by: string | null
          tsc_in_scope: string[]
        }
        Insert: {
          attestation_type?: string
          category_hashes: Json
          generated_at?: string
          generated_by: string
          id?: string
          legal_hold?: boolean
          packet_uuid: string
          period_end: string
          period_start: string
          retention_until: string
          root_hash: string
          rule_registry_version: string
          signature_jwt: string
          signing_key_id: string
          size_bytes: number
          status?: string
          storage_key: string
          storage_sha256: string
          superseded_by?: string | null
          tsc_in_scope: string[]
        }
        Update: {
          attestation_type?: string
          category_hashes?: Json
          generated_at?: string
          generated_by?: string
          id?: string
          legal_hold?: boolean
          packet_uuid?: string
          period_end?: string
          period_start?: string
          retention_until?: string
          root_hash?: string
          rule_registry_version?: string
          signature_jwt?: string
          signing_key_id?: string
          size_bytes?: number
          status?: string
          storage_key?: string
          storage_sha256?: string
          superseded_by?: string | null
          tsc_in_scope?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "soc2_packets_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "soc2_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      soc2_pseudonym_keys: {
        Row: {
          created_at: string
          destroyed_at: string | null
          id: string
          key_ref: string
          packet_id: string
        }
        Insert: {
          created_at?: string
          destroyed_at?: string | null
          id?: string
          key_ref: string
          packet_id: string
        }
        Update: {
          created_at?: string
          destroyed_at?: string | null
          id?: string
          key_ref?: string
          packet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soc2_pseudonym_keys_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: true
            referencedRelation: "soc2_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      soc2_signing_keys: {
        Row: {
          active: boolean
          alg: string
          created_at: string
          id: string
          private_key_ref: string
          public_key_pem: string
          retired_at: string | null
          rotation_of: string | null
        }
        Insert: {
          active?: boolean
          alg?: string
          created_at?: string
          id: string
          private_key_ref: string
          public_key_pem: string
          retired_at?: string | null
          rotation_of?: string | null
        }
        Update: {
          active?: boolean
          alg?: string
          created_at?: string
          id?: string
          private_key_ref?: string
          public_key_pem?: string
          retired_at?: string | null
          rotation_of?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soc2_signing_keys_rotation_of_fkey"
            columns: ["rotation_of"]
            isOneToOne: false
            referencedRelation: "soc2_signing_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      social_review_queue: {
        Row: {
          assigned_to: string | null
          confidence: number
          created_at: string
          disposition: string | null
          disposition_note: string | null
          id: string
          reason: string
          signal_id: string
          status: string
          suggested_rule_ids: string[]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          confidence: number
          created_at?: string
          disposition?: string | null
          disposition_note?: string | null
          id?: string
          reason: string
          signal_id: string
          status?: string
          suggested_rule_ids?: string[]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          confidence?: number
          created_at?: string
          disposition?: string | null
          disposition_note?: string | null
          id?: string
          reason?: string
          signal_id?: string
          status?: string
          suggested_rule_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_review_queue_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "social_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      social_signals: {
        Row: {
          author_display_name: string | null
          author_external_id: string | null
          author_handle: string
          captured_at: string
          collector_id: string
          content_quality_score: number
          created_at: string
          fingerprint_simhash: string | null
          id: string
          jurisdiction_country: string | null
          jurisdiction_region: string | null
          language: string | null
          matched_practitioner_id: string | null
          overall_confidence: number
          practitioner_match_confidence: number | null
          practitioner_match_method: string | null
          pricing: Json | null
          product_matches: Json
          published_at: string | null
          raw_signal_id: string | null
          status: string
          text_derived: string | null
          url: string
        }
        Insert: {
          author_display_name?: string | null
          author_external_id?: string | null
          author_handle: string
          captured_at?: string
          collector_id: string
          content_quality_score?: number
          created_at?: string
          fingerprint_simhash?: string | null
          id?: string
          jurisdiction_country?: string | null
          jurisdiction_region?: string | null
          language?: string | null
          matched_practitioner_id?: string | null
          overall_confidence?: number
          practitioner_match_confidence?: number | null
          practitioner_match_method?: string | null
          pricing?: Json | null
          product_matches?: Json
          published_at?: string | null
          raw_signal_id?: string | null
          status?: string
          text_derived?: string | null
          url: string
        }
        Update: {
          author_display_name?: string | null
          author_external_id?: string | null
          author_handle?: string
          captured_at?: string
          collector_id?: string
          content_quality_score?: number
          created_at?: string
          fingerprint_simhash?: string | null
          id?: string
          jurisdiction_country?: string | null
          jurisdiction_region?: string | null
          language?: string | null
          matched_practitioner_id?: string | null
          overall_confidence?: number
          practitioner_match_confidence?: number | null
          practitioner_match_method?: string | null
          pricing?: Json | null
          product_matches?: Json
          published_at?: string | null
          raw_signal_id?: string | null
          status?: string
          text_derived?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_signals_matched_practitioner_id_fkey"
            columns: ["matched_practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_engagement_summary_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "social_signals_matched_practitioner_id_fkey"
            columns: ["matched_practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_practice_health_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "social_signals_matched_practitioner_id_fkey"
            columns: ["matched_practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioner_protocol_effectiveness_mv"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "social_signals_matched_practitioner_id_fkey"
            columns: ["matched_practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_signals_matched_practitioner_id_fkey"
            columns: ["matched_practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_engagement_summary"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "social_signals_matched_practitioner_id_fkey"
            columns: ["matched_practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_practice_health"
            referencedColumns: ["practitioner_id"]
          },
          {
            foreignKeyName: "social_signals_matched_practitioner_id_fkey"
            columns: ["matched_practitioner_id"]
            isOneToOne: false
            referencedRelation: "v_practitioner_protocol_effectiveness"
            referencedColumns: ["practitioner_id"]
          },
        ]
      }
      social_signals_below_threshold: {
        Row: {
          confidence: number
          created_at: string
          id: string
          reason: string
          signal_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          reason: string
          signal_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          reason?: string
          signal_id?: string
        }
        Relationships: []
      }
      social_signals_unmatched: {
        Row: {
          created_at: string
          id: string
          next_retry_at: string | null
          reason: string
          retry_count: number
          signal_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          next_retry_at?: string | null
          reason: string
          retry_count?: number
          signal_id: string
        }
        Update: {
          created_at?: string
          id?: string
          next_retry_at?: string | null
          reason?: string
          retry_count?: number
          signal_id?: string
        }
        Relationships: []
      }
      subscription_mrr_snapshot: {
        Row: {
          annual_plan_mrr_share: string | null
          created_at: string | null
          current_arr: number
          current_mrr: number
          id: string
          month12_projected_arr: number
          month12_projected_mrr: number
          mrr_growth_pct: string
          otp_mrr_share: string | null
          practitioner_mrr_share: string | null
          snapshot_date: string
          sub_monthly_mrr_share: string | null
          sub_quarterly_mrr_share: string | null
          total_active_customers: number
          total_subscriptions: number
        }
        Insert: {
          annual_plan_mrr_share?: string | null
          created_at?: string | null
          current_arr: number
          current_mrr: number
          id?: string
          month12_projected_arr: number
          month12_projected_mrr: number
          mrr_growth_pct: string
          otp_mrr_share?: string | null
          practitioner_mrr_share?: string | null
          snapshot_date?: string
          sub_monthly_mrr_share?: string | null
          sub_quarterly_mrr_share?: string | null
          total_active_customers: number
          total_subscriptions: number
        }
        Update: {
          annual_plan_mrr_share?: string | null
          created_at?: string | null
          current_arr?: number
          current_mrr?: number
          id?: string
          month12_projected_arr?: number
          month12_projected_mrr?: number
          mrr_growth_pct?: string
          otp_mrr_share?: string | null
          practitioner_mrr_share?: string | null
          snapshot_date?: string
          sub_monthly_mrr_share?: string | null
          sub_quarterly_mrr_share?: string | null
          total_active_customers?: number
          total_subscriptions?: number
        }
        Relationships: []
      }
      subscription_sku_economics: {
        Row: {
          best_lifetime_profit: number
          best_subscription_tier: string
          category: string
          created_at: string | null
          id: string
          msrp: number
          name: string
          sku: string
          subscription_affinity: string
        }
        Insert: {
          best_lifetime_profit: number
          best_subscription_tier: string
          category: string
          created_at?: string | null
          id?: string
          msrp: number
          name: string
          sku: string
          subscription_affinity: string
        }
        Update: {
          best_lifetime_profit?: number
          best_subscription_tier?: string
          category?: string
          created_at?: string | null
          id?: string
          msrp?: number
          name?: string
          sku?: string
          subscription_affinity?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_sku_economics_sku_fkey"
            columns: ["sku"]
            isOneToOne: true
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      supplement_adherence: {
        Row: {
          adherence_percent: number | null
          category: string | null
          id: string
          recommended_dosage: string | null
          recommended_frequency: string | null
          started_at: string | null
          status: string | null
          streak_days: number | null
          supplement_name: string
          supplement_type: string | null
          total_doses_logged: number | null
          user_id: string
        }
        Insert: {
          adherence_percent?: number | null
          category?: string | null
          id?: string
          recommended_dosage?: string | null
          recommended_frequency?: string | null
          started_at?: string | null
          status?: string | null
          streak_days?: number | null
          supplement_name: string
          supplement_type?: string | null
          total_doses_logged?: number | null
          user_id: string
        }
        Update: {
          adherence_percent?: number | null
          category?: string | null
          id?: string
          recommended_dosage?: string | null
          recommended_frequency?: string | null
          started_at?: string | null
          status?: string | null
          streak_days?: number | null
          supplement_name?: string
          supplement_type?: string | null
          total_doses_logged?: number | null
          user_id?: string
        }
        Relationships: []
      }
      supplement_brand_aliases: {
        Row: {
          alias: string
          alias_type: string | null
          brand_registry_id: string
          created_at: string | null
          id: string
          normalized_alias: string
        }
        Insert: {
          alias: string
          alias_type?: string | null
          brand_registry_id: string
          created_at?: string | null
          id?: string
          normalized_alias: string
        }
        Update: {
          alias?: string
          alias_type?: string | null
          brand_registry_id?: string
          created_at?: string | null
          id?: string
          normalized_alias?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_brand_aliases_brand_registry_id_fkey"
            columns: ["brand_registry_id"]
            isOneToOne: false
            referencedRelation: "supplement_brand_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_brand_registry: {
        Row: {
          brand_name: string
          certifications: string[] | null
          competitive_notes: string | null
          created_at: string | null
          discovery_source: string | null
          estimated_sku_count: number | null
          hq_country: string | null
          id: string
          is_active: boolean | null
          key_categories: string[] | null
          logo_url: string | null
          normalized_name: string
          search_vector: unknown
          tier: number
          tier_label: string | null
          total_user_entries: number | null
          unique_users: number | null
          updated_at: string | null
          verification_status: string | null
          website_url: string | null
        }
        Insert: {
          brand_name: string
          certifications?: string[] | null
          competitive_notes?: string | null
          created_at?: string | null
          discovery_source?: string | null
          estimated_sku_count?: number | null
          hq_country?: string | null
          id?: string
          is_active?: boolean | null
          key_categories?: string[] | null
          logo_url?: string | null
          normalized_name: string
          search_vector?: unknown
          tier?: number
          tier_label?: string | null
          total_user_entries?: number | null
          unique_users?: number | null
          updated_at?: string | null
          verification_status?: string | null
          website_url?: string | null
        }
        Update: {
          brand_name?: string
          certifications?: string[] | null
          competitive_notes?: string | null
          created_at?: string | null
          discovery_source?: string | null
          estimated_sku_count?: number | null
          hq_country?: string | null
          id?: string
          is_active?: boolean | null
          key_categories?: string[] | null
          logo_url?: string | null
          normalized_name?: string
          search_vector?: unknown
          tier?: number
          tier_label?: string | null
          total_user_entries?: number | null
          unique_users?: number | null
          updated_at?: string | null
          verification_status?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      supplement_brand_top_products: {
        Row: {
          barcode_ean: string | null
          barcode_upc: string | null
          bioavailability_estimate: number | null
          brand_registry_id: string
          cache_expiry: string | null
          created_at: string | null
          delivery_method: string | null
          discovery_source: string | null
          enrichment_cache_expires: string | null
          enrichment_confidence: number | null
          enrichment_date: string | null
          enrichment_source: string | null
          enrichment_status: string | null
          id: string
          image_url: string | null
          ingredient_breakdown: Json | null
          is_enriched: boolean | null
          is_proprietary_blend: boolean | null
          last_scanned_at: string | null
          non_medicinal_ingredients: Json | null
          normalized_product_name: string
          product_category: string | null
          product_name: string
          product_url: string | null
          retail_price_cad: number | null
          retail_price_usd: number | null
          scan_count: number | null
          search_vector: unknown
          serving_size: string | null
          total_count: number | null
          total_user_entries: number | null
          updated_at: string | null
        }
        Insert: {
          barcode_ean?: string | null
          barcode_upc?: string | null
          bioavailability_estimate?: number | null
          brand_registry_id: string
          cache_expiry?: string | null
          created_at?: string | null
          delivery_method?: string | null
          discovery_source?: string | null
          enrichment_cache_expires?: string | null
          enrichment_confidence?: number | null
          enrichment_date?: string | null
          enrichment_source?: string | null
          enrichment_status?: string | null
          id?: string
          image_url?: string | null
          ingredient_breakdown?: Json | null
          is_enriched?: boolean | null
          is_proprietary_blend?: boolean | null
          last_scanned_at?: string | null
          non_medicinal_ingredients?: Json | null
          normalized_product_name: string
          product_category?: string | null
          product_name: string
          product_url?: string | null
          retail_price_cad?: number | null
          retail_price_usd?: number | null
          scan_count?: number | null
          search_vector?: unknown
          serving_size?: string | null
          total_count?: number | null
          total_user_entries?: number | null
          updated_at?: string | null
        }
        Update: {
          barcode_ean?: string | null
          barcode_upc?: string | null
          bioavailability_estimate?: number | null
          brand_registry_id?: string
          cache_expiry?: string | null
          created_at?: string | null
          delivery_method?: string | null
          discovery_source?: string | null
          enrichment_cache_expires?: string | null
          enrichment_confidence?: number | null
          enrichment_date?: string | null
          enrichment_source?: string | null
          enrichment_status?: string | null
          id?: string
          image_url?: string | null
          ingredient_breakdown?: Json | null
          is_enriched?: boolean | null
          is_proprietary_blend?: boolean | null
          last_scanned_at?: string | null
          non_medicinal_ingredients?: Json | null
          normalized_product_name?: string
          product_category?: string | null
          product_name?: string
          product_url?: string | null
          retail_price_cad?: number | null
          retail_price_usd?: number | null
          scan_count?: number | null
          search_vector?: unknown
          serving_size?: string | null
          total_count?: number | null
          total_user_entries?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplement_brand_top_products_brand_registry_id_fkey"
            columns: ["brand_registry_id"]
            isOneToOne: false
            referencedRelation: "supplement_brand_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_discount_rules: {
        Row: {
          created_at: string
          discount_percent: number
          display_name: string
          id: string
          is_active: boolean
          is_annual_prepay_bonus: boolean
          requires_active_protocol: boolean
          requires_genex360_any: boolean
          requires_genex360_complete: boolean
          requires_subscription: boolean
          rule_priority: number
        }
        Insert: {
          created_at?: string
          discount_percent: number
          display_name: string
          id: string
          is_active?: boolean
          is_annual_prepay_bonus?: boolean
          requires_active_protocol?: boolean
          requires_genex360_any?: boolean
          requires_genex360_complete?: boolean
          requires_subscription?: boolean
          rule_priority: number
        }
        Update: {
          created_at?: string
          discount_percent?: number
          display_name?: string
          id?: string
          is_active?: boolean
          is_annual_prepay_bonus?: boolean
          requires_active_protocol?: boolean
          requires_genex360_any?: boolean
          requires_genex360_complete?: boolean
          requires_subscription?: boolean
          rule_priority?: number
        }
        Relationships: []
      }
      supplement_photo_bindings: {
        Row: {
          archived_at: string | null
          binding_id: string
          bound_at: string
          bound_by_user_id: string | null
          inventory_id: string
          is_primary: boolean
          sku: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          binding_id?: string
          bound_at?: string
          bound_by_user_id?: string | null
          inventory_id: string
          is_primary?: boolean
          sku: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          binding_id?: string
          bound_at?: string
          bound_by_user_id?: string | null
          inventory_id?: string
          is_primary?: boolean
          sku?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplement_photo_bindings_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "supplement_photo_inventory"
            referencedColumns: ["inventory_id"]
          },
        ]
      }
      supplement_photo_inventory: {
        Row: {
          bucket_name: string
          byte_size: number
          content_type: string
          deleted_at: string | null
          first_seen_at: string
          inventory_id: string
          last_modified_at: string
          last_verified_at: string
          object_path: string
          scope: Database["public"]["Enums"]["photo_scope"]
          sha256_hash: string
        }
        Insert: {
          bucket_name?: string
          byte_size: number
          content_type: string
          deleted_at?: string | null
          first_seen_at?: string
          inventory_id?: string
          last_modified_at: string
          last_verified_at?: string
          object_path: string
          scope?: Database["public"]["Enums"]["photo_scope"]
          sha256_hash: string
        }
        Update: {
          bucket_name?: string
          byte_size?: number
          content_type?: string
          deleted_at?: string | null
          first_seen_at?: string
          inventory_id?: string
          last_modified_at?: string
          last_verified_at?: string
          object_path?: string
          scope?: Database["public"]["Enums"]["photo_scope"]
          sha256_hash?: string
        }
        Relationships: []
      }
      supplement_search_index: {
        Row: {
          aliases: string[] | null
          brand_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          normalized_product_name: string
          product_category: string | null
          product_name: string
          source: string
          source_id: string | null
          updated_at: string | null
        }
        Insert: {
          aliases?: string[] | null
          brand_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          normalized_product_name: string
          product_category?: string | null
          product_name: string
          source: string
          source_id?: string | null
          updated_at?: string | null
        }
        Update: {
          aliases?: string[] | null
          brand_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          normalized_product_name?: string
          product_category?: string | null
          product_name?: string
          source?: string
          source_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_scorecard: {
        Row: {
          annual_spend: number
          composite_score: number
          created_at: string | null
          id: string
          ingredient_count: number
          lead_time_days: number
          payment_terms: string | null
          quality_certs: string[] | null
          recommendations: string[] | null
          region: string
          risk_tier: string
          score_cert_strength: number
          score_cost_concentration: number
          score_lead_time: number
          score_payment_terms: number
          score_regional_risk: number
          score_sku_exposure: number
          sku_count: number
          sku_exposure_pct: number
          spend_share_pct: number
          supplier: string
        }
        Insert: {
          annual_spend: number
          composite_score: number
          created_at?: string | null
          id?: string
          ingredient_count: number
          lead_time_days: number
          payment_terms?: string | null
          quality_certs?: string[] | null
          recommendations?: string[] | null
          region: string
          risk_tier: string
          score_cert_strength: number
          score_cost_concentration: number
          score_lead_time: number
          score_payment_terms: number
          score_regional_risk: number
          score_sku_exposure: number
          sku_count: number
          sku_exposure_pct: number
          spend_share_pct: number
          supplier: string
        }
        Update: {
          annual_spend?: number
          composite_score?: number
          created_at?: string | null
          id?: string
          ingredient_count?: number
          lead_time_days?: number
          payment_terms?: string | null
          quality_certs?: string[] | null
          recommendations?: string[] | null
          region?: string
          risk_tier?: string
          score_cert_strength?: number
          score_cost_concentration?: number
          score_lead_time?: number
          score_payment_terms?: number
          score_regional_risk?: number
          score_sku_exposure?: number
          sku_count?: number
          sku_exposure_pct?: number
          spend_share_pct?: number
          supplier?: string
        }
        Relationships: []
      }
      system_health_checks: {
        Row: {
          check_name: string
          checked_at: string
          error_code: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          metadata: Json | null
          status: string
        }
        Insert: {
          check_name: string
          checked_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          status: string
        }
        Update: {
          check_name?: string
          checked_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          status?: string
        }
        Relationships: []
      }
      takedown_requests: {
        Row: {
          created_at: string
          draft_body: string | null
          finding_id: string | null
          id: string
          listing_url: string
          mechanism: string
          platform: string
          platform_response_document_urls: string[] | null
          response_note: string | null
          response_received_at: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          takedown_effective_at: string | null
          template_id: string | null
          template_version: number | null
          test_buy_id: string | null
          vision_determination_id: string | null
        }
        Insert: {
          created_at?: string
          draft_body?: string | null
          finding_id?: string | null
          id?: string
          listing_url: string
          mechanism: string
          platform: string
          platform_response_document_urls?: string[] | null
          response_note?: string | null
          response_received_at?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          takedown_effective_at?: string | null
          template_id?: string | null
          template_version?: number | null
          test_buy_id?: string | null
          vision_determination_id?: string | null
        }
        Update: {
          created_at?: string
          draft_body?: string | null
          finding_id?: string | null
          id?: string
          listing_url?: string
          mechanism?: string
          platform?: string
          platform_response_document_urls?: string[] | null
          response_note?: string | null
          response_received_at?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          takedown_effective_at?: string | null
          template_id?: string | null
          template_version?: number | null
          test_buy_id?: string | null
          vision_determination_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "takedown_requests_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "compliance_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takedown_requests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "takedown_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takedown_requests_test_buy_id_fkey"
            columns: ["test_buy_id"]
            isOneToOne: false
            referencedRelation: "counterfeit_test_buys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takedown_requests_vision_determination_id_fkey"
            columns: ["vision_determination_id"]
            isOneToOne: false
            referencedRelation: "counterfeit_determinations"
            referencedColumns: ["id"]
          },
        ]
      }
      takedown_templates: {
        Row: {
          active: boolean
          approved_at: string | null
          approved_by: string | null
          body: string
          created_at: string
          id: string
          jurisdiction: string
          language: string
          mechanism: string
          required_slots: string[]
          template_code: string
          version: number
        }
        Insert: {
          active?: boolean
          approved_at?: string | null
          approved_by?: string | null
          body: string
          created_at?: string
          id?: string
          jurisdiction?: string
          language?: string
          mechanism: string
          required_slots: string[]
          template_code: string
          version: number
        }
        Update: {
          active?: boolean
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          created_at?: string
          id?: string
          jurisdiction?: string
          language?: string
          mechanism?: string
          required_slots?: string[]
          template_code?: string
          version?: number
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          activity_type: string | null
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          token_amount: number
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          token_amount: number
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          activity_type?: string | null
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          token_amount?: number
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      toolchain_runs: {
        Row: {
          completed_at: string
          created_at: string | null
          dry_run: boolean
          failed: number
          files_changed: number
          id: string
          passed: number
          run_id: string
          skipped: number
          started_at: string
          total_duration: string
          total_steps: number
        }
        Insert: {
          completed_at: string
          created_at?: string | null
          dry_run?: boolean
          failed: number
          files_changed: number
          id?: string
          passed: number
          run_id: string
          skipped: number
          started_at: string
          total_duration: string
          total_steps: number
        }
        Update: {
          completed_at?: string
          created_at?: string | null
          dry_run?: boolean
          failed?: number
          files_changed?: number
          id?: string
          passed?: number
          run_id?: string
          skipped?: number
          started_at?: string
          total_duration?: string
          total_steps?: number
        }
        Relationships: []
      }
      toolchain_step_results: {
        Row: {
          created_at: string | null
          duration: string | null
          error: string | null
          id: string
          name: string
          run_id: string
          status: string
          step: number
        }
        Insert: {
          created_at?: string | null
          duration?: string | null
          error?: string | null
          id?: string
          name: string
          run_id: string
          status: string
          step: number
        }
        Update: {
          created_at?: string | null
          duration?: string | null
          error?: string | null
          id?: string
          name?: string
          run_id?: string
          status?: string
          step?: number
        }
        Relationships: [
          {
            foreignKeyName: "toolchain_step_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "toolchain_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      trust_band_chips: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          category: string
          chip_text: string
          claimed_threshold: number | null
          created_at: string
          current_measured_value: number | null
          display_order: number
          icon_name: string
          id: string
          live_data_source: string | null
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          steve_approval_at: string | null
          steve_approval_by: string | null
          substantiation_ref: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          category: string
          chip_text: string
          claimed_threshold?: number | null
          created_at?: string
          current_measured_value?: number | null
          display_order?: number
          icon_name: string
          id?: string
          live_data_source?: string | null
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          substantiation_ref?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          category?: string
          chip_text?: string
          claimed_threshold?: number | null
          created_at?: string
          current_measured_value?: number | null
          display_order?: number
          icon_name?: string
          id?: string
          live_data_source?: string | null
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          substantiation_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_band_chips_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_band_clinician_cards: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          clinician_consent_received_at: string | null
          clinician_consent_scope: string | null
          clinician_consent_storage_key: string | null
          clinician_display_name: string
          created_at: string
          credential_line: string
          descriptor_sentence: string
          display_order: number
          id: string
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          photo_license_storage_key: string | null
          photo_storage_key: string | null
          role_line: string
          steve_approval_at: string | null
          steve_approval_by: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          clinician_consent_received_at?: string | null
          clinician_consent_scope?: string | null
          clinician_consent_storage_key?: string | null
          clinician_display_name: string
          created_at?: string
          credential_line: string
          descriptor_sentence: string
          display_order?: number
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          photo_license_storage_key?: string | null
          photo_storage_key?: string | null
          role_line: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          clinician_consent_received_at?: string | null
          clinician_consent_scope?: string | null
          clinician_consent_storage_key?: string | null
          clinician_display_name?: string
          created_at?: string
          credential_line?: string
          descriptor_sentence?: string
          display_order?: number
          id?: string
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          photo_license_storage_key?: string | null
          photo_storage_key?: string | null
          role_line?: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_band_clinician_cards_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_band_events: {
        Row: {
          actor_user_id: string | null
          event_detail: Json | null
          event_kind: string
          id: string
          occurred_at: string
          row_id: string
          surface: string
        }
        Insert: {
          actor_user_id?: string | null
          event_detail?: Json | null
          event_kind: string
          id?: string
          occurred_at?: string
          row_id: string
          surface: string
        }
        Update: {
          actor_user_id?: string | null
          event_detail?: Json | null
          event_kind?: string
          id?: string
          occurred_at?: string
          row_id?: string
          surface?: string
        }
        Relationships: []
      }
      trust_band_regulatory_paragraphs: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          created_at: string
          frameworks_named: string[]
          id: string
          legal_counsel_review_at: string | null
          legal_counsel_review_by: string | null
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          paragraph_text: string
          steve_approval_at: string | null
          steve_approval_by: string | null
          steve_approval_note: string | null
          substantiation_refs: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          frameworks_named?: string[]
          id?: string
          legal_counsel_review_at?: string | null
          legal_counsel_review_by?: string | null
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          paragraph_text: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          steve_approval_note?: string | null
          substantiation_refs?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          frameworks_named?: string[]
          id?: string
          legal_counsel_review_at?: string | null
          legal_counsel_review_by?: string | null
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          paragraph_text?: string
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          steve_approval_note?: string | null
          substantiation_refs?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_band_regulatory_paragra_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_band_scale_measurements: {
        Row: {
          chip_id: string
          data_source_queried: string
          id: string
          measured_at: string
          measured_value: number
          passed_threshold: boolean
        }
        Insert: {
          chip_id: string
          data_source_queried: string
          id?: string
          measured_at?: string
          measured_value: number
          passed_threshold: boolean
        }
        Update: {
          chip_id?: string
          data_source_queried?: string
          id?: string
          measured_at?: string
          measured_value?: number
          passed_threshold?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trust_band_scale_measurements_chip_id_fkey"
            columns: ["chip_id"]
            isOneToOne: false
            referencedRelation: "trust_band_chips"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_band_testimonials: {
        Row: {
          active: boolean
          archived: boolean
          archived_at: string | null
          claims_substantiation_refs: string[]
          created_at: string
          display_order: number
          endorser_connection_disclosure_text: string
          endorser_consent_received_at: string
          endorser_consent_revoked_at: string | null
          endorser_identity: string
          endorser_material_connection: string
          endorser_photo_consent_storage_key: string | null
          endorser_photo_storage_key: string | null
          endorser_role: string
          endorser_written_consent_storage_key: string
          id: string
          legal_counsel_review_at: string | null
          legal_counsel_review_by: string | null
          marshall_precheck_passed: boolean
          marshall_precheck_session_id: string | null
          steve_approval_at: string | null
          steve_approval_by: string | null
          testimonial_date_of_statement: string
          testimonial_text: string
          typicality_disclosure_text: string | null
          typicality_status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          claims_substantiation_refs?: string[]
          created_at?: string
          display_order?: number
          endorser_connection_disclosure_text: string
          endorser_consent_received_at: string
          endorser_consent_revoked_at?: string | null
          endorser_identity: string
          endorser_material_connection: string
          endorser_photo_consent_storage_key?: string | null
          endorser_photo_storage_key?: string | null
          endorser_role: string
          endorser_written_consent_storage_key: string
          id?: string
          legal_counsel_review_at?: string | null
          legal_counsel_review_by?: string | null
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          testimonial_date_of_statement: string
          testimonial_text: string
          typicality_disclosure_text?: string | null
          typicality_status: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          archived_at?: string | null
          claims_substantiation_refs?: string[]
          created_at?: string
          display_order?: number
          endorser_connection_disclosure_text?: string
          endorser_consent_received_at?: string
          endorser_consent_revoked_at?: string | null
          endorser_identity?: string
          endorser_material_connection?: string
          endorser_photo_consent_storage_key?: string | null
          endorser_photo_storage_key?: string | null
          endorser_role?: string
          endorser_written_consent_storage_key?: string
          id?: string
          legal_counsel_review_at?: string | null
          legal_counsel_review_by?: string | null
          marshall_precheck_passed?: boolean
          marshall_precheck_session_id?: string | null
          steve_approval_at?: string | null
          steve_approval_by?: string | null
          testimonial_date_of_statement?: string
          testimonial_text?: string
          typicality_disclosure_text?: string | null
          typicality_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_band_testimonials_marshall_precheck_session_id_fkey"
            columns: ["marshall_precheck_session_id"]
            isOneToOne: false
            referencedRelation: "precheck_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ultrathink_advisor_conversations: {
        Row: {
          advisor_role: string
          category: string | null
          confidence: number | null
          content: string
          context_snapshot: Json | null
          created_at: string
          escalated: boolean
          guardrail_triggered: boolean
          guardrail_type: string | null
          id: string
          message_role: string
          patient_id: string | null
          response_length: number | null
          user_id: string
        }
        Insert: {
          advisor_role: string
          category?: string | null
          confidence?: number | null
          content: string
          context_snapshot?: Json | null
          created_at?: string
          escalated?: boolean
          guardrail_triggered?: boolean
          guardrail_type?: string | null
          id?: string
          message_role: string
          patient_id?: string | null
          response_length?: number | null
          user_id: string
        }
        Update: {
          advisor_role?: string
          category?: string | null
          confidence?: number | null
          content?: string
          context_snapshot?: Json | null
          created_at?: string
          escalated?: boolean
          guardrail_triggered?: boolean
          guardrail_type?: string | null
          id?: string
          message_role?: string
          patient_id?: string | null
          response_length?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ultrathink_advisor_evolution_reports: {
        Row: {
          actions_taken: Json | null
          created_at: string
          degradation_detected: boolean
          id: string
          metrics: Json
          role: string
          week_of: string
        }
        Insert: {
          actions_taken?: Json | null
          created_at?: string
          degradation_detected?: boolean
          id?: string
          metrics: Json
          role: string
          week_of: string
        }
        Update: {
          actions_taken?: Json | null
          created_at?: string
          degradation_detected?: boolean
          id?: string
          metrics?: Json
          role?: string
          week_of?: string
        }
        Relationships: []
      }
      ultrathink_advisor_prompts: {
        Row: {
          created_at: string
          created_by: string
          deactivated_at: string | null
          id: string
          is_active: boolean
          role: string
          system_prompt: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          role: string
          system_prompt: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          role?: string
          system_prompt?: string
          version?: number
        }
        Relationships: []
      }
      ultrathink_advisor_query_log: {
        Row: {
          advisor_role: string
          context_snapshot: Json | null
          created_at: string
          id: string
          message: string
          model_used: string | null
          patient_id: string | null
          response_time_ms: number | null
          satisfaction_rating: number | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          advisor_role: string
          context_snapshot?: Json | null
          created_at?: string
          id?: string
          message: string
          model_used?: string | null
          patient_id?: string | null
          response_time_ms?: number | null
          satisfaction_rating?: number | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          advisor_role?: string
          context_snapshot?: Json | null
          created_at?: string
          id?: string
          message?: string
          model_used?: string | null
          patient_id?: string | null
          response_time_ms?: number | null
          satisfaction_rating?: number | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ultrathink_advisor_ratings: {
        Row: {
          conversation_id: string
          created_at: string
          feedback: string | null
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ultrathink_advisor_ratings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ultrathink_advisor_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ultrathink_agent_events: {
        Row: {
          agent_name: string
          created_at: string
          event_type: string
          id: string
          payload: Json
          run_id: string | null
          severity: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          run_id?: string | null
          severity?: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          run_id?: string | null
          severity?: string
        }
        Relationships: []
      }
      ultrathink_agent_log: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          protocol_id: string | null
          run_id: string
          status: string
          trigger_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          protocol_id?: string | null
          run_id?: string
          status: string
          trigger_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          protocol_id?: string | null
          run_id?: string
          status?: string
          trigger_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ultrathink_agent_log_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "ultrathink_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      ultrathink_agent_registry: {
        Row: {
          agent_name: string
          agent_type: string
          consecutive_misses: number
          description: string
          display_name: string
          expected_period_minutes: number | null
          health_check_query: string | null
          health_status: string
          id: string
          is_active: boolean
          is_critical: boolean
          last_health_check_at: string | null
          last_heartbeat_at: string | null
          origin_prompt: string | null
          registered_at: string
          reports: string | null
          runtime_handle: string | null
          runtime_kind: string
          tier: number
          updated_at: string
        }
        Insert: {
          agent_name: string
          agent_type: string
          consecutive_misses?: number
          description: string
          display_name: string
          expected_period_minutes?: number | null
          health_check_query?: string | null
          health_status?: string
          id?: string
          is_active?: boolean
          is_critical?: boolean
          last_health_check_at?: string | null
          last_heartbeat_at?: string | null
          origin_prompt?: string | null
          registered_at?: string
          reports?: string | null
          runtime_handle?: string | null
          runtime_kind: string
          tier: number
          updated_at?: string
        }
        Update: {
          agent_name?: string
          agent_type?: string
          consecutive_misses?: number
          description?: string
          display_name?: string
          expected_period_minutes?: number | null
          health_check_query?: string | null
          health_status?: string
          id?: string
          is_active?: boolean
          is_critical?: boolean
          last_health_check_at?: string | null
          last_heartbeat_at?: string | null
          origin_prompt?: string | null
          registered_at?: string
          reports?: string | null
          runtime_handle?: string | null
          runtime_kind?: string
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      ultrathink_agent_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          max_retries: number
          payload: Json
          priority: number
          result: Json | null
          retry_count: number
          scheduled_for: string
          started_at: string | null
          status: string
          task_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number
          payload?: Json
          priority?: number
          result?: Json | null
          retry_count?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          task_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number
          payload?: Json
          priority?: number
          result?: Json | null
          retry_count?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          task_type?: string
        }
        Relationships: []
      }
      ultrathink_clinical_rules: {
        Row: {
          bioavailability_note: string | null
          combined_score: number | null
          created_at: string
          delivery_form: string | null
          deprecated_at: string | null
          deprecation_reason: string | null
          dosage: string | null
          evidence_level: string
          evidence_score: number
          frequency: string | null
          health_signals: string[] | null
          id: string
          is_active: boolean
          outcome_n: number
          outcome_score: number | null
          product_category: string | null
          product_name: string | null
          rationale_template: string | null
          rule_id: string
          rule_name: string
          source_rule_table: string | null
          timing: string[] | null
          trigger_field: string | null
          trigger_operator: string | null
          trigger_type: string
          trigger_value: string | null
          updated_at: string
        }
        Insert: {
          bioavailability_note?: string | null
          combined_score?: number | null
          created_at?: string
          delivery_form?: string | null
          deprecated_at?: string | null
          deprecation_reason?: string | null
          dosage?: string | null
          evidence_level?: string
          evidence_score?: number
          frequency?: string | null
          health_signals?: string[] | null
          id?: string
          is_active?: boolean
          outcome_n?: number
          outcome_score?: number | null
          product_category?: string | null
          product_name?: string | null
          rationale_template?: string | null
          rule_id: string
          rule_name: string
          source_rule_table?: string | null
          timing?: string[] | null
          trigger_field?: string | null
          trigger_operator?: string | null
          trigger_type: string
          trigger_value?: string | null
          updated_at?: string
        }
        Update: {
          bioavailability_note?: string | null
          combined_score?: number | null
          created_at?: string
          delivery_form?: string | null
          deprecated_at?: string | null
          deprecation_reason?: string | null
          dosage?: string | null
          evidence_level?: string
          evidence_score?: number
          frequency?: string | null
          health_signals?: string[] | null
          id?: string
          is_active?: boolean
          outcome_n?: number
          outcome_score?: number | null
          product_category?: string | null
          product_name?: string | null
          rationale_template?: string | null
          rule_id?: string
          rule_name?: string
          source_rule_table?: string | null
          timing?: string[] | null
          trigger_field?: string | null
          trigger_operator?: string | null
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ultrathink_data_feeds: {
        Row: {
          base_url: string | null
          circuit_open_until: string | null
          consecutive_failures: number
          cost_per_run_usd: number
          cost_tier: string
          created_at: string
          daily_budget_usd: number
          display_name: string
          id: string
          is_active: boolean
          last_run_at: string | null
          last_status: string | null
          next_run_at: string | null
          notes: string | null
          schedule_cron: string
          source: string
          spent_reset_at: string
          total_spent_lifetime_usd: number
          total_spent_today_usd: number
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          circuit_open_until?: string | null
          consecutive_failures?: number
          cost_per_run_usd?: number
          cost_tier: string
          created_at?: string
          daily_budget_usd?: number
          display_name: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_status?: string | null
          next_run_at?: string | null
          notes?: string | null
          schedule_cron: string
          source: string
          spent_reset_at?: string
          total_spent_lifetime_usd?: number
          total_spent_today_usd?: number
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          circuit_open_until?: string | null
          consecutive_failures?: number
          cost_per_run_usd?: number
          cost_tier?: string
          created_at?: string
          daily_budget_usd?: number
          display_name?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_status?: string | null
          next_run_at?: string | null
          notes?: string | null
          schedule_cron?: string
          source?: string
          spent_reset_at?: string
          total_spent_lifetime_usd?: number
          total_spent_today_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      ultrathink_interaction_rules: {
        Row: {
          agent_a: string
          agent_a_kind: string
          agent_b: string
          agent_b_kind: string
          created_at: string
          evidence_score: number
          id: string
          is_active: boolean
          mechanism: string | null
          recommendation: string
          severity: string
          source: string
          source_ids: string[] | null
          updated_at: string
        }
        Insert: {
          agent_a: string
          agent_a_kind: string
          agent_b: string
          agent_b_kind: string
          created_at?: string
          evidence_score?: number
          id?: string
          is_active?: boolean
          mechanism?: string | null
          recommendation: string
          severity: string
          source: string
          source_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          agent_a?: string
          agent_a_kind?: string
          agent_b?: string
          agent_b_kind?: string
          created_at?: string
          evidence_score?: number
          id?: string
          is_active?: boolean
          mechanism?: string | null
          recommendation?: string
          severity?: string
          source?: string
          source_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      ultrathink_jeffery_advisor_config: {
        Row: {
          auto_applied: boolean
          created_at: string
          id: string
          instructions: string
          is_active: boolean
          reason: string | null
          role: string
        }
        Insert: {
          auto_applied?: boolean
          created_at?: string
          id?: string
          instructions: string
          is_active?: boolean
          reason?: string | null
          role: string
        }
        Update: {
          auto_applied?: boolean
          created_at?: string
          id?: string
          instructions?: string
          is_active?: boolean
          reason?: string | null
          role?: string
        }
        Relationships: []
      }
      ultrathink_jeffery_decisions: {
        Row: {
          created_at: string
          decision_type: string
          id: string
          inputs: Json
          outcome: Json | null
          rationale: string
          reviewed_at: string | null
          run_id: string
          target_agent: string | null
          was_correct: boolean | null
        }
        Insert: {
          created_at?: string
          decision_type: string
          id?: string
          inputs?: Json
          outcome?: Json | null
          rationale: string
          reviewed_at?: string | null
          run_id: string
          target_agent?: string | null
          was_correct?: boolean | null
        }
        Update: {
          created_at?: string
          decision_type?: string
          id?: string
          inputs?: Json
          outcome?: Json | null
          rationale?: string
          reviewed_at?: string | null
          run_id?: string
          target_agent?: string | null
          was_correct?: boolean | null
        }
        Relationships: []
      }
      ultrathink_jeffery_evolution: {
        Row: {
          agent_name: string | null
          created_at: string
          delta_pct: number | null
          entry_type: string
          id: string
          metric_name: string | null
          metric_value: number | null
          notes: string | null
          payload: Json
          population_size: number | null
          rolling_30d_avg: number | null
          week_starting: string | null
        }
        Insert: {
          agent_name?: string | null
          created_at?: string
          delta_pct?: number | null
          entry_type: string
          id?: string
          metric_name?: string | null
          metric_value?: number | null
          notes?: string | null
          payload?: Json
          population_size?: number | null
          rolling_30d_avg?: number | null
          week_starting?: string | null
        }
        Update: {
          agent_name?: string | null
          created_at?: string
          delta_pct?: number | null
          entry_type?: string
          id?: string
          metric_name?: string | null
          metric_value?: number | null
          notes?: string | null
          payload?: Json
          population_size?: number | null
          rolling_30d_avg?: number | null
          week_starting?: string | null
        }
        Relationships: []
      }
      ultrathink_knowledge_base: {
        Row: {
          citations: Json
          created_at: string
          domain: string
          effect_size: number | null
          evidence_level: string
          evidence_score: number
          fact_hash: string
          id: string
          last_validated: string
          object: string
          predicate: string
          source_count: number
          subject: string
          updated_at: string
        }
        Insert: {
          citations?: Json
          created_at?: string
          domain: string
          effect_size?: number | null
          evidence_level?: string
          evidence_score?: number
          fact_hash: string
          id?: string
          last_validated?: string
          object: string
          predicate: string
          source_count?: number
          subject: string
          updated_at?: string
        }
        Update: {
          citations?: Json
          created_at?: string
          domain?: string
          effect_size?: number | null
          evidence_level?: string
          evidence_score?: number
          fact_hash?: string
          id?: string
          last_validated?: string
          object?: string
          predicate?: string
          source_count?: number
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      ultrathink_knowledge_graph_edges: {
        Row: {
          created_at: string
          dst_fact_id: string
          id: string
          relation: string
          src_fact_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          dst_fact_id: string
          id?: string
          relation: string
          src_fact_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          dst_fact_id?: string
          id?: string
          relation?: string
          src_fact_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ultrathink_knowledge_graph_edges_dst_fact_id_fkey"
            columns: ["dst_fact_id"]
            isOneToOne: false
            referencedRelation: "ultrathink_knowledge_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ultrathink_knowledge_graph_edges_src_fact_id_fkey"
            columns: ["src_fact_id"]
            isOneToOne: false
            referencedRelation: "ultrathink_knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      ultrathink_nutrient_rda: {
        Row: {
          age_group: string
          id: string
          nutrient: string
          rda_unit: string | null
          rda_value: number | null
          retrieved_at: string
          source: string
          source_url: string | null
          upper_limit: number | null
          upper_limit_unit: string | null
        }
        Insert: {
          age_group: string
          id?: string
          nutrient: string
          rda_unit?: string | null
          rda_value?: number | null
          retrieved_at?: string
          source?: string
          source_url?: string | null
          upper_limit?: number | null
          upper_limit_unit?: string | null
        }
        Update: {
          age_group?: string
          id?: string
          nutrient?: string
          rda_unit?: string | null
          rda_value?: number | null
          retrieved_at?: string
          source?: string
          source_url?: string | null
          upper_limit?: number | null
          upper_limit_unit?: string | null
        }
        Relationships: []
      }
      ultrathink_outcome_tracker: {
        Row: {
          age_bracket: string
          bio_score_after_30d: number | null
          bio_score_after_60d: number | null
          bio_score_before: number
          condition_pattern: string
          delta_30d: number | null
          delta_60d: number | null
          id: string
          improved: boolean | null
          product_name: string
          recommendation_at: string
          recommendation_hash: string
          recorded_at: string
          sex_bracket: string | null
        }
        Insert: {
          age_bracket: string
          bio_score_after_30d?: number | null
          bio_score_after_60d?: number | null
          bio_score_before: number
          condition_pattern: string
          delta_30d?: number | null
          delta_60d?: number | null
          id?: string
          improved?: boolean | null
          product_name: string
          recommendation_at: string
          recommendation_hash: string
          recorded_at?: string
          sex_bracket?: string | null
        }
        Update: {
          age_bracket?: string
          bio_score_after_30d?: number | null
          bio_score_after_60d?: number | null
          bio_score_before?: number
          condition_pattern?: string
          delta_30d?: number | null
          delta_60d?: number | null
          id?: string
          improved?: boolean | null
          product_name?: string
          recommendation_at?: string
          recommendation_hash?: string
          recorded_at?: string
          sex_bracket?: string | null
        }
        Relationships: []
      }
      ultrathink_pattern_cache: {
        Row: {
          built_at: string
          combined_confidence: number | null
          data_confidence: number
          expires_at: string | null
          hit_count: number
          id: string
          last_hit_at: string | null
          outcome_confidence: number | null
          pattern_hash: string
          protocol_payload: Json
          sample_n: number
          signal_summary: string
          source_rule_ids: string[] | null
        }
        Insert: {
          built_at?: string
          combined_confidence?: number | null
          data_confidence: number
          expires_at?: string | null
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          outcome_confidence?: number | null
          pattern_hash: string
          protocol_payload: Json
          sample_n?: number
          signal_summary: string
          source_rule_ids?: string[] | null
        }
        Update: {
          built_at?: string
          combined_confidence?: number | null
          data_confidence?: number
          expires_at?: string | null
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          outcome_confidence?: number | null
          pattern_hash?: string
          protocol_payload?: Json
          sample_n?: number
          signal_summary?: string
          source_rule_ids?: string[] | null
        }
        Relationships: []
      }
      ultrathink_product_efficacy: {
        Row: {
          avg_delta_60d: number | null
          computed_at: string
          condition_pattern: string | null
          id: string
          improved_n: number
          improvement_rate: number | null
          median_delta_60d: number | null
          product_name: string
          sample_n: number
        }
        Insert: {
          avg_delta_60d?: number | null
          computed_at?: string
          condition_pattern?: string | null
          id?: string
          improved_n?: number
          improvement_rate?: number | null
          median_delta_60d?: number | null
          product_name: string
          sample_n?: number
        }
        Update: {
          avg_delta_60d?: number | null
          computed_at?: string
          condition_pattern?: string | null
          id?: string
          improved_n?: number
          improvement_rate?: number | null
          median_delta_60d?: number | null
          product_name?: string
          sample_n?: number
        }
        Relationships: []
      }
      ultrathink_protocols: {
        Row: {
          bio_score_impact: Json | null
          claude_model: string | null
          confidence_pct: number
          confidence_tier: number
          context_snapshot: Json | null
          created_at: string | null
          data_sources_used: string[] | null
          detected_patterns: string[] | null
          engine: string | null
          expires_at: string | null
          generated_at: string | null
          generation_time_ms: number | null
          high_priority_count: number | null
          id: string
          input_token_count: number | null
          items: Json | null
          low_priority_count: number | null
          medium_priority_count: number | null
          output_token_count: number | null
          protocol_rationale: string | null
          protocol_type: string | null
          rationale: string | null
          status: string
          supervision_required: boolean | null
          total_recommendations: number | null
          trigger_type: string | null
          updated_at: string | null
          user_id: string
          version: number
        }
        Insert: {
          bio_score_impact?: Json | null
          claude_model?: string | null
          confidence_pct?: number
          confidence_tier?: number
          context_snapshot?: Json | null
          created_at?: string | null
          data_sources_used?: string[] | null
          detected_patterns?: string[] | null
          engine?: string | null
          expires_at?: string | null
          generated_at?: string | null
          generation_time_ms?: number | null
          high_priority_count?: number | null
          id?: string
          input_token_count?: number | null
          items?: Json | null
          low_priority_count?: number | null
          medium_priority_count?: number | null
          output_token_count?: number | null
          protocol_rationale?: string | null
          protocol_type?: string | null
          rationale?: string | null
          status?: string
          supervision_required?: boolean | null
          total_recommendations?: number | null
          trigger_type?: string | null
          updated_at?: string | null
          user_id: string
          version?: number
        }
        Update: {
          bio_score_impact?: Json | null
          claude_model?: string | null
          confidence_pct?: number
          confidence_tier?: number
          context_snapshot?: Json | null
          created_at?: string | null
          data_sources_used?: string[] | null
          detected_patterns?: string[] | null
          engine?: string | null
          expires_at?: string | null
          generated_at?: string | null
          generation_time_ms?: number | null
          high_priority_count?: number | null
          id?: string
          input_token_count?: number | null
          items?: Json | null
          low_priority_count?: number | null
          medium_priority_count?: number | null
          output_token_count?: number | null
          protocol_rationale?: string | null
          protocol_type?: string | null
          rationale?: string | null
          status?: string
          supervision_required?: boolean | null
          total_recommendations?: number | null
          trigger_type?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      ultrathink_recommendations: {
        Row: {
          added_to_protocol_at: string | null
          bioavailability_note: string | null
          contraindications: string[] | null
          created_at: string | null
          delivery_form: string
          dismissed_reason: string | null
          dosage: string
          duration_weeks: number | null
          evidence_level: string | null
          farmceutica_product: string
          frequency: string
          health_signals: string[]
          id: string
          interaction_check: string | null
          is_accepted: boolean | null
          is_dismissed: boolean | null
          priority: string
          product_category: string
          protocol_id: string
          rank: number
          rationale: string
          replaces_current: string | null
          synergy_with: string[] | null
          timing: string[]
          user_id: string
        }
        Insert: {
          added_to_protocol_at?: string | null
          bioavailability_note?: string | null
          contraindications?: string[] | null
          created_at?: string | null
          delivery_form: string
          dismissed_reason?: string | null
          dosage: string
          duration_weeks?: number | null
          evidence_level?: string | null
          farmceutica_product: string
          frequency: string
          health_signals: string[]
          id?: string
          interaction_check?: string | null
          is_accepted?: boolean | null
          is_dismissed?: boolean | null
          priority: string
          product_category: string
          protocol_id: string
          rank: number
          rationale: string
          replaces_current?: string | null
          synergy_with?: string[] | null
          timing: string[]
          user_id: string
        }
        Update: {
          added_to_protocol_at?: string | null
          bioavailability_note?: string | null
          contraindications?: string[] | null
          created_at?: string | null
          delivery_form?: string
          dismissed_reason?: string | null
          dosage?: string
          duration_weeks?: number | null
          evidence_level?: string | null
          farmceutica_product?: string
          frequency?: string
          health_signals?: string[]
          id?: string
          interaction_check?: string | null
          is_accepted?: boolean | null
          is_dismissed?: boolean | null
          priority?: string
          product_category?: string
          protocol_id?: string
          rank?: number
          rationale?: string
          replaces_current?: string | null
          synergy_with?: string[] | null
          timing?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ultrathink_recommendations_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "ultrathink_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      ultrathink_research_feed: {
        Row: {
          abstract: string | null
          authors: string[] | null
          external_id: string
          fetched_at: string
          id: string
          knowledge_ids: string[] | null
          process_error: string | null
          processed_at: string | null
          published_at: string | null
          raw_payload: Json | null
          source: string
          status: string
          title: string
          url: string | null
        }
        Insert: {
          abstract?: string | null
          authors?: string[] | null
          external_id: string
          fetched_at?: string
          id?: string
          knowledge_ids?: string[] | null
          process_error?: string | null
          processed_at?: string | null
          published_at?: string | null
          raw_payload?: Json | null
          source: string
          status?: string
          title: string
          url?: string | null
        }
        Update: {
          abstract?: string | null
          authors?: string[] | null
          external_id?: string
          fetched_at?: string
          id?: string
          knowledge_ids?: string[] | null
          process_error?: string | null
          processed_at?: string | null
          published_at?: string | null
          raw_payload?: Json | null
          source?: string
          status?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      ultrathink_sync_log: {
        Row: {
          action: string
          cost_usd: number
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          records_added: number
          records_error: number
          records_in: number
          records_skipped: number
          run_id: string
          source: string
          status: string
        }
        Insert: {
          action: string
          cost_usd?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_added?: number
          records_error?: number
          records_in?: number
          records_skipped?: number
          run_id: string
          source: string
          status?: string
        }
        Update: {
          action?: string
          cost_usd?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_added?: number
          records_error?: number
          records_in?: number
          records_skipped?: number
          run_id?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      unit_economics: {
        Row: {
          annual_profit_per_customer: number
          annual_revenue_per_customer: number
          breakeven_revenue: number
          breakeven_units_per_month: number
          cac: number
          cac_payback_months: number
          category: string
          channel: string
          cogs: number
          contribution_margin: number
          contribution_margin_pct: number
          created_at: string | null
          customer_lifespan_years: number
          flag: string
          id: string
          ltv: number
          ltv_to_cac_ratio: number
          name: string
          order_frequency: number
          price: number
          profit_per_order: number
          revenue_per_order: number
          sku: string
          tier: string
          units_per_order: number
          variable_costs_per_unit: number
        }
        Insert: {
          annual_profit_per_customer: number
          annual_revenue_per_customer: number
          breakeven_revenue: number
          breakeven_units_per_month: number
          cac: number
          cac_payback_months: number
          category: string
          channel: string
          cogs: number
          contribution_margin: number
          contribution_margin_pct: number
          created_at?: string | null
          customer_lifespan_years: number
          flag: string
          id?: string
          ltv: number
          ltv_to_cac_ratio: number
          name: string
          order_frequency: number
          price: number
          profit_per_order: number
          revenue_per_order: number
          sku: string
          tier: string
          units_per_order: number
          variable_costs_per_unit: number
        }
        Update: {
          annual_profit_per_customer?: number
          annual_revenue_per_customer?: number
          breakeven_revenue?: number
          breakeven_units_per_month?: number
          cac?: number
          cac_payback_months?: number
          category?: string
          channel?: string
          cogs?: number
          contribution_margin?: number
          contribution_margin_pct?: number
          created_at?: string | null
          customer_lifespan_years?: number
          flag?: string
          id?: string
          ltv?: number
          ltv_to_cac_ratio?: number
          name?: string
          order_frequency?: number
          price?: number
          profit_per_order?: number
          revenue_per_order?: number
          sku?: string
          tier?: string
          units_per_order?: number
          variable_costs_per_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "unit_economics_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      usda_food_cache: {
        Row: {
          cached_at: string
          calories_per_100g: number | null
          carbs_per_100g: number | null
          expires_at: string
          fdc_id: number | null
          fiber_per_100g: number | null
          food_name: string
          id: string
          omega3_per_100g: number | null
          protein_per_100g: number | null
          query_normalized: string
          raw_payload: Json | null
          saturated_fat_per_100g: number | null
          serving_size_g: number | null
          sugar_per_100g: number | null
          total_fat_per_100g: number | null
          trans_fat_per_100g: number | null
        }
        Insert: {
          cached_at?: string
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          expires_at?: string
          fdc_id?: number | null
          fiber_per_100g?: number | null
          food_name: string
          id?: string
          omega3_per_100g?: number | null
          protein_per_100g?: number | null
          query_normalized: string
          raw_payload?: Json | null
          saturated_fat_per_100g?: number | null
          serving_size_g?: number | null
          sugar_per_100g?: number | null
          total_fat_per_100g?: number | null
          trans_fat_per_100g?: number | null
        }
        Update: {
          cached_at?: string
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          expires_at?: string
          fdc_id?: number | null
          fiber_per_100g?: number | null
          food_name?: string
          id?: string
          omega3_per_100g?: number | null
          protein_per_100g?: number | null
          query_normalized?: string
          raw_payload?: Json | null
          saturated_fat_per_100g?: number | null
          serving_size_g?: number | null
          sugar_per_100g?: number | null
          total_fat_per_100g?: number | null
          trans_fat_per_100g?: number | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          first_name: string
          id: string
          is_default: boolean
          label: string
          last_name: string
          phone: string | null
          state: string
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          first_name: string
          id?: string
          is_default?: boolean
          label?: string
          last_name: string
          phone?: string | null
          state: string
          updated_at?: string
          user_id: string
          zip: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          first_name?: string
          id?: string
          is_default?: boolean
          label?: string
          last_name?: string
          phone?: string | null
          state?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: []
      }
      user_current_supplements: {
        Row: {
          added_at: string | null
          brand: string | null
          category: string | null
          dosage: string | null
          dosage_form: string | null
          formulation: string | null
          frequency: string | null
          id: string
          is_ai_recommended: boolean | null
          is_current: boolean | null
          key_ingredients: string[] | null
          product_name: string | null
          source: string | null
          supplement_name: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          brand?: string | null
          category?: string | null
          dosage?: string | null
          dosage_form?: string | null
          formulation?: string | null
          frequency?: string | null
          id?: string
          is_ai_recommended?: boolean | null
          is_current?: boolean | null
          key_ingredients?: string[] | null
          product_name?: string | null
          source?: string | null
          supplement_name: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          brand?: string | null
          category?: string | null
          dosage?: string | null
          dosage_form?: string | null
          formulation?: string | null
          frequency?: string | null
          id?: string
          is_ai_recommended?: boolean | null
          is_current?: boolean | null
          key_ingredients?: string[] | null
          product_name?: string | null
          source?: string | null
          supplement_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feature_opt_ins: {
        Row: {
          feature_id: string
          id: string
          opted_in: boolean
          opted_in_at: string
          opted_out_at: string | null
          user_id: string
        }
        Insert: {
          feature_id: string
          id?: string
          opted_in?: boolean
          opted_in_at?: string
          opted_out_at?: string | null
          user_id: string
        }
        Update: {
          feature_id?: string
          id?: string
          opted_in?: boolean
          opted_in_at?: string
          opted_out_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_opt_ins_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interaction_cache: {
        Row: {
          evaluated_at: string | null
          id: string
          input_hash: string
          interactions: Json
          major_count: number | null
          minor_count: number | null
          moderate_count: number | null
          safety_cleared: boolean | null
          synergistic_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          evaluated_at?: string | null
          id?: string
          input_hash: string
          interactions?: Json
          major_count?: number | null
          minor_count?: number | null
          moderate_count?: number | null
          safety_cleared?: boolean | null
          synergistic_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          evaluated_at?: string | null
          id?: string
          input_hash?: string
          interactions?: Json
          major_count?: number | null
          minor_count?: number | null
          moderate_count?: number | null
          safety_cleared?: boolean | null
          synergistic_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          agent_a: string
          agent_b: string
          blocks_protocol: boolean | null
          cache_id: string
          created_at: string | null
          id: string
          rationale: string
          recommendation: string
          requires_hcp_review: boolean | null
          rule_id: string
          severity: string
          timing_note: string | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agent_a: string
          agent_b: string
          blocks_protocol?: boolean | null
          cache_id: string
          created_at?: string | null
          id?: string
          rationale: string
          recommendation: string
          requires_hcp_review?: boolean | null
          rule_id: string
          severity: string
          timing_note?: string | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agent_a?: string
          agent_b?: string
          blocks_protocol?: boolean | null
          cache_id?: string
          created_at?: string | null
          id?: string
          rationale?: string
          recommendation?: string
          requires_hcp_review?: boolean | null
          rule_id?: string
          severity?: string
          timing_note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_cache_id_fkey"
            columns: ["cache_id"]
            isOneToOne: false
            referencedRelation: "user_interaction_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_delivery_confirmation: boolean
          email_newsletter: boolean
          email_order_updates: boolean
          email_promotions: boolean
          email_protocol_recommendations: boolean
          email_shipping_updates: boolean
          id: string
          push_bio_score_milestones: boolean
          push_order_updates: boolean
          push_protocol_changes: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_delivery_confirmation?: boolean
          email_newsletter?: boolean
          email_order_updates?: boolean
          email_promotions?: boolean
          email_protocol_recommendations?: boolean
          email_shipping_updates?: boolean
          id?: string
          push_bio_score_milestones?: boolean
          push_order_updates?: boolean
          push_protocol_changes?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_delivery_confirmation?: boolean
          email_newsletter?: boolean
          email_order_updates?: boolean
          email_promotions?: boolean
          email_protocol_recommendations?: boolean
          email_shipping_updates?: boolean
          id?: string
          push_bio_score_milestones?: boolean
          push_order_updates?: boolean
          push_protocol_changes?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          link: string | null
          metadata: Json
          portal: string | null
          related_interaction_id: string | null
          severity: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          link?: string | null
          metadata?: Json
          portal?: string | null
          related_interaction_id?: string | null
          severity?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          link?: string | null
          metadata?: Json
          portal?: string | null
          related_interaction_id?: string | null
          severity?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_peptide_prescriptions: {
        Row: {
          ai_reasoning: string | null
          created_at: string | null
          cycle_protocol: string | null
          delivery_form: string | null
          delivery_option_id: string | null
          dosing_protocol: string | null
          ended_at: string | null
          id: string
          peptide_id: string
          started_at: string | null
          status: string | null
          triggering_symptoms: string[] | null
          triggering_variants: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string | null
          cycle_protocol?: string | null
          delivery_form?: string | null
          delivery_option_id?: string | null
          dosing_protocol?: string | null
          ended_at?: string | null
          id?: string
          peptide_id: string
          started_at?: string | null
          status?: string | null
          triggering_symptoms?: string[] | null
          triggering_variants?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string | null
          cycle_protocol?: string | null
          delivery_form?: string | null
          delivery_option_id?: string | null
          dosing_protocol?: string | null
          ended_at?: string | null
          id?: string
          peptide_id?: string
          started_at?: string | null
          status?: string | null
          triggering_symptoms?: string[] | null
          triggering_variants?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_protocols: {
        Row: {
          caq_version: string | null
          confidence_score: number | null
          created_at: string | null
          genex360_included: boolean | null
          id: string
          is_active: boolean | null
          protocol_data: Json
          protocol_name: string | null
          source: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          caq_version?: string | null
          confidence_score?: number | null
          created_at?: string | null
          genex360_included?: boolean | null
          id?: string
          is_active?: boolean | null
          protocol_data?: Json
          protocol_name?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          caq_version?: string | null
          confidence_score?: number | null
          created_at?: string | null
          genex360_included?: boolean | null
          id?: string
          is_active?: boolean | null
          protocol_data?: Json
          protocol_name?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          multiplier: number | null
          streak_start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          multiplier?: number | null
          streak_start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          multiplier?: number | null
          streak_start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_supplements: {
        Row: {
          active_compounds: string[] | null
          added_during: string | null
          ai_confidence: number | null
          allergen_warnings: string[] | null
          brand: string | null
          category: string | null
          created_at: string | null
          delivery_method: string | null
          dosage_amount: number | null
          dosage_unit: string | null
          farmceutica_alternative: Json | null
          frequency: string | null
          id: string
          identified_from: string | null
          ingredient_breakdown: Json | null
          is_active: boolean | null
          other_ingredients: string[] | null
          photo_urls: string[] | null
          product_name: string
          product_url: string | null
          reason_for_taking: string | null
          recommended_daily_intake: string | null
          satisfaction_rating: number | null
          serving_size: string | null
          servings_per_container: number | null
          source: string
          started_date: string | null
          times_per_day: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_compounds?: string[] | null
          added_during?: string | null
          ai_confidence?: number | null
          allergen_warnings?: string[] | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          delivery_method?: string | null
          dosage_amount?: number | null
          dosage_unit?: string | null
          farmceutica_alternative?: Json | null
          frequency?: string | null
          id?: string
          identified_from?: string | null
          ingredient_breakdown?: Json | null
          is_active?: boolean | null
          other_ingredients?: string[] | null
          photo_urls?: string[] | null
          product_name: string
          product_url?: string | null
          reason_for_taking?: string | null
          recommended_daily_intake?: string | null
          satisfaction_rating?: number | null
          serving_size?: string | null
          servings_per_container?: number | null
          source: string
          started_date?: string | null
          times_per_day?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_compounds?: string[] | null
          added_during?: string | null
          ai_confidence?: number | null
          allergen_warnings?: string[] | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          delivery_method?: string | null
          dosage_amount?: number | null
          dosage_unit?: string | null
          farmceutica_alternative?: Json | null
          frequency?: string | null
          id?: string
          identified_from?: string | null
          ingredient_breakdown?: Json | null
          is_active?: boolean | null
          other_ingredients?: string[] | null
          photo_urls?: string[] | null
          product_name?: string
          product_url?: string | null
          reason_for_taking?: string | null
          recommended_daily_intake?: string | null
          satisfaction_rating?: number | null
          serving_size?: string | null
          servings_per_container?: number | null
          source?: string
          started_date?: string | null
          times_per_day?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_tiers: {
        Row: {
          achieved_at: string | null
          id: string
          tier: Database["public"]["Enums"]["tier_level"]
          tokens_toward_next_tier: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["tier_level"]
          tokens_toward_next_tier?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["tier_level"]
          tokens_toward_next_tier?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tiers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_baas: {
        Row: {
          baa_expires_on: string | null
          baa_signed_on: string
          created_at: string
          document_url: string | null
          id: string
          notes: string | null
          scope: string
          updated_at: string
          vendor_name: string
        }
        Insert: {
          baa_expires_on?: string | null
          baa_signed_on: string
          created_at?: string
          document_url?: string | null
          id?: string
          notes?: string | null
          scope: string
          updated_at?: string
          vendor_name: string
        }
        Update: {
          baa_expires_on?: string | null
          baa_signed_on?: string
          created_at?: string
          document_url?: string | null
          id?: string
          notes?: string | null
          scope?: string
          updated_at?: string
          vendor_name?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          benefits: Json
          capacity: number
          created_at: string
          email: string
          id: string
          ip_address: unknown
          position: number
          redeemed_at: string | null
          redeemed_user_id: string | null
          referral_source: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          benefits?: Json
          capacity?: number
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown
          position: number
          redeemed_at?: string | null
          redeemed_user_id?: string | null
          referral_source?: string | null
          status?: string
          user_agent?: string | null
        }
        Update: {
          benefits?: Json
          capacity?: number
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          position?: number
          redeemed_at?: string | null
          redeemed_user_id?: string | null
          referral_source?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      wearable_integrations: {
        Row: {
          connected_at: string | null
          device_name: string | null
          device_type: string
          id: string
          is_active: boolean | null
          last_sync_date: string | null
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          device_name?: string | null
          device_type: string
          id?: string
          is_active?: boolean | null
          last_sync_date?: string | null
          user_id: string
        }
        Update: {
          connected_at?: string | null
          device_name?: string | null
          device_type?: string
          id?: string
          is_active?: boolean | null
          last_sync_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wearable_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_analytics: {
        Row: {
          active_layers: string[] | null
          calculated_at: string | null
          categories: Json
          confidence_pct: number | null
          confidence_tier: string | null
          data_sources_used: string[] | null
          genex360_included: boolean | null
          id: string
          low_category: string | null
          missing_layers: string[] | null
          new_categories_unlocked: string[] | null
          next_calculation_at: string | null
          scoring_version: string | null
          summary: string | null
          top_category: string | null
          trigger: string | null
          unified_scores: Json | null
          user_id: string | null
        }
        Insert: {
          active_layers?: string[] | null
          calculated_at?: string | null
          categories?: Json
          confidence_pct?: number | null
          confidence_tier?: string | null
          data_sources_used?: string[] | null
          genex360_included?: boolean | null
          id?: string
          low_category?: string | null
          missing_layers?: string[] | null
          new_categories_unlocked?: string[] | null
          next_calculation_at?: string | null
          scoring_version?: string | null
          summary?: string | null
          top_category?: string | null
          trigger?: string | null
          unified_scores?: Json | null
          user_id?: string | null
        }
        Update: {
          active_layers?: string[] | null
          calculated_at?: string | null
          categories?: Json
          confidence_pct?: number | null
          confidence_tier?: string | null
          data_sources_used?: string[] | null
          genex360_included?: boolean | null
          id?: string
          low_category?: string | null
          missing_layers?: string[] | null
          new_categories_unlocked?: string[] | null
          next_calculation_at?: string | null
          scoring_version?: string | null
          summary?: string | null
          top_category?: string | null
          trigger?: string | null
          unified_scores?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      wellness_scoring_config: {
        Row: {
          adjustment_rules: Json | null
          base_weight: number
          category: string
          id: string
          layer: string
          updated_at: string | null
        }
        Insert: {
          adjustment_rules?: Json | null
          base_weight: number
          category: string
          id?: string
          layer: string
          updated_at?: string | null
        }
        Update: {
          adjustment_rules?: Json | null
          base_weight?: number
          category?: string
          id?: string
          layer?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whatif_scenarios: {
        Row: {
          annual_net_profit: number
          annual_revenue: number
          created_at: string | null
          description: string | null
          id: string
          impact: string
          margin_change: string
          net_margin_pct: number
          net_profit_change_pct: string
          revenue_change_pct: string
          scenario: string
          sku_count: number
          type: string
        }
        Insert: {
          annual_net_profit: number
          annual_revenue: number
          created_at?: string | null
          description?: string | null
          id?: string
          impact: string
          margin_change: string
          net_margin_pct: number
          net_profit_change_pct: string
          revenue_change_pct: string
          scenario: string
          sku_count: number
          type: string
        }
        Update: {
          annual_net_profit?: number
          annual_revenue?: number
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: string
          margin_change?: string
          net_margin_pct?: number
          net_profit_change_pct?: string
          revenue_change_pct?: string
          scenario?: string
          sku_count?: number
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      practitioner_engagement_summary_mv: {
        Row: {
          avg_engagement_score: number | null
          clients_high_engagement: number | null
          clients_low_engagement: number | null
          clients_medium_engagement: number | null
          clients_very_high_engagement: number | null
          clients_with_score: number | null
          consenting_client_count: number | null
          p50_engagement_score: number | null
          p90_engagement_score: number | null
          practitioner_id: string | null
          refreshed_at: string | null
        }
        Relationships: []
      }
      practitioner_practice_health_mv: {
        Row: {
          avg_bio_optimization_score: number | null
          avg_engagement_score: number | null
          clients_bio_opt_high: number | null
          clients_bio_opt_low: number | null
          clients_bio_opt_mid: number | null
          new_clients_30d: number | null
          new_clients_90d: number | null
          practitioner_id: string | null
          refreshed_at: string | null
          total_active_clients: number | null
        }
        Relationships: []
      }
      practitioner_protocol_effectiveness_mv: {
        Row: {
          active_client_count: number | null
          avg_confidence_score: number | null
          most_recent_assignment: string | null
          practitioner_id: string | null
          protocol_name: string | null
          refreshed_at: string | null
          total_client_count: number | null
        }
        Relationships: []
      }
      product_catalog_enriched: {
        Row: {
          active: boolean | null
          category: string | null
          cogs: number | null
          cogs_ratio: number | null
          composite_score: number | null
          contraindication_tags: string[] | null
          delivery_form: string | null
          dist_margin: number | null
          distributor: number | null
          dtc_margin: number | null
          genetic_tags: string[] | null
          goal_tags: string[] | null
          id: string | null
          image_url: string | null
          lifestyle_tags: string[] | null
          master_sku: string | null
          name: string | null
          price: number | null
          priority_weight: number | null
          rationalization_tier: string | null
          sku: string | null
          symptom_tags: string[] | null
          viable_channels: number | null
          wholesale: number | null
          ws_margin: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_master_sku_fkey"
            columns: ["master_sku"]
            isOneToOne: false
            referencedRelation: "master_skus"
            referencedColumns: ["sku"]
          },
        ]
      }
      security_scan_summary: {
        Row: {
          auto_repaired_count: number | null
          critical_count: number | null
          high_count: number | null
          info_count: number | null
          low_count: number | null
          medium_count: number | null
          open_count: number | null
          pending_review_count: number | null
          scan_id: string | null
          scanned_at: string | null
          total_findings: number | null
        }
        Relationships: []
      }
      v_practitioner_engagement_summary: {
        Row: {
          avg_engagement_score: number | null
          clients_high_engagement: number | null
          clients_low_engagement: number | null
          clients_medium_engagement: number | null
          clients_very_high_engagement: number | null
          clients_with_score: number | null
          consenting_client_count: number | null
          p50_engagement_score: number | null
          p90_engagement_score: number | null
          practitioner_id: string | null
          refreshed_at: string | null
        }
        Relationships: []
      }
      v_practitioner_practice_health: {
        Row: {
          avg_bio_optimization_score: number | null
          avg_engagement_score: number | null
          clients_bio_opt_high: number | null
          clients_bio_opt_low: number | null
          clients_bio_opt_mid: number | null
          new_clients_30d: number | null
          new_clients_90d: number | null
          practitioner_id: string | null
          refreshed_at: string | null
          total_active_clients: number | null
        }
        Relationships: []
      }
      v_practitioner_protocol_effectiveness: {
        Row: {
          active_client_count: number | null
          avg_confidence_score: number | null
          most_recent_assignment: string | null
          practitioner_id: string | null
          protocol_name: string | null
          refreshed_at: string | null
          total_client_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      allocate_vat_invoice_number: {
        Args: { p_sequence_name: string }
        Returns: string
      }
      approve_customs_recordation_ceo: {
        Args: { p_recordation_id: string }
        Returns: string
      }
      bos_sanitize_error_message: { Args: { input: string }; Returns: string }
      bos_telemetry_retention_sweep: {
        Args: never
        Returns: {
          rows_deleted: number
          table_name: string
        }[]
      }
      brand_autocomplete: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          brand_id: string
          brand_name: string
          match_source: string
          product_count: number
          tier: number
          tier_label: string
        }[]
      }
      calculate_map_compliance_scores: {
        Args: never
        Returns: {
          rows_written: number
        }[]
      }
      check_active_vip_exemption: {
        Args: {
          p_observed_at: string
          p_practitioner_id: string
          p_product_id: string
          p_source_url: string
        }
        Returns: boolean
      }
      check_active_waiver_for_observation: {
        Args: {
          p_observed_at: string
          p_practitioner_id: string
          p_product_id: string
          p_source_url: string
        }
        Returns: {
          waived_price_cents: number
          waiver_id: string
        }[]
      }
      check_missing_fk_indexes: {
        Args: never
        Returns: {
          column_name: string
          constraint_name: string
          table_name: string
        }[]
      }
      check_stale_statistics: {
        Args: never
        Returns: {
          last_analyze: string
          row_estimate: number
          table_name: string
        }[]
      }
      check_table_bloat: {
        Args: never
        Returns: {
          dead_ratio: number
          dead_tuples: number
          live_tuples: number
          table_name: string
        }[]
      }
      check_tables_without_rls: {
        Args: never
        Returns: {
          schema_name: string
          table_name: string
        }[]
      }
      check_unused_indexes: {
        Args: never
        Returns: {
          index_name: string
          index_scans: number
          index_size: string
          table_name: string
        }[]
      }
      claim_bos_compute_batch: {
        Args: { p_limit: number }
        Returns: {
          bypass_cooldown: boolean
          enqueued_at: string
          event_id: string | null
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          retry_count: number
          source: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "bos_compute_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_pending_flag_activations: {
        Args: { p_limit?: number }
        Returns: {
          feature_id: string
          id: string
          scheduled_by: string
          scheduled_for: string
          target_action: string
          target_value: Json
        }[]
      }
      claim_pending_proposal_activations: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          initiated_by: string
        }[]
      }
      classify_map_severity: {
        Args: {
          ingredient_floor_cents: number
          map_cents: number
          observed_cents: number
        }
        Returns: string
      }
      compliance_verify_audit_chain: {
        Args: { p_limit?: number }
        Returns: {
          checked_rows: number
          first_bad_row: number
          ok: boolean
        }[]
      }
      compute_bio_optimization_score: {
        Args: {
          p_breakdown: Json
          p_compute_version: string
          p_confidence: number
          p_score: number
          p_source?: string
          p_tier: number
          p_user_id: string
        }
        Returns: string
      }
      create_vip_sensitive_note: {
        Args: { p_plaintext: string; p_vip_exemption_id: string }
        Returns: string
      }
      current_user_jurisdiction: { Args: never; Returns: string }
      delete_scheduler_token: {
        Args: { p_vault_ref: string }
        Returns: undefined
      }
      detect_map_violations: {
        Args: never
        Returns: {
          detected: number
        }[]
      }
      enrichment_queue: {
        Args: { batch_limit?: number }
        Returns: {
          brand_name: string
          priority_score: number
          product_id: string
          product_name: string
          scan_count: number
          tier: number
        }[]
      }
      exec_generate_watermark_token: { Args: never; Returns: string }
      exec_issue_pack: {
        Args: {
          p_ceo_user_id: string
          p_ip_address?: unknown
          p_pack_id: string
          p_typed_confirmation: string
          p_user_agent?: string
        }
        Returns: Json
      }
      find_patient_user_id_by_email: {
        Args: { p_email: string }
        Returns: string
      }
      fuzzy_brand_match: {
        Args: { max_distance?: number; search_term: string }
        Returns: {
          brand_name: string
          distance: number
          id: string
          normalized_name: string
          tier: number
        }[]
      }
      fuzzy_product_match: {
        Args: { brand_id: string; search_term: string }
        Returns: {
          bioavailability_estimate: number
          delivery_method: string
          id: string
          ingredient_breakdown: Json
          is_enriched: boolean
          normalized_product_name: string
          product_name: string
          similarity: number
        }[]
      }
      generate_protocol_invite_code: { Args: never; Returns: string }
      generate_shop_order_number: { Args: never; Returns: string }
      get_active_peptide_stack: {
        Args: { p_user_id: string }
        Returns: {
          confidence_pct: number
          confidence_tier: number
          generated_at: string
          patterns: Json
          patterns_detected: string[]
          protocol_id: string
          recommendations: Json
          stack_narrative: string
          total_peptides: number
        }[]
      }
      get_active_protocol: {
        Args: { p_user_id: string }
        Returns: {
          bio_score_impact: Json
          confidence_pct: number
          confidence_tier: number
          data_sources_used: string[]
          generated_at: string
          high_priority_count: number
          low_priority_count: number
          medium_priority_count: number
          protocol_id: string
          protocol_rationale: string
          recommendations: Json
          total_recommendations: number
          version: number
        }[]
      }
      get_advisor_summary: {
        Args: never
        Returns: {
          category: string
          fixed_today: number
          open_count: number
          severity: string
        }[]
      }
      get_brand_agent_status: {
        Args: never
        Returns: {
          brand_count: number
          pct: number
          status: string
        }[]
      }
      get_latest_completed_caq: {
        Args: { target_user_id: string }
        Returns: {
          allergies: Json
          assessment_id: string
          completed_at: string
          demographics: Json
          emotional_symptoms: Json
          health_concerns: Json
          lifestyle: Json
          medications: Json
          neuro_symptoms: Json
          physical_symptoms: Json
          supplements: Json
          version_number: number
        }[]
      }
      get_my_issued_prescription_clinical_notes: {
        Args: { p_token_id: string }
        Returns: string
      }
      get_recent_fixes: {
        Args: { limit_n?: number }
        Returns: {
          affected_table: string
          applied_at: string
          duration_ms: number
          fix_type: string
          severity: string
          success: boolean
          title: string
        }[]
      }
      get_security_agent_config: { Args: { config_key: string }; Returns: Json }
      global_product_search: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          brand_id: string
          brand_name: string
          delivery_method: string
          product_category: string
          product_id: string
          product_name: string
          tier: number
        }[]
      }
      grant_customs_counsel_session: {
        Args: { p_case_id?: string; p_notes?: string; p_user_id: string }
        Returns: string
      }
      helix_create_redemption: {
        Args: {
          p_order_id?: string
          p_reward_description: string
          p_reward_type: string
          p_tokens_spent: number
          p_user_id: string
        }
        Returns: string
      }
      helix_increment_balance: {
        Args: { p_points: number; p_user_id: string }
        Returns: undefined
      }
      helix_redeem_catalog_item: {
        Args: {
          p_application_context?: Json
          p_catalog_item_id: string
          p_user_id: string
        }
        Returns: string
      }
      increment_brand_retry: {
        Args: { p_brand_id: string }
        Returns: undefined
      }
      increment_promo_redemption: {
        Args: { p_code: string; p_order_id: string }
        Returns: undefined
      }
      is_compliance_reader: { Args: never; Returns: boolean }
      is_financial_admin: { Args: never; Returns: boolean }
      is_hipaa_admin: { Args: never; Returns: boolean }
      is_iso_admin: { Args: never; Returns: boolean }
      is_practitioner_self: {
        Args: { p_practitioner_id: string }
        Returns: boolean
      }
      jeffery_emit_message: {
        Args: {
          p_category: string
          p_detail: Json
          p_proposed_action: Json
          p_severity: string
          p_source_agent: string
          p_source_context: Json
          p_summary: string
          p_title: string
        }
        Returns: string
      }
      jeffery_log_decision: {
        Args: {
          p_decision_type: string
          p_inputs: Json
          p_rationale: string
          p_run_id: string
          p_target_agent: string
        }
        Returns: string
      }
      jeffery_log_evolution: {
        Args: {
          p_agent_name: string
          p_entry_type: string
          p_metric_name: string
          p_metric_value: number
          p_notes: string
          p_payload: Json
          p_population_size: number
          p_rolling_30d_avg: number
        }
        Returns: string
      }
      lookup_protocol_template: {
        Args: { p_pattern_ids: string[]; p_template_type?: string }
        Returns: {
          bio_improvements: string[]
          bio_score_delta: number
          bio_timeline_weeks: number
          match_score: number
          match_type: string
          pattern_key: string
          rationale_template: string
          recommendations: Json
          template_id: string
        }[]
      }
      map_grace_hours: { Args: { severity: string }; Returns: number }
      match_knowledge_chunks: {
        Args: {
          filter_specialty?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      prescription_check_my_eligibility: {
        Args: { p_skus: string[] }
        Returns: {
          expires_at: string
          has_token: boolean
          quantity_remaining: number
          sku: string
          token_id: string
        }[]
      }
      prescription_consume: {
        Args: { p_order_id: string; p_token_id: string }
        Returns: boolean
      }
      prescription_consume_quantity: {
        Args: { p_order_id: string; p_quantity?: number; p_token_id: string }
        Returns: boolean
      }
      prescription_expire_overdue: { Args: never; Returns: number }
      prescription_issue: {
        Args: {
          p_clinical_notes?: string
          p_dosage_instructions?: string
          p_expires_at: string
          p_metadata?: Json
          p_patient_user_id: string
          p_quantity: number
          p_sku: string
        }
        Returns: string
      }
      prescription_revoke: {
        Args: { p_reason: string; p_token_id: string }
        Returns: boolean
      }
      process_expired_map_grace_periods: {
        Args: never
        Returns: {
          escalated: number
        }[]
      }
      process_reconciliation_for_period: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: {
          runs_written: number
        }[]
      }
      product_autocomplete: {
        Args: {
          result_limit?: number
          search_query?: string
          selected_brand_id: string
        }
        Returns: {
          delivery_method: string
          is_enriched: boolean
          product_category: string
          product_id: string
          product_name: string
        }[]
      }
      protocol_share_accept: {
        Args: { p_invite_code: string }
        Returns: {
          accepted_at: string | null
          can_modify_protocol: boolean
          can_order_on_behalf: boolean
          can_recommend_products: boolean
          created_at: string
          expires_at: string | null
          id: string
          invite_code: string
          invite_email: string | null
          metadata: Json
          notes: string | null
          patient_id: string
          provider_id: string | null
          provider_type: string
          revoked_at: string | null
          share_bio_optimization_score: boolean
          share_caq_data: boolean
          share_genetic_results: boolean
          share_lab_results: boolean
          share_peptide_recommendations: boolean
          share_supplements: boolean
          share_wellness_analytics: boolean
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "protocol_shares"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      protocol_share_assert_access: {
        Args: { p_category: string; p_patient_id: string }
        Returns: {
          accepted_at: string | null
          can_modify_protocol: boolean
          can_order_on_behalf: boolean
          can_recommend_products: boolean
          created_at: string
          expires_at: string | null
          id: string
          invite_code: string
          invite_email: string | null
          metadata: Json
          notes: string | null
          patient_id: string
          provider_id: string | null
          provider_type: string
          revoked_at: string | null
          share_bio_optimization_score: boolean
          share_caq_data: boolean
          share_genetic_results: boolean
          share_lab_results: boolean
          share_peptide_recommendations: boolean
          share_supplements: boolean
          share_wellness_analytics: boolean
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "protocol_shares"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      protocol_share_create: {
        Args: {
          p_can_modify_protocol: boolean
          p_can_order_on_behalf: boolean
          p_can_recommend_products: boolean
          p_invite_email: string
          p_notes?: string
          p_provider_type: string
          p_share_bio_optimization_score: boolean
          p_share_caq_data: boolean
          p_share_genetic_results: boolean
          p_share_lab_results: boolean
          p_share_peptide_recommendations: boolean
          p_share_supplements: boolean
          p_share_wellness_analytics: boolean
        }
        Returns: {
          accepted_at: string | null
          can_modify_protocol: boolean
          can_order_on_behalf: boolean
          can_recommend_products: boolean
          created_at: string
          expires_at: string | null
          id: string
          invite_code: string
          invite_email: string | null
          metadata: Json
          notes: string | null
          patient_id: string
          provider_id: string | null
          provider_type: string
          revoked_at: string | null
          share_bio_optimization_score: boolean
          share_caq_data: boolean
          share_genetic_results: boolean
          share_lab_results: boolean
          share_peptide_recommendations: boolean
          share_supplements: boolean
          share_wellness_analytics: boolean
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "protocol_shares"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      protocol_share_revoke: {
        Args: { p_share_id: string }
        Returns: {
          accepted_at: string | null
          can_modify_protocol: boolean
          can_order_on_behalf: boolean
          can_recommend_products: boolean
          created_at: string
          expires_at: string | null
          id: string
          invite_code: string
          invite_email: string | null
          metadata: Json
          notes: string | null
          patient_id: string
          provider_id: string | null
          provider_type: string
          revoked_at: string | null
          share_bio_optimization_score: boolean
          share_caq_data: boolean
          share_genetic_results: boolean
          share_lab_results: boolean
          share_peptide_recommendations: boolean
          share_supplements: boolean
          share_wellness_analytics: boolean
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "protocol_shares"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      provider_get_patient_bio_score: {
        Args: { p_patient_id: string }
        Returns: {
          bio_optimization_opportunities: string[]
          bio_optimization_score: number
          bio_optimization_strengths: string[]
          bio_optimization_tier: string
          caq_completed_at: string
        }[]
      }
      provider_get_patient_caq: {
        Args: { p_patient_id: string }
        Returns: {
          allergies: Json
          completed_at: string
          demographics: Json
          emotional_symptoms: Json
          health_concerns: Json
          lifestyle: Json
          medications: Json
          neuro_symptoms: Json
          physical_symptoms: Json
          status: string
          supplements: Json
          version_number: number
        }[]
      }
      provider_get_patient_genetics: {
        Args: { p_patient_id: string }
        Returns: {
          additional_genes: Json
          comt_status: string
          created_at: string
          cyp2d6_status: string
          mthfr_status: string
          report_date: string
          source_lab: string
        }[]
      }
      provider_get_patient_peptide_recommendations: {
        Args: { p_patient_id: string }
        Returns: {
          created_at: string
          cycle_off_weeks: number
          cycle_on_weeks: number
          delivery_form: string
          dosage: string
          evidence_level: string
          frequency: string
          is_accepted: boolean
          peptide_name: string
          priority: string
          rank: number
          rationale: string
          requires_supervision: boolean
        }[]
      }
      provider_get_patient_supplements: {
        Args: { p_patient_id: string }
        Returns: {
          added_at: string
          brand: string
          category: string
          dosage: string
          dosage_form: string
          frequency: string
          is_current: boolean
          product_name: string
          supplement_name: string
        }[]
      }
      provider_get_patient_wellness_analytics: {
        Args: { p_patient_id: string }
        Returns: {
          calculated_at: string
          categories: Json
          data_sources_used: string[]
          genex360_included: boolean
          summary: string
        }[]
      }
      provider_list_shared_patients: {
        Args: never
        Returns: {
          accepted_at: string
          bio_optimization_score: number
          can_modify: boolean
          can_order: boolean
          can_recommend: boolean
          constitutional_type: string
          email: string
          full_name: string
          patient_id: string
          share_bio_score: boolean
          share_caq: boolean
          share_genetics: boolean
          share_id: string
          share_labs: boolean
          share_peptides: boolean
          share_supplements: boolean
          share_wellness: boolean
        }[]
      }
      read_scheduler_token: {
        Args: { p_purpose: string; p_vault_ref: string }
        Returns: Json
      }
      read_vault_pii: {
        Args: { p_field: string; p_purpose: string; p_vault_ref: string }
        Returns: Json
      }
      refresh_customs_activity_flags: { Args: never; Returns: number }
      refresh_practitioner_analytics_phase_2a: {
        Args: never
        Returns: undefined
      }
      revoke_expired_customs_counsel_sessions: { Args: never; Returns: number }
      search_peptides: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          category_id: number
          category_name: string
          evidence_level: string
          genex_panel: string
          genex_synergy_description: string
          is_farmceutica: boolean
          is_investigational: boolean
          match_score: number
          peptide_id: string
          product_name: string
          product_number: number
        }[]
      }
      search_supplement_products: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          aliases: string[]
          brand_name: string
          id: string
          product_category: string
          product_name: string
          score: number
          source: string
          source_id: string
        }[]
      }
      search_supplement_products_brand_prioritized: {
        Args: {
          preferred_brand?: string
          result_limit?: number
          search_query: string
        }
        Returns: {
          aliases: string[]
          brand_name: string
          id: string
          product_category: string
          product_name: string
          score: number
          source: string
          source_id: string
        }[]
      }
      search_supplements: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          brand_id: string
          brand_name: string
          ingredient_breakdown: Json
          is_enriched: boolean
          match_score: number
          product_category: string
          product_id: string
          product_name: string
          result_type: string
        }[]
      }
      search_supplements_v2: {
        Args: {
          brand_filter?: string
          query_text: string
          result_limit?: number
        }
        Returns: {
          brand_id: string
          brand_name: string
          category: string
          delivery_method: string
          id: string
          image_url: string
          is_enriched: boolean
          name: string
          rank: number
          result_type: string
          similarity_score: number
        }[]
      }
      shop_cart_add_item: {
        Args: {
          p_delivery_form: string
          p_metadata: Json
          p_product_name: string
          p_product_slug: string
          p_product_type: string
          p_quantity: number
          p_unit_price_cents: number
        }
        Returns: {
          created_at: string
          delivery_form: string | null
          id: string
          metadata: Json
          product_name: string
          product_slug: string
          product_type: string
          quantity: number
          unit_price_cents: number | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "shop_cart_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      shop_create_order_with_items: {
        Args: {
          p_discount_code?: string
          p_items: Json
          p_portal_type?: string
          p_shipping: Json
          p_totals: Json
        }
        Returns: {
          cancellation_reason: string | null
          cancelled_at: string | null
          carrier: string | null
          created_at: string
          delivered_at: string | null
          discount_cents: number
          discount_code: string | null
          estimated_delivery_date: string | null
          id: string
          metadata: Json
          notes: string | null
          order_number: string
          portal_type: string
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_cents: number
          shipping_city: string | null
          shipping_country: string | null
          shipping_email: string | null
          shipping_first_name: string | null
          shipping_last_name: string | null
          shipping_phone: string | null
          shipping_state: string | null
          shipping_zip: string | null
          status: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "shop_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      soc2_has_auditor_access: {
        Args: { p_packet_id: string }
        Returns: boolean
      }
      store_scheduler_token: {
        Args: { p_bundle: Json; p_purpose: string }
        Returns: Json
      }
      ultrathink_agent_health_sweep: {
        Args: never
        Returns: {
          out_agent_name: string
          out_new_status: string
        }[]
      }
      ultrathink_agent_heartbeat: {
        Args: {
          p_agent_name: string
          p_event_type: string
          p_payload: Json
          p_run_id: string
          p_severity: string
        }
        Returns: undefined
      }
      ultrathink_record_sync: {
        Args: {
          p_action: string
          p_added: number
          p_cost: number
          p_duration: number
          p_err_msg: string
          p_error: number
          p_in: number
          p_metadata: Json
          p_run_id: string
          p_skipped: number
          p_source: string
          p_status: string
        }
        Returns: undefined
      }
      ultrathink_today_spend: { Args: never; Returns: number }
      validate_promo_code: {
        Args: { p_code: string; p_subtotal_cents: number }
        Returns: {
          error: string
          kind: string
          normalized_code: string
          ok: boolean
          value: number
        }[]
      }
      vault_read: { Args: { p_ref: string }; Returns: string }
      waitlist_join: {
        Args: {
          p_email: string
          p_referral_source?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      waitlist_stats: { Args: never; Returns: Json }
    }
    Enums: {
      aggregation_period_type:
        | "monthly"
        | "quarterly"
        | "annual"
        | "trailing_12_months"
        | "ytd"
        | "ad_hoc"
      aggregation_snapshot_state:
        | "draft"
        | "computing"
        | "computed"
        | "cfo_review"
        | "cfo_approved"
        | "locked"
        | "failed"
      alert_severity: "INFO" | "WARNING" | "ALERT" | "CRITICAL"
      board_member_role:
        | "director"
        | "advisor"
        | "observer"
        | "executive"
        | "auditor"
      channel_state:
        | "pending_verification"
        | "verified"
        | "verification_lapsed"
        | "verification_failed"
        | "volume_flagged"
        | "suspended"
      channel_type:
        | "own_website"
        | "amazon_storefront"
        | "etsy_shop"
        | "shopify_store"
        | "tiktok_shop"
        | "physical_clinic_pos"
        | "wholesale_partner_storefront"
        | "pop_up_event"
      counsel_engagement_status:
        | "proposed"
        | "pending_cfo_approval"
        | "pending_ceo_approval"
        | "approved"
        | "active"
        | "completed"
        | "withdrawn"
        | "rejected"
      counterparty_type:
        | "individual"
        | "sole_proprietor"
        | "llc"
        | "corp"
        | "foreign_entity"
        | "unknown"
      currency_code: "USD" | "EUR" | "GBP" | "AUD"
      customs_case_activity_type:
        | "customs_detention"
        | "customs_seizure"
        | "iprs_unauthorized"
        | "e_allegation"
        | "moiety_claim"
      customs_counsel_review_kind:
        | "authentication_determination"
        | "e_allegation"
        | "recordation"
        | "authentication_guide"
        | "moiety_claim"
        | "training_deck"
      customs_counsel_review_status:
        | "pending"
        | "approved"
        | "rejected"
        | "changes_requested"
      customs_detention_status:
        | "notice_received"
        | "response_required"
        | "importer_responded"
        | "rightsholder_assist"
        | "sample_provided"
        | "closed_released"
        | "escalated_seizure"
      customs_determination:
        | "authentic"
        | "not_authentic"
        | "unable_to_determine"
      customs_e_allegation_posture: "named" | "anonymous"
      customs_e_allegation_status:
        | "draft"
        | "counsel_review"
        | "submitted"
        | "acknowledged"
        | "closed"
      customs_fee_type: "recordation_initial" | "recordation_renewal" | "other"
      customs_guide_section_type:
        | "brand_intro"
        | "mark_specimen"
        | "genuine_characteristics"
        | "packaging_features"
        | "authorized_distribution"
        | "known_variants"
        | "contact_points"
      customs_guide_status:
        | "draft"
        | "counsel_review"
        | "submitted_to_cbp"
        | "acknowledged"
        | "retired"
      customs_iprs_result_status:
        | "new"
        | "requires_review"
        | "confirmed_unauthorized"
        | "confirmed_authorized"
        | "dismissed"
        | "case_opened"
      customs_moiety_claim_status:
        | "forecast"
        | "filed"
        | "awarded"
        | "denied"
        | "withdrawn"
      customs_recordation_status:
        | "draft"
        | "pending_fee"
        | "under_review"
        | "active"
        | "grace_period"
        | "expired"
        | "withdrawn"
      customs_recordation_type: "trademark" | "copyright"
      customs_seizure_status:
        | "seized"
        | "forfeiture_initiated"
        | "awaiting_disclosure"
        | "disclosure_received"
        | "destroyed"
        | "donated"
        | "mark_obliterated"
        | "released_unusual"
      customs_training_format:
        | "in_person"
        | "virtual_webinar"
        | "recorded_module"
      customs_training_status:
        | "requested"
        | "vetting"
        | "scheduled"
        | "delivered"
        | "declined"
      enforcement_action_status:
        | "draft"
        | "pending_approval"
        | "approved_awaiting_send"
        | "sent"
        | "acknowledged"
        | "response_received"
        | "complied"
        | "disputed"
        | "counter_notice_received"
        | "escalated"
        | "withdrawn"
      enforcement_action_type:
        | "cease_and_desist_letter"
        | "dmca_takedown"
        | "marketplace_ip_complaint"
        | "marketplace_tos_complaint"
        | "refusal_to_sell"
        | "wholesale_account_suspension"
        | "customs_referral"
        | "information_request"
        | "follow_up"
      evidence_artifact_type:
        | "page_screenshot"
        | "html_snapshot"
        | "pricing_capture"
        | "whois_lookup"
        | "marketplace_seller_profile"
        | "trademark_usage_capture"
        | "test_purchase_receipt"
        | "product_photograph"
        | "lab_report"
        | "customer_complaint"
        | "platform_decision_doc"
        | "counterparty_correspondence"
        | "other"
      form_type:
        | "TINCTURE"
        | "ENCAPSULATION"
        | "POWDER"
        | "TEA"
        | "TOPICAL"
        | "OTHER"
      legal_case_bucket:
        | "unclassified"
        | "map_only"
        | "gray_market_no_differences"
        | "gray_market_material_differences"
        | "counterfeit"
      legal_case_priority: "p1_critical" | "p2_high" | "p3_normal" | "p4_low"
      legal_case_state:
        | "intake"
        | "triage_ai"
        | "pending_human_triage"
        | "pending_medical_director_review"
        | "classified"
        | "active_enforcement"
        | "resolved_successful"
        | "resolved_unsuccessful"
        | "escalated_to_outside_counsel"
        | "escalated_to_litigation"
        | "closed_no_action"
        | "archived"
      map_vip_exemption_reason:
        | "long_term_patient"
        | "immediate_family"
        | "documented_financial_hardship"
        | "returning_chronic_illness_subscription"
        | "clinical_trial_compassionate_use"
        | "other_documented"
      map_vip_exemption_status:
        | "pending_approval"
        | "active"
        | "expired_auto"
        | "revoked"
        | "rejected"
      map_waiver_status:
        | "draft"
        | "pending_approval"
        | "info_requested"
        | "active"
        | "expired"
        | "revoked"
        | "rejected"
      map_waiver_type:
        | "seasonal_promotion"
        | "charity_event"
        | "clinic_in_person_only"
        | "clinical_study_recruitment"
        | "new_patient_onboarding"
      market_code: "US" | "EU" | "UK" | "AU"
      nda_status:
        | "not_submitted"
        | "submitted"
        | "under_review"
        | "on_file"
        | "expired"
      notification_channel: "sms" | "slack" | "push" | "email" | "in_app"
      notification_priority: "urgent" | "high" | "normal" | "low"
      pack_state:
        | "draft"
        | "mdna_pending"
        | "mdna_drafted"
        | "cfo_review"
        | "cfo_approved"
        | "pending_ceo_approval"
        | "issued"
        | "erratum_issued"
        | "archived"
      payout_method_status:
        | "pending_setup"
        | "verified"
        | "failed_verification"
        | "revoked"
      payout_rail:
        | "stripe_connect_ach"
        | "paypal"
        | "domestic_wire_us"
        | "international_wire"
      photo_scope: "in_scope" | "out_of_scope"
      pricing_status:
        | "draft"
        | "pending_governance"
        | "pending_approval"
        | "active"
        | "rejected"
        | "superseded"
      privileged_comms_direction: "inbound" | "outbound" | "internal"
      protocol_status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
      shop_finding_resolution:
        | "pending_review"
        | "approved_to_insert"
        | "approved_to_retire"
        | "approved_to_correct"
        | "rejected"
      shop_finding_type:
        | "missing_in_catalog"
        | "catalog_not_in_canonical"
        | "mismatched_name"
        | "mismatched_category"
        | "mismatched_price"
      task_type: "SUPPLEMENT" | "EXERCISE" | "MEAL_LOG" | "LAB_TEST" | "CUSTOM"
      tax_form_type: "w9" | "w8ben" | "w8bene" | "t4a_registration"
      tax_info_status:
        | "not_submitted"
        | "submitted"
        | "under_review"
        | "on_file"
        | "rejected_re_upload_required"
      tax_registration_status: "pending" | "active" | "suspended" | "retired"
      template_status: "draft" | "active" | "retired"
      tier_level: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM"
      transaction_type: "EARN" | "REDEEM" | "BONUS" | "ADJUSTMENT"
      vat_invoice_status: "draft" | "issued" | "void" | "superseded"
      verification_method:
        | "domain_meta_tag"
        | "dns_txt_record"
        | "marketplace_oauth"
        | "manual_document_upload"
        | "email_from_domain"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      aggregation_period_type: [
        "monthly",
        "quarterly",
        "annual",
        "trailing_12_months",
        "ytd",
        "ad_hoc",
      ],
      aggregation_snapshot_state: [
        "draft",
        "computing",
        "computed",
        "cfo_review",
        "cfo_approved",
        "locked",
        "failed",
      ],
      alert_severity: ["INFO", "WARNING", "ALERT", "CRITICAL"],
      board_member_role: [
        "director",
        "advisor",
        "observer",
        "executive",
        "auditor",
      ],
      channel_state: [
        "pending_verification",
        "verified",
        "verification_lapsed",
        "verification_failed",
        "volume_flagged",
        "suspended",
      ],
      channel_type: [
        "own_website",
        "amazon_storefront",
        "etsy_shop",
        "shopify_store",
        "tiktok_shop",
        "physical_clinic_pos",
        "wholesale_partner_storefront",
        "pop_up_event",
      ],
      counsel_engagement_status: [
        "proposed",
        "pending_cfo_approval",
        "pending_ceo_approval",
        "approved",
        "active",
        "completed",
        "withdrawn",
        "rejected",
      ],
      counterparty_type: [
        "individual",
        "sole_proprietor",
        "llc",
        "corp",
        "foreign_entity",
        "unknown",
      ],
      currency_code: ["USD", "EUR", "GBP", "AUD"],
      customs_case_activity_type: [
        "customs_detention",
        "customs_seizure",
        "iprs_unauthorized",
        "e_allegation",
        "moiety_claim",
      ],
      customs_counsel_review_kind: [
        "authentication_determination",
        "e_allegation",
        "recordation",
        "authentication_guide",
        "moiety_claim",
        "training_deck",
      ],
      customs_counsel_review_status: [
        "pending",
        "approved",
        "rejected",
        "changes_requested",
      ],
      customs_detention_status: [
        "notice_received",
        "response_required",
        "importer_responded",
        "rightsholder_assist",
        "sample_provided",
        "closed_released",
        "escalated_seizure",
      ],
      customs_determination: [
        "authentic",
        "not_authentic",
        "unable_to_determine",
      ],
      customs_e_allegation_posture: ["named", "anonymous"],
      customs_e_allegation_status: [
        "draft",
        "counsel_review",
        "submitted",
        "acknowledged",
        "closed",
      ],
      customs_fee_type: ["recordation_initial", "recordation_renewal", "other"],
      customs_guide_section_type: [
        "brand_intro",
        "mark_specimen",
        "genuine_characteristics",
        "packaging_features",
        "authorized_distribution",
        "known_variants",
        "contact_points",
      ],
      customs_guide_status: [
        "draft",
        "counsel_review",
        "submitted_to_cbp",
        "acknowledged",
        "retired",
      ],
      customs_iprs_result_status: [
        "new",
        "requires_review",
        "confirmed_unauthorized",
        "confirmed_authorized",
        "dismissed",
        "case_opened",
      ],
      customs_moiety_claim_status: [
        "forecast",
        "filed",
        "awarded",
        "denied",
        "withdrawn",
      ],
      customs_recordation_status: [
        "draft",
        "pending_fee",
        "under_review",
        "active",
        "grace_period",
        "expired",
        "withdrawn",
      ],
      customs_recordation_type: ["trademark", "copyright"],
      customs_seizure_status: [
        "seized",
        "forfeiture_initiated",
        "awaiting_disclosure",
        "disclosure_received",
        "destroyed",
        "donated",
        "mark_obliterated",
        "released_unusual",
      ],
      customs_training_format: [
        "in_person",
        "virtual_webinar",
        "recorded_module",
      ],
      customs_training_status: [
        "requested",
        "vetting",
        "scheduled",
        "delivered",
        "declined",
      ],
      enforcement_action_status: [
        "draft",
        "pending_approval",
        "approved_awaiting_send",
        "sent",
        "acknowledged",
        "response_received",
        "complied",
        "disputed",
        "counter_notice_received",
        "escalated",
        "withdrawn",
      ],
      enforcement_action_type: [
        "cease_and_desist_letter",
        "dmca_takedown",
        "marketplace_ip_complaint",
        "marketplace_tos_complaint",
        "refusal_to_sell",
        "wholesale_account_suspension",
        "customs_referral",
        "information_request",
        "follow_up",
      ],
      evidence_artifact_type: [
        "page_screenshot",
        "html_snapshot",
        "pricing_capture",
        "whois_lookup",
        "marketplace_seller_profile",
        "trademark_usage_capture",
        "test_purchase_receipt",
        "product_photograph",
        "lab_report",
        "customer_complaint",
        "platform_decision_doc",
        "counterparty_correspondence",
        "other",
      ],
      form_type: [
        "TINCTURE",
        "ENCAPSULATION",
        "POWDER",
        "TEA",
        "TOPICAL",
        "OTHER",
      ],
      legal_case_bucket: [
        "unclassified",
        "map_only",
        "gray_market_no_differences",
        "gray_market_material_differences",
        "counterfeit",
      ],
      legal_case_priority: ["p1_critical", "p2_high", "p3_normal", "p4_low"],
      legal_case_state: [
        "intake",
        "triage_ai",
        "pending_human_triage",
        "pending_medical_director_review",
        "classified",
        "active_enforcement",
        "resolved_successful",
        "resolved_unsuccessful",
        "escalated_to_outside_counsel",
        "escalated_to_litigation",
        "closed_no_action",
        "archived",
      ],
      map_vip_exemption_reason: [
        "long_term_patient",
        "immediate_family",
        "documented_financial_hardship",
        "returning_chronic_illness_subscription",
        "clinical_trial_compassionate_use",
        "other_documented",
      ],
      map_vip_exemption_status: [
        "pending_approval",
        "active",
        "expired_auto",
        "revoked",
        "rejected",
      ],
      map_waiver_status: [
        "draft",
        "pending_approval",
        "info_requested",
        "active",
        "expired",
        "revoked",
        "rejected",
      ],
      map_waiver_type: [
        "seasonal_promotion",
        "charity_event",
        "clinic_in_person_only",
        "clinical_study_recruitment",
        "new_patient_onboarding",
      ],
      market_code: ["US", "EU", "UK", "AU"],
      nda_status: [
        "not_submitted",
        "submitted",
        "under_review",
        "on_file",
        "expired",
      ],
      notification_channel: ["sms", "slack", "push", "email", "in_app"],
      notification_priority: ["urgent", "high", "normal", "low"],
      pack_state: [
        "draft",
        "mdna_pending",
        "mdna_drafted",
        "cfo_review",
        "cfo_approved",
        "pending_ceo_approval",
        "issued",
        "erratum_issued",
        "archived",
      ],
      payout_method_status: [
        "pending_setup",
        "verified",
        "failed_verification",
        "revoked",
      ],
      payout_rail: [
        "stripe_connect_ach",
        "paypal",
        "domestic_wire_us",
        "international_wire",
      ],
      photo_scope: ["in_scope", "out_of_scope"],
      pricing_status: [
        "draft",
        "pending_governance",
        "pending_approval",
        "active",
        "rejected",
        "superseded",
      ],
      privileged_comms_direction: ["inbound", "outbound", "internal"],
      protocol_status: ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"],
      shop_finding_resolution: [
        "pending_review",
        "approved_to_insert",
        "approved_to_retire",
        "approved_to_correct",
        "rejected",
      ],
      shop_finding_type: [
        "missing_in_catalog",
        "catalog_not_in_canonical",
        "mismatched_name",
        "mismatched_category",
        "mismatched_price",
      ],
      task_type: ["SUPPLEMENT", "EXERCISE", "MEAL_LOG", "LAB_TEST", "CUSTOM"],
      tax_form_type: ["w9", "w8ben", "w8bene", "t4a_registration"],
      tax_info_status: [
        "not_submitted",
        "submitted",
        "under_review",
        "on_file",
        "rejected_re_upload_required",
      ],
      tax_registration_status: ["pending", "active", "suspended", "retired"],
      template_status: ["draft", "active", "retired"],
      tier_level: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
      transaction_type: ["EARN", "REDEEM", "BONUS", "ADJUSTMENT"],
      vat_invoice_status: ["draft", "issued", "void", "superseded"],
      verification_method: [
        "domain_meta_tag",
        "dns_txt_record",
        "marketplace_oauth",
        "manual_document_upload",
        "email_from_domain",
      ],
    },
  },
} as const

// ---------------------------------------------------------------------------
// Legacy hand-rolled exports.
//
// These lived at the bottom of the hand-rolled types.ts before it was
// regenerated via `supabase gen types typescript --linked` in commit a47e80d.
// Re-appending them here because the regenerate wiped them, and (app)/layout.tsx
// + auth-store.ts import mapDatabaseRoleToUserRole at runtime; when the
// function is undefined the SSR layout throws and produces the Next.js
// production fallback "Application error: a server-side exception has occurred".
//
// Each subsequent `supabase gen types typescript --linked` run must preserve
// this block. If you re-run the generator, re-append this section by hand.
// ---------------------------------------------------------------------------

export type DatabaseRole = "patient" | "practitioner" | "admin" | "naturopath"
export type UserRole = "consumer" | "practitioner" | "naturopath" | "admin"

export function mapDatabaseRoleToUserRole(dbRole: DatabaseRole | string): UserRole {
  switch (dbRole) {
    case "patient": return "consumer"
    case "practitioner": return "practitioner"
    case "naturopath": return "naturopath"
    case "admin": return "admin"
    default: return "consumer"
  }
}

// Legacy type aliases from the pre-regen types.ts. Kept as `any` because
// they were `any` before; the TypeScript callers narrow via their own
// guards. Do not tighten these without auditing every import site.
export type Profile = any
export type Product = any
export type SupplementLog = any
export type GeneticVariant = any
export type Conversation = any
export type Message = any
export type Achievement = any
export type UserAchievement = any
export type Subscription = any
export type AssessmentResult = any
