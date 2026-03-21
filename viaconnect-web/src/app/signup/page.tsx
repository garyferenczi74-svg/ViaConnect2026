"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/store/auth-store";
import toast from "react-hot-toast";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: "consumer",
    label: "Personal Wellness",
    description: "Explore your genetics and get personalized formulations",
  },
  {
    value: "practitioner",
    label: "Practitioner",
    description: "Manage patients and access clinical genomic tools",
  },
  {
    value: "naturopath",
    label: "Naturopath",
    description: "Integrative protocols with genomic-guided wellness",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("consumer");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("Check your email to confirm your account!");
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            <span className="text-burnt-copper">Via</span>Connect
          </h1>
          <p className="text-gray-400 mt-2">Create your account</p>
        </div>

        <form
          onSubmit={handleSignup}
          className="bg-gray-900 border border-white/10 rounded-2xl p-8 space-y-6"
        >
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-burnt-copper focus:border-transparent"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-burnt-copper focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-burnt-copper focus:border-transparent"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              I am a...
            </label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === r.value
                      ? "border-burnt-copper bg-burnt-copper/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="mt-1 accent-burnt-copper"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">
                      {r.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-burnt-copper hover:bg-copper-400 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-burnt-copper hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
