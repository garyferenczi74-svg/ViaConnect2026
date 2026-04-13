'use client';

// FixedHeroDivider — thin visual breathing strip between portal sections.
// Pure CSS fixed background, no children, decoration only.

interface FixedHeroDividerProps {
  imageUrl: string;
  height?: string;
  overlayOpacity?: number;
}

export default function FixedHeroDivider({
  imageUrl,
  height = 'h-[160px] md:h-[200px]',
  overlayOpacity = 0.6,
}: FixedHeroDividerProps) {
  return (
    <div className={`relative overflow-hidden ${height}`}>
      <div
        className="absolute inset-0 bg-scroll bg-center bg-cover md:bg-fixed"
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, #1A2744 0%, rgba(10,15,35,${overlayOpacity}) 30%, rgba(10,15,35,${overlayOpacity}) 70%, #1A2744 100%)`,
        }}
      />
    </div>
  );
}
