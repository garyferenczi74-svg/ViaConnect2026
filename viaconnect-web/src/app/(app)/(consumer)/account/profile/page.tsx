"use client";

// /account/profile — Prompt #55. Personal info form, password change,
// and danger-zone account deletion. Personal info reads from the
// profiles table; email lives on auth.users.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Check,
  KeyRound,
  Trash2,
  CircleCheck,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmLocationBanner } from "@/components/location/ConfirmLocationBanner";
import { LocationSelector } from "@/components/location/LocationSelector";
import { isCompleteStructuredLocation } from "@/lib/location/signup-schema";
import type { StructuredLocation } from "@/lib/location/types";
import { createClient } from "@/lib/supabase/client";
import { reportSupabaseError } from "@/lib/utils/schema-drift";
import {
  buildProfileSavePayload,
  profileLocationSaveError,
} from "./profile-save-payload";

interface ProfileForm {
  first_name: string;
  last_name: string;
  phone: string;
}

function locationFromRow(row: {
  city?: string | null;
  subdivision_name?: string | null;
  subdivision_code?: string | null;
  country_name?: string | null;
  country_code?: string | null;
  location_is_free_entry?: boolean | null;
}): StructuredLocation | null {
  const city = row.city?.trim() ?? "";
  const countryName = row.country_name?.trim() ?? "";
  const countryCode = row.country_code?.trim() ?? "";
  if (!city && !countryName && !countryCode) {
    return null;
  }
  return {
    city,
    subdivisionName: row.subdivision_name ?? null,
    subdivisionCode: row.subdivision_code ?? null,
    countryName,
    countryCode,
    isFreeEntry: row.location_is_free_entry === true,
  };
}

