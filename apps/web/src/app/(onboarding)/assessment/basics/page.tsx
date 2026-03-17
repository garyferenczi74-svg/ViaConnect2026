'use client';

import Link from 'next/link';
import { useState } from 'react';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

const progressSections = [
  { label: 'Basic Profile', step: 1 },
  { label: 'Health Foundation', step: 2 },
  { label: 'Genetic & Advanced', step: 3 },
  { label: 'Goals & Preferences', step: 4 },
];

const nextSteps = [
  'Answer personalized health questions across 4 dimensions',
  'Our AI analyzes your unique health profile',
  'Receive your customized supplement protocol',
  'Track your progress with real-time insights',
];

export default function AssessmentBasicsPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [biologicalSex, setBiologicalSex] = useState<string>('');

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0A0F1C] to-[#0F172A] px-4 py-8">
      {/* Progress Bar */}
      <div className="mx-auto mb-8 max-w-3xl">
        <div className="mb-2 text-center text-sm font-medium text-white/50">
          Section 1 of 4
        </div>
        <div className="flex gap-2">
          {progressSections.map((section) => (
            <div key={section.step} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  section.step === 1
                    ? 'bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6]'
                    : 'bg-white/10'
                }`}
              />
              <span className="mt-1 block text-center text-[11px] text-white/40">
                {section.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-6 lg:flex-row">
        {/* Main Form Card */}
        <div className="flex-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <h1 className="font-[Syne] text-[28px] font-bold text-white">
              Let&apos;s Start With the Basics
            </h1>
            <p className="mt-2 text-sm text-white/60">
              This information creates your secure ViaConnect account and helps us personalize
              your health assessment. All data is encrypted end-to-end.
            </p>

            {/* HIPAA Badge */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
              <span className="material-symbols-outlined text-base">lock</span>
              Your data is encrypted and HIPAA protected
            </div>

            {/* Form */}
            <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
              {/* Row 1: Names */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/70">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/70">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/50"
                  />
                </div>
              </div>

              {/* Row 2: Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/50"
                />
              </div>

              {/* Row 3: Date of Birth */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">
                  Date of Birth
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none backdrop-blur-sm transition-all focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/50 [&>option]:bg-[#0F172A] [&>option]:text-white"
                  >
                    <option value="" disabled>
                      Month
                    </option>
                    {months.map((m, i) => (
                      <option key={m} value={String(i + 1)}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none backdrop-blur-sm transition-all focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/50 [&>option]:bg-[#0F172A] [&>option]:text-white"
                  >
                    <option value="" disabled>
                      Day
                    </option>
                    {days.map((d) => (
                      <option key={d} value={String(d)}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none backdrop-blur-sm transition-all focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/50 [&>option]:bg-[#0F172A] [&>option]:text-white"
                  >
                    <option value="" disabled>
                      Year
                    </option>
                    {years.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Biological Sex */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">
                  Biological Sex
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'male', label: 'Male', icon: 'male' },
                    { value: 'female', label: 'Female', icon: 'female' },
                    { value: 'unspecified', label: 'Prefer not to say', icon: 'person' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBiologicalSex(option.value)}
                      className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 transition-all ${
                        biologicalSex === option.value
                          ? 'border-[#06B6D4] bg-[#06B6D4]/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="material-symbols-outlined">{option.icon}</span>
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-[#0A0F1C] px-4 text-white/40">or continue with</span>
                </div>
              </div>

              {/* Social Auth */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Apple
                </button>
              </div>

              <p className="text-center text-xs text-white/40">
                You&apos;ll create a password after completing the assessment to secure your
                results.
              </p>

              {/* Continue Button */}
              <div className="flex items-center justify-between pt-2">
                <Link href="/login" className="text-sm text-white/50 hover:text-[#06B6D4]">
                  Already have an account? Sign In
                </Link>
                <Link
                  href="/assessment/health"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:scale-[1.02]"
                >
                  Continue to Health Assessment
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Side Card */}
        <div className="w-full lg:w-80">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="font-[Syne] text-lg font-bold text-white">What happens next?</h3>
            <div className="mt-4 space-y-4">
              {nextSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-lg text-emerald-400">
                    check_circle
                  </span>
                  <span className="text-sm leading-relaxed text-white/60">{step}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-[#06B6D4]/20 bg-[#06B6D4]/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[#06B6D4]">
                <span className="material-symbols-outlined text-base">timer</span>
                Takes about 10 minutes
              </div>
              <p className="mt-1 text-xs text-white/40">
                You can save your progress and return anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
