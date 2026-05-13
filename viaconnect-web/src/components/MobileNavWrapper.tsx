"use client";

import { MobileNavBar } from "@/components/layout/MobileNavBar";

export function MobileNavWrapper({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="sticky top-16 z-50 bg-[#0D1520] md:relative md:top-auto md:z-auto md:bg-transparent">
        <MobileNavBar role={role} />
      </div>
      <div className="p-4 lg:p-6">{children}</div>
    </>
  );
}
