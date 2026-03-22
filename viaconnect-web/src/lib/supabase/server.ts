import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nnhkcufyqjojdbvdrpky.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaGtjdWZ5cWpvamRidmRycGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MzI5MjgsImV4cCI6MjA4OTIwODkyOH0.75jtXFDId6-W-WMItKXffwwhwUB2u0e37VAFmkK0FwM";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above
          }
        },
      },
    }
  );
}
