'use client';

import { useState, useEffect } from 'react';
import { Layers, Zap, Check, Save, Search } from 'lucide-react';
import SourceCard from '@/components/media-sources/SourceCard';
import PreviewModal from '@/components/media-sources/PreviewModal';
import { SOURCES, CATEGORIES } from '@/components/media-sources/sourceData';
import ToggleSwitch from '@/components/media-sources/ToggleSwitch';

type MediaSource = (typeof SOURCES)[number];

export default function ConsumerMediaSourcesPage() {
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewSource, setPreviewSource] = useState<MediaSource | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('viaconnect-active-sources');
      if (stored) setActiveSources(JSON.parse(stored));
    } catch {}
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('viaconnect-active-sources', JSON.stringify(activeSources));
    } catch {}
  }, [activeSources]);

  const toggleSource = (id: string) => {
    setActiveSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const filteredSources = SOURCES.filter((source) => {
    const matchesCategory = categoryFilter === 'All' || source.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      source.name.toLowerCase().includes(q) ||
      source.description.toLowerCase().includes(q) ||
      source.tags?.some((t: string) => t.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const activeSourceNames = SOURCES.filter((s) => activeSources.includes(s.id)).map((s) => s.name);

  return (
    <div
      className="min-h-screen px-4 lg:px-6 py-8"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(45,165,160,0.2), rgba(45,165,160,0.05))' }}>
          <Layers className="w-4 h-4 text-[#2DA5A0]" />
          <span className="text-sm font-semibold text-[#2DA5A0]">ViaConnect GeneX360</span>
        </div>
        <h1
          className="text-[42px] font-extrabold leading-tight bg-clip-text text-transparent mb-3"
          style={{ backgroundImage: 'linear-gradient(135deg, #2DA5A0, #B75E18)' }}
        >
          Media Sources
        </h1>
        <p className="text-[17px] text-[#A0AEC0] max-w-[720px]">
          Curate your personalized health intelligence feed. Activate trusted sources to receive
          the latest genomic research, wellness insights, and supplement science — all tailored to your unique profile.
        </p>
      </div>

      {/* Insights Banner */}
      {activeSources.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6">
          <div
            className="rounded-xl p-5 flex items-start gap-4 border-l-4 border-[#2DA5A0]"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2DA5A0, #1E8A85)' }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-[15px] mb-1">
                {activeSources.length} Active Source{activeSources.length !== 1 ? 's' : ''}
              </p>
              <p className="text-[#A0AEC0] text-sm">
                Streaming from: {activeSourceNames.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div
          className="rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex items-center gap-4">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(45,165,160,0.15)', color: '#2DA5A0' }}
            >
              {activeSources.length} of 12 sources activated
            </span>
            <span className="text-[#A0AEC0] text-sm hidden sm:inline">
              Last synced: just now
            </span>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-300"
            style={{
              background: isSaved
                ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                : 'linear-gradient(135deg, #2DA5A0, #1E8A85)',
            }}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaved ? 'Saved!' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200"
              style={
                categoryFilter === cat
                  ? {
                      borderColor: '#2DA5A0',
                      background: 'rgba(45,165,160,0.15)',
                      color: '#2DA5A0',
                    }
                  : {
                      borderColor: 'rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)',
                      color: '#A0AEC0',
                    }
              }
            >
              {cat}
            </button>
          ))}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
            <input
              type="text"
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg text-sm text-white placeholder-[#A0AEC0] border border-white/10 outline-none transition-all duration-200 focus:border-[#2DA5A0]"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)' }}
            />
          </div>
        </div>
      </div>

      {/* Source Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              isActive={activeSources.includes(source.id)}
              onToggle={() => toggleSource(source.id)}
              onPreview={() => setPreviewSource(source)}
              accentColor="#2DA5A0"
            />
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewSource && (
        <PreviewModal
          source={previewSource}
          onClose={() => setPreviewSource(null)}
          accentColor="#2DA5A0"
        />
      )}
    </div>
  );
}
