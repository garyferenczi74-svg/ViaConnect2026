"use client";

import { ReactNode } from "react";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import FloatingActionButton from "@/components/layout/FloatingActionButton";
import MobileNav from "@/components/layout/MobileNav";

function LayoutShell({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar />
      <TopBar />

      {/* Main Content */}
      <main
        className={`mt-16 transition-all duration-200 ease-in-out ${
          collapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        <div className="overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto px-6 py-8 pb-24 md:pb-8">
            {children}
          </div>
        </div>
      </main>

      <FloatingActionButton />
      <MobileNav />
    </div>
  );
}

export default function NaturopathLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <LayoutShell>{children}</LayoutShell>
    </SidebarProvider>
  );
}
