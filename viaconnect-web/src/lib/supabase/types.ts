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
      bio_optimization_history: {
        Row: {
          breakdown: Json | null
          created_at: string | null
          date: string
          id: string
          score: number
          source: string | null
          user_id: string | null
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          score: number
          source?: string | null
          user_id?: string | null
        }
        Update: {
          breakdown?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          score?: number
          source?: string | null
          user_id?: string | null
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
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
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
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          name: string
          price: number
          short_name: string
          sku: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name: string
          price?: number
          short_name: string
          sku: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          short_name?: string
          sku?: string
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
    }
    Functions: {
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
      is_financial_admin: { Args: never; Returns: boolean }
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
      alert_severity: "INFO" | "WARNING" | "ALERT" | "CRITICAL"
      form_type:
        | "TINCTURE"
        | "ENCAPSULATION"
        | "POWDER"
        | "TEA"
        | "TOPICAL"
        | "OTHER"
      protocol_status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
      task_type: "SUPPLEMENT" | "EXERCISE" | "MEAL_LOG" | "LAB_TEST" | "CUSTOM"
      tier_level: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM"
      transaction_type: "EARN" | "REDEEM" | "BONUS" | "ADJUSTMENT"
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
      alert_severity: ["INFO", "WARNING", "ALERT", "CRITICAL"],
      form_type: [
        "TINCTURE",
        "ENCAPSULATION",
        "POWDER",
        "TEA",
        "TOPICAL",
        "OTHER",
      ],
      protocol_status: ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"],
      task_type: ["SUPPLEMENT", "EXERCISE", "MEAL_LOG", "LAB_TEST", "CUSTOM"],
      tier_level: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
      transaction_type: ["EARN", "REDEEM", "BONUS", "ADJUSTMENT"],
    },
  },
} as const

// ════════════════════════════════════════════════════════════════════════
//  LEGACY ALIASES — manually maintained
//  DO NOT REMOVE WHEN REGENERATING WITH `supabase gen types`.
//  Re-add this block (or copy from git history) after every regen.
//  These re-export Row types and helper enums that older code paths
//  still import directly from "@/lib/supabase/types".
//  Tables that no longer exist in the live schema are aliased to `any`
//  so calling code keeps compiling; runtime behavior is unchanged.
// ════════════════════════════════════════════════════════════════════════

// Existing tables — proper Database row extracts
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type AssessmentResult = Database["public"]["Tables"]["assessment_results"]["Row"]
export type GeneticProfile = Database["public"]["Tables"]["genetic_profiles"]["Row"]
export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
export type Product = Database["public"]["Tables"]["products"]["Row"]
export type UserProtocol = Database["public"]["Tables"]["user_protocols"]["Row"]
export type TokenTransaction = Database["public"]["Tables"]["token_transactions"]["Row"]
export type Order = Database["public"]["Tables"]["orders"]["Row"]
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"]

// Tables removed from the live schema — typed as any so legacy callers
// keep compiling. Drop these aliases when the code paths are migrated.
export type SupplementLog = any
export type GeneticVariant = any
export type Conversation = any
export type Message = any
export type Achievement = any
export type UserAchievement = any
export type Subscription = any

// Role helpers (originally lived in the hand-rolled types.ts)
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
