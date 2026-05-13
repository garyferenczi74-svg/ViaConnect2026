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
      <MobileNavBar role={role} />
      <div className="p-4 lg:p-6">{children}</div>
    </>
  );
}
