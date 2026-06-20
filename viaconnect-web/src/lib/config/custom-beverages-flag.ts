// Consumer gate for Prompt 207a. NEXT_PUBLIC_ so client and server agree.
// OFF in production (env unset); set NEXT_PUBLIC_HYDRATION_CUSTOM_BEVERAGES=true
// in .env.local and staging to turn it ON. Flag id: hydration_custom_beverages.
export function isCustomBeveragesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HYDRATION_CUSTOM_BEVERAGES === 'true';
}
