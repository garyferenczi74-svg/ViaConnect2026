"use client";

// /account/addresses — Prompt #55. CRUD over user_addresses.
// Add, edit, delete, and set-as-default. Used during checkout to
// pre-fill shipping fields.

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  StarOff,
  MapPin,
  Loader2,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface Address {
  id: string;
  user_id: string;
  label: string;
  is_default: boolean;
  first_name: string;
  last_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string | null;
}

const EMPTY_FORM: Omit<Address, "id" | "user_id"> = {
  label: "Home",
  is_default: false,
  first_name: "",
  last_name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  phone: "",
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("user_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setAddresses((data as Address[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(addr: Address) {
    setEditing(addr);
    setShowForm(true);
  }

  async function setDefault(id: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Clear current default
    await (supabase as any)
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
    // Set this one
    const { error } = await (supabase as any)
      .from("user_addresses")
      .update({ is_default: true })
      .eq("id", id);
    if (error) {
      toast.error("Could not update default");
    } else {
      toast.success("Default address updated");
      await load();
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from("user_addresses")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Could not delete address");
    } else {
      toast.success("Address removed");
      setConfirmDelete(null);
      await load();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold">Saved Addresses</h2>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 text-white text-xs font-semibold transition-colors min-h-[36px]"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          Add Address
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
          <Loader2
            className="w-6 h-6 text-white/40 mx-auto animate-spin"
            strokeWidth={1.5}
          />
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
            <MapPin className="w-6 h-6 text-white/30" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-white/70 mb-1">No saved addresses yet</p>
          <p className="text-xs text-white/40 mb-5">
            Save an address to speed up checkout next time.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <article
              key={addr.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {addr.label}
                  </h3>
                  {addr.is_default && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2DA5A0]/15 text-[#2DA5A0] border border-[#2DA5A0]/30 font-semibold">
                      <Star className="w-3 h-3" strokeWidth={1.5} />
                      Default
                    </span>
                  )}
                </div>
              </div>
              <address className="not-italic text-sm text-white/75 leading-relaxed">
                {addr.first_name} {addr.last_name}
                <br />
                {addr.address_line1}
                {addr.address_line2 && (
                  <>
                    <br />
                    {addr.address_line2}
                  </>
                )}
                <br />
                {addr.city}, {addr.state} {addr.zip}
                {addr.phone && (
                  <>
                    <br />
                    <span className="text-white/55">{addr.phone}</span>
                  </>
                )}
              </address>
              <div className="flex items-center gap-2 mt-4">
                {!addr.is_default && (
                  <button
                    type="button"
                    onClick={() => setDefault(addr.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/65 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
                  >
                    <StarOff className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Set Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(addr)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/65 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(addr.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AddressFormModal
        open={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await load();
        }}
      />

      <ConfirmDeleteModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  );
}

// ── Form modal ───────────────────────────────────────────────────────────

function AddressFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: Address | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          label: editing.label,
          is_default: editing.is_default,
          first_name: editing.first_name,
          last_name: editing.last_name,
          address_line1: editing.address_line1,
          address_line2: editing.address_line2 ?? "",
          city: editing.city,
          state: editing.state,
          zip: editing.zip,
          country: editing.country,
          phone: editing.phone ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in required");
      setSubmitting(false);
      return;
    }

    // If marking new address as default, clear other defaults first
    if (form.is_default) {
      await (supabase as any)
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const payload = {
      ...form,
      user_id: user.id,
      address_line2: form.address_line2 || null,
      phone: form.phone || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await (supabase as any)
        .from("user_addresses")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("user_addresses").insert(payload));
    }

    if (error) {
      toast.error(error.message ?? "Could not save address");
      setSubmitting(false);
      return;
    }
    toast.success(editing ? "Address updated" : "Address added");
    setSubmitting(false);
    await onSaved();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && onClose()}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.form
            onSubmit={handleSubmit}
            initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full max-w-lg rounded-2xl border border-white/[0.10] bg-[#1E3054] p-6 shadow-2xl my-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">
                {editing ? "Edit Address" : "Add Address"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-white/55 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Label">
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  required
                  maxLength={50}
                  placeholder="Home, Work, Other"
                  className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name">
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    required
                    className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
                  />
                </Field>
                <Field label="Last Name">
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    required
                    className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
                  />
                </Field>
              </div>
              <Field label="Address Line 1">
                <input
                  type="text"
                  value={form.address_line1}
                  onChange={(e) =>
                    setForm({ ...form, address_line1: e.target.value })
                  }
                  required
                  className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
                />
              </Field>
              <Field label="Address Line 2 (optional)">
                <input
                  type="text"
                  value={form.address_line2 ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, address_line2: e.target.value })
                  }
                  className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="City">
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
                  />
                </Field>
                <Field label="State">
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value.toUpperCase() })
                    }
                    required
                    maxLength={2}
                    className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
                  />
                </Field>
                <Field label="ZIP">
                  <input
                    type="text"
                    value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    required
                    maxLength={10}
                    className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
                  />
                </Field>
              </div>
              <Field label="Phone (optional)">
                <input
                  type="tel"
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-white/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) =>
                    setForm({ ...form, is_default: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#2DA5A0]"
                />
                Set as default address
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 transition-all inline-flex items-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {editing ? "Save Changes" : "Add Address"}
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
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

// ── Confirm delete ───────────────────────────────────────────────────────

function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#1E3054] p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-white mb-1">
              Delete address?
            </h3>
            <p className="text-sm text-white/60 mb-5">
              This address will be removed from your saved addresses.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/90 hover:bg-red-500 transition-all"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
