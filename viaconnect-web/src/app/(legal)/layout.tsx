import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ViaConnectLogo } from "@/components/ui/ViaConnectLogo";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-[#1A2744] text-gray-200"
      style={{ fontFamily: "'Instrument Sans', sans-serif" }}
    >
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link href="/" aria-label="ViaConnect home">
            <ViaConnectLogo size="md" />
          </Link>
          <Link
            href="/"
            aria-label="Back to home"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 leading-relaxed">
        {children}
      </main>
    </div>
  );
}
