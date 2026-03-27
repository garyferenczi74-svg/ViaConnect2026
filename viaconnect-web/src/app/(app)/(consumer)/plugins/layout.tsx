export default function PluginsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {children}
      </div>
    </div>
  );
}
