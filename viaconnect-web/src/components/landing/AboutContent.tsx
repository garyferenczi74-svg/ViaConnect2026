"use client";

import { TabH1, TabH2, TabH3, TabP, TabAccent, TabBold, TabBullet } from "./TabSection";
import { TabCTA } from "./TabCTA";

export function AboutContent() {
  return (
    <div>
      <TabH1>We Didn&apos;t Start a Supplement Company. We Started a Revolution.</TabH1>

      <TabH2>Who We Are</TabH2>
      <TabP>ViaConnect is not another brand on a shelf. We are a vertically integrated precision health company headquartered in Buffalo, New York with operations in Rakitovica, Croatia, built from the ground up to solve the fundamental problem the supplement industry has been ignoring: your body is genetically unique, and your supplements should be too.</TabP>
      <TabP>We are the first company in the world to build the entire stack,from genetic testing to AI interpretation to formulation to delivery to clinical platform,as one integrated system.</TabP>

      <TabH2>Our Mission</TabH2>
      <TabAccent>&ldquo;To provide quality, bioavailable nutrition based on your unique genetic profile,so you know exactly what your body needs on your journey to bettering your health.&rdquo;</TabAccent>
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

      <TabH2>Our Promise</TabH2>
      <ul className="list-none space-y-2 mb-6">
        <TabBullet>Never sell genetic data</TabBullet>
        <TabBullet>Never recommend without genetic support</TabBullet>
        <TabBullet>Never use synthetics when bioavailable forms exist</TabBullet>
        <TabBullet>Always show the science</TabBullet>
        <TabBullet>Always give data control</TabBullet>
        <TabBullet>Never stop investing in R&amp;D</TabBullet>
      </ul>

      <TabP>&ldquo;This is not a supplement company. This is a health company that happens to make the best supplements you have ever taken,because they were designed for the only genome that matters: yours.&rdquo;</TabP>

      <TabCTA text={"Join the Precision Health Revolution\nStart Your Journey Today"} />

      <p className="text-base md:text-lg text-[#B87333] italic font-semibold mb-4 text-center">&ldquo;Your DNA has been waiting your whole life for you to read it. Today is the day.&rdquo;</p>
    </div>
  );
}
