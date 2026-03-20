// Auto-aligned with Supabase project nnhkcufyqjojdbvdrpky
// Existing tables (19) + new tables added by migration

export interface Database {
  public: {
    Tables: {
      // ── EXISTING TABLES (match live DB exactly) ──────────────────────

      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: 'patient' | 'practitioner' | 'admin';
          onboarding_completed: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'patient' | 'practitioner' | 'admin';
          onboarding_completed?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'patient' | 'practitioner' | 'admin';
          onboarding_completed?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      genetic_profiles: {
        Row: {
          id: string;
          user_id: string;
          cyp2d6_status: string | null;
          mthfr_status: string | null;
          comt_status: string | null;
          additional_genes: Record<string, unknown> | null;
          source_lab: string | null;
          report_date: string | null;
          created_at: string | null;
        };
        Insert: {
          user_id: string;
          cyp2d6_status?: string | null;
          mthfr_status?: string | null;
          comt_status?: string | null;
          additional_genes?: Record<string, unknown> | null;
          source_lab?: string | null;
          report_date?: string | null;
        };
        Update: {
          user_id?: string;
          cyp2d6_status?: string | null;
          mthfr_status?: string | null;
          comt_status?: string | null;
          additional_genes?: Record<string, unknown> | null;
          source_lab?: string | null;
          report_date?: string | null;
        };
        Relationships: [];
      };

      protocols: {
        Row: {
          id: string;
          user_id: string;
          patient_id: string | null;
          protocol_name: string;
          form: 'TINCTURE' | 'ENCAPSULATION' | 'POWDER' | 'TEA' | 'TOPICAL' | 'OTHER';
          total_volume_ml: number | null;
          dosage_instructions: string | null;
          status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          patient_id?: string | null;
          protocol_name: string;
          form: 'TINCTURE' | 'ENCAPSULATION' | 'POWDER' | 'TEA' | 'TOPICAL' | 'OTHER';
          total_volume_ml?: number | null;
          dosage_instructions?: string | null;
          status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
        };
        Update: {
          user_id?: string;
          patient_id?: string | null;
          protocol_name?: string;
          form?: 'TINCTURE' | 'ENCAPSULATION' | 'POWDER' | 'TEA' | 'TOPICAL' | 'OTHER';
          total_volume_ml?: number | null;
          dosage_instructions?: string | null;
          status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
        };
        Relationships: [];
      };

      protocol_ingredients: {
        Row: {
          id: string;
          protocol_id: string;
          herb_id: string;
          ratio: string | null;
          volume_ml: number | null;
          percentage: number | null;
          sequence_order: number | null;
          added_at: string | null;
        };
        Insert: {
          protocol_id: string;
          herb_id: string;
          ratio?: string | null;
          volume_ml?: number | null;
          percentage?: number | null;
          sequence_order?: number | null;
        };
        Update: {
          protocol_id?: string;
          herb_id?: string;
          ratio?: string | null;
          volume_ml?: number | null;
          percentage?: number | null;
          sequence_order?: number | null;
        };
        Relationships: [];
      };

      herbs: {
        Row: {
          id: string;
          common_name: string;
          scientific_name: string | null;
          category: 'ADAPTOGEN' | 'HEPATIC' | 'NERVINE' | 'TONIC' | 'BITTER' | 'CARMINATIVE' | 'DEMULCENT' | 'OTHER' | null;
          rating: number | null;
          description: string | null;
          typical_ratio: string | null;
          contraindications: string | null;
          created_at: string | null;
        };
        Insert: {
          common_name: string;
          scientific_name?: string | null;
          category?: 'ADAPTOGEN' | 'HEPATIC' | 'NERVINE' | 'TONIC' | 'BITTER' | 'CARMINATIVE' | 'DEMULCENT' | 'OTHER' | null;
          rating?: number | null;
          description?: string | null;
          typical_ratio?: string | null;
          contraindications?: string | null;
        };
        Update: {
          common_name?: string;
          scientific_name?: string | null;
          category?: 'ADAPTOGEN' | 'HEPATIC' | 'NERVINE' | 'TONIC' | 'BITTER' | 'CARMINATIVE' | 'DEMULCENT' | 'OTHER' | null;
          rating?: number | null;
          description?: string | null;
          typical_ratio?: string | null;
          contraindications?: string | null;
        };
        Relationships: [];
      };

      safety_alerts: {
        Row: {
          id: string;
          protocol_id: string;
          herb_id: string | null;
          alert_type: string;
          severity: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
          message: string;
          recommendation: string | null;
          requires_monitoring: boolean | null;
          created_at: string | null;
        };
        Insert: {
          protocol_id: string;
          herb_id?: string | null;
          alert_type: string;
          severity: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
          message: string;
          recommendation?: string | null;
          requires_monitoring?: boolean | null;
        };
        Update: {
          protocol_id?: string;
          herb_id?: string | null;
          alert_type?: string;
          severity?: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
          message?: string;
          recommendation?: string | null;
          requires_monitoring?: boolean | null;
        };
        Relationships: [];
      };

      farma_tokens: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          lifetime_earned: number;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          balance: number;
          lifetime_earned: number;
        };
        Update: {
          user_id?: string;
          balance?: number;
          lifetime_earned?: number;
        };
        Relationships: [];
      };

