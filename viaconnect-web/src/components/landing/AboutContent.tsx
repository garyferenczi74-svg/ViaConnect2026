"use client";

import { TabH1, TabH2, TabH3, TabP, TabAccent, TabBold, TabBullet } from "./TabSection";
import { TabCTA } from "./TabCTA";

export function AboutContent() {
  return (
    <div>
      <TabH1>We Didn&apos;t Start a Supplement Company. We Started a Revolution.</TabH1>

      <TabH2>Who We Are</TabH2>
      <TabP>FarmCeutica Wellness LLC is not another brand on a shelf. We are a vertically integrated precision health company headquartered in Buffalo, New York with operations in Calgary, Alberta&mdash;built from the ground up to solve the fundamental problem the supplement industry has been ignoring: your body is genetically unique, and your supplements should be too.</TabP>
      <TabP>We are the first company in the world to build the entire stack&mdash;from genetic testing to AI interpretation to formulation to delivery to clinical platform&mdash;as one integrated system.</TabP>

      <TabH2>Our Mission</TabH2>
      <TabAccent>&ldquo;To provide quality, bioavailable nutrition based on your unique genetic profile&mdash;so you know exactly what your body needs on your journey to bettering your health.&rdquo;</TabAccent>
      <TabP><TabBold>One Genome. One Formulation. One Life at a Time.</TabBold></TabP>

      <TabH3>Core Beliefs</TabH3>
      <ul className="list-none space-y-2 mb-6">
        <TabBullet>Genetics determine supplements, not marketing</TabBullet>
        <TabBullet>Bioavailability is not optional</TabBullet>
        <TabBullet>Your data belongs to you</TabBullet>
        <TabBullet>AI augments, never replaces</TabBullet>
        <TabBullet>Collaboration produces best outcomes</TabBullet>
        <TabBullet>Science evolves, protocols evolve with it</TabBullet>
      </ul>

      <TabH2>Our Journey</TabH2>
      <div className="space-y-4 my-6">
        {[
          { year: "1990s\u20132010s", text: "30+ years GMP facility development." },
          { year: "2018", text: "FarmCeutica founded." },
          { year: "2019\u20132021", text: "Dual-delivery technology validated (10\u201327x)." },
          { year: "2022\u20132023", text: "Pivot to precision nutraceuticals. 27+ formulations." },
          { year: "2024", text: "GeneX360\u2122 designed. PeptideIQ\u2122 + CannabisIQ\u2122 (zero competitors). CLIA labs." },
          { year: "2024\u20132025", text: "ViaConnect\u2122 built. Five-source AI. HIPAA deployed. Patent filed." },
          { year: "2025", text: "Clinical validation: MTHFR (N=72), bio-age (N=47). Score: A\u2212 (91/110)." },
          { year: "2026", text: "Launch. $5.5M seed round. 48,000+ retail. The revolution goes live." },
        ].map((item) => (
          <div key={item.year} className="flex gap-4 items-start">
            <span className="text-sm font-bold text-[#06B6D4] w-28 flex-shrink-0">{item.year}</span>
            <span className="text-base text-white/70">{item.text}</span>
          </div>
        ))}
      </div>

      <TabH2>The Team</TabH2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-6">
        {[
          { name: "Gary Ferenczi", role: "CEO & Founder", detail: "30+ years GMP" },
          { name: "Dr. Fadi Dagher", role: "Medical Director", detail: "" },
          { name: "Thomas Rosengren", role: "CTO / Production", detail: "" },
          { name: "Steve Rica", role: "Compliance", detail: "" },
          { name: "Domenic Romeo", role: "CFO", detail: "" },
        ].map((member) => (
          <div key={member.name} className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">{member.name}</p>
            <p className="text-xs text-[#B87333] mt-0.5">{member.role}</p>
            {member.detail && <p className="text-xs text-white/40 mt-0.5">{member.detail}</p>}
          </div>
        ))}
      </div>

      <TabH2>Our Promise</TabH2>
      <ul className="list-none space-y-2 mb-6">
        <TabBullet>Never sell genetic data</TabBullet>
        <TabBullet>Never recommend without genetic support</TabBullet>
        <TabBullet>Never use synthetics when bioavailable forms exist</TabBullet>
        <TabBullet>Always show the science</TabBullet>
        <TabBullet>Always give data control</TabBullet>
        <TabBullet>Never stop investing in R&amp;D</TabBullet>
      </ul>

      <TabP>&ldquo;This is not a supplement company. This is a health company that happens to make the best supplements you have ever taken&mdash;because they were designed for the only genome that matters: yours.&rdquo;</TabP>

      <TabCTA text={"Join the Precision Health Revolution\nStart Your Journey Today"} />

      <p className="text-base md:text-lg text-[#B87333] italic font-semibold mb-4 text-center">&ldquo;Your DNA has been waiting your whole life for you to read it. Today is the day.&rdquo;</p>
    </div>
  );
}
