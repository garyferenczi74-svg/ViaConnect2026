import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "ViaConnect support",
  description: "How to contact ViaConnect support, and links to public help pages.",
};

// Exact wording from Terms section 3. Do not paraphrase.
const NOT_MEDICAL_ADVICE =
  "The Services are for informational and wellness purposes only. They do not provide medical advice, diagnosis, or treatment.";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#1A2744] text-white flex flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs uppercase tracking-wider text-white/45">ViaConnect</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">ViaConnect support</h1>
        <p className="mt-4 text-sm sm:text-base text-white/70 leading-relaxed">
          ViaConnect is the app from Farmceutica Wellness. You can email us from this page. An account is not required.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Support</h2>
          <p className="text-sm text-white/75 leading-relaxed">
            <a
              href="mailto:support@viaconnectapp.com"
              className="inline-flex min-h-[44px] items-center font-semibold text-[#2DA5A0] hover:underline"
              data-testid="support-email"
            >
              support@viaconnectapp.com
            </a>
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">General inquiries</h2>
          <p className="text-sm text-white/75 leading-relaxed">
            <a
              href="mailto:info@viaconnectapp.com"
              className="inline-flex min-h-[44px] items-center font-semibold text-[#2DA5A0] hover:underline"
              data-testid="info-email"
            >
              info@viaconnectapp.com
            </a>
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">Help</h2>
          <ul className="text-sm">
            <li>
              <Link
                href="/privacy"
                className="inline-flex min-h-[44px] items-center font-semibold text-[#2DA5A0] hover:underline"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="inline-flex min-h-[44px] items-center font-semibold text-[#2DA5A0] hover:underline"
              >
                Terms of Service
              </Link>
            </li>
            <li>
              <Link
                href="/delete-account"
                className="inline-flex min-h-[44px] items-center font-semibold text-[#2DA5A0] hover:underline"
              >
                Delete account
              </Link>
            </li>
            <li>
              <Link
                href="/dsar"
                className="inline-flex min-h-[44px] items-center font-semibold text-[#2DA5A0] hover:underline"
              >
                Privacy request form
              </Link>
            </li>
          </ul>
        </section>

        <p className="mt-8 text-sm text-white/60 leading-relaxed">{NOT_MEDICAL_ADVICE}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
