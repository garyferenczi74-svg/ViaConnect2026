import Sidebar from "@/components/Sidebar";
import { wellnessNavItems } from "@/lib/mock-data";

export default function WellnessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar portal="wellness" navItems={wellnessNavItems} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
