export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'patient' | 'naturopath' | 'practitioner' | 'clinic_admin' | 'super_admin';
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'patient' | 'naturopath' | 'practitioner' | 'clinic_admin' | 'super_admin';
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          email?: string;
          role?: 'patient' | 'naturopath' | 'practitioner' | 'clinic_admin' | 'super_admin';
          full_name?: string | null;
          avatar_url?: string | null;
        };
      };
      practitioners: {
        Row: {
          id: string;
          user_id: string;
          license_number: string | null;
          specializations: string[];
          clinic_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          license_number?: string | null;
          specializations?: string[];
          clinic_id?: string | null;
        };
        Update: {
          license_number?: string | null;
          specializations?: string[];
          clinic_id?: string | null;
        };
      };
      patients: {
        Row: {
          id: string;
          user_id: string;
          date_of_birth: string | null;
          practitioner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date_of_birth?: string | null;
          practitioner_id?: string | null;
        };
        Update: {
          date_of_birth?: string | null;
          practitioner_id?: string | null;
        };
      };
      consent_records: {
        Row: {
          id: string;
          patient_id: string;
          consent_type: string;
          status: 'pending' | 'granted' | 'revoked' | 'expired';
          granted_at: string | null;
          revoked_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          consent_type: string;
          status?: 'pending' | 'granted' | 'revoked' | 'expired';
          granted_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          status?: 'pending' | 'granted' | 'revoked' | 'expired';
          granted_at?: string | null;
          revoked_at?: string | null;
          expires_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
