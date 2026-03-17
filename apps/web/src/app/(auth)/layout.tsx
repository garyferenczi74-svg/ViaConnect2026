export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0F1C]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-[#06B6D4]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-[#8B5CF6]/10 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md px-4">{children}</div>
    </div>
  );
}
