import { Puzzle, ShieldCheck } from "lucide-react";

export const dynamic = "force-static";

const SUPPORTED = [
  "Instagram", "TikTok Studio", "YouTube Studio", "X (Twitter)",
  "LinkedIn", "Facebook Pages", "Substack", "WordPress",
  "Medium", "Beehiiv", "ConvertKit", "Mailchimp", "Generic selection (right-click)",
];

export default function ExtensionInstallPage() {
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Puzzle className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Install the Marshall pre-check extension</h1>
      </div>
      <p className="text-xs text-white/60 max-w-2xl">
        The extension adds a Scan with Marshall button inside supported content composers.
        It reads the composer text only when you click; it never scrapes the page in the background.
        Authentication uses OAuth against your ViaConnect account; tokens live in browser session storage
        and are cleared when you close the browser.
      </p>

      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-300" strokeWidth={1.5} />
          Privacy guarantees
        </h2>
        <ul className="text-xs text-white/70 list-disc list-inside space-y-1">
          <li>No background scraping. The extension only reads the composer when you explicitly click Scan or use the right-click menu.</li>
          <li>No external analytics. Zero third-party SDKs shipped in the extension bundle.</li>
          <li>Explicit host permissions only. The manifest lists each supported site; no <code className="text-[11px]">all_urls</code>.</li>
          <li>Draft text crosses the network to the Marshall API; it is hashed server-side and never persisted in plaintext.</li>
          <li>Add the <code className="text-[11px]">data-marshall-disable</code> attribute to a composer if you need a hard opt-out on a specific page.</li>
        </ul>
      </div>

      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-5">
        <h2 className="text-sm font-semibold text-white mb-2">Supported composers</h2>
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-white/70">
          {SUPPORTED.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>

      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-5">
        <h2 className="text-sm font-semibold text-white mb-2">Installation</h2>
        <p className="text-xs text-white/60 mb-2">
          During internal dogfood + invited cohort phases the extension is distributed via the enterprise private channel.
          Public Chrome Web Store, Edge Add-ons, and Firefox AMO listings go live with Phase D (day 31+).
        </p>
        <p className="text-xs text-white/60">
          Contact Steve Rica to request access to the private channel.
        </p>
      </div>
    </div>
  );
}
