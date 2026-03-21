import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

export type UserRole = "consumer" | "practitioner" | "naturopath";

interface AuthState {
  user: User | null;
  role: UserRole;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole) => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: "consumer",
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      role: (user?.user_metadata?.role as UserRole) ?? "consumer",
    }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, role: "consumer", isLoading: false }),
}));
