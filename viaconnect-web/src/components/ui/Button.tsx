import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-copper to-copper/80 text-white hover:from-copper/90 hover:to-copper/70 shadow-lg shadow-copper/20",
  secondary:
    "bg-white/[0.04] text-gray-300 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white",
  danger:
    "bg-rose/10 text-rose border border-rose/20 hover:bg-rose/20",
  ghost:
    "text-gray-400 hover:text-white hover:bg-white/[0.04]",
};

const sizeStyles: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 rounded-lg",
  md: "text-sm px-4 py-2 rounded-lg",
  lg: "text-sm px-5 py-2.5 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150
        ${variantStyles[variant]} ${sizeStyles[size]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
