// Database types — aligned with viaconnect-mobile/src/lib/supabase/types.ts
// Only includes tables actively used by the web app

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DatabaseRole = "patient" | "practitioner" | "admin" | "naturopath";
export type UserRole = "consumer" | "practitioner" | "naturopath";

/** Maps the Supabase profiles.role DB value to the app-level UserRole */
export function mapDatabaseRoleToUserRole(dbRole: DatabaseRole | string): UserRole {
  switch (dbRole) {
    case "practitioner":
      return "practitioner";
    case "admin":
      return "practitioner";
    case "naturopath":
      return "naturopath";
    case "patient":
    default:
      return "consumer";
  }
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: DatabaseRole;
          onboarding_completed: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: DatabaseRole;
          onboarding_completed?: boolean | null;
        };
        Update: {
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: DatabaseRole;
          onboarding_completed?: boolean | null;
        };
        Relationships: [];
      };

      assessment_results: {
        Row: {
          id: string;
          user_id: string;
          phase: number;
          data: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          phase: number;
          data: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          phase?: number;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };

      clinical_assessments: {
        Row: {
          id: string;
          user_id: string;
          date_of_birth: string | null;
          biological_sex: "male" | "female" | "intersex" | "prefer_not_to_say" | null;
          height_cm: number | null;
          weight_kg: number | null;
          primary_goals: string[] | null;
          current_conditions: string[] | null;
          current_medications: string | null;
          allergies: string | null;
          sleep_hours_avg: number | null;
          exercise_frequency: "none" | "1-2_weekly" | "3-4_weekly" | "5+_weekly" | null;
          stress_level: "low" | "moderate" | "high" | "very_high" | null;
          diet_type: "omnivore" | "vegetarian" | "vegan" | "keto" | "paleo" | "mediterranean" | "other" | null;
          current_supplements: string[] | null;
          completed: boolean | null;
          completed_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          date_of_birth?: string | null;
          biological_sex?: "male" | "female" | "intersex" | "prefer_not_to_say" | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          primary_goals?: string[] | null;
          current_conditions?: string[] | null;
          current_medications?: string | null;
          allergies?: string | null;
          sleep_hours_avg?: number | null;
          exercise_frequency?: "none" | "1-2_weekly" | "3-4_weekly" | "5+_weekly" | null;
          stress_level?: "low" | "moderate" | "high" | "very_high" | null;
          diet_type?: "omnivore" | "vegetarian" | "vegan" | "keto" | "paleo" | "mediterranean" | "other" | null;
          current_supplements?: string[] | null;
          completed?: boolean | null;
        };
        Update: {
          date_of_birth?: string | null;
          biological_sex?: "male" | "female" | "intersex" | "prefer_not_to_say" | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          primary_goals?: string[] | null;
          current_conditions?: string[] | null;
          current_medications?: string | null;
          allergies?: string | null;
          sleep_hours_avg?: number | null;
          exercise_frequency?: "none" | "1-2_weekly" | "3-4_weekly" | "5+_weekly" | null;
          stress_level?: "low" | "moderate" | "high" | "very_high" | null;
          diet_type?: "omnivore" | "vegetarian" | "vegan" | "keto" | "paleo" | "mediterranean" | "other" | null;
          current_supplements?: string[] | null;
          completed?: boolean | null;
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
          cyp2d6_status?: string | null;
          mthfr_status?: string | null;
          comt_status?: string | null;
          additional_genes?: Record<string, unknown> | null;
          source_lab?: string | null;
          report_date?: string | null;
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
          notification_type?: string;
          title?: string;
          message?: string | null;
          read?: boolean | null;
          expires_at?: string | null;
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
          balance?: number;
          lifetime_earned?: number;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          short_name: string;
          description: string;
          category: "supplement" | "test_kit" | "peptide" | "cannabis";
          price: number;
          image_url: string | null;
          active: boolean;
          delivery_type: string | null;
          target_genes: string[] | null;
          created_at: string;
        };
        Insert: {
          sku: string;
          name: string;
          short_name: string;
          description: string;
          category: "supplement" | "test_kit" | "peptide" | "cannabis";
          price: number;
          image_url?: string | null;
          active: boolean;
          delivery_type?: string | null;
          target_genes?: string[] | null;
        };
        Update: {
          sku?: string;
          name?: string;
          short_name?: string;
          description?: string;
          category?: "supplement" | "test_kit" | "peptide" | "cannabis";
          price?: number;
          image_url?: string | null;
          active?: boolean;
          delivery_type?: string | null;
          target_genes?: string[] | null;
        };
        Relationships: [];
      };

      supplement_logs: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          logged_at: string;
          dose: string | null;
          time_of_day: "morning" | "noon" | "evening" | "bedtime";
          created_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
          logged_at?: string;
          dose?: string | null;
          time_of_day: "morning" | "noon" | "evening" | "bedtime";
        };
        Update: {
          logged_at?: string;
          dose?: string | null;
          time_of_day?: "morning" | "noon" | "evening" | "bedtime";
        };
        Relationships: [];
      };

      user_protocols: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          dose: string;
          time_of_day: "morning" | "noon" | "evening" | "bedtime";
          active: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
          dose: string;
          time_of_day: "morning" | "noon" | "evening" | "bedtime";
          active?: boolean;
        };
        Update: {
          dose?: string;
          time_of_day?: "morning" | "noon" | "evening" | "bedtime";
          active?: boolean;
        };
        Relationships: [];
      };

      genetic_variants: {
        Row: {
          id: string;
          user_id: string;
          panel: string;
          gene: string;
          rsid: string;
          genotype: string;
          risk_level: "low" | "moderate" | "high";
          category: string;
          clinical_summary: string | null;
          product_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          panel: string;
          gene: string;
          rsid: string;
          genotype: string;
          risk_level: "low" | "moderate" | "high";
          category: string;
          clinical_summary?: string | null;
          product_id?: string | null;
        };
        Update: {
          panel?: string;
          gene?: string;
          rsid?: string;
          genotype?: string;
          risk_level?: "low" | "moderate" | "high";
          category?: string;
          clinical_summary?: string | null;
          product_id?: string | null;
        };
        Relationships: [];
      };

      conversations: {
        Row: {
          id: string;
          patient_id: string;
          practitioner_id: string;
          last_message: string | null;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          patient_id: string;
          practitioner_id: string;
          last_message?: string | null;
          last_message_at?: string | null;
        };
        Update: {
          last_message?: string | null;
          last_message_at?: string | null;
        };
        Relationships: [];
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content: string;
          read?: boolean;
        };
        Update: {
          content?: string;
          read?: boolean;
        };
        Relationships: [];
      };

      token_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          action: string;
          balance_after: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          amount: number;
          action: string;
          balance_after: number;
        };
        Update: {
          amount?: number;
          action?: string;
          balance_after?: number;
        };
        Relationships: [];
      };

      achievements: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string | null;
          token_reward: number;
          criteria: string;
          created_at: string;
        };
        Insert: {
          name: string;
          description: string;
          icon?: string | null;
          token_reward: number;
          criteria: string;
        };
        Update: {
          name?: string;
          description?: string;
          icon?: string | null;
          token_reward?: number;
          criteria?: string;
        };
        Relationships: [];
      };

      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: {
          user_id: string;
          achievement_id: string;
        };
        Update: {
          unlocked_at?: string;
        };
        Relationships: [];
      };

      orders: {
        Row: {
          id: string;
          user_id: string;
          status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
          total: number;
          items: Json;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
          total: number;
          items: Json;
        };
        Update: {
          status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
          total?: number;
          items?: Json;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          plan: "gold" | "platinum" | "practitioner";
          status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          plan: "gold" | "platinum" | "practitioner";
          status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Update: {
          plan?: "gold" | "platinum" | "practitioner";
          status?: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          metadata: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
        };
        Update: {
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AssessmentResult = Database["public"]["Tables"]["assessment_results"]["Row"];
export type GeneticProfile = Database["public"]["Tables"]["genetic_profiles"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type SupplementLog = Database["public"]["Tables"]["supplement_logs"]["Row"];
export type UserProtocol = Database["public"]["Tables"]["user_protocols"]["Row"];
export type GeneticVariant = Database["public"]["Tables"]["genetic_variants"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type TokenTransaction = Database["public"]["Tables"]["token_transactions"]["Row"];
export type Achievement = Database["public"]["Tables"]["achievements"]["Row"];
export type UserAchievement = Database["public"]["Tables"]["user_achievements"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
