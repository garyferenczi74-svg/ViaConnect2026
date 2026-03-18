"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface NewPatientForm {
  firstName: string
  lastName: string
  dob: string
  gender: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zip: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
  conditions: string[]
  allergies: string
  currentMedications: string
  currentSupplements: string
  insuranceProvider: string
  policyNumber: string
  groupNumber: string
}

const INITIAL_FORM: NewPatientForm = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  conditions: [],
  allergies: "",
  currentMedications: "",
  currentSupplements: "",
  insuranceProvider: "",
  policyNumber: "",
  groupNumber: "",
}

const CONDITION_OPTIONS = [
  "MTHFR C677T homozygous",
  "MTHFR A1298C heterozygous",
  "COMT Val158Met",
  "CYP2D6 poor metabolizer",
  "CYP2C19 intermediate metabolizer",
  "APOE e4 carrier",
  "VDR Taq polymorphism",
  "FTO rs9939609",
  "Hypothyroidism",
  "Hashimoto's thyroiditis",
  "Type 2 diabetes",
  "Hypertension",
  "Hyperlipidemia",
  "Iron deficiency anemia",
  "Celiac disease",
  "Chronic fatigue syndrome",
  "Anxiety disorder",
  "Depression",
  "Vitamin D deficiency",
  "Chronic kidney disease",
  "Coronary artery disease",
  "Methylation disorder",
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewPatientPage() {
  const [form, setForm] = useState<NewPatientForm>(INITIAL_FORM)

  function update<K extends keyof NewPatientForm>(
    key: K,
    value: NewPatientForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleCondition(condition: string) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter((c) => c !== condition)
        : [...prev.conditions, condition],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // In production this would call an API
    console.log("New patient data:", form)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/patients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            New Patient Registration
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter the patient&apos;s demographic, contact, and medical details
            below.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Demographics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="firstName"
              label="First Name"
              required
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="Jane"
            />
            <Input
              id="lastName"
              label="Last Name"
              required
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              placeholder="Doe"
            />
            <Input
              id="dob"
              label="Date of Birth"
              type="date"
              required
              value={form.dob}
              onChange={(e) => update("dob", e.target.value)}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="gender"
                className="block text-sm font-medium text-gray-700"
              >
                Gender
              </label>
              <Select
                id="gender"
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
                placeholder="Select gender"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="jane.doe@email.com"
              />
              <Input
                id="phone"
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <Input
              id="addressLine1"
              label="Address Line 1"
              value={form.addressLine1}
              onChange={(e) => update("addressLine1", e.target.value)}
              placeholder="123 Main Street"
            />
            <Input
              id="addressLine2"
              label="Address Line 2"
              value={form.addressLine2}
              onChange={(e) => update("addressLine2", e.target.value)}
              placeholder="Apt 4B"
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Input
                id="city"
                label="City"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="San Francisco"
              />
              <Input
                id="state"
                label="State"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                placeholder="CA"
              />
              <Input
                id="zip"
                label="ZIP Code"
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
                placeholder="94103"
              />
            </div>

            <Separator />

            <p className="text-sm font-medium text-gray-700">
              Emergency Contact
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                id="ecName"
                label="Name"
                value={form.emergencyContactName}
                onChange={(e) =>
                  update("emergencyContactName", e.target.value)
                }
                placeholder="John Doe"
              />
              <Input
                id="ecPhone"
                label="Phone"
                type="tel"
                value={form.emergencyContactPhone}
                onChange={(e) =>
                  update("emergencyContactPhone", e.target.value)
                }
                placeholder="(555) 987-6543"
              />
              <Input
                id="ecRelation"
                label="Relationship"
                value={form.emergencyContactRelation}
                onChange={(e) =>
                  update("emergencyContactRelation", e.target.value)
                }
                placeholder="Spouse"
              />
            </div>
          </CardContent>
        </Card>

        {/* Medical History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Medical History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Conditions (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {CONDITION_OPTIONS.map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => toggleCondition(condition)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.conditions.includes(condition)
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="allergies"
                className="block text-sm font-medium text-gray-700"
              >
                Allergies
              </label>
              <textarea
                id="allergies"
                rows={2}
                value={form.allergies}
                onChange={(e) => update("allergies", e.target.value)}
                placeholder="e.g., Penicillin, Sulfa drugs, Latex"
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="medications"
                className="block text-sm font-medium text-gray-700"
              >
                Current Medications
              </label>
              <textarea
                id="medications"
                rows={2}
                value={form.currentMedications}
                onChange={(e) => update("currentMedications", e.target.value)}
                placeholder="e.g., Levothyroxine 50mcg daily, Metformin 500mg BID"
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="supplements"
                className="block text-sm font-medium text-gray-700"
              >
                Current Supplements
              </label>
              <textarea
                id="supplements"
                rows={2}
                value={form.currentSupplements}
                onChange={(e) => update("currentSupplements", e.target.value)}
                placeholder="e.g., Methylfolate 1mg daily, Vitamin D3 5000 IU daily"
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Insurance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Insurance Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              id="insuranceProvider"
              label="Insurance Provider"
              value={form.insuranceProvider}
              onChange={(e) => update("insuranceProvider", e.target.value)}
              placeholder="Blue Cross Blue Shield"
            />
            <Input
              id="policyNumber"
              label="Policy Number"
              value={form.policyNumber}
              onChange={(e) => update("policyNumber", e.target.value)}
              placeholder="BCB-123456789"
            />
            <Input
              id="groupNumber"
              label="Group Number"
              value={form.groupNumber}
              onChange={(e) => update("groupNumber", e.target.value)}
              placeholder="GRP-001"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/patients">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Save Patient
          </Button>
        </div>
      </form>
    </div>
  )
}
