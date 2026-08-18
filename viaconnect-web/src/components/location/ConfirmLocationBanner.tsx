export function ConfirmLocationBanner() {
  return (
    <div
      role="status"
      className="rounded-xl border border-[#B75E18]/30 bg-[#B75E18]/10 p-4"
    >
      <p className="text-sm font-semibold text-white">Confirm your location</p>
      <p className="mt-1 text-sm text-white/70">
        We could not match your saved location to a single city. Please choose your country, region, and city.
      </p>
    </div>
  );
}
