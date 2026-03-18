"use client"

import React, { useState, FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  function validate(): boolean {
    const newErrors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)

    try {
      // TODO: Replace with Supabase auth call
      // const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      console.log("Sign in attempt:", { email, rememberMe })

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      router.push("/dashboard")
    } catch (error) {
      console.error("Login failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSSOLogin() {
    // TODO: Replace with Supabase SSO / OAuth
    // const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'azure' })
    console.log("SSO login initiated")
  }

  return (
    <>
      <title>Sign In | ViaConnect Practitioners Portal</title>
      <meta
        name="description"
        content="Sign in to your ViaConnect GeneX360 practitioners portal"
      />

      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your practitioners portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="practitioner@clinic.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              error={errors.email}
              disabled={isLoading}
              autoComplete="email"
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
              }}
              error={errors.password}
              disabled={isLoading}
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* SSO Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            size="lg"
            onClick={handleSSOLogin}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Single Sign-On (SSO)
          </Button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </>
  )
}
