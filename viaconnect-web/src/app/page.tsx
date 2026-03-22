"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";

export default function HomePage() {
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Header slides down
      tl.from(headerRef.current, {
        y: -40,
        opacity: 0,
        duration: 0.6,
      });

      // Logo scales in with a gentle pulse
      tl.from(
        logoRef.current,
        {
          scale: 0.6,
          opacity: 0,
          duration: 1,
          ease: "back.out(1.4)",
        },
        "-=0.2"
      );

      // Heading fades up
      tl.from(
        headingRef.current,
        {
          y: 30,
          opacity: 0,
          duration: 0.8,
        },
        "-=0.4"
      );

      // Subtext fades up
      tl.from(
        subtextRef.current,
        {
          y: 20,
          opacity: 0,
          duration: 0.7,
        },
        "-=0.3"
      );

      // CTA buttons stagger in
      tl.from(
        ctaRef.current?.children ?? [],
        {
          y: 20,
          opacity: 0,
          duration: 0.5,
          stagger: 0.15,
        },
        "-=0.3"
      );

      // Footer fades in
      tl.from(
        footerRef.current,
        {
          opacity: 0,
          duration: 0.5,
        },
        "-=0.2"
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col">
      <header
        ref={headerRef}
        className="border-b border-white/10 px-6 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="ViaConnect"
            width={48}
            height={48}
            priority
          />
          <span className="text-xs bg-teal/50 text-white px-2 py-0.5 rounded-full">
            GeneX360
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-copper hover:bg-copper/80 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pt-12">
        <div className="max-w-2xl text-center">
          <div ref={logoRef} className="flex justify-center mb-8">
            <Image
              src="/logo.svg"
              alt="ViaConnect"
              width={200}
              height={220}
              priority
            />
          </div>
          <h1
            ref={headingRef}
            className="text-5xl font-bold mb-6 leading-tight"
          >
            One Genome. One Formulation.{" "}
            <span className="text-copper">One Life at a Time.</span>
          </h1>
          <p
            ref={subtextRef}
            className="text-lg text-gray-400 mb-8 leading-relaxed"
          >
            Precision health powered by your unique genetic profile. Discover
            personalized supplement formulations with 10&ndash;27x
            bioavailability.
          </p>
          <div ref={ctaRef} className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-copper hover:bg-copper/80 text-white px-8 py-3 rounded-xl font-medium transition-colors"
            >
              Start Your Journey
            </Link>
            <Link
              href="/login"
              className="border border-white/20 hover:border-white/40 text-white px-8 py-3 rounded-xl font-medium transition-colors"
            >
              Practitioner Portal
            </Link>
          </div>
        </div>
      </main>

      <footer
        ref={footerRef}
        className="border-t border-white/10 px-6 py-4 text-center text-sm text-gray-500"
      >
        &copy; {new Date().getFullYear()} FarmCeutica Wellness LLC, Buffalo NY.
        All rights reserved.
      </footer>
    </div>
  );
}
