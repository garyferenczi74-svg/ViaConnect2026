import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { mapDatabaseRoleToUserRole } from "@/lib/supabase/types";
import type { UserRole } from "@/lib/supabase/types";

// All (app) routes require authentication — never statically generate them
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Normalize role: handle both app-level (consumer/practitioner/naturopath)
  // and DB-level (patient/admin) role values from user_metadata
  const rawRole = (user.user_metadata?.role as string) ?? "consumer";
  const appRoles: UserRole[] = ["consumer", "practitioner", "naturopath"];
  const role = appRoles.includes(rawRole as UserRole)
    ? rawRole
    : mapDatabaseRoleToUserRole(rawRole);

  return (
    <AppShell user={user} role={role}>
      {children}
    </AppShell>
  );
}
