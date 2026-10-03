"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

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
  const redirectTo = searchParams.get("redirectTo");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function getRoleHomePath(role: string | undefined): string {
    switch (role) {
      case "practitioner":
        return "/practitioner/dashboard";
      case "naturopath":
        return "/naturopath/dashboard";
      default:
        return "/dashboard";
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Redirect to correct portal based on role
    const role = data.user?.user_metadata?.role as string | undefined;
    const dest = redirectTo || getRoleHomePath(role);
    router.push(dest);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 md:px-0">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          <span className="text-copper">Via</span>Connect
        </h1>
        <p className="text-gray-400 mt-2 text-sm md:text-base">Sign in to your account</p>
      </div>

      <div className="glass rounded-2xl p-4 md:p-6 lg:p-8 space-y-6">
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 min-h-[44px] bg-dark-surface border border-dark-border rounded-lg px-3 text-base text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-xs text-rose mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-copper hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 min-h-[44px] bg-dark-surface border border-dark-border rounded-lg px-3 pr-10 text-base text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors"
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-rose mt-1">{errors.password}</p>}
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-dark-border bg-dark-surface accent-copper"
            />
            <span className="text-sm text-gray-400">Remember me</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 min-h-[44px] bg-gradient-to-r from-copper to-copper/80 hover:from-copper/90 hover:to-copper/70 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <SocialSignInButtons nextPath={redirectTo} />

        {/* Sign up link */}
        <p className="text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-copper hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
