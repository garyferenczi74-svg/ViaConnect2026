import { createClient } from "@/lib/supabase/server";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import { loadPractitionerLiveRoster } from "@/lib/practitioner/live-roster";
import { PractitionerPatientsRoster } from "./PractitionerPatientsRoster";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const supabase = await createClient();
  const session = await resolveSessionRole("app.practitioner.patients");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const snapshot = user
    ? await loadPractitionerLiveRoster(supabase, {
        userId: user.id,
        role: session?.role,
      })
    : await loadPractitionerLiveRoster(supabase, {
        userId: "",
        role: undefined,
      });

  return (
    <PractitionerPatientsRoster
      patients={snapshot.patients}
      lookupFailed={snapshot.lookupFailed}
    />
  );
}
