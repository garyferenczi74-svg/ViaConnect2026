import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Delete your ViaConnect account",
  description: "How to delete a ViaConnect account in the app or request deletion on the web.",
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#1A2744] text-white flex flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs uppercase tracking-wider text-white/45">ViaConnect</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Delete your ViaConnect account</h1>
        <p className="mt-4 text-sm sm:text-base text-white/70 leading-relaxed">
          ViaConnect is the app from Farmceutica Wellness. You can delete your account in the app, or you can send a deletion request on the web.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Delete in the app</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-white/75 leading-relaxed">
            <li>Sign in to ViaConnect.</li>
            <li>Open Account profile or Profile.</li>
            <li>Choose Delete account.</li>
            <li>Type DELETE and confirm. Deletion runs then. You are signed out.</li>
          </ol>
          <p className="text-sm text-white/60 leading-relaxed">
            This removes the login and the personal, health, genetic, and photo data stored with the account. Some order and payment records may be kept with the name, email, address, and phone removed.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Request deletion on the web</h2>
          <p className="text-sm text-white/75 leading-relaxed">
            If you cannot use the app, open the privacy request form and choose Delete my data.
          </p>
          <p className="text-sm text-white/75 leading-relaxed">
            That form records the request. It does not delete the account by itself. We reply within the time shown on the form: 45 days for California, and 30 days for the EU and the UK.
          </p>
          <Link
            href="/dsar"
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#2DA5A0] hover:underline"
          >
            Open the privacy request form
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
