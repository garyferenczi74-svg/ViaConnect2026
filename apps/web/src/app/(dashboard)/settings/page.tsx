"use client"

import { useState } from "react"
import {
  User,
  Building2,
  Bell,
  ShieldCheck,
  CreditCard,
  Upload,
  Check,
  Monitor,
  Smartphone,
  MapPin,
  Clock,
  Eye,
  EyeOff,
  LogOut,
  ChevronRight,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Select, SelectOption } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationSetting {
  id: string
  label: string
  description: string
  enabled: boolean
}

interface ActiveSession {
  id: string
  device: string
  location: string
  lastActive: string
  current: boolean
  icon: "desktop" | "mobile"
}

interface LoginRecord {
  id: string
  date: string
  ip: string
  location: string
  device: string
  status: "Success" | "Failed"
}

interface BillingRecord {
  id: string
  date: string
  description: string
  amount: string
  status: "Paid" | "Pending" | "Failed"
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const initialNotifications: NotificationSetting[] = [
  { id: "email", label: "Email Notifications", description: "Receive email updates for important events", enabled: true },
  { id: "sms", label: "SMS Alerts", description: "Critical alerts sent via text message", enabled: true },
  { id: "patient-updates", label: "Patient Updates", description: "Notifications when patient records are updated", enabled: true },
  { id: "lab-results", label: "Lab Results Ready", description: "Alert when new lab results are available for review", enabled: true },
  { id: "drug-interactions", label: "Drug Interaction Alerts", description: "Warnings for potential drug interactions in prescriptions", enabled: true },
  { id: "protocol-reminders", label: "Protocol Reminders", description: "Reminders for upcoming protocol milestones and follow-ups", enabled: false },
  { id: "cme-deadlines", label: "CME Deadlines", description: "Alerts for continuing medical education credit deadlines", enabled: false },
  { id: "system-updates", label: "System Updates", description: "Platform maintenance and feature release notifications", enabled: false },
]

const activeSessions: ActiveSession[] = [
  { id: "s1", device: "Chrome on macOS", location: "San Francisco, CA", lastActive: "Current session", current: true, icon: "desktop" },
  { id: "s2", device: "Safari on iPhone", location: "San Francisco, CA", lastActive: "2 hours ago", current: false, icon: "mobile" },
  { id: "s3", device: "Firefox on Windows", location: "New York, NY", lastActive: "1 day ago", current: false, icon: "desktop" },
]

const loginHistory: LoginRecord[] = [
  { id: "l1", date: "2026-03-18 09:12 AM", ip: "192.168.1.45", location: "San Francisco, CA", device: "Chrome / macOS", status: "Success" },
  { id: "l2", date: "2026-03-17 08:30 PM", ip: "10.0.0.12", location: "San Francisco, CA", device: "Safari / iOS", status: "Success" },
  { id: "l3", date: "2026-03-17 03:15 PM", ip: "192.168.1.45", location: "San Francisco, CA", device: "Chrome / macOS", status: "Success" },
  { id: "l4", date: "2026-03-16 11:42 AM", ip: "203.45.67.89", location: "Unknown", device: "Firefox / Windows", status: "Failed" },
  { id: "l5", date: "2026-03-16 09:00 AM", ip: "192.168.1.45", location: "San Francisco, CA", device: "Chrome / macOS", status: "Success" },
]

const billingHistory: BillingRecord[] = [
  { id: "b1", date: "2026-03-01", description: "Practitioner Plan - Monthly", amount: "$128.88", status: "Paid" },
  { id: "b2", date: "2026-02-01", description: "Practitioner Plan - Monthly", amount: "$128.88", status: "Paid" },
  { id: "b3", date: "2026-01-01", description: "Practitioner Plan - Monthly", amount: "$128.88", status: "Paid" },
  { id: "b4", date: "2025-12-01", description: "Practitioner Plan - Monthly", amount: "$128.88", status: "Paid" },
  { id: "b5", date: "2025-11-01", description: "Practitioner Plan - Monthly", amount: "$128.88", status: "Paid" },
]

const planFeatures = [
  "Unlimited patient records",
  "GeneX360 genomic analysis",
  "FHIR/EHR integration",
  "Drug interaction checking",
  "Protocol management",
  "CME tracking",
  "Priority support",
  "HIPAA-compliant messaging",
]

const operatingHours = [
  { day: "Monday", open: "08:00", close: "17:00", active: true },
  { day: "Tuesday", open: "08:00", close: "17:00", active: true },
  { day: "Wednesday", open: "08:00", close: "17:00", active: true },
  { day: "Thursday", open: "08:00", close: "17:00", active: true },
  { day: "Friday", open: "08:00", close: "16:00", active: true },
  { day: "Saturday", open: "09:00", close: "12:00", active: false },
  { day: "Sunday", open: "", close: "", active: false },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Profile state
  const [fullName, setFullName] = useState("Dr. Sarah Mitchell")
  const [email, setEmail] = useState("s.mitchell@viaconnect.health")
  const [phone, setPhone] = useState("(415) 555-0198")
  const [specialty, setSpecialty] = useState("Functional Medicine")
  const [npiNumber, setNpiNumber] = useState("1234567890")
  const [licenseNumber, setLicenseNumber] = useState("MD-2019-045821")
  const [stateOfPractice, setStateOfPractice] = useState("California")
  const [bio, setBio] = useState("Board-certified in functional and integrative medicine with over 12 years of clinical experience. Specializing in genomic-guided treatment protocols, methylation disorders, and personalized wellness optimization.")

  // Practice state
  const [practiceName, setPracticeName] = useState("Bay Area Functional Medicine")
  const [practiceAddress, setPracticeAddress] = useState("450 Sutter St, Suite 840, San Francisco, CA 94108")
  const [practicePhone, setPracticePhone] = useState("(415) 555-0200")
  const [practiceFax, setPracticeFax] = useState("(415) 555-0201")
  const [practiceWebsite, setPracticeWebsite] = useState("https://bayareafunctional.com")
  const [practiceType, setPracticeType] = useState("group")
  const [practiceEhr, setPracticeEhr] = useState("epic")
  const [hours, setHours] = useState(operatingHours)

  // Notifications state
  const [notifications, setNotifications] = useState(initialNotifications)

  // Security state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)

  const handleToggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    )
  }

  const handleToggleDay = (index: number) => {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, active: !h.active } : h))
    )
  }

  const handleHourChange = (index: number, field: "open" | "close", value: string) => {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">Manage your account, practice, and application preferences</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-1.5 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="practice">
            <Building2 className="mr-1.5 h-4 w-4" />
            Practice
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-1.5 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-1.5 h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal and professional details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
                  SM
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </Button>
                  <p className="mt-1.5 text-xs text-gray-500">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="full-name"
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                  id="email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  id="phone"
                  label="Phone Number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  id="specialty"
                  label="Specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                />
                <Input
                  id="npi"
                  label="NPI Number"
                  value={npiNumber}
                  onChange={(e) => setNpiNumber(e.target.value)}
                />
                <Input
                  id="license"
                  label="License Number"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
                <Input
                  id="state"
                  label="State of Practice"
                  value={stateOfPractice}
                  onChange={(e) => setStateOfPractice(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button>
                <Check className="h-4 w-4" />
                Save Profile
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── Practice Tab ────────────────────────────────────────────────── */}
        <TabsContent value="practice">
          <Card>
            <CardHeader>
              <CardTitle>Practice Information</CardTitle>
              <CardDescription>Manage your practice details and operating hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    id="practice-name"
                    label="Practice Name"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    id="practice-address"
                    label="Address"
                    value={practiceAddress}
                    onChange={(e) => setPracticeAddress(e.target.value)}
                  />
                </div>
                <Input
                  id="practice-phone"
                  label="Phone"
                  type="tel"
                  value={practicePhone}
                  onChange={(e) => setPracticePhone(e.target.value)}
                />
                <Input
                  id="practice-fax"
                  label="Fax"
                  type="tel"
                  value={practiceFax}
                  onChange={(e) => setPracticeFax(e.target.value)}
                />
                <Input
                  id="practice-website"
                  label="Website"
                  type="url"
                  value={practiceWebsite}
                  onChange={(e) => setPracticeWebsite(e.target.value)}
                />
                <div className="space-y-1.5">
                  <label htmlFor="practice-type" className="block text-sm font-medium text-gray-700">
                    Practice Type
                  </label>
                  <Select
                    id="practice-type"
                    value={practiceType}
                    onChange={(e) => setPracticeType(e.target.value)}
                  >
                    <SelectOption value="solo">Solo Practice</SelectOption>
                    <SelectOption value="group">Group Practice</SelectOption>
                    <SelectOption value="hospital">Hospital Affiliated</SelectOption>
                    <SelectOption value="academic">Academic Medical Center</SelectOption>
                    <SelectOption value="telehealth">Telehealth Only</SelectOption>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="practice-ehr" className="block text-sm font-medium text-gray-700">
                    EHR System
                  </label>
                  <Select
                    id="practice-ehr"
                    value={practiceEhr}
                    onChange={(e) => setPracticeEhr(e.target.value)}
                  >
                    <SelectOption value="epic">Epic</SelectOption>
                    <SelectOption value="cerner">Cerner</SelectOption>
                    <SelectOption value="athena">Athena Health</SelectOption>
                    <SelectOption value="allscripts">AllScripts</SelectOption>
                    <SelectOption value="other">Other</SelectOption>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Operating Hours */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-700">Operating Hours</h3>
                <div className="space-y-2">
                  {hours.map((h, index) => (
                    <div
                      key={h.day}
                      className="flex items-center gap-4 rounded-lg border border-gray-100 p-3"
                    >
                      <label className="flex w-28 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={h.active}
                          onChange={() => handleToggleDay(index)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-500 accent-emerald-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{h.day}</span>
                      </label>
                      {h.active ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={h.open}
                            onChange={(e) => handleHourChange(index, "open", e.target.value)}
                            className="rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-400">to</span>
                          <input
                            type="time"
                            value={h.close}
                            onChange={(e) => handleHourChange(index, "close", e.target.value)}
                            className="rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>
                <Check className="h-4 w-4" />
                Save Practice Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── Notifications Tab ───────────────────────────────────────────── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between rounded-lg p-4 transition-colors hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{notification.label}</p>
                      <p className="text-sm text-gray-500">{notification.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notification.enabled}
                      onClick={() => handleToggleNotification(notification.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                        notification.enabled ? "bg-emerald-500" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notification.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ────────────────────────────────────────────────── */}
        <TabsContent value="security">
          <div className="space-y-6">
            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-md space-y-4">
                  <div className="relative">
                    <Input
                      id="current-password"
                      label="Current Password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="new-password"
                      label="New Password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Input
                    id="confirm-password"
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Update Password</Button>
              </CardFooter>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>Add an extra layer of security to your account</CardDescription>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={twoFactorEnabled}
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                      twoFactorEnabled ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        twoFactorEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </CardHeader>
              {twoFactorEnabled && (
                <CardContent>
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Two-factor authentication is enabled</p>
                      <p className="text-sm text-emerald-600">Your account is secured with authenticator app verification.</p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Devices currently logged into your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
                    >
                      <div className="flex items-center gap-3">
                        {session.icon === "desktop" ? (
                          <Monitor className="h-5 w-5 text-gray-500" />
                        ) : (
                          <Smartphone className="h-5 w-5 text-gray-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{session.device}</p>
                            {session.current && (
                              <Badge variant="success">Current</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {session.lastActive}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!session.current && (
                        <Button variant="ghost" size="sm">
                          <LogOut className="h-4 w-4" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Login History */}
            <Card>
              <CardHeader>
                <CardTitle>Login History</CardTitle>
                <CardDescription>Recent login activity on your account</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-gray-600">{record.date}</TableCell>
                        <TableCell>
                          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{record.ip}</code>
                        </TableCell>
                        <TableCell className="text-gray-600">{record.location}</TableCell>
                        <TableCell className="text-gray-600">{record.device}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "Success" ? "success" : "destructive"}>
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Billing Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="billing">
          <div className="space-y-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Your active subscription</CardDescription>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Practitioner Plan</h3>
                    <p className="mt-1 text-3xl font-bold text-emerald-600">
                      $128.88<span className="text-base font-normal text-gray-500">/mo</span>
                    </p>
                    <p className="mt-2 text-sm text-gray-500">Billed monthly. Next billing date: April 1, 2026</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {planFeatures.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="gap-3">
                <Button>
                  <ChevronRight className="h-4 w-4" />
                  Upgrade Plan
                </Button>
                <Button variant="outline">Cancel Subscription</Button>
              </CardFooter>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Manage your payment information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-16 items-center justify-center rounded-md bg-gradient-to-r from-blue-600 to-blue-800 text-xs font-bold text-white">
                      VISA
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Visa ending in 4242</p>
                      <p className="text-xs text-gray-500">Expires 09/2028</p>
                    </div>
                  </div>
                  <Badge variant="success">Default</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">
                  <CreditCard className="h-4 w-4" />
                  Update Payment Method
                </Button>
              </CardFooter>
            </Card>

            {/* Billing History */}
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>Your recent invoices and payments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-gray-600">{record.date}</TableCell>
                        <TableCell className="font-medium text-gray-900">{record.description}</TableCell>
                        <TableCell className="text-gray-900">{record.amount}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "Paid" ? "success" : record.status === "Pending" ? "warning" : "destructive"}>
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
