import { Capacitor } from "@capacitor/core";
import { PUSH_OPT_IN_KEY, readOptIn, writeOptIn } from "@/lib/native/device-preferences";

export type PushRegistrationResult = { ok: true } | { ok: false; reason: string };

let listenersAttached = false;
let pendingRegistration: ((result: PushRegistrationResult) => void) | null = null;

function settleRegistration(result: PushRegistrationResult): void {
  const pending = pendingRegistration;
  pendingRegistration = null;
  pending?.(result);
}

async function postDeviceToken(token: string): Promise<PushRegistrationResult> {
  const platform = Capacitor.getPlatform();
  if (platform !== "ios" && platform !== "android") {
    return { ok: false, reason: "web" };
  }
  const response = await fetch("/api/notifications/push/device-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform }),
  });
  const json = (await response.json().catch(() => null)) as { ok?: boolean } | null;
  if (!response.ok || !json || json.ok !== true) {
    return { ok: false, reason: "store_failed" };
  }
  return { ok: true };
}

/**
 * Registers with APNs or FCM only after the system permission is already
 * granted. Does not show the system prompt.
 */
export async function registerNativePushToken(): Promise<PushRegistrationResult> {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: "web" };
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const current = await PushNotifications.checkPermissions();
  if (current.receive !== "granted") return { ok: false, reason: "permission" };

  if (!listenersAttached) {
    listenersAttached = true;
    void PushNotifications.addListener("registration", (event) => {
      void postDeviceToken(event.value).then(settleRegistration);
    });
    void PushNotifications.addListener("registrationError", () => {
      settleRegistration({ ok: false, reason: "registration_error" });
    });
  }

  return new Promise((resolve) => {
    pendingRegistration = resolve;
    void PushNotifications.register().catch(() => settleRegistration({ ok: false, reason: "register_failed" }));
    window.setTimeout(() => {
      if (pendingRegistration === resolve) settleRegistration({ ok: false, reason: "timeout" });
    }, 12000);
  });
}

/** Call only after the in-app explanation. This is the system prompt. */
export async function enableNativePushAfterDisclosure(): Promise<PushRegistrationResult> {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: "web" };
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") {
    writeOptIn(window.localStorage, PUSH_OPT_IN_KEY, false);
    return { ok: false, reason: "denied" };
  }
  writeOptIn(window.localStorage, PUSH_OPT_IN_KEY, true);
  return registerNativePushToken();
}

export async function refreshNativePushIfOptedIn(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!readOptIn(window.localStorage, PUSH_OPT_IN_KEY)) return;
  await registerNativePushToken();
}

export async function disableNativePushOptIn(): Promise<void> {
  writeOptIn(window.localStorage, PUSH_OPT_IN_KEY, false);
}
