import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ViaConnect account deleted",
  robots: { index: false, follow: false },
};

export default function AccountDeletedPage() {
  return (
    <div className="min-h-screen bg-[#1A2744] text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
        <p className="text-xs uppercase tracking-wider text-white/45">ViaConnect</p>
        <h1 className="mt-2 text-2xl font-bold">Your ViaConnect account has been deleted</h1>
        <p className="mt-4 text-sm text-white/70 leading-relaxed">
          You have been signed out. Personal, health, genetic, and photo data stored with the account was removed. Some order and payment records may be kept with the name, email, address, and phone removed.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#2DA5A0] hover:underline"
        >
          Back to home
        </Link>
      </main>
    </div>
  );
}
