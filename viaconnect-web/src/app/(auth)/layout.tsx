export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-dark-bg relative overflow-hidden">
      {/* DNA helix background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dna" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="2" fill="currentColor" />
              <circle cx="45" cy="45" r="2" fill="currentColor" />
              <line x1="15" y1="15" x2="45" y2="45" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dna)" />
        </svg>
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-copper/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
