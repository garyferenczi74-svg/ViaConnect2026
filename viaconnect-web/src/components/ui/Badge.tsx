type BadgeVariant = "active" | "pending" | "warning" | "danger" | "info" | "neutral";

const variantStyles: Record<BadgeVariant, string> = {
  active: "bg-portal-green/15 text-portal-green border-portal-green/20",
  pending: "bg-portal-yellow/15 text-portal-yellow border-portal-yellow/20",
  warning: "bg-copper/15 text-copper border-copper/20",
  danger: "bg-rose/15 text-rose border-rose/20",
  info: "bg-cyan/15 text-cyan border-cyan/20",
  neutral: "bg-white/[0.06] text-gray-400 border-white/[0.08]",
};

export function Badge({
  variant = "neutral",
  children,
  className = "",
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
