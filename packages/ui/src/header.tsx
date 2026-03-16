import React from 'react';

export interface HeaderProps {
  brandLine?: string;
  title?: string;
  titleAccent?: string;
  icon?: string;
}

export function Header({
  brandLine = 'FarmCeutica Wellness LLC',
  title = 'ViaConnect™',
  titleAccent = 'GeneX360',
  icon = 'genetics',
}: HeaderProps) {
  return (
    <header className="p-6 border-b border-white/10 bg-[#0a0f1c]/80 sticky top-0 z-50 backdrop-blur-md">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-[#05bed6] font-bold">
            {brandLine}
          </span>
          <h1 className="font-[Syne] text-xl font-bold tracking-tight text-white">
            {title} <span className="text-[#05bed6]">{titleAccent}</span>
          </h1>
        </div>
        <span className="material-symbols-outlined text-slate-400 opacity-60">
          {icon}
        </span>
      </div>
    </header>
  );
}
