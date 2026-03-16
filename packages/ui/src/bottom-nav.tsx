import React from 'react';

export interface NavItem {
  icon: string;
  label: string;
  href: string;
  filled?: boolean;
}

export interface BottomNavProps {
  items: NavItem[];
  activeIndex?: number;
  className?: string;
}

const defaultItems: NavItem[] = [
  { icon: 'home', label: 'Home', href: '/', filled: true },
  { icon: 'genetics', label: 'Insights', href: '/insights' },
  { icon: 'menu_book', label: 'Plan', href: '/plan' },
  { icon: 'person', label: 'Profile', href: '/profile' },
];

export function BottomNav({
  items = defaultItems,
  activeIndex = 0,
  className = '',
}: BottomNavProps) {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-[#0a0f1c]/90 backdrop-blur-xl border-t border-white/10 pb-8 pt-3 px-6 z-50 ${className}`}
    >
      <div className="flex justify-between items-center max-w-md mx-auto">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <a
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 ${
                isActive ? 'text-[#05bed6]' : 'text-slate-400 opacity-60'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={
                  isActive && item.filled
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
