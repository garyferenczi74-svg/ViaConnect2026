import { forwardRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-400">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-10 px-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors
            bg-white/[0.04] border focus:ring-1
            ${error
              ? "border-rose/40 focus:border-rose focus:ring-rose/30"
              : "border-white/[0.08] focus:border-copper/50 focus:ring-copper/20"
            } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-rose">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