      token_transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: 'EARN' | 'REDEEM' | 'BONUS' | 'ADJUSTMENT';
          activity_type: string | null;
          token_amount: number;
          balance_after: number;
          description: string | null;
          created_at: string | null;
        };
        Insert: {
          user_id: string;
          transaction_type: 'EARN' | 'REDEEM' | 'BONUS' | 'ADJUSTMENT';
          activity_type?: string | null;
          token_amount: number;
          balance_after: number;
          description?: string | null;
        };
        Update: {
          user_id?: string;
          transaction_type?: 'EARN' | 'REDEEM' | 'BONUS' | 'ADJUSTMENT';
          activity_type?: string | null;
          token_amount?: number;
          balance_after?: number;
          description?: string | null;
        };
        Relationships: [];
      };

      health_metrics: {
        Row: {
          id: string;
          user_id: string;
          metric_date: string;
          sleep_score: number | null;
          hrv_value: number | null;
          hrv_source: string | null;
          steps_count: number | null;
          recovery_state: 'Optimal' | 'Good' | 'Needs Rest' | null;
          last_synced: string | null;
        };
        Insert: {
          user_id: string;
          metric_date: string;
          sleep_score?: number | null;
          hrv_value?: number | null;
          hrv_source?: string | null;
          steps_count?: number | null;
          recovery_state?: 'Optimal' | 'Good' | 'Needs Rest' | null;
          last_synced?: string | null;
        };
        Update: {
          user_id?: string;
          metric_date?: string;
          sleep_score?: number | null;
          hrv_value?: number | null;
          hrv_source?: string | null;
          steps_count?: number | null;
          recovery_state?: 'Optimal' | 'Good' | 'Needs Rest' | null;
          last_synced?: string | null;
        };
        Relationships: [];
      };

      health_scores: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          calculation_version: string | null;
          created_at: string | null;
        };
        Insert: {
          user_id: string;
          score: number;
          calculation_version?: string | null;
        };
        Update: {
          user_id?: string;
          score?: number;
          calculation_version?: string | null;
        };
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          notification_type: string;
          title: string;
          message: string | null;
          read: boolean | null;
          created_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          user_id: string;
          notification_type: string;
          title: string;
          message?: string | null;
          read?: boolean | null;
          expires_at?: string | null;
        };
        Update: {
          user_id?: string;
          notification_type?: string;
          title?: string;
          message?: string | null;
          read?: boolean | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };

      ai_insights: {
        Row: {
          id: string;
          user_id: string;
          insight_text: string;
          insight_type: string | null;
          pubmed_id: string | null;
          research_title: string | null;
          research_summary: string | null;
          research_url: string | null;
          relevance_score: number | null;
          generated_at: string | null;
        };
        Insert: {
          user_id: string;
          insight_text: string;
          insight_type?: string | null;
          pubmed_id?: string | null;
          research_title?: string | null;
          research_summary?: string | null;
          research_url?: string | null;
          relevance_score?: number | null;
        };
        Update: {
          user_id?: string;
          insight_text?: string;
          insight_type?: string | null;
          pubmed_id?: string | null;
          research_title?: string | null;
          research_summary?: string | null;
          research_url?: string | null;
          relevance_score?: number | null;
        };
        Relationships: [];
      };

      clinical_assessments: {
        Row: {
          id: string;
          user_id: string;
          date_of_birth: string | null;
          biological_sex: 'male' | 'female' | 'intersex' | 'prefer_not_to_say' | null;
          height_cm: number | null;
          weight_kg: number | null;
          primary_goals: string[] | null;
          current_conditions: string[] | null;
          current_medications: string | null;
          allergies: string | null;
          sleep_hours_avg: number | null;
          exercise_frequency: 'none' | '1-2_weekly' | '3-4_weekly' | '5+_weekly' | null;
          stress_level: 'low' | 'moderate' | 'high' | 'very_high' | null;
          diet_type: 'omnivore' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean' | 'other' | null;
          current_supplements: string[] | null;
          previous_herbal_experience: boolean | null;
          completed: boolean | null;
          completed_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          date_of_birth?: string | null;
          biological_sex?: 'male' | 'female' | 'intersex' | 'prefer_not_to_say' | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          primary_goals?: string[] | null;
          current_conditions?: string[] | null;
          current_medications?: string | null;
          allergies?: string | null;
          sleep_hours_avg?: number | null;
          exercise_frequency?: 'none' | '1-2_weekly' | '3-4_weekly' | '5+_weekly' | null;
          stress_level?: 'low' | 'moderate' | 'high' | 'very_high' | null;
          diet_type?: 'omnivore' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean' | 'other' | null;
          current_supplements?: string[] | null;
          previous_herbal_experience?: boolean | null;
          completed?: boolean | null;
          completed_at?: string | null;
        };
        Update: {
          user_id?: string;
          date_of_birth?: string | null;
          biological_sex?: 'male' | 'female' | 'intersex' | 'prefer_not_to_say' | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          primary_goals?: string[] | null;
          current_conditions?: string[] | null;
          current_medications?: string | null;
          allergies?: string | null;
          sleep_hours_avg?: number | null;
          exercise_frequency?: 'none' | '1-2_weekly' | '3-4_weekly' | '5+_weekly' | null;
          stress_level?: 'low' | 'moderate' | 'high' | 'very_high' | null;
          diet_type?: 'omnivore' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean' | 'other' | null;
          current_supplements?: string[] | null;
          previous_herbal_experience?: boolean | null;
          completed?: boolean | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };

      daily_tasks: {
        Row: {
          id: string;
          user_id: string;
          protocol_date: string;
          task_type: 'SUPPLEMENT' | 'EXERCISE' | 'MEAL_LOG' | 'LAB_TEST' | 'CUSTOM';
          title: string;
          description: string | null;
          completed: boolean;
          completed_at: string | null;
          created_at: string | null;
        };
        Insert: {
          user_id: string;
          protocol_date: string;
          task_type: 'SUPPLEMENT' | 'EXERCISE' | 'MEAL_LOG' | 'LAB_TEST' | 'CUSTOM';
          title: string;
          description?: string | null;
          completed: boolean;
          completed_at?: string | null;
        };
        Update: {
          user_id?: string;
          protocol_date?: string;
          task_type?: 'SUPPLEMENT' | 'EXERCISE' | 'MEAL_LOG' | 'LAB_TEST' | 'CUSTOM';
          title?: string;
          description?: string | null;
          completed?: boolean;
          completed_at?: string | null;
        };
        Relationships: [];
      };

      user_streaks: {
        Row: {
          id: string;
          user_id: string;
          current_streak: number;
          longest_streak: number;
          multiplier: number | null;
          streak_start_date: string | null;
          last_activity_date: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          multiplier?: number | null;
          streak_start_date?: string | null;
          last_activity_date?: string | null;
        };
        Update: {
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          multiplier?: number | null;
          streak_start_date?: string | null;
          last_activity_date?: string | null;
        };
        Relationships: [];
      };

      user_tiers: {
        Row: {
          id: string;
          user_id: string;
          tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
          tokens_toward_next_tier: number;
          achieved_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
          tokens_toward_next_tier: number;
        };
        Update: {
          user_id?: string;
          tier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
          tokens_toward_next_tier?: number;
        };
        Relationships: [];
      };

      rewards: {
        Row: {
          id: string;
          reward_name: string;
          reward_type: string;
          token_cost: number;
          description: string | null;
          available: boolean | null;
          limit_per_user: number | null;
          created_at: string | null;
        };
        Insert: {
          reward_name: string;
          reward_type: string;
          token_cost: number;
          description?: string | null;
          available?: boolean | null;
          limit_per_user?: number | null;
        };
        Update: {
          reward_name?: string;
          reward_type?: string;
          token_cost?: number;
          description?: string | null;
          available?: boolean | null;
          limit_per_user?: number | null;
        };
        Relationships: [];
      };

      reward_redemptions: {
        Row: {
          id: string;
          user_id: string;
          reward_id: string;
          tokens_spent: number;
          status: 'PENDING' | 'FULFILLED' | 'EXPIRED' | null;
          claimed_at: string | null;
          fulfillment_date: string | null;
        };
        Insert: {
          user_id: string;
          reward_id: string;
          tokens_spent: number;
          status?: 'PENDING' | 'FULFILLED' | 'EXPIRED' | null;
          fulfillment_date?: string | null;
        };
        Update: {
          user_id?: string;
          reward_id?: string;
          tokens_spent?: number;
          status?: 'PENDING' | 'FULFILLED' | 'EXPIRED' | null;
          fulfillment_date?: string | null;
        };
        Relationships: [];
      };

      wearable_integrations: {
        Row: {
          id: string;
          user_id: string;
          device_type: string;
          device_name: string | null;
          last_sync_date: string | null;
          is_active: boolean | null;
          connected_at: string | null;
        };
        Insert: {
          user_id: string;
          device_type: string;
          device_name?: string | null;
          last_sync_date?: string | null;
          is_active?: boolean | null;
        };
        Update: {
          user_id?: string;
          device_type?: string;
          device_name?: string | null;
          last_sync_date?: string | null;
          is_active?: boolean | null;
        };
        Relationships: [];
      };

      // ── NEW TABLES (added by migration) ──────────────────────────────

      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          short_name: string;
          description: string;
          category: 'supplement' | 'test_kit' | 'peptide' | 'cannabis';
          price: number;
          image_url: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          sku: string;
          name: string;
          short_name: string;
          description: string;
          category: 'supplement' | 'test_kit' | 'peptide' | 'cannabis';
          price: number;
          image_url?: string | null;
          active: boolean;
        };
        Update: {
          sku?: string;
          name?: string;
          short_name?: string;
          description?: string;
          category?: 'supplement' | 'test_kit' | 'peptide' | 'cannabis';
          price?: number;
          image_url?: string | null;
          active?: boolean;
        };
        Relationships: [];
      };

      orders: {
        Row: {
          id: string;
          user_id: string;
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
          total: number;
          stripe_payment_id: string | null;
          shipping_address: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
          total: number;
          stripe_payment_id?: string | null;
          shipping_address?: Record<string, unknown> | null;
        };
        Update: {
          user_id?: string;
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
          total?: number;
          stripe_payment_id?: string | null;
          shipping_address?: Record<string, unknown> | null;
        };
        Relationships: [];
      };

      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [];
      };

      memberships: {
        Row: {
          id: string;
          user_id: string;
          tier: 'free' | 'gold' | 'platinum' | 'practitioner';
          stripe_subscription_id: string | null;
          rc_entitlement_id: string | null;
          started_at: string;
          expires_at: string | null;
          status: 'active' | 'cancelled' | 'expired';
        };
        Insert: {
          user_id: string;
          tier: 'free' | 'gold' | 'platinum' | 'practitioner';
          stripe_subscription_id?: string | null;
          rc_entitlement_id?: string | null;
          started_at: string;
          expires_at?: string | null;
          status: 'active' | 'cancelled' | 'expired';
        };
        Update: {
          user_id?: string;
          tier?: 'free' | 'gold' | 'platinum' | 'practitioner';
          stripe_subscription_id?: string | null;
          rc_entitlement_id?: string | null;
          started_at?: string;
          expires_at?: string | null;
          status?: 'active' | 'cancelled' | 'expired';
        };
        Relationships: [];
      };

      kit_registrations: {
        Row: {
          id: string;
          user_id: string;
          kit_barcode: string;
          panel_type: string;
          status: 'registered' | 'shipped_to_lab' | 'received' | 'processing' | 'completed';
          registered_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          kit_barcode: string;
          panel_type: string;
          status: 'registered' | 'shipped_to_lab' | 'received' | 'processing' | 'completed';
        };
        Update: {
          user_id?: string;
          kit_barcode?: string;
          panel_type?: string;
          status?: 'registered' | 'shipped_to_lab' | 'received' | 'processing' | 'completed';
        };
        Relationships: [];
      };

      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string;
          record_id: string;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          action: string;
          table_name: string;
          record_id: string;
          old_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
        };
        Update: {
          user_id?: string | null;
          action?: string;
          table_name?: string;
          record_id?: string;
          old_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      alert_severity: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
      transaction_type: 'EARN' | 'REDEEM' | 'BONUS' | 'ADJUSTMENT';
      form_type: 'TINCTURE' | 'ENCAPSULATION' | 'POWDER' | 'TEA' | 'TOPICAL' | 'OTHER';
      protocol_status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
      task_type: 'SUPPLEMENT' | 'EXERCISE' | 'MEAL_LOG' | 'LAB_TEST' | 'CUSTOM';
      tier_level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    };
  };
}

