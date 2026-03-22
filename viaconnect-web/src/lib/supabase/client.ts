import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nnhkcufyqjojdbvdrpky.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaGtjdWZ5cWpvamRidmRycGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MzI5MjgsImV4cCI6MjA4OTIwODkyOH0.75jtXFDId6-W-WMItKXffwwhwUB2u0e37VAFmkK0FwM";

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
