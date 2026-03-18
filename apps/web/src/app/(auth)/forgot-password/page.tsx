"use client"

import React, { useState, FormEvent } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  function validate(): boolean {
    if (!email.trim()) {
      setError("Email is required")
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      return false
    }
    setError("")
    return true
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)

    try {
      // TODO: Replace with Supabase auth call
      // const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      //   redirectTo: `${window.location.origin}/reset-password`,
      // })
      console.log("Password reset requested for:", email)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setIsSubmitted(true)
    } catch (err) {
      console.error("Password reset failed:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <>
        <title>Check Your Email | ViaConnect Practitioners Portal</title>
        <meta
          name="description"
          content="Password reset instructions have been sent to your email"
        />

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <svg
                className="h-7 w-7 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl text-center">
              Check your email
            </CardTitle>
            <CardDescription className="text-center">
              We&apos;ve sent password reset instructions to{" "}
              <span className="font-medium text-gray-700">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-sm text-emerald-800 leading-relaxed">
                If an account exists with that email address, you will receive a
                password reset link shortly. Please check your inbox and spam
                folder.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full h-11"
              size="lg"
              onClick={() => {
                setIsSubmitted(false)
                setEmail("")
              }}
            >
              Try a different email
            </Button>

            <p className="text-center text-sm text-gray-500">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
              >
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <title>Forgot Password | ViaConnect Practitioners Portal</title>
      <meta
        name="description"
        content="Reset your ViaConnect GeneX360 practitioners portal password"
      />

      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <svg
              className="h-7 w-7 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl text-center">
            Forgot your password?
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
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
                if (error) setError("")
              }}
              error={error}
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />

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
                  Sending reset link...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </>
  )
}
