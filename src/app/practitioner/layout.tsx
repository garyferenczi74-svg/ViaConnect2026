import Sidebar from "@/components/Sidebar";
import { practitionerNavItems } from "@/lib/mock-data";

export default function PractitionerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar portal="practitioner" navItems={practitionerNavItems} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