// Convenience type aliases — existing tables
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type GeneticProfile = Database['public']['Tables']['genetic_profiles']['Row'];
export type Protocol = Database['public']['Tables']['protocols']['Row'];
export type ProtocolIngredient = Database['public']['Tables']['protocol_ingredients']['Row'];
export type Herb = Database['public']['Tables']['herbs']['Row'];
export type SafetyAlert = Database['public']['Tables']['safety_alerts']['Row'];
export type FarmaToken = Database['public']['Tables']['farma_tokens']['Row'];
export type TokenTransaction = Database['public']['Tables']['token_transactions']['Row'];
export type HealthMetric = Database['public']['Tables']['health_metrics']['Row'];
export type HealthScore = Database['public']['Tables']['health_scores']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type AiInsight = Database['public']['Tables']['ai_insights']['Row'];
export type ClinicalAssessment = Database['public']['Tables']['clinical_assessments']['Row'];
export type DailyTask = Database['public']['Tables']['daily_tasks']['Row'];
export type UserStreak = Database['public']['Tables']['user_streaks']['Row'];
export type UserTier = Database['public']['Tables']['user_tiers']['Row'];
export type Reward = Database['public']['Tables']['rewards']['Row'];
export type RewardRedemption = Database['public']['Tables']['reward_redemptions']['Row'];
export type WearableIntegration = Database['public']['Tables']['wearable_integrations']['Row'];

// Convenience type aliases — new tables
export type Product = Database['public']['Tables']['products']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Membership = Database['public']['Tables']['memberships']['Row'];
export type KitRegistration = Database['public']['Tables']['kit_registrations']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
