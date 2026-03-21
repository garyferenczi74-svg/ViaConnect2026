import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

// Re-export UserRole from shared types for backwards compatibility
export type { UserRole } from "@/lib/supabase/types";
import type { UserRole } from "@/lib/supabase/types";
import { mapDatabaseRoleToUserRole } from "@/lib/supabase/types";

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
    // user_metadata.role may be the app-level role (consumer/practitioner/naturopath)
    // or the DB-level role (patient/practitioner/admin) — handle both
    const rawRole = user?.user_metadata?.role as string | undefined;
    let role: UserRole = "consumer";
    if (rawRole === "consumer" || rawRole === "practitioner" || rawRole === "naturopath") {
      role = rawRole;
    } else if (rawRole) {
      role = mapDatabaseRoleToUserRole(rawRole);
    }
    set({ user, role });
  },
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, role: "consumer", isLoading: false }),
}));
