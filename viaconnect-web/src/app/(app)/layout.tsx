import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { mapDatabaseRoleToUserRole } from "@/lib/supabase/types";
import type { UserRole } from "@/lib/supabase/types";
import { AdminPortalDetector } from "@/components/AdminPortalDetector";
import { PortalShellRouter } from "@/components/practitioner/PortalShellRouter";

// All (app) routes require authentication — never statically generate them
export const dynamic = "force-dynamic";

const NATUROPATH_LIKE_CREDENTIALS = new Set(["nd", "dc", "lac"]);

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
  const isAdmin = rawRole === "admin";
  const appRoles: UserRole[] = ["consumer", "practitioner", "naturopath"];
  const role = appRoles.includes(rawRole as UserRole)
    ? rawRole
    : mapDatabaseRoleToUserRole(rawRole);

  // For admin users, we wrap in a client component that detects the current
  // portal from the URL and overrides the role prop accordingly. Admin
  // visiting practitioner routes is handled by AdminPortalDetector swapping
  // role to 'practitioner' before AppShell renders; the practitioner-shell
  // path through PortalShellRouter handles tab+sidebar at the leaf.
  if (isAdmin) {
    return (
      <AdminPortalDetector user={user}>
        {children}
      </AdminPortalDetector>
    );
  }

  // For practitioner users, fetch the lightweight shell profile so the
  // tab + sidebar can render correctly without an extra round-trip per
  // page render. Cast through any until DB types regen catches up with
  // the revised P91 default_active_tab + default_patient_view_mode
  // columns from migration _180.
  let practitionerProfile = null as null | {
    display_name: string;
    practice_name: string | null;
    credential_type: string;
    default_active_tab: 'practice' | 'naturopath';
  };
  let showNaturopathTab = false;

  if (role === 'practitioner') {
    const { data } = await (supabase as any)
      .from('practitioners')
      .select('display_name, practice_name, credential_type, default_active_tab')
      .eq('user_id', user.id)
      .eq('account_status', 'active')
      .maybeSingle();
    if (data) {
      practitionerProfile = {
        display_name: (data.display_name as string) ?? user.email ?? 'Practitioner',
        practice_name: (data.practice_name as string | null) ?? null,
        credential_type: (data.credential_type as string) ?? 'other',
        default_active_tab: ((data.default_active_tab as string) === 'naturopath'
          ? 'naturopath'
          : 'practice'),
      };
      showNaturopathTab = NATUROPATH_LIKE_CREDENTIALS.has(practitionerProfile.credential_type);
    }
  }

  return (
    <PortalShellRouter
      user={user}
      role={role}
      practitionerProfile={practitionerProfile}
      showNaturopathTab={showNaturopathTab}
    >
      {children}
    </PortalShellRouter>
  );
}
