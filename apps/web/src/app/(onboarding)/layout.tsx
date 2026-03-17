export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      {/* Floating gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#06B6D4]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#8B5CF6]/8 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
