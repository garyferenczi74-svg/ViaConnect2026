export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
