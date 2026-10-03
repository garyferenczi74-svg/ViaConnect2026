export const BIOMETRIC_LOCK_KEY = "viaconnect.biometric-lock.v1";
export const PUSH_OPT_IN_KEY = "viaconnect.push-opt-in.v1";

export function readOptIn(storage: Pick<Storage, "getItem">, key: string): boolean {
  try {
    return storage.getItem(key) === "on";
  } catch {
    return false;
  }
}

export function writeOptIn(storage: Pick<Storage, "setItem" | "removeItem">, key: string, on: boolean): void {
  if (on) storage.setItem(key, "on");
  else storage.removeItem(key);
}
