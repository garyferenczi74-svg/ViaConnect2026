// Database types — aligned with viaconnect-mobile/src/lib/supabase/types.ts
// Only includes tables actively used by the web app

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DatabaseRole = "patient" | "practitioner" | "admin";
export type UserRole = "consumer" | "practitioner" | "naturopath";

/** Maps the Supabase profiles.role DB value to the app-level UserRole */
export function mapDatabaseRoleToUserRole(dbRole: DatabaseRole | string): UserRole {
  switch (dbRole) {
    case "practitioner":
      return "practitioner";
    case "admin":
      return "practitioner";
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
