"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";

export function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  className = "",
}: {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
  };

  return (
    <AvatarPrimitive.Root
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0
        bg-dark-surface border border-dark-border ${sizeClasses[size]} ${className}`}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback className="font-bold text-gray-300 leading-none">
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
