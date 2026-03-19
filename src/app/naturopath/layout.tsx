import Sidebar from "@/components/Sidebar";
import { naturopathNavItems } from "@/lib/mock-data";

export default function NaturopathLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar portal="naturopath" navItems={naturopathNavItems} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
