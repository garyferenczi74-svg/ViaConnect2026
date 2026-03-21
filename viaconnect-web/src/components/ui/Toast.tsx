"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1F2937",
          color: "#E5E7EB",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "0.75rem",
          fontSize: "0.875rem",
          padding: "12px 16px",
        },
        success: {
          iconTheme: { primary: "#4ADE80", secondary: "#1F2937" },
        },
        error: {
          iconTheme: { primary: "#9D5858", secondary: "#1F2937" },
        },
      }}
    />
  );
}
