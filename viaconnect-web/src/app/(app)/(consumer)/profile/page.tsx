"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Conversation } from "@/lib/supabase/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Crown,
  Bell,
  Users,
  Download,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { PageTransition, StaggerChild, MotionCard } from "@/lib/motion";

const supabase = createClient();

const notificationPrefs = [
  { key: "supplement_reminders", label: "Supplement Reminders", icon: Bell },
  { key: "genetic_insights", label: "New Genetic Insights", icon: Bell },
  { key: "token_updates", label: "ViaTokens Updates", icon: Bell },
  { key: "practitioner_messages", label: "Practitioner Messages", icon: Bell },
  { key: "promotions", label: "Promotional Offers", icon: Bell },
];

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    date_of_birth: "",
    address: "",
  });
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    supplement_reminders: true,
    genetic_insights: true,
    token_updates: true,
    practitioner_messages: true,
    promotions: false,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setFormData({
          full_name: user.user_metadata?.full_name ?? "",
          phone: user.user_metadata?.phone ?? "",
          date_of_birth: user.user_metadata?.date_of_birth ?? "",
          address: user.user_metadata?.address ?? "",
        });
      }
    });
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      return data as Profile | null;
    },
    enabled: !!userId,
  });

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  type PractitionerInfo = { id: string; full_name: string | null; avatar_url: string | null; role: string };

  // Connected practitioners
  const { data: practitioners } = useQuery({
    queryKey: ["connected-practitioners", userId],
    queryFn: async () => {
      const { data: convos } = await supabase
        .from("conversations")
        .select("practitioner_id")
        .eq("patient_id", userId!);
      const rows = (convos ?? []) as Pick<Conversation, "practitioner_id">[];
      if (rows.length === 0) return [] as PractitionerInfo[];

      const ids = rows.map((c) => c.practitioner_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("id", ids);
      return (profiles ?? []) as PractitionerInfo[];
    },
    enabled: !!userId,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: data.full_name,
          phone: data.phone,
          date_of_birth: data.date_of_birth,
          address: data.address,
        },
      });
      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ full_name: data.full_name })
        .eq("id", userId!);
    },
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const email = user?.email ?? "";

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <StaggerChild>
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage your personal information, subscription, and preferences.
        </p>
      </StaggerChild>

      <StaggerChild className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Personal Info */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                Personal Information
              </h3>
              <Button
                size="sm"
                variant={editing ? "primary" : "secondary"}
                onClick={() => {
                  if (editing) {
                    updateProfile.mutate(formData);
                  } else {
                    setEditing(true);
                  }
                }}
                disabled={updateProfile.isPending}
              >
                {editing ? "Save Changes" : "Edit"}
              </Button>
            </div>

            {profileLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : editing ? (
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400">Email</label>
                  <div className="h-10 px-3 flex items-center rounded-lg text-sm text-gray-500 bg-white/[0.02] border border-white/[0.06]">
                    {email}
                  </div>
                </div>
                <Input
                  label="Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
                <Input
                  label="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { icon: User, label: "Name", value: profile?.full_name ?? (formData.full_name || "Not provided") },
                  { icon: Mail, label: "Email", value: email },
                  { icon: Phone, label: "Phone", value: formData.phone || "Not provided" },
                  { icon: Calendar, label: "Date of Birth", value: formData.date_of_birth || "Not provided" },
                  { icon: MapPin, label: "Address", value: formData.address || "Not provided" },
                ].map((field) => (
                  <div key={field.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                      <field.icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{field.label}</p>
                      <p className="text-sm text-white">{field.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: Settings Cards */}
        <div className="space-y-6">
          {/* Membership */}
          <MotionCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-portal-yellow" />
              <h3 className="text-lg font-semibold text-white">Membership</h3>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] mb-4">
              <div>
                <p className="text-sm text-white font-medium">Free Plan</p>
                <p className="text-xs text-gray-500">Basic access to genetic insights</p>
              </div>
              <Badge variant="neutral">Current</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-copper/20 bg-copper/5">
                <p className="text-sm font-semibold text-white">Gold</p>
                <p className="text-copper font-bold">$8.88/mo</p>
                <p className="text-[10px] text-gray-400 mt-1">Insights + ViaTokens</p>
              </div>
              <div className="p-3 rounded-xl border border-plum/20 bg-plum/5">
                <p className="text-sm font-semibold text-white">Platinum</p>
                <p className="text-plum font-bold">$28.88/mo</p>
                <p className="text-[10px] text-gray-400 mt-1">Full access + AI</p>
              </div>
            </div>
            <Button variant="primary" size="sm" className="w-full mt-4">
              Upgrade Plan
            </Button>
          </MotionCard>

          {/* Notification Preferences */}
          <MotionCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
            </div>
            <div className="space-y-3">
              {notificationPrefs.map((pref) => {
                const enabled = notifPrefs[pref.key] ?? false;
                return (
                  <div key={pref.key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-300">{pref.label}</span>
                    <button
                      onClick={() => {
                        setNotifPrefs({ ...notifPrefs, [pref.key]: !enabled });
                        toast.success(`${pref.label} ${!enabled ? "enabled" : "disabled"}`);
                      }}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        enabled ? "bg-portal-green" : "bg-white/[0.08]"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                          enabled ? "left-5.5 right-0.5" : "left-0.5"
                        }`}
                        style={{ left: enabled ? "calc(100% - 18px)" : "2px" }}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </MotionCard>

          {/* Connected Practitioners */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Connected Practitioners</h3>
            </div>
            {(practitioners ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">
                No practitioners connected. Ask your practitioner for an invite code.
              </p>
            ) : (
              <div className="space-y-2">
                {(practitioners ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06]"
                  >
                    <div className="w-8 h-8 rounded-full bg-teal/20 flex items-center justify-center">
                      <span className="text-teal text-xs font-bold">
                        {p.full_name?.charAt(0) ?? "?"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{p.full_name ?? "Unknown"}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{p.role}</p>
                    </div>
                    <Link href="/messages" className="text-xs text-copper hover:underline">
                      Message
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Data Export */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Data Export</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Download a copy of your health data, genetic results, and account information.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast.success("Data export requested. Check your email.")}
            >
              <Download className="w-4 h-4 mr-2" />
              Request Data Export
            </Button>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-rose/20">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-rose" />
              <h3 className="text-lg font-semibold text-rose">Danger Zone</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </Card>
        </div>
      </StaggerChild>

      {/* Delete Account Modal */}
      <Modal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-rose/10 border border-rose/20">
            <p className="text-sm text-rose font-medium">
              This will permanently delete your account, including:
            </p>
            <ul className="text-xs text-rose/80 mt-2 space-y-1 list-disc pl-4">
              <li>All genetic profile data</li>
              <li>Assessment results and health scores</li>
              <li>ViaTokens balance and history</li>
              <li>Supplement protocols and logs</li>
              <li>All messages and conversations</li>
            </ul>
          </div>
          <Input
            label={`Type "DELETE" to confirm`}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            error={deleteConfirm.length > 0 && deleteConfirm !== "DELETE" ? "Type DELETE to confirm" : undefined}
          />
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteConfirm("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConfirm !== "DELETE"}
              onClick={() => {
                toast.error("Account deletion is processed by our team. You will receive a confirmation email.");
                setDeleteModalOpen(false);
                setDeleteConfirm("");
              }}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}
