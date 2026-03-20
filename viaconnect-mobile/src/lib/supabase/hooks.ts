import { useQuery } from '@tanstack/react-query';
import { supabase } from './client';
import type {
  Profile,
  GeneticProfile,
  Protocol,
  FarmaToken,
  Product,
} from './types';

// ── Auth / Profile ──────────────────────────────────────────────────────────

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

// ── Genetic Data ────────────────────────────────────────────────────────────

export function useGeneticProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['genetic_profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('genetic_profiles')
        .select('*')
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
      return data as GeneticProfile;
    },
  });
}

// ── Protocols ───────────────────────────────────────────────────────────────

export function useProtocols(userId: string | undefined) {
  return useQuery({
    queryKey: ['protocols', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocols')
        .select('*, protocol_ingredients(*, herbs(*))')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Protocol[];
    },
  });
}

// ── FarmaTokens (ViaTokens) ────────────────────────────────────────────────

export function useTokenBalance(userId: string | undefined) {
  return useQuery({
    queryKey: ['token_balance', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farma_tokens')
        .select('*')
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
      return data as FarmaToken;
    },
  });
}

// ── Products ────────────────────────────────────────────────────────────────

export function useProducts(category?: Product['category']) {
  return useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name');
      if (category) {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
}