const EMPTY_PROFILE: ProfileForm = {
  first_name: "",
  last_name: "",
  phone: "",
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [location, setLocation] = useState<StructuredLocation | null>(null);
  const [subdivisionOptional, setSubdivisionOptional] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setEmail(user.email ?? "");
      setEmailVerified(Boolean(user.email_confirmed_at));
      const { data: profileRow } = await (supabase as any)
        .from("profiles")
        .select(
          "full_name, phone, city, subdivision_name, subdivision_code, country_name, country_code, location_is_free_entry, location_needs_confirm",
        )
        .eq("id", user.id)
        .maybeSingle();
      if (profileRow) {
        const fullName = (profileRow.full_name as string | null) ?? "";
        const parts = fullName.trim().split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ") || "";
        setProfile({
          first_name: firstName,
          last_name: lastName,
          phone: (profileRow.phone as string | null) ?? "",
        });
        setLocation(locationFromRow(profileRow));
        setNeedsConfirm(profileRow.location_needs_confirm === true);
      }
      setLoading(false);
    })();
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingProfile(false);
      return;
    }
    // Prompt 210d P0-6: payload built by the pure helper (same keys and value
    // shaping as the former inline literal) so the write-shape test can assert
    // its keys against the live profiles columns plus the P0-6 migration.
    // Prompt 223: complete selector writes structured columns and clears confirm.
    // Incomplete non-null location (typed query, uncommitted city) must not
    // toast success while 223 columns stay unchanged.
    const locationSaveError = profileLocationSaveError(
      location,
      subdivisionOptional,
      needsConfirm,
    );
    if (locationSaveError) {
      setLocationError(locationSaveError);
      setSavingProfile(false);
      return;
    }
    setLocationError("");
    const { error } = await (supabase as any)
      .from("profiles")
      .upsert(
        buildProfileSavePayload({
          userId: user.id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          phone: profile.phone,
          location,
          subdivisionOptional,
        }),
        { onConflict: "id" },
      );
    setSavingProfile(false);
    if (error) {
      toast.error(error.message ?? "Could not save profile");
      // Prompt 210d P0-6: the save error was only ever a toast, so schema
      // drift (profiles.phone absent live) stayed invisible in logs. Report
      // it via the P0-1 classifier after the toast, preserving the existing
      // user-facing flow; production stays fail-open and the strict-mode
      // rethrow cannot engage in the browser bundle. Context carries object
      // names only, never the payload.
      reportSupabaseError("profiles.save", error, { table: "profiles" });
    } else {
      if (isCompleteStructuredLocation(location, subdivisionOptional)) {
        setNeedsConfirm(false);
      }
      toast.success("Profile updated");
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (pwNew !== pwConfirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (pwNew.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message ?? "Could not update password");
    } else {
      toast.success("Password updated");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    }
  }

  async function handleDeleteAccount() {
    // Account deletion requires elevated privileges; this is a UX
    // placeholder that opens a support email until the deletion RPC
    // exists.
    const subject = encodeURIComponent("Account deletion request");
    const body = encodeURIComponent(
      `Please delete my ViaConnect account (${email}).`,
    );
    if (typeof window !== "undefined") {
      window.open(
        `mailto:support@farmceutica.com?subject=${subject}&body=${body}`,
        "_blank",
      );
    }
    setConfirmDelete(false);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
        <Loader2
          className="w-6 h-6 text-white/40 mx-auto animate-spin"
          strokeWidth={1.5}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg sm:text-xl font-bold">Profile</h2>

      {/* Personal info */}
      <form
        onSubmit={handleProfileSave}
        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3"
      >
        <h3 className="text-sm font-semibold text-white mb-1">
          Personal Information
        </h3>
        {needsConfirm ? <ConfirmLocationBanner /> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First Name">
            <input
              type="text"
              value={profile.first_name}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
              className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
            />
          </Field>
          <Field label="Last Name">
            <input
              type="text"
              value={profile.last_name}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
            />
          </Field>
        </div>
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              Email
              {emailVerified && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#7BAE7F]">
                  <CircleCheck className="w-3 h-3" strokeWidth={1.5} />
                  Verified
                </span>
              )}
            </span>
          }
        >
          <input
            type="email"
            value={email}
            disabled
            className="w-full bg-[#1A2744]/50 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/55 outline-none cursor-not-allowed min-h-[40px]"
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
          />
        </Field>
        <LocationSelector
          value={location}
          onChange={(next) => {
            setLocation(next);
            setLocationError("");
          }}
          onSubdivisionOptionalChange={setSubdivisionOptional}
        />
        {locationError ? (
          <p className="text-xs text-red-400">{locationError}</p>
        ) : null}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 transition-all disabled:opacity-60 min-h-[40px]"
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                Saving…
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                Save
              </>
            )}
          </button>
        </div>
      </form>

      {/* Password */}
      <form
        onSubmit={handlePasswordSave}
        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3"
      >
        <h3 className="text-sm font-semibold text-white mb-1 inline-flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
          Change Password
        </h3>
        <Field label="Current Password">
          <input
            type="password"
            value={pwCurrent}
            onChange={(e) => setPwCurrent(e.target.value)}
            autoComplete="current-password"
            className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="New Password">
            <input
              type="password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
            />
          </Field>
          <Field label="Confirm New Password">
            <input
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
            />
          </Field>
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={savingPassword || !pwNew || !pwConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 transition-all disabled:opacity-60 min-h-[40px]"
          >
            {savingPassword ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                Updating…
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5">
        <h3 className="text-sm font-semibold text-red-300 mb-1 inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
          Danger Zone
        </h3>
        <p className="text-xs text-red-300/70 mb-4">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 transition-all min-h-[40px]"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          Delete Account
        </button>
      </div>

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-[#1E3054] p-6 shadow-2xl"
            >
              <h3 className="text-base font-semibold text-white mb-1">
                Delete your account?
              </h3>
              <p className="text-sm text-white/60 mb-5 leading-relaxed">
                Account deletion is processed manually by our support team to
                ensure your data is fully removed across all systems. We'll
                open an email so you can confirm your request.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/90 hover:bg-red-500 transition-all"
                >
                  Email Support
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-white/55 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
