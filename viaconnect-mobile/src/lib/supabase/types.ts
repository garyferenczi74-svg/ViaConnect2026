export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          portal_type: 'consumer' | 'practitioner' | 'naturopath';
          membership_tier: 'free' | 'gold' | 'platinum' | 'practitioner';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      genetic_profiles: {
        Row: {
          id: string;
          user_id: string;
          panel_type: 'GENEX-M' | 'GENEX-P' | 'GENEX-G' | 'GENEX-E' | 'GENEX-C' | 'Complete';
          status: 'pending' | 'processing' | 'completed';
          raw_data_url: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['genetic_profiles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['genetic_profiles']['Insert']>;
      };
      gene_variants: {
        Row: {
          id: string;
          genetic_profile_id: string;
          gene_name: string;
          variant: string;
          rsid: string;
          genotype: string;
          impact: 'positive' | 'neutral' | 'moderate' | 'significant';
          category: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['gene_variants']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['gene_variants']['Insert']>;
      };
      protocols: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          status: 'active' | 'paused' | 'completed';
          ai_reasoning: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['protocols']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['protocols']['Insert']>;
      };
      protocol_items: {
        Row: {
          id: string;
          protocol_id: string;
          product_id: string;
          dosage: string;
          frequency: string;
          time_of_day: 'morning' | 'afternoon' | 'evening' | 'bedtime';
          notes: string | null;
          sort_order: number;
        };
        Insert: Omit<Database['public']['Tables']['protocol_items']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['protocol_items']['Insert']>;
      };
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
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      via_tokens: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          lifetime_earned: number;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['via_tokens']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['via_tokens']['Insert']>;
      };
      token_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: 'earned' | 'redeemed' | 'expired' | 'bonus';
          reason: string;
          reference_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['token_transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['token_transactions']['Insert']>;
      };
      adherence_logs: {
        Row: {
          id: string;
          user_id: string;
          protocol_item_id: string;
          taken_at: string;
          skipped: boolean;
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['adherence_logs']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['adherence_logs']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['memberships']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>;
      };
      practitioner_patients: {
        Row: {
          id: string;
          practitioner_id: string;
          patient_id: string;
          status: 'invited' | 'active' | 'archived';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['practitioner_patients']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['practitioner_patients']['Insert']>;
      };
      practitioner_notes: {
        Row: {
          id: string;
          practitioner_id: string;
          patient_id: string;
          content: string;
          is_private: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['practitioner_notes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['practitioner_notes']['Insert']>;
      };
      ai_consultations: {
        Row: {
          id: string;
          user_id: string;
          model: 'claude' | 'grok' | 'gpt4o';
          prompt: string;
          response: string;
          context: Record<string, unknown> | null;
          tokens_used: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_consultations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ai_consultations']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['kit_registrations']['Row'], 'id' | 'registered_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['kit_registrations']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: 'reminder' | 'result' | 'promotion' | 'system';
          read: boolean;
          data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      health_metrics: {
        Row: {
          id: string;
          user_id: string;
          metric_type: string;
          value: number;
          unit: string;
          recorded_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_metrics']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['health_metrics']['Insert']>;
      };
      supplement_interactions: {
        Row: {
          id: string;
          product_a_id: string;
          product_b_id: string;
          interaction_type: 'synergy' | 'caution' | 'contraindicated';
          description: string;
        };
        Insert: Omit<Database['public']['Tables']['supplement_interactions']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['supplement_interactions']['Insert']>;
      };
      gene_product_mappings: {
        Row: {
          id: string;
          gene_name: string;
          variant: string;
          product_id: string;
          relevance_score: number;
          rationale: string;
        };
        Insert: Omit<Database['public']['Tables']['gene_product_mappings']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['gene_product_mappings']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
      referral_codes: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          uses: number;
          max_uses: number | null;
          reward_tokens: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['referral_codes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['referral_codes']['Insert']>;
      };
      content_library: {
        Row: {
          id: string;
          title: string;
          slug: string;
          body: string;
          category: string;
          tags: string[];
          portal_access: ('consumer' | 'practitioner' | 'naturopath')[];
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['content_library']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['content_library']['Insert']>;
      };
    };
    Functions: Record<string, never>;
    Enums: {
      portal_type: 'consumer' | 'practitioner' | 'naturopath';
      membership_tier: 'free' | 'gold' | 'platinum' | 'practitioner';
      gene_impact: 'positive' | 'neutral' | 'moderate' | 'significant';
    };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type GeneticProfile = Database['public']['Tables']['genetic_profiles']['Row'];
export type GeneVariant = Database['public']['Tables']['gene_variants']['Row'];
export type Protocol = Database['public']['Tables']['protocols']['Row'];
export type ProtocolItem = Database['public']['Tables']['protocol_items']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type ViaToken = Database['public']['Tables']['via_tokens']['Row'];
export type TokenTransaction = Database['public']['Tables']['token_transactions']['Row'];
export type AdherenceLog = Database['public']['Tables']['adherence_logs']['Row'];
export type Membership = Database['public']['Tables']['memberships']['Row'];
export type AiConsultation = Database['public']['Tables']['ai_consultations']['Row'];
export type KitRegistration = Database['public']['Tables']['kit_registrations']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
