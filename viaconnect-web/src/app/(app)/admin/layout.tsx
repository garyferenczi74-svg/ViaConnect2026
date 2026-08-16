/**
 * Prompt 219I: admin layout shell. Children render inside; route error.tsx is
 * last resort. Per-page panels use AdminPanelErrorBoundary for isolation.
 */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#1A2744]">{children}</div>;
}
