import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

// Re-export UserRole from shared types for backwards compatibility
export type { UserRole } from "@/lib/supabase/types";
import type { UserRole } from "@/lib/supabase/types";

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
  setUser: (user) => {
    // Privileged roles must come from profiles.role via setRole, never
    // from user_metadata (user-editable in Supabase Auth).
    set({ user, role: "consumer" });
  },
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, role: "consumer", isLoading: false }),
}));
