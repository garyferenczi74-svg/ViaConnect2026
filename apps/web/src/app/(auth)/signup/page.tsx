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
import { cn } from "@/lib/utils"

const SPECIALTIES = [
  { value: "", label: "Select your credential" },
  { value: "MD", label: "MD — Doctor of Medicine" },
  { value: "DO", label: "DO — Doctor of Osteopathic Medicine" },
  { value: "RD", label: "RD — Registered Dietitian" },
  { value: "NP", label: "NP — Nurse Practitioner" },
  { value: "PA", label: "PA — Physician Assistant" },
]

interface FormErrors {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
  specialty?: string
  npiNumber?: string
  practiceName?: string
  terms?: string
}

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [specialty, setSpecialty] = useState("")
  const [npiNumber, setNpiNumber] = useState("")
  const [practiceName, setPracticeName] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }

    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password =
        "Password must contain uppercase, lowercase, and a number"
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (!specialty) {
      newErrors.specialty = "Please select your credential"
    }

    if (!npiNumber.trim()) {
      newErrors.npiNumber = "NPI number is required"
    } else if (!/^\d{10}$/.test(npiNumber.trim())) {
      newErrors.npiNumber = "NPI number must be 10 digits"
    }

    if (!practiceName.trim()) {
      newErrors.practiceName = "Practice name is required"
    }

    if (!agreeTerms) {
      newErrors.terms = "You must agree to the terms and conditions"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function clearError(field: keyof FormErrors) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)

    try {
      // TODO: Replace with Supabase auth call
      // const { data, error } = await supabase.auth.signUp({
      //   email,
      //   password,
      //   options: {
      //     data: { full_name: fullName, specialty, npi_number: npiNumber, practice_name: practiceName }
      //   }
      // })
      console.log("Sign up attempt:", {
        fullName,
        email,
        specialty,
        npiNumber,
        practiceName,
      })

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      router.push("/dashboard")
    } catch (error) {
      console.error("Signup failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <title>Create Account | ViaConnect Practitioners Portal</title>
      <meta
        name="description"
        content="Create your ViaConnect GeneX360 practitioners portal account"
      />

      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Join the ViaConnect GeneX360 practitioners network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="fullName"
              label="Full Name"
              type="text"
              placeholder="Dr. Jane Smith"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                clearError("fullName")
              }}
              error={errors.fullName}
              disabled={isLoading}
              autoComplete="name"
            />

            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="practitioner@clinic.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearError("email")
              }}
              error={errors.email}
              disabled={isLoading}
              autoComplete="email"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearError("password")
                }}
                error={errors.password}
                disabled={isLoading}
                autoComplete="new-password"
              />

              <Input
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  clearError("confirmPassword")
                }}
                error={errors.confirmPassword}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            {/* Specialty Dropdown */}
            <div className="space-y-1.5">
              <label
                htmlFor="specialty"
                className="block text-sm font-medium text-gray-700"
              >
                Credential / Specialty
              </label>
              <select
                id="specialty"
                value={specialty}
                onChange={(e) => {
                  setSpecialty(e.target.value)
                  clearError("specialty")
                }}
                disabled={isLoading}
                className={cn(
                  "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50",
                  !specialty && "text-gray-400",
                  errors.specialty &&
                    "border-red-500 focus-visible:ring-red-500"
                )}
              >
                {SPECIALTIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {errors.specialty && (
                <p className="text-xs text-red-500">{errors.specialty}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="npiNumber"
                label="NPI Number"
                type="text"
                placeholder="10-digit NPI"
                value={npiNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10)
                  setNpiNumber(val)
                  clearError("npiNumber")
                }}
                error={errors.npiNumber}
                disabled={isLoading}
                inputMode="numeric"
              />

              <Input
                id="practiceName"
                label="Practice Name"
                type="text"
                placeholder="Your clinic or practice"
                value={practiceName}
                onChange={(e) => {
                  setPracticeName(e.target.value)
                  clearError("practiceName")
                }}
                error={errors.practiceName}
                disabled={isLoading}
              />
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-1.5">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked)
                    clearError("terms")
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-600 leading-snug">
                  I agree to the{" "}
                  <Link
                    href="#"
                    className="text-emerald-600 hover:text-emerald-500 underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="#"
                    className="text-emerald-600 hover:text-emerald-500 underline"
                  >
                    Privacy Policy
                  </Link>
                  , including HIPAA data handling practices.
                </span>
              </label>
              {errors.terms && (
                <p className="text-xs text-red-500">{errors.terms}</p>
              )}
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
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </>
  )
}
