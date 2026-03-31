"use client";

import { TabH1, TabH2, TabH3, TabP, TabBold, TabCheck } from "./TabSection";
import { TabCTA } from "./TabCTA";

export function ProcessContent() {
  return (
    <div>
      <TabH1>Invest in the Only Body You&apos;ll Ever Have.</TabH1>
      <TabP>Your genome is a one-time investment that pays dividends for life. Blood tests need repeating. Prescriptions need refilling. Your DNA never changes. Test once. Optimize forever.</TabP>
      <TabP>The average American spends $1,100 per year on supplements designed for someone else&apos;s body. Most absorb at less than 10%. That&apos;s $990 per year wasted.</TabP>

      <TabH2>GeneX360&trade; Testing</TabH2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
        {[
          { name: "GENEX-M\u2122", price: "$288.88" },
          { name: "NUTRIGEN-DX\u2122", price: "$388.88" },
          { name: "PeptideIQ\u2122", price: "$428.88" },
          { name: "EpigenHQ\u2122", price: "$448.88" },
          { name: "CannabisIQ\u2122", price: "$398.88" },
          { name: "HormoneIQ\u2122", price: "$508.88" },
        ].map((panel) => (
          <div key={panel.name} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <p className="text-sm font-semibold text-white">{panel.name}</p>
            <p className="text-2xl font-bold text-[#06B6D4] mt-1">{panel.price}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-gradient-to-r from-[#B87333]/20 to-[#D4923A]/20 border border-[#B87333]/30 p-6 my-8 text-center">
        <p className="text-2xl font-bold text-white">GeneX360&trade; COMPLETE</p>
        <p className="text-4xl font-bold text-[#06B6D4] mt-2">$988.88</p>
        <p className="text-sm text-white/60 mt-2">Save $1,473 (59.8%) &mdash; 6 months Platinum included &mdash; HSA/FSA Eligible</p>
        <p className="text-xs text-white/40 mt-1">Ships in 4 days &mdash; Results 7&ndash;14 days</p>
      </div>

      <TabH2>ViaConnect&trade; Membership</TabH2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Gold</p>
          <p className="text-3xl font-bold text-white mt-1">$8.88<span className="text-sm text-white/40 font-normal">/mo</span></p>
          <p className="text-xs text-[#B87333] italic mt-1">&ldquo;Less than a Starbucks latte.&rdquo;</p>
          <ul className="list-none mt-4 space-y-1.5">
            <TabCheck>Genetic panel access</TabCheck>
            <TabCheck>Health Score</TabCheck>
            <TabCheck>Daily protocol</TabCheck>
            <TabCheck>ViaTokens</TabCheck>
            <TabCheck>Basic AI</TabCheck>
            <TabCheck>Community</TabCheck>
          </ul>
        </div>

        <div className="rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 p-5 relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] px-3 py-1 rounded-full bg-[#06B6D4] text-white font-bold uppercase tracking-wider">Most Popular</span>
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Platinum</p>
          <p className="text-3xl font-bold text-white mt-1">$28.88<span className="text-sm text-white/40 font-normal">/mo</span></p>
          <p className="text-xs text-[#B87333] italic mt-1">&ldquo;One takeout meal.&rdquo;</p>
          <ul className="list-none mt-4 space-y-1.5">
            <TabCheck>Everything Gold</TabCheck>
            <TabCheck>Full AI with SHAP</TabCheck>
            <TabCheck>Wearables integration</TabCheck>
            <TabCheck>Telehealth</TabCheck>
            <TabCheck>Biomarker trends</TabCheck>
            <TabCheck>Unlimited AI chat</TabCheck>
            <TabCheck>2x ViaTokens</TabCheck>
          </ul>
          <p className="text-[10px] text-[#06B6D4]/60 mt-3">GeneX360 Complete buyers get 6 months free.</p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Practitioner &amp; Naturopath</p>
          <p className="text-3xl font-bold text-white mt-1">$128.88<span className="text-sm text-white/40 font-normal">/mo</span></p>
          <p className="text-xs text-[#B87333] italic mt-1">&ldquo;Less than one billable hour.&rdquo;</p>
          <ul className="list-none mt-4 space-y-1.5">
            <TabCheck>Everything Platinum</TabCheck>
            <TabCheck>Patient management</TabCheck>
            <TabCheck>Protocol builder</TabCheck>
            <TabCheck>EHR integration</TabCheck>
            <TabCheck>CME/CE (18/yr)</TabCheck>
            <TabCheck>Herb-gene database</TabCheck>
            <TabCheck>White-label &amp; wholesale</TabCheck>
          </ul>
        </div>
      </div>

      <TabH2>All-Inclusive Packages</TabH2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        {[
          { name: "ESSENTIAL", price: "$589", tag: null },
          { name: "GUIDED", price: "$789", tag: "Most Popular" },
          { name: "PREMIUM", price: "$1,289", tag: null },
        ].map((pkg) => (
          <div key={pkg.name} className={`rounded-xl p-5 text-center ${pkg.tag ? "bg-[#06B6D4]/10 border border-[#06B6D4]/30" : "bg-white/5 border border-white/10"}`}>
            {pkg.tag && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#06B6D4] text-white font-bold uppercase">{pkg.tag}</span>}
            <p className="text-sm font-semibold text-white mt-2">{pkg.name}</p>
            <p className="text-3xl font-bold text-[#06B6D4] mt-1">{pkg.price}</p>
          </div>
        ))}
      </div>

      <TabH2>HSA/FSA Eligible</TabH2>
      <TabP>Truemed integration. LMN generated in-app. 25&ndash;40% effective cost reduction. $988.88 becomes $593&ndash;$741.</TabP>

      <TabH2>Subscribe &amp; Save</TabH2>
      <TabP>$89&ndash;$189/month (20% off). Genetically-calibrated. Auto-adjusted by AI.</TabP>

      <TabH2>What Every Member Gets</TabH2>
      <ul className="list-none space-y-2 mb-6">
        <TabCheck>HIPAA + data ownership</TabCheck>
        <TabCheck>One-click delete</TabCheck>
        <TabCheck>Full catalog access</TabCheck>
        <TabCheck>Daily protocol</TabCheck>
        <TabCheck>ViaTokens</TabCheck>
        <TabCheck>Community</TabCheck>
        <TabCheck>Evidence library</TabCheck>
        <TabCheck>Ships in 4 days</TabCheck>
        <TabCheck>Results 7&ndash;14 days</TabCheck>
        <TabCheck>Lifetime genetic data access</TabCheck>
      </ul>

      <TabCTA text={"Your Genome. Your Investment. Your Future.\nChoose Your Plan"} />
    </div>
  );
}
