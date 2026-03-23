"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = schema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/profile`,
    });

    if (resetError) {
      toast.error(resetError.message);
      setIsLoading(false);
      return;
    }

    setSent(true);
    setIsLoading(false);
  }

  return (
    <>
      {/* Logo */}
      <div className="text-center mb-8">
        <img src="/logo.png" alt="ViaConnect™" className="h-16 w-auto mx-auto mb-3" />
        <p className="text-gray-400 mt-2 text-sm">Reset your password</p>
      </div>

      <div className="glass rounded-2xl p-8">
        {sent ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 bg-portal-green/15 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-portal-green" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Check your email</p>
              <p className="text-sm text-gray-400 mt-2">
                We sent a password reset link to
              </p>
              <p className="text-sm text-white font-medium mt-1 flex items-center justify-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-copper" />
                {email}
              </p>
            </div>
            <p className="text-xs text-gray-500 pt-2">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                onClick={() => setSent(false)}
                className="text-copper hover:underline"
              >
                try again
              </button>
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mt-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className={`w-full h-10 bg-dark-surface border rounded-lg px-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors ${
                  error
                    ? "border-rose/40 focus:ring-rose/30 focus:border-rose"
                    : "border-dark-border focus:ring-copper/50 focus:border-copper/50"
                }`}
                placeholder="you@example.com"
              />
              {error && <p className="text-xs text-rose mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-gradient-to-r from-copper to-copper/80 hover:from-copper/90 hover:to-copper/70 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <p className="text-center text-sm text-gray-400">
              Remember your password?{" "}
              <Link href="/login" className="text-copper hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </>
  );
}
