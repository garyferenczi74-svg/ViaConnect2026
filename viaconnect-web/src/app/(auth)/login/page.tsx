"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">
          <span className="text-copper">Via</span>Connect
        </h1>
        <p className="text-gray-400 mt-2">Sign in to your account</p>
      </div>

      <form
        onSubmit={handleLogin}
        className="glass rounded-2xl p-8 space-y-6"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-copper hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
            placeholder="Your password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-copper hover:bg-copper/80 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-copper hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </>
  );
}
