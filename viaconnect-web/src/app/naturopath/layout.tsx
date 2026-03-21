import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NaturopathNav } from "@/components/nav/naturopath-nav";

export default async function NaturopathLayout({
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

  if (user.user_metadata?.role !== "naturopath") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <NaturopathNav user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
