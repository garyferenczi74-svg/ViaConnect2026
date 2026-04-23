"use client";

// Prompt #112 — Browser push permission + subscription flow.

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(base64) : "";
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function Page() {
  const [status, setStatus] = useState<"checking" | "unsupported" | "ready" | "subscribing" | "enabled" | "blocked" | "error">("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setStatus("unsupported"); return; }
    if (Notification.permission === "granted") setStatus("enabled");
    else if (Notification.permission === "denied") setStatus("blocked");
    else setStatus("ready");
  }, []);

  async function enable() {
    setStatus("subscribing");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const keyResp = await fetch("/api/notifications/push/vapid-public-key");
      const keyJson = await keyResp.json();
      if (!keyJson.ok || !keyJson.public_key) throw new Error("vapid_not_configured");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyJson.public_key),
      });
      const body = { subscription: sub.toJSON(), device_label: navigator.userAgent.slice(0, 60) };
      const post = await fetch("/api/notifications/push/subscribe", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const pj = await post.json();
      if (!pj.ok) throw new Error("server_rejected");
      setStatus("enabled");
      setMessage("Push notifications enabled on this device.");
    } catch (e) {
      setStatus("error");
      setMessage(String(e));
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Smartphone className="h-6 w-6 text-teal-300" strokeWidth={1.5} aria-hidden />
        <div>
          <h2 className="text-xl font-semibold">Push notifications</h2>
          <p className="text-sm text-slate-400">Browser-based push; enable per device.</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        {status === "unsupported" && <p className="text-sm text-amber-300">This browser does not support Web Push.</p>}
        {status === "blocked" && <p className="text-sm text-rose-300">You denied notifications for this site. Unblock from the browser settings and reload.</p>}
        {status === "enabled" && <p className="text-sm text-emerald-300">Push notifications are enabled on this device.</p>}
        {(status === "ready" || status === "subscribing") && (
          <button
            onClick={enable}
            disabled={status === "subscribing"}
            className="min-h-[44px] rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-teal-500"
          >
            {status === "subscribing" ? "Enabling..." : "Enable push on this device"}
          </button>
        )}
        {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
      </div>
    </section>
  );
}
