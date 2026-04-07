'use client';

import { useState, useEffect, useMemo } from 'react';
import { Layers, Zap, Check, Save, Search, Leaf } from 'lucide-react';
import SourceCard from '@/components/media-sources/SourceCard';
import PreviewModal from '@/components/media-sources/PreviewModal';
import { SOURCES, CATEGORIES } from '@/components/media-sources/sourceData';
import ToggleSwitch from '@/components/media-sources/ToggleSwitch';

type MediaSource = (typeof SOURCES)[number];

export default function NaturopathMediaSourcesPage() {
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewSource, setPreviewSource] = useState<MediaSource | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('viaconnect-naturopath-active-sources');
      if (stored) setActiveSources(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('viaconnect-naturopath-active-sources', JSON.stringify(activeSources));
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

  // Category counts for filter pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    counts['All'] = SOURCES.length;
    for (const source of SOURCES) {
      counts[source.category] = (counts[source.category] || 0) + 1;
    }
    return counts;
  }, []);

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
      style={{ background: 'linear-gradient(180deg, #0D1520, #121E1A, #131D2E)' }}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(123,174,127,0.2), rgba(123,174,127,0.05))' }}
        >
          <Layers className="w-4 h-4 text-[#7BAE7F]" />
          <span className="text-sm font-semibold text-[#7BAE7F]">ViaConnect GeneX360</span>
        </div>
        <h1
          className="text-[42px] font-extrabold leading-tight bg-clip-text text-transparent mb-3"
          style={{ backgroundImage: 'linear-gradient(135deg, #7BAE7F, #C4944A)' }}
        >
          Media Sources
        </h1>
        <p className="text-[17px] text-[#A0AEC0] max-w-[720px]">
          Explore holistic wellness research and integrative medicine sources. Curate a personalized feed of
          evidence-based natural health content, herbal studies, and genomic insights for your practice.
        </p>
      </div>

      {/* Herbal & Natural Medicine Info Card */}
      <div className="max-w-7xl mx-auto mb-6">
        <div
          className="rounded-xl p-4 flex items-center gap-3 border border-[#7BAE7F]/20"
          style={{ background: 'rgba(123,174,127,0.06)', backdropFilter: 'blur(12px)' }}
        >
          <Leaf className="w-5 h-5 text-[#7BAE7F] flex-shrink-0" />
          <p className="text-sm text-[#A0AEC0]">
            <span className="text-[#C4944A] font-semibold">Herbal &amp; Natural Medicine:</span> Access the Herbal-Genomic Database for gene-nutrient interaction data, traditional remedy research, and botanical compound studies integrated with your sources.
          </p>
        </div>
      </div>

      {/* Insights Banner */}
      {activeSources.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6">
          <div
            className="rounded-xl p-5 flex items-start gap-4 border-l-4 border-[#7BAE7F]"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7BAE7F, #5E9462)' }}
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
              style={{ background: 'rgba(123,174,127,0.15)', color: '#7BAE7F' }}
            >
              {activeSources.length} of {SOURCES.length} sources activated
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
                : 'linear-gradient(135deg, #7BAE7F, #5E9462)',
            }}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaved ? 'Saved!' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 whitespace-nowrap flex-shrink-0"
              style={
                categoryFilter === cat
                  ? {
                      borderColor: '#7BAE7F',
                      background: 'rgba(123,174,127,0.15)',
                      color: '#7BAE7F',
                    }
                  : {
                      borderColor: 'rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)',
                      color: '#A0AEC0',
                    }
              }
            >
              {cat}{' '}
              <span
                className="ml-1 text-xs opacity-70"
              >
                ({categoryCounts[cat] || 0})
              </span>
            </button>
          ))}
          <div className="relative ml-auto flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
            <input
              type="text"
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg text-sm text-white placeholder-[#A0AEC0] border border-white/10 outline-none transition-all duration-200 focus:border-[#7BAE7F]"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)' }}
            />
          </div>
        </div>
      </div>

      {/* Source Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredSources.map((source) => {
            const cardProps = {
              source,
              isActive: activeSources.includes(source.id),
              onToggle: () => toggleSource(source.id),
              onPreview: () => setPreviewSource(source),
              accentColor: "#7BAE7F",
            } as any;
            return <SourceCard key={source.id} {...cardProps} />;
          })}
        </div>
      </div>

      {/* Preview Modal */}
      {previewSource && (
        <PreviewModal
          source={previewSource as any}
          onClose={() => setPreviewSource(null)}
          {...({ accentColor: "#7BAE7F" } as any)}
        />
      )}
    </div>
  );
}
