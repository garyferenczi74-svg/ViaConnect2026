"use client";

export function TabH1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">{children}</h1>;
}

export function TabH2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl md:text-2xl font-semibold text-[#B87333] mb-4 mt-10">{children}</h2>;
}

export function TabH3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg md:text-xl font-semibold text-[#2DA5A0] mb-3 mt-8">{children}</h3>;
}

export function TabP({ children }: { children: React.ReactNode }) {
  return <p className="text-base md:text-lg text-white/80 leading-relaxed mb-4">{children}</p>;
}

export function TabAccent({ children }: { children: React.ReactNode }) {
  return <p className="text-base md:text-lg text-[#B87333] italic font-semibold mb-4">{children}</p>;
}

export function TabBold({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-[#06B6D4]">{children}</span>;
}

export function TabBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-white/70 mb-2">
      <span className="text-[#2DA5A0] mt-1.5 flex-shrink-0">&bull;</span>
      <span>{children}</span>
    </li>
  );
}

export function TabCheck({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-white/70 mb-2">
      <span className="text-[#06B6D4] mt-0.5 flex-shrink-0">&#10003;</span>
      <span>{children}</span>
    </li>
  );
}
