'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';

const completedSections = [
  { label: 'Basic Profile', icon: 'person' },
  { label: 'Health Foundation', icon: 'favorite' },
  { label: 'Genetic & Advanced', icon: 'genetics' },
  { label: 'Goals & Preferences', icon: 'flag' },
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-[#06B6D4]' };
  return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
}

export default function AssessmentCompletePage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [optIn, setOptIn] = useState(true);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const firstName = 'Sarah';
  const email = 'sarah@example.com';

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#0A0F1C] to-[#0F172A] px-4 py-8">
      {/* Radial glow behind card */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] opacity-[0.07] blur-[120px]" />

      {/* ViaConnect Logo */}
      <div className="relative z-10 mb-8 flex justify-center">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
            FarmCeutica Wellness LLC
          </span>
          <h2 className="mt-1 text-xl font-bold tracking-tight">
            <span className="text-white">Via</span>
            <span className="bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent">
              Connect
            </span>
            <span className="text-white/60">&trade;</span>
          </h2>
        </div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          {/* Animated checkmark */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/10">
              <span className="material-symbols-outlined text-4xl text-emerald-400">
                check_circle
              </span>
            </div>
          </div>

          <h1 className="text-center font-[Syne] text-4xl font-bold text-white">
            Assessment Complete!
          </h1>
          <p className="mt-3 text-center text-white/60">
            You answered 52 questions across 4 health dimensions.
          </p>

          {/* Completed section badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {completedSections.map((section) => (
              <div
                key={section.label}
                className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                {section.label}
              </div>
            ))}
          </div>

          {/* Results teaser — blurred overlay */}
          <div className="relative mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="absolute inset-0 z-10 flex items-end justify-center bg-gradient-to-t from-[#0A0F1C] via-[#0A0F1C]/80 to-transparent p-4">
              <p className="text-center text-sm font-medium text-[#06B6D4]">
                <span className="material-symbols-outlined mr-1 align-middle text-base">lock</span>
                Create your password to unlock your full results
              </p>
            </div>
            <div className="blur-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
                Health Blueprint Preview
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <div className="font-mono text-2xl font-bold text-white">67</div>
                  <div className="text-[10px] text-white/40">/ 100</div>
                  <div className="mt-1 text-xs text-white/60">Overall</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <div className="font-mono text-2xl font-bold text-amber-400">45</div>
                  <div className="text-[10px] text-white/40">/ 100</div>
                  <div className="mt-1 text-xs text-white/60">Energy</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <div className="font-mono text-2xl font-bold text-[#8B5CF6]">58</div>
                  <div className="text-[10px] text-white/40">/ 100</div>
                  <div className="mt-1 text-xs text-white/60">Cognitive</div>
                </div>
              </div>
            </div>
          </div>

          {/* Password Form */}
          <div className="mt-8 space-y-5">
            <div className="rounded-xl border border-[#06B6D4]/20 bg-[#06B6D4]/5 px-4 py-3 text-center">
              <p className="text-sm text-[#06B6D4]">
                Welcome back, <span className="font-semibold">{firstName}</span>! Create a
                password to secure your results.
              </p>
            </div>

            {/* Email (pre-filled, disabled) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/50 outline-none"
              />
            </div>

            {/* Create Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">
                Create Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= strength.score ? strength.color : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="mt-1 block text-xs text-white/40">
                    Password strength: {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <span className="mt-1 block text-xs text-red-400">Passwords do not match</span>
              )}
            </div>

            {/* Opt-in checkbox */}
            <label className="flex cursor-pointer items-start gap-3">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-white/5 transition-all peer-checked:border-[#06B6D4] peer-checked:bg-[#06B6D4]">
                  {optIn && (
                    <span className="material-symbols-outlined text-sm text-white">check</span>
                  )}
                </div>
              </div>
              <span className="text-sm text-white/50">
                Send me personalized health insights, protocol updates, and wellness tips based
                on my assessment results.
              </span>
            </label>

            {/* CTA */}
            <button className="w-full rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-8 py-4 text-lg font-semibold text-white shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-all hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] hover:scale-[1.01]">
              Create Account &amp; View My Results
              <span className="material-symbols-outlined ml-2 align-middle text-xl">
                arrow_forward
              </span>
            </button>

            <p className="text-center text-xs text-white/30">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-white/50 underline hover:text-white/70">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-white/50 underline hover:text-white/70">
                Privacy Policy
              </Link>
              .
            </p>

            <p className="text-center text-sm text-white/40">
              Already have a ViaConnect account?{' '}
              <Link href="/login" className="text-[#06B6D4] hover:text-[#06B6D4]/80">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
