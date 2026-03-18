"use client"

import React from "react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Brand Panel */}
      <div className="relative lg:w-[480px] xl:w-[540px] shrink-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 flex flex-col justify-between p-8 lg:p-12 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                ViaConnect
              </h1>
              <p className="text-emerald-100 text-xs font-medium tracking-wider uppercase">
                GeneX360
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden lg:block">
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Clinical-Grade
            <br />
            Precision Health
          </h2>
          <p className="text-emerald-100 text-base leading-relaxed max-w-sm">
            Advanced genomic analytics and precision diagnostics for healthcare
            practitioners. Evidence-based insights powering better patient
            outcomes.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-emerald-50">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-sm">HIPAA-compliant secure platform</span>
            </div>
            <div className="flex items-center gap-3 text-emerald-50">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-sm">360-degree genomic analysis</span>
            </div>
            <div className="flex items-center gap-3 text-emerald-50">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-sm">Real-time clinical decision support</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden lg:block">
          <p className="text-emerald-200 text-xs">
            &copy; {new Date().getFullYear()} ViaConnect Health Technologies.
            All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gray-50/50">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
