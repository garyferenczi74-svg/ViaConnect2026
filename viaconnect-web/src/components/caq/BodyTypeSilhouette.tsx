"use client";

interface BodyTypeSilhouetteProps {
  style: "narrow" | "athletic" | "wider";
  color: string;
}

export function BodyTypeSilhouette({ style, color }: BodyTypeSilhouetteProps) {
  const strokeColor = color;

  if (style === "narrow") {
    return (
      <svg viewBox="0 0 32 44" className="w-8 h-10" fill="none">
        <circle cx="16" cy="6" r="4" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M12 12 L11 24 L13 34 L15 44 M20 12 L21 24 L19 34 L17 44" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 12 L20 12" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M8 16 L12 14 M24 16 L20 14" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (style === "athletic") {
    return (
      <svg viewBox="0 0 32 44" className="w-8 h-10" fill="none">
        <circle cx="16" cy="6" r="4" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M10 12 L11 24 L13 34 L14 44 M22 12 L21 24 L19 34 L18 44" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 12 L22 12" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M5 17 L10 13 M27 17 L22 13" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 44" className="w-8 h-10" fill="none">
      <circle cx="16" cy="6" r="4" stroke={strokeColor} strokeWidth="1.5" />
      <path d="M11 12 L9 24 L11 34 L13 44 M21 12 L23 24 L21 34 L19 44" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 12 L21 12" stroke={strokeColor} strokeWidth="1.5" />
      <path d="M7 17 L11 13 M25 17 L21 13" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
