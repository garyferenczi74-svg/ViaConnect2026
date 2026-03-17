'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const dots: { x: number; y: number; vx: number; vy: number; radius: number; color: string }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 80; i++) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? '#06B6D4' : '#8B5CF6',
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();

        for (let j = i + 1; j < dots.length; j++) {
          const other = dots[j];
          const dist = Math.hypot(dot.x - other.x, dot.y - other.y);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(dot.x, dot.y);
            ctx.lineTo(other.x, other.y);
            const gradient = ctx.createLinearGradient(dot.x, dot.y, other.x, other.y);
            gradient.addColorStop(0, '#06B6D4');
            gradient.addColorStop(1, '#8B5CF6');
            ctx.strokeStyle = gradient;
            ctx.globalAlpha = 0.12 * (1 - dist / 150);
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
      style={{ opacity: 0.3 }}
    />
  );
}

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0A0F1C] to-[#0F172A]">
      {/* Floating blur orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-[#06B6D4] opacity-10 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/3 h-[400px] w-[400px] rounded-full bg-[#8B5CF6] opacity-10 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/2 top-2/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-[#06B6D4] opacity-[0.06] blur-[100px]" />

      {/* Constellation background */}
      <ConstellationCanvas />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-4 py-8">
        {/* Top branding */}
        <div className="flex flex-col items-center pt-8">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
            FarmCeutica Wellness LLC
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            <span className="text-white">Via</span>
            <span className="bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent">
              Connect
            </span>
            <span className="text-white/60">&trade;</span>
          </h2>
        </div>

        {/* Hero section */}
        <div className="flex max-w-4xl flex-col items-center text-center">
          <h1 className="font-[Syne] text-[40px] font-bold leading-tight md:text-[64px]">
            <span className="text-white">Discover Your Personalized</span>
            <br />
            <span className="bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent">
              Health Blueprint
            </span>
            <br />
            <span className="text-white">in 10 Minutes</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/70">
            Answer science-backed questions. Get precision insights. Access your customized
            supplement protocol.
          </p>

          {/* Primary CTA */}
          <Link
            href="/assessment/basics"
            className="mt-10 flex w-[280px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-8 py-4 text-lg font-semibold text-white shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] hover:scale-[1.02]"
          >
            Start Your Journey
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </Link>

          {/* What You'll Discover */}
          <div className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.08]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#06B6D4]/20 to-[#8B5CF6]/20">
                <span className="material-symbols-outlined text-[#06B6D4]">genetics</span>
              </div>
              <h3 className="font-[Syne] text-lg font-bold text-white">Genetic Insights</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                Understand how your unique genetic profile influences nutrient absorption,
                metabolism, and overall wellness potential.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.08]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#06B6D4]/20 to-[#8B5CF6]/20">
                <span className="material-symbols-outlined text-[#8B5CF6]">psychology</span>
              </div>
              <h3 className="font-[Syne] text-lg font-bold text-white">AI Protocol</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                Receive a precision supplement protocol generated by AI, tailored to your
                health profile, goals, and biochemistry.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.08]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#06B6D4]/20 to-[#8B5CF6]/20">
                <span className="material-symbols-outlined text-[#06B6D4]">monitoring</span>
              </div>
              <h3 className="font-[Syne] text-lg font-bold text-white">Track Outcomes</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                Monitor your progress with real-time biomarker tracking, adaptive
                recommendations, and measurable health improvements.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex w-full max-w-4xl flex-col items-center gap-6 pb-4">
          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/40">
            <span>Developed by genetic researchers</span>
            <span className="hidden sm:inline">·</span>
            <span>HIPAA compliant</span>
            <span className="hidden sm:inline">·</span>
            <span>48,000+ users</span>
            <span className="hidden sm:inline">·</span>
            <span>10-27x Bioavailability</span>
            <span className="hidden sm:inline">·</span>
            <span>GMP Certified</span>
          </div>

          {/* Practitioner / Naturopath links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/practitioner"
              className="text-white/50 transition-colors hover:text-emerald-400"
            >
              Are you a Practitioner?
            </Link>
            <Link
              href="/naturopath"
              className="text-white/50 transition-colors hover:text-amber-400"
            >
              Are you a Naturopath?
            </Link>
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center gap-2 text-sm text-white/40">
            <span>
              Already have an account?{' '}
              <Link href="/login" className="text-[#06B6D4] transition-colors hover:text-[#06B6D4]/80">
                Sign In
              </Link>
            </span>
            <span className="text-xs text-white/20">
              &copy; 2026 FarmCeutica Wellness LLC. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
