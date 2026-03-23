"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/store/auth-store";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  UserCircle,
  Stethoscope,
  Leaf,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";

// ─── Schemas ────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const step3Schema = z.object({
  fullName: z.string().min(2, "Name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  phone: z.string().optional(),
  location: z.string().optional(),
});

const step4Schema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
});

// ─── Role cards ─────────────────────────────────────────────────────────────

const ROLES: { value: UserRole; label: string; icon: React.ElementType; color: string; description: string; features: string[] }[] = [
  {
    value: "consumer",
    label: "Personal Wellness",
    icon: UserCircle,
    color: "border-teal text-teal",
    description: "Explore your genetics and get personalized supplement formulations",
    features: ["GeneX360 genetic analysis", "Personalized supplement protocols", "ViaTokens rewards", "AI wellness advisor"],
  },
  {
    value: "practitioner",
    label: "Practitioner",
    icon: Stethoscope,
    color: "border-portal-green text-portal-green",
    description: "Manage patients and access clinical genomic tools",
    features: ["Patient management portal", "Clinical genomics dashboard", "Drug-gene interaction checker", "EHR integration hub"],
  },
  {
    value: "naturopath",
    label: "Naturopath",
    icon: Leaf,
    color: "border-sage text-sage",
    description: "Integrative protocols with genomic-guided botanical wellness",
    features: ["Botanical formula builder", "Constitutional typing", "Compliance tracking", "Appointment scheduler"],
  },
];

