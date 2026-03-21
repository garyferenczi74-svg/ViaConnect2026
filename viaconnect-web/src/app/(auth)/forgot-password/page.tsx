"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/profile`,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    setSent(true);
    setIsLoading(false);
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">
          <span className="text-copper">Via</span>Connect
        </h1>
        <p className="text-gray-400 mt-2">Reset your password</p>
      </div>

      <div className="glass rounded-2xl p-8">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-portal-green/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-portal-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-medium">Check your email</p>
            <p className="text-sm text-gray-400">
              We sent a password reset link to <span className="text-white">{email}</span>
            </p>
            <Link href="/login" className="block text-sm text-copper hover:underline mt-4">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-copper hover:bg-copper/80 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>

            <p className="text-center text-sm text-gray-400">
              Remember your password?{" "}
              <Link href="/login" className="text-copper hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </>
  );
}
