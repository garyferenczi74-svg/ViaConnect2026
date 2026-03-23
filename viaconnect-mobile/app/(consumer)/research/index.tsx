/**
 * ViaConnect GeneX360 — Research Hub
 *
 * Multi-source health research engine with streaming AI chat.
 * Queries 6 data sources in parallel: Claude, Grok, PubMed,
 * ClinicalTrials.gov, Perplexity Web Search, FarmCeutica KB.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeInDown } from 'react-native-reanimated';
import { GlassCard } from '../../../src/components/ui';
import { useIsDesktop, useBreakpoint } from '../../../src/components/shared/ResponsiveLayout';
import { supabase } from '../../../src/lib/supabase/client';
import {
  executeResearch,
  SOURCE_CONFIG,
  ALL_SOURCES,
  type SourceId,
  type SourceProgress,
  type Citation,
  type EvidenceGrade,
  type ResearchFilters,
  type ResearchResponse,
  type SourceResult,
} from '../../../packages/ai-layer/research-engine';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  evidenceGrade?: EvidenceGrade;
  citations?: Citation[];
  sourceResults?: Record<string, SourceResult>;
  isStreaming?: boolean;
}

interface SavedResearch {
  id: string;
  title: string;
  tags: string[];
  created_at: string;
  research_query_id: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  {
    id: 'sp1',
    text: 'How does MTHFR C677T affect methylfolate needs?',
    icon: '🧬',
  },
  {
    id: 'sp2',
    text: 'Latest research on NAD+ and mitochondrial health',
    icon: '🔬',
  },
  {
    id: 'sp3',
    text: 'Clinical trials for curcumin bioavailability',
    icon: '📊',
  },
  {
    id: 'sp4',
    text: 'Gene-based supplement interactions with CYP2D6',
    icon: '⚠️',
  },
];

const TRENDING_TOPICS = [
  { title: 'MTHFR & Methylation Support', queries: '2.4k searches' },
  { title: 'NAD+ Longevity Research', queries: '1.8k searches' },
  { title: 'Peptide Therapy (Retatrutide)', queries: '1.2k searches' },
  { title: 'Gut-Brain Axis & Probiotics', queries: '980 searches' },
  { title: 'CannabisIQ Gene Panels', queries: '870 searches' },
];

const EVIDENCE_TYPE_OPTIONS = [
  'Systematic Review',
  'RCT',
  'Cohort Study',
  'Case Study',
  'Meta-Analysis',
];

const SOURCE_FILTER_PILLS: { id: SourceId | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pubmed', label: 'PubMed' },
  { id: 'clinicaltrials', label: 'Trials' },
  { id: 'claude', label: 'AI' },
  { id: 'farmaceutica', label: 'KB' },
];

// ── Evidence Grade Bar ─────────────────────────────────────────────────────

function EvidenceGradeBar({ grade }: { grade: EvidenceGrade }) {
  const getColor = (score: number) => {
    if (score >= 8) return '#10B981';
    if (score >= 6) return '#06B6D4';
    if (score >= 4) return '#F59E0B';
    return '#EF4444';
  };

  const color = getColor(grade.score);

  return (
    <View className="mt-3 mb-2">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-sage text-xs">Evidence Grade</Text>
        <View
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: `${color}20` }}
        >
          <Text className="text-xs font-bold" style={{ color }}>
            {grade.score.toFixed(1)} — {grade.label}
          </Text>
        </View>
      </View>
      <View className="h-2 bg-dark-border/30 rounded-full overflow-hidden">
        <Animated.View
          entering={FadeIn.duration(500)}
          className="h-full rounded-full"
          style={{
            width: `${(grade.score / 10) * 100}%`,
            backgroundColor: color,
          }}
        />
      </View>
      <View className="flex-row mt-1 gap-3">
        <Text className="text-dark-border text-[10px]">
          Sources: {grade.sourceAgreement.toFixed(1)}
        </Text>
        <Text className="text-dark-border text-[10px]">
          Quality: {grade.qualityScore.toFixed(1)}
        </Text>
        <Text className="text-dark-border text-[10px]">
          Recency: {grade.recencyScore.toFixed(1)}
        </Text>
      </View>
    </View>
  );
}

// ── Source Progress Ticker ──────────────────────────────────────────────────

function SourceProgressTicker({
  progress,
}: {
  progress: SourceProgress[];
}) {
  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      className="bg-dark-card/80 rounded-xl p-3 mb-3 border border-dark-border"
    >
      {progress.map((source) => (
        <View key={source.id} className="flex-row items-center py-1">
          <View className="w-5 items-center">
            {source.status === 'loading' ? (
              <ActivityIndicator size={12} color={source.color} />
            ) : source.status === 'done' ? (
              <Text className="text-xs">✓</Text>
            ) : source.status === 'error' ? (
              <Text className="text-xs text-red-500">✗</Text>
            ) : (
              <Text className="text-xs text-dark-border">○</Text>
            )}
          </View>
          <View
            className="w-2 h-2 rounded-full mx-2"
            style={{ backgroundColor: source.color }}
          />
          <Text
            className={`text-xs flex-1 ${
              source.status === 'done'
                ? 'text-white'
                : source.status === 'error'
                  ? 'text-red-400'
                  : 'text-sage'
            }`}
          >
            {source.label}
          </Text>
          {source.detail && (
            <Text className="text-dark-border text-[10px]">{source.detail}</Text>
          )}
        </View>
      ))}
    </Animated.View>
  );
}

// ── Citation List ──────────────────────────────────────────────────────────

function CitationList({
  citations,
  expanded,
  onToggle,
}: {
  citations: Citation[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!citations.length) return null;

  return (
    <View className="mt-2">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center py-1"
      >
        <Text className="text-sage text-xs font-semibold">
          {citations.length} Citation{citations.length !== 1 ? 's' : ''}{' '}
          {expanded ? '▾' : '▸'}
        </Text>
      </Pressable>
      {expanded && (
        <View className="mt-1 gap-1">
          {citations.map((citation, i) => (
            <Pressable
              key={`${citation.type}-${citation.id}-${i}`}
              onPress={() => {
                if (citation.url) Linking.openURL(citation.url);
              }}
              className="flex-row items-start py-1 px-2 bg-dark-bg/50 rounded-lg"
            >
              <Text className="text-dark-border text-[10px] w-5">
                [{i + 1}]
              </Text>
              <View className="flex-1 ml-1">
                <Text
                  className={`text-xs ${citation.url ? 'text-cyan-400' : 'text-white'}`}
                  numberOfLines={2}
                >
                  {citation.title}
                </Text>
                {citation.authors?.length ? (
                  <Text className="text-dark-border text-[10px]">
                    {citation.authors.join(', ')}
                    {citation.journal ? ` — ${citation.journal}` : ''}
                    {citation.year ? ` (${citation.year})` : ''}
                  </Text>
                ) : null}
                {citation.pmid && (
                  <Text className="text-blue-400 text-[10px]">
                    PMID: {citation.pmid}
                  </Text>
                )}
                {citation.nctId && (
                  <Text className="text-emerald-400 text-[10px]">
                    {citation.nctId}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Source Breakdown Accordion ──────────────────────────────────────────────

function SourceBreakdown({
  sourceResults,
}: {
  sourceResults: Record<string, SourceResult>;
}) {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const sources = Object.values(sourceResults);

  if (!sources.length) return null;

  return (
    <View className="mt-2 border-t border-dark-border/50 pt-2">
      <Text className="text-sage text-xs font-semibold mb-1">
        Source Breakdown
      </Text>
      {sources.map((result) => {
        const config = SOURCE_CONFIG[result.sourceId];
        const isExpanded = expandedSource === result.sourceId;
        return (
          <View key={result.sourceId} className="mb-1">
            <Pressable
              onPress={() =>
                setExpandedSource(isExpanded ? null : result.sourceId)
              }
              className="flex-row items-center py-1.5"
            >
              <View
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: config.color }}
              />
              <Text className="text-white text-xs flex-1">
                {config.label}
              </Text>
              <Text className="text-dark-border text-[10px]">
                {result.citations.length} refs {isExpanded ? '▾' : '▸'}
              </Text>
            </Pressable>
            {isExpanded && (
              <View className="ml-4 pl-2 border-l border-dark-border/30">
                <Text
                  className="text-sage text-xs leading-4 py-1"
                  numberOfLines={10}
                >
                  {result.content.slice(0, 500)}
                  {result.content.length > 500 ? '...' : ''}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Response Message Card ──────────────────────────────────────────────────

function ResponseCard({ message }: { message: ChatMessage }) {
  const [citationsExpanded, setCitationsExpanded] = useState(false);

  return (
    <Animated.View entering={FadeInUp.duration(400)}>
      <GlassCard className="p-4">
        {/* Main answer */}
        <Text className="text-white text-sm leading-5">
          {message.content}
          {message.isStreaming && (
            <Text className="text-cyan-400">▊</Text>
          )}
        </Text>

        {/* Evidence grade bar */}
        {message.evidenceGrade && (
          <EvidenceGradeBar grade={message.evidenceGrade} />
        )}

        {/* Source breakdown */}
        {message.sourceResults && (
          <SourceBreakdown sourceResults={message.sourceResults} />
        )}

        {/* Citations */}
        {message.citations && (
          <CitationList
            citations={message.citations}
            expanded={citationsExpanded}
            onToggle={() => setCitationsExpanded(!citationsExpanded)}
          />
        )}

        {/* Action buttons */}
        {!message.isStreaming && (
          <View className="flex-row mt-3 gap-2 border-t border-dark-border/50 pt-2">
            {(['Copy', 'Save', 'Share'] as const).map((action) => (
              <Pressable
                key={action}
                className="bg-dark-bg/50 rounded-lg px-3 py-1.5 active:opacity-70"
                onPress={() => handleAction(action, message)}
              >
                <Text className="text-sage text-[10px] font-medium">
                  {action}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </GlassCard>
    </Animated.View>
  );
}

async function handleAction(
  action: 'Copy' | 'Save' | 'Share',
  message: ChatMessage,
) {
  if (action === 'Copy' && Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      // Clipboard API may not be available
    }
  }
  // Save and Share would integrate with Supabase / native share sheet
}

// ── Sidebar Components ─────────────────────────────────────────────────────

function FiltersCard({
  filters,
  onFiltersChange,
}: {
  filters: ResearchFilters;
  onFiltersChange: (f: ResearchFilters) => void;
}) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    filters.evidenceType ?? [],
  );

  return (
    <GlassCard className="p-4 mb-4">
      <Text className="text-white text-sm font-semibold mb-3">
        Research Filters
      </Text>

      {/* Date Range */}
      <Text className="text-sage text-xs mb-1">Date Range</Text>
      <View className="flex-row gap-2 mb-3">
        <TextInput
          className="flex-1 bg-dark-bg rounded-lg px-3 py-2 text-white text-xs border border-dark-border"
          placeholder="From (YYYY)"
          placeholderTextColor="#6B7280"
          value={filters.dateRange?.from ?? ''}
          onChangeText={(from) =>
            onFiltersChange({
              ...filters,
              dateRange: { ...filters.dateRange, from },
            })
          }
        />
        <TextInput
          className="flex-1 bg-dark-bg rounded-lg px-3 py-2 text-white text-xs border border-dark-border"
          placeholder="To (YYYY)"
          placeholderTextColor="#6B7280"
          value={filters.dateRange?.to ?? ''}
          onChangeText={(to) =>
            onFiltersChange({
              ...filters,
              dateRange: { ...filters.dateRange, to },
            })
          }
        />
      </View>

      {/* Evidence Type */}
      <Text className="text-sage text-xs mb-1">Evidence Type</Text>
      <View className="flex-row flex-wrap gap-1 mb-3">
        {EVIDENCE_TYPE_OPTIONS.map((type) => {
          const isSelected = selectedTypes.includes(type);
          return (
            <Pressable
              key={type}
              className={`rounded-full px-2.5 py-1 ${
                isSelected ? 'bg-cyan-500/20' : 'bg-dark-bg'
              } border ${isSelected ? 'border-cyan-500/50' : 'border-dark-border'}`}
              onPress={() => {
                const next = isSelected
                  ? selectedTypes.filter((t) => t !== type)
                  : [...selectedTypes, type];
                setSelectedTypes(next);
                onFiltersChange({ ...filters, evidenceType: next });
              }}
            >
              <Text
                className={`text-[10px] ${isSelected ? 'text-cyan-400' : 'text-sage'}`}
              >
                {type}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Population */}
      <Text className="text-sage text-xs mb-1">Population</Text>
      <TextInput
        className="bg-dark-bg rounded-lg px-3 py-2 text-white text-xs border border-dark-border"
        placeholder="e.g., Adults 18-65, Pediatric..."
        placeholderTextColor="#6B7280"
        value={filters.population ?? ''}
        onChangeText={(population) =>
          onFiltersChange({ ...filters, population })
        }
      />
    </GlassCard>
  );
}

function SavedResearchCard({
  savedItems,
}: {
  savedItems: SavedResearch[];
}) {
  return (
    <GlassCard className="p-4 mb-4">
      <Text className="text-white text-sm font-semibold mb-3">
        Saved Research
      </Text>
      {savedItems.length === 0 ? (
        <Text className="text-dark-border text-xs">
          No saved research yet. Click "Save" on any response to add it here.
        </Text>
      ) : (
        savedItems.map((item) => (
          <Pressable
            key={item.id}
            className="py-2 border-b border-dark-border/30 active:opacity-70"
          >
            <Text className="text-white text-xs" numberOfLines={1}>
              {item.title}
            </Text>
            <View className="flex-row mt-1 gap-1">
              {item.tags.map((tag) => (
                <View
                  key={tag}
                  className="bg-plum/20 rounded-full px-2 py-0.5"
                >
                  <Text className="text-plum text-[9px]">{tag}</Text>
                </View>
              ))}
            </View>
            <Text className="text-dark-border text-[10px] mt-0.5">
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </Pressable>
        ))
      )}
    </GlassCard>
  );
}

function TrendingResearchCard() {
  return (
    <GlassCard className="p-4">
      <Text className="text-white text-sm font-semibold mb-3">
        Trending Research
      </Text>
      {TRENDING_TOPICS.map((topic, i) => (
        <View
          key={i}
          className="flex-row items-center py-2 border-b border-dark-border/30"
        >
          <Text className="text-copper text-xs font-bold w-5">
            {i + 1}
          </Text>
          <View className="flex-1 ml-2">
            <Text className="text-white text-xs">{topic.title}</Text>
            <Text className="text-dark-border text-[10px]">
              {topic.queries}
            </Text>
          </View>
        </View>
      ))}
    </GlassCard>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ResearchHubScreen() {
  const isDesktop = useIsDesktop();
  const breakpoint = useBreakpoint();
  const scrollRef = useRef<ScrollView>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sourceProgress, setSourceProgress] = useState<SourceProgress[]>([]);

  // Filters & settings
  const [filters, setFilters] = useState<ResearchFilters>({});
  const [includeGenetics, setIncludeGenetics] = useState(false);
  const [activeSourceFilter, setActiveSourceFilter] = useState<
    SourceId | 'all'
  >('all');
  const [savedResearch, setSavedResearch] = useState<SavedResearch[]>([]);
  const [mobileTab, setMobileTab] = useState<'chat' | 'filters'>('chat');

  // User role (from Supabase profile)
  const [userRole, setUserRole] = useState<
    'consumer' | 'practitioner' | 'naturopath'
  >('consumer');
  const [geneticProfile, setGeneticProfile] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Load saved research & user profile on mount
  useEffect(() => {
    loadUserProfile();
    loadSavedResearch();
  }, []);

  const loadUserProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      setUserRole(
        ((profile as any).role as 'consumer' | 'practitioner' | 'naturopath') ??
          'consumer',
      );
      // Genetic profile loaded separately if available
      const { data: variants } = await supabase
        .from('genetic_variants')
        .select('gene, variant, result, metabolizer_status')
        .eq('user_id', user.id);
      if (variants?.length) {
        setGeneticProfile({ variants });
      }
    }
  };

  const loadSavedResearch = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // research_library table created by migration 20260323
    const { data } = await (supabase.from as any)('research_library')
      .select('id, title, tags, created_at, research_query_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setSavedResearch(data as SavedResearch[]);
  };

  const handleSend = useCallback(
    async (queryText?: string) => {
      const query = queryText ?? input.trim();
      if (!query || isLoading) return;

      setInput('');
      setIsLoading(true);

      // Add user message
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Create placeholder assistant message for streaming
      const assistantId = `msg-${Date.now()}-response`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Determine active sources
      const activeSources: SourceId[] =
        activeSourceFilter === 'all'
          ? [...ALL_SOURCES]
          : [activeSourceFilter];

      try {
        const response = await executeResearch(
          {
            query,
            sources: activeSources,
            filters,
            includeGenetics,
            geneticProfile: includeGenetics ? geneticProfile : null,
            userRole,
          },
          (progress) => setSourceProgress([...progress]),
          (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + token }
                  : m,
              ),
            );
          },
        );

        // Finalize assistant message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: response.answer || m.content,
                  evidenceGrade: response.evidenceGrade,
                  citations: response.citations,
                  sourceResults: response.sourceResults,
                  isStreaming: false,
                }
              : m,
          ),
        );

        // Persist to Supabase
        persistResearchQuery(query, response);
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `Research error: ${(err as Error).message}. Please try again.`,
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
        setSourceProgress([]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [
      input,
      isLoading,
      activeSourceFilter,
      filters,
      includeGenetics,
      geneticProfile,
      userRole,
    ],
  );

  const persistResearchQuery = async (
    query: string,
    response: ResearchResponse,
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // research_queries table created by migration 20260323
    await (supabase.from as any)('research_queries').insert({
      user_id: user.id,
      query,
      response_markdown: response.answer,
      evidence_grade: response.evidenceGrade.score,
      evidence_label: response.evidenceGrade.label,
      sources_used: Object.keys(response.sourceResults),
      citations: response.citations,
      source_results: response.sourceResults,
      filters_applied: filters,
      genetics_included: includeGenetics,
    });
  };

  // ── Welcome State ──────────────────────────────────────────────────────

  const WelcomeState = () => (
    <Animated.View
      entering={FadeIn.duration(600)}
      className="flex-1 items-center justify-center px-6 py-12"
    >
      <Text className="text-4xl mb-3">🔬</Text>
      <Text className="text-white text-2xl font-bold text-center mb-2">
        Research Hub
      </Text>
      <Text className="text-sage text-sm text-center mb-8 max-w-md">
        Search across PubMed, clinical trials, AI models, and our knowledge
        base. Get evidence-graded answers with full citations.
      </Text>

      {/* Suggested prompts */}
      <View className="flex-row flex-wrap justify-center gap-3 max-w-lg">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt.id}
            className="bg-white/5 rounded-2xl border border-white/10 px-4 py-3 active:opacity-70"
            style={{
              maxWidth: isDesktop ? 220 : '48%',
              ...(Platform.OS === 'web'
                ? { backdropFilter: 'blur(20px)' }
                : {}),
            }}
            onPress={() => handleSend(prompt.text)}
          >
            <Text className="text-lg mb-1">{prompt.icon}</Text>
            <Text className="text-white text-xs leading-4">
              {prompt.text}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Consumer disclaimer */}
      {userRole === 'consumer' && (
        <Text className="text-dark-border text-[10px] text-center mt-8 max-w-md">
          This tool provides research information only and is not medical
          advice. Always consult your healthcare provider before making health
          decisions.
        </Text>
      )}
    </Animated.View>
  );

  // ── Chat Panel ─────────────────────────────────────────────────────────

  const ChatPanel = () => (
    <View className="flex-1">
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-white text-xl font-bold">Research Hub</Text>
        <Text className="text-sage text-xs">
          Multi-source evidence engine • {userRole === 'consumer' ? 'Personal Wellness' : userRole === 'practitioner' ? 'Practitioner' : 'Naturopath'} Portal
        </Text>
      </View>

      {/* Messages or Welcome */}
      {messages.length === 0 ? (
        <WelcomeState />
      ) : (
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* Source progress ticker */}
          {sourceProgress.length > 0 && (
            <SourceProgressTicker progress={sourceProgress} />
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              className={`mb-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.role === 'user' ? (
                <View className="bg-cyan-500/15 rounded-2xl rounded-br-md p-3 max-w-[85%] border border-cyan-500/20">
                  <Text className="text-white text-sm">{msg.content}</Text>
                  <Text className="text-dark-border text-[10px] mt-1">
                    {msg.timestamp}
                  </Text>
                </View>
              ) : (
                <View className="max-w-[95%] w-full">
                  <ResponseCard message={msg} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input bar */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="px-4 pt-2 pb-4 border-t border-dark-border"
      >
        {/* Source filter pills */}
        <View className="flex-row gap-1.5 mb-2">
          {SOURCE_FILTER_PILLS.map((pill) => {
            const isActive = activeSourceFilter === pill.id;
            return (
              <Pressable
                key={pill.id}
                className={`rounded-full px-3 py-1 ${
                  isActive ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-dark-card border-dark-border'
                } border`}
                onPress={() => setActiveSourceFilter(pill.id)}
              >
                <Text
                  className={`text-[10px] font-medium ${
                    isActive ? 'text-cyan-400' : 'text-sage'
                  }`}
                >
                  {pill.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row gap-2 items-end">
          {/* Left controls */}
          <View className="flex-row gap-1">
            {/* My Genetics toggle */}
            <Pressable
              className={`w-10 h-10 rounded-xl items-center justify-center border ${
                includeGenetics
                  ? 'bg-cyan-500/20 border-cyan-500/50'
                  : 'bg-dark-card border-dark-border'
              }`}
              onPress={() => setIncludeGenetics(!includeGenetics)}
              accessibilityLabel="Toggle genetic profile inclusion"
            >
              <Text className={`text-lg ${includeGenetics ? '' : 'opacity-50'}`}>
                🧬
              </Text>
            </Pressable>
          </View>

          {/* Text input */}
          <TextInput
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
            style={
              Platform.OS === 'web'
                ? ({ backdropFilter: 'blur(20px)', outlineStyle: 'none' } as any)
                : {}
            }
            placeholder="Ask a health research question..."
            placeholderTextColor="#6B7280"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            multiline
            accessibilityLabel="Research question input"
          />

          {/* Submit button */}
          <Pressable
            className={`h-10 rounded-xl px-5 items-center justify-center ${
              input.trim() && !isLoading
                ? 'bg-teal'
                : 'bg-dark-border/50'
            }`}
            onPress={() => handleSend()}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text
                className={`font-bold text-sm ${
                  input.trim() ? 'text-white' : 'text-dark-border'
                }`}
              >
                Search
              </Text>
            )}
          </Pressable>
        </View>

        {includeGenetics && (
          <View className="flex-row items-center mt-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5" />
            <Text className="text-cyan-400 text-[10px]">
              Genetic profile included in research context
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );

  // ── Sidebar Panel ──────────────────────────────────────────────────────

  const SidebarPanel = () => (
    <ScrollView
      className="bg-dark-card/50 border-l border-dark-border p-4"
      style={{ width: isDesktop ? '35%' : '100%' }}
    >
      {/* Role-specific header */}
      {userRole === 'practitioner' && (
        <GlassCard className="p-3 mb-4">
          <Text className="text-portal-green text-xs font-bold">
            Practitioner Mode
          </Text>
          <Text className="text-sage text-[10px] mt-1">
            GRADE labels enabled • Export-to-notes available • CME tracking active
          </Text>
        </GlassCard>
      )}
      {userRole === 'naturopath' && (
        <GlassCard className="p-3 mb-4">
          <Text className="text-portal-yellow text-xs font-bold">
            Naturopath Mode
          </Text>
          <Text className="text-sage text-[10px] mt-1">
            Herb-drug interactions • Therapeutic Order overlay • Botanical monographs
          </Text>
        </GlassCard>
      )}

      <FiltersCard filters={filters} onFiltersChange={setFilters} />
      <SavedResearchCard savedItems={savedResearch} />
      <TrendingResearchCard />
    </ScrollView>
  );

  // ── Render ─────────────────────────────────────────────────────────────

  if (isDesktop) {
    return (
      <View className="flex-1 flex-row bg-dark-bg">
        <View style={{ width: '65%' }}>
          <ChatPanel />
        </View>
        <SidebarPanel />
      </View>
    );
  }

  // Mobile: tabs between chat and sidebar
  return (
    <View className="flex-1 bg-dark-bg">
      {/* Mobile tab bar */}
      <View className="flex-row border-b border-dark-border">
        <Pressable
          className={`flex-1 py-3 items-center ${
            mobileTab === 'chat' ? 'border-b-2 border-cyan-400' : ''
          }`}
          onPress={() => setMobileTab('chat')}
        >
          <Text
            className={`text-xs font-semibold ${
              mobileTab === 'chat' ? 'text-cyan-400' : 'text-sage'
            }`}
          >
            Research Chat
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-3 items-center ${
            mobileTab === 'filters' ? 'border-b-2 border-cyan-400' : ''
          }`}
          onPress={() => setMobileTab('filters')}
        >
          <Text
            className={`text-xs font-semibold ${
              mobileTab === 'filters' ? 'text-cyan-400' : 'text-sage'
            }`}
          >
            Filters & Saved
          </Text>
        </Pressable>
      </View>

      {mobileTab === 'chat' ? <ChatPanel /> : <SidebarPanel />}
    </View>
  );
}