// ─── Stepper ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Role" },
  { id: 3, label: "Profile" },
  { id: 4, label: "Verify" },
  { id: 5, label: "Confirm" },
];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((step, i) => {
        const isComplete = current > step.id;
        const isActive = current === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isComplete
                    ? "bg-copper text-white"
                    : isActive
                    ? "bg-copper/20 text-copper border-2 border-copper"
                    : "bg-dark-surface text-gray-500 border border-dark-border"
                }`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span className={`text-[10px] mt-1 ${isActive ? "text-copper" : "text-gray-600"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 mt-[-12px] rounded-full ${isComplete ? "bg-copper" : "bg-dark-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [role, setRole] = useState<UserRole>("consumer");

  // Step 3
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  // Step 4
  const [licenseNumber, setLicenseNumber] = useState("");

  // Step 5 — OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  function validate(): boolean {
    setErrors({});
    if (step === 1) {
      const result = step1Schema.safeParse({ email, password, confirmPassword });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message;
        });
        setErrors(fieldErrors);
        return false;
      }
    }
    if (step === 3) {
      const result = step3Schema.safeParse({ fullName, dob, phone, location });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message;
        });
        setErrors(fieldErrors);
        return false;
      }
    }
    if (step === 4 && role !== "consumer") {
      const result = step4Schema.safeParse({ licenseNumber });
      if (!result.success) {
        setErrors({ licenseNumber: result.error.issues[0].message });
        return false;
      }
    }
    return true;
  }

  async function handleNext() {
    if (!validate()) return;

    // Skip license step for consumers
    if (step === 3 && role === "consumer") {
      await handleSignup();
      return;
    }
    if (step === 4) {
      await handleSignup();
      return;
    }

    setStep((s) => s + 1);
  }

  function handleBack() {
    setErrors({});
    if (step === 4 && role === "consumer") {
      setStep(3);
      return;
    }
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSignup() {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          dob,
          phone: phone || undefined,
          location: location || undefined,
          license_number: role !== "consumer" ? licenseNumber : undefined,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setStep(5);
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    // Auto-focus next input
    if (value && index < 5) {
      const el = document.getElementById(`otp-${index + 1}`);
      el?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const el = document.getElementById(`otp-${index - 1}`);
      el?.focus();
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join("");
    if (code.length < 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("Account verified!");
    if (role === "consumer") {
      router.push("/onboarding/1");
    } else {
      router.push(role === "practitioner" ? "/practitioner/dashboard" : "/naturopath/dashboard");
    }
    router.refresh();
  }

  async function handleResendOtp() {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification code resent! Check your inbox.");
    }
  }

  const inputClass = "w-full h-10 bg-dark-surface border border-dark-border rounded-lg px-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors";
  const errorInputClass = "w-full h-10 bg-dark-surface border border-rose/40 rounded-lg px-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-rose/30 focus:border-rose transition-colors";

  return (
    <>
      {/* Logo */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white">
          <span className="text-copper">Via</span>Connect
        </h1>
        <p className="text-gray-400 mt-2 text-sm">Create your account</p>
      </div>

      <Stepper current={step} />

      <div className="glass rounded-2xl p-8">
        {/* ── Step 1: Email + Password ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? errorInputClass : inputClass} placeholder="you@example.com" />
              {errors.email && <p className="text-xs text-rose mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={errors.password ? errorInputClass + " pr-10" : inputClass + " pr-10"} placeholder="Minimum 8 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose mt-1">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={errors.confirmPassword ? errorInputClass : inputClass} placeholder="Re-enter your password" />
              {errors.confirmPassword && <p className="text-xs text-rose mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>
        )}

        {/* ── Step 2: Role Selection ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 mb-2">Choose your portal experience</p>
            {ROLES.map((r) => {
              const isSelected = role === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? `${r.color} bg-white/[0.03]`
                      : "border-dark-border hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-white/[0.08]" : "bg-dark-surface"}`}>
                      <r.icon className={`w-5 h-5 ${isSelected ? "" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{r.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-copper" />}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {r.features.map((f) => (
                          <span key={f} className="text-[10px] text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-full">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Step 3: Profile Basics ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
              <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={errors.fullName ? errorInputClass : inputClass} placeholder="Your full name" />
              {errors.fullName && <p className="text-xs text-rose mt-1">{errors.fullName}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-gray-300 mb-1.5">Date of Birth</label>
                <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={errors.dob ? errorInputClass : inputClass} />
                {errors.dob && <p className="text-xs text-rose mt-1">{errors.dob}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1.5">Phone <span className="text-gray-600">(optional)</span></label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1.5">Location <span className="text-gray-600">(optional)</span></label>
              <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="City, State" />
            </div>
          </div>
        )}

        {/* ── Step 4: License Verification (Practitioner/Naturopath only) ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-copper/10 border border-copper/20">
              <Shield className="w-5 h-5 text-copper shrink-0" />
              <p className="text-sm text-gray-300">
                {role === "practitioner" ? "Medical" : "Naturopathic"} license verification is required for professional portal access.
              </p>
            </div>
            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-300 mb-1.5">
                License Number
              </label>
              <input
                id="licenseNumber"
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className={errors.licenseNumber ? errorInputClass : inputClass}
                placeholder="Enter your license number"
              />
              {errors.licenseNumber && <p className="text-xs text-rose mt-1">{errors.licenseNumber}</p>}
            </div>
            <p className="text-xs text-gray-500">
              Your license will be verified within 24 hours. You&apos;ll have access to the portal immediately.
            </p>
          </div>
        )}

        {/* ── Step 5: Email Verification OTP ── */}
        {step === 5 && (
          <div className="space-y-6 text-center">
            <div>
              <p className="text-lg font-semibold text-white">Verify your email</p>
              <p className="text-sm text-gray-400 mt-1">
                We sent a 6-digit code to <span className="text-white">{email}</span>
              </p>
            </div>
            <div className="flex justify-center gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-bold bg-dark-surface border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper transition-colors"
                />
              ))}
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={isLoading || otp.join("").length < 6}
              className="w-full h-10 bg-gradient-to-r from-copper to-copper/80 hover:from-copper/90 hover:to-copper/70 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </button>
            <p className="text-xs text-gray-500">
              Didn&apos;t receive the code?{" "}
              <button onClick={handleResendOtp} disabled={isLoading} className="text-copper hover:underline disabled:opacity-50">Resend</button>
            </p>
          </div>
        )}

        {/* ── Navigation buttons ── */}
        {step < 5 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                Already have an account?
              </Link>
            )}
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="flex items-center gap-1.5 h-9 px-5 bg-gradient-to-r from-copper to-copper/80 hover:from-copper/90 hover:to-copper/70 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : step === 3 && role === "consumer" ? (
                "Create Account"
              ) : step === 4 ? (
                "Create Account"
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
