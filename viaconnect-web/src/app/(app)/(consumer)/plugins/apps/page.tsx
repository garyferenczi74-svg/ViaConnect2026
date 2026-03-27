'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import toast from 'react-hot-toast';

type Category = 'All' | 'Nutrition' | 'Fitness' | 'Sleep' | 'Medical' | 'Genetic Data';

interface AppItem {
  name: string;
  icon: string;
  description: string;
  dataTypes: string[];
  category: Category;
  geneticContext?: string;
}

const categories: Category[] = ['All', 'Nutrition', 'Fitness', 'Sleep', 'Medical', 'Genetic Data'];

const apps: AppItem[] = [
  {
    name: 'MyFitnessPal',
    icon: '\uD83C\uDF4E',
    description: 'Calorie & macro tracking, food diary',
    dataTypes: ['nutrition', 'calories', 'macros'],
    category: 'Nutrition',
  },
  {
    name: 'Cronometer',
    icon: '\uD83E\uDD66',
    description: 'Detailed micronutrient tracking',
    dataTypes: ['nutrition', 'micronutrients'],
    category: 'Nutrition',
  },
  {
    name: 'Strava',
    icon: '\uD83C\uDFC3',
    description: 'Running, cycling, swimming activities',
    dataTypes: ['workouts', 'activities'],
    category: 'Fitness',
  },
  {
    name: 'Peloton',
    icon: '\uD83D\uDEB4',
    description: 'Indoor cycling, strength, yoga workouts',
    dataTypes: ['workouts', 'heart_rate'],
    category: 'Fitness',
  },
  {
    name: '23andMe',
    icon: '\uD83E\uDDEC',
    description: 'Import raw genetic data file',
    dataTypes: ['snps'],
    category: 'Genetic Data',
    geneticContext: "Re-analyze your existing DNA data through GeneX360's precision engine",
  },
  {
    name: 'AncestryDNA',
    icon: '\uD83E\uDDEC',
    description: 'Import raw genetic data file',
    dataTypes: ['snps'],
    category: 'Genetic Data',
  },
  {
    name: 'Upload Raw DNA File',
    icon: '\uD83D\uDCC1',
    description: 'Manual .txt/.csv upload',
    dataTypes: ['snps'],
    category: 'Genetic Data',
  },
];

export default function AppsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [search, setSearch] = useState('');

  const filtered = apps.filter((app) => {
    const matchesCategory = activeCategory === 'All' || app.category === activeCategory;
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleConnect = () => {
    toast.success('Connection flow coming soon \u2014 Terra API integration in progress');
  };

  // Group filtered apps by category for display
  const grouped = filtered.reduce<Record<string, AppItem[]>>((acc, app) => {
    if (!acc[app.category]) acc[app.category] = [];
    acc[app.category].push(app);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/plugins"
        className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
        style={{ color: 'var(--teal-500)' }}
      >
        <ArrowLeft size={16} />
        Plugins
      </Link>

      {/* Title */}
      <h1 className="text-heading-2" style={{ color: 'var(--text-heading-orange)' }}>
        Connect App
      </h1>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={
              activeCategory === cat
                ? { backgroundColor: 'rgba(45, 165, 160, 0.15)', color: '#2DA5A0' }
                : { backgroundColor: 'transparent', color: 'var(--text-secondary)' }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="glass-v2 flex items-center gap-3 px-4 py-3 rounded-xl">
        <Search size={18} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="Search apps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none w-full text-sm text-white placeholder:text-white/40"
        />
      </div>

      {/* App cards grouped by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="flex flex-col gap-3">
          <p className="text-overline">{category.toUpperCase()}</p>
          <div className="flex flex-col gap-3">
            {items.map((app) => (
              <button
                key={app.name}
                onClick={handleConnect}
                className="glass-v2 flex items-start gap-4 p-5 rounded-2xl text-left transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--navy-600)] text-2xl shrink-0">
                  {app.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white">{app.name}</h3>
                  <p className="text-sm text-white/60 mt-0.5">{app.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {app.dataTypes.map((dt) => (
                      <span
                        key={dt}
                        className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'rgba(45,165,160,0.1)',
                          color: 'var(--teal-500)',
                        }}
                      >
                        {dt}
                      </span>
                    ))}
                  </div>
                  {app.geneticContext && (
                    <p className="text-xs text-white/50 mt-2 italic">{app.geneticContext}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="glass-v2 p-8 rounded-2xl text-center">
          <p className="text-white/50 text-sm">No apps match your search.</p>
        </div>
      )}
    </div>
  );
}
