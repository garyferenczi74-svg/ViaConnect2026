import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';

// ── Types ────────────────────────────────────────────────────────────────────

type ModelId = 'claude' | 'grok' | 'gpt4o';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  model: ModelId;
  content: string;
  timestamp: string;
}

interface PromptTemplate {
  id: string;
  label: string;
  prompt: string;
  icon: string;
}

// ── Seed Data ────────────────────────────────────────────────────────────────

const MODELS: { id: ModelId; name: string; role: string; color: string; bg: string }[] = [
  { id: 'claude', name: 'Claude', role: 'Clinical Reasoning', color: 'text-portal-purple', bg: 'bg-portal-purple/10' },
  { id: 'grok', name: 'Grok', role: 'Real-time Research', color: 'text-portal-green', bg: 'bg-portal-green/10' },
  { id: 'gpt4o', name: 'GPT-4o', role: 'Data Extraction', color: 'text-copper', bg: 'bg-copper/10' },
];

const PROMPT_TEMPLATES: PromptTemplate[] = [
  { id: 't1', label: 'Protocol Review', prompt: 'Review this protocol for patient [name] with the following genetic profile: [genes]. Check for optimal dosing, potential interactions, and evidence-based recommendations.', icon: '📋' },
  { id: 't2', label: 'Interaction Check', prompt: 'Analyze potential interactions between the following supplements and medications for a patient who is a [CYP2D6 status] metabolizer: [list supplements and medications].', icon: '⚠️' },
  { id: 't3', label: 'Evidence Lookup', prompt: 'Find the latest clinical evidence for using [supplement] in patients with [genetic variant]. Include relevant PubMed studies from the last 3 years.', icon: '🔬' },
  { id: 't4', label: 'Dosage Optimization', prompt: 'Given this patient\'s genetic profile ([genes]) and current medications ([meds]), recommend optimal dosing for [supplement] considering their metabolizer status.', icon: '💊' },
];

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'm1', role: 'user', model: 'claude',
    content: 'Review the MTHFR Support Protocol for Sarah Chen (MTHFR C677T Homozygous, CYP2D6 *4/*4 Poor Metabolizer). Current protocol: MTHFR+, CoQ10+, NAD+.',
    timestamp: '9:15 AM',
  },
  {
    id: 'm2', role: 'assistant', model: 'claude',
    content: 'Protocol Review for Sarah Chen:\n\n✅ MTHFR+ — Appropriate for C677T homozygous. Methylfolate form bypasses impaired MTHFR enzyme. Recommended dose: 1000-2000 mcg/day.\n\n✅ CoQ10+ — Excellent choice. Supports mitochondrial function and may compensate for reduced methylation capacity.\n\n⚠️ NAD+ — Consider that as a CYP2D6 *4/*4 poor metabolizer, NAD+ precursors (NR/NMN) may have altered pharmacokinetics. Recommend starting at lower dose (250mg vs standard 500mg) and titrating.\n\n📊 Evidence: MTHFR C677T carriers show 10-27x improved bioavailability with methylfolate vs folic acid (Bailey et al., 2024).\n\nConsensus: 3/3 models agree on protocol direction.',
    timestamp: '9:16 AM',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function AIClinicalSupport() {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [input, setInput] = useState('');
  const [activeModel, setActiveModel] = useState<ModelId>('claude');
  const [isLoading, setIsLoading] = useState(false);
  const [consensusLevel, setConsensusLevel] = useState(92);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      model: activeModel,
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Simulated response
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const responses: Record<ModelId, string> = {
      claude: 'Based on clinical reasoning and the patient\'s genetic profile, I recommend adjusting the protocol to include B12 methylcobalamin alongside the MTHFR+ supplement. The C677T variant typically benefits from combined methylation support. The 10-27x bioavailability improvement with methylated forms is well-documented.',
      grok: 'Latest research (March 2026): A new meta-analysis published in Nature Medicine confirms that dual methylation support (methylfolate + methylcobalamin) shows 34% better homocysteine reduction in MTHFR C677T carriers compared to single-agent therapy. This aligns with the current protocol direction.',
      gpt4o: 'Extracted from patient records:\n• Homocysteine: 12.4 μmol/L (within range but trending up)\n• Folate: 8.2 ng/mL (adequate)\n• B12: 320 pg/mL (low-normal, suggests supplementation would benefit)\n\nRecommendation: Add B12 methylcobalamin 1000 mcg/day to protocol.',
    };

    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now()}-response`,
      role: 'assistant',
      model: activeModel,
      content: responses[activeModel],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setConsensusLevel(Math.min(100, consensusLevel + Math.floor(Math.random() * 5)));
    setIsLoading(false);
  };

  const applyTemplate = (template: PromptTemplate) => {
    setInput(template.prompt);
  };

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <Text className="text-white text-2xl font-bold">AI Clinical Support</Text>
        <Text className="text-dark-border text-sm">Multi-LLM decision support system</Text>
      </View>

      {/* Model Selector */}
      <View className="flex-row px-4 py-2 gap-2">
        {MODELS.map((model) => (
          <Pressable
            key={model.id}
            className={`flex-1 rounded-xl py-2.5 items-center border ${
              activeModel === model.id ? `${model.bg} border-transparent` : 'bg-dark-card border-dark-border'
            }`}
            onPress={() => setActiveModel(model.id)}
          >
            <Text className={`text-xs font-bold ${activeModel === model.id ? model.color : 'text-white'}`}>
              {model.name}
            </Text>
            <Text className="text-dark-border text-[10px]">{model.role}</Text>
          </Pressable>
        ))}
      </View>

      {/* Consensus Indicator */}
      <View className="px-4 py-2">
        <View className="bg-dark-card rounded-xl p-3 border border-dark-border flex-row items-center">
          <View className="flex-1">
            <Text className="text-dark-border text-xs">Model Consensus</Text>
            <View className="flex-row items-center mt-1">
              <View className="flex-1 h-2 bg-dark-border/30 rounded-full overflow-hidden mr-2">
                <View
                  className={`h-full rounded-full ${
                    consensusLevel >= 80 ? 'bg-portal-green' : consensusLevel >= 50 ? 'bg-portal-yellow' : 'bg-red-500'
                  }`}
                  style={{ width: `${consensusLevel}%` }}
                />
              </View>
              <Text className="text-white text-sm font-bold">{consensusLevel}%</Text>
            </View>
          </View>
          <View
            className={`ml-3 rounded-full px-2 py-0.5 ${
              consensusLevel >= 80 ? 'bg-portal-green/20' : 'bg-portal-yellow/20'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                consensusLevel >= 80 ? 'text-portal-green' : 'text-portal-yellow'
              }`}
            >
              {consensusLevel >= 80 ? 'AGREE' : 'MIXED'}
            </Text>
          </View>
        </View>
      </View>

      {/* Chat Messages */}
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-4">
        {messages.map((msg) => {
          const modelConfig = MODELS.find((m) => m.id === msg.model);
          return (
            <View
              key={msg.id}
              className={`mb-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.role === 'assistant' && (
                <View className="flex-row items-center mb-1">
                  <View className={`rounded-full px-2 py-0.5 ${modelConfig?.bg}`}>
                    <Text className={`text-[10px] font-bold ${modelConfig?.color}`}>
                      {modelConfig?.name}
                    </Text>
                  </View>
                  <Text className="text-dark-border text-[10px] ml-1">{msg.timestamp}</Text>
                </View>
              )}
              <View
                className={`rounded-2xl p-3 max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-portal-green/20 rounded-br-md'
                    : 'bg-dark-card border border-dark-border rounded-bl-md'
                }`}
              >
                <Text className="text-white text-sm leading-5">{msg.content}</Text>
              </View>
              {msg.role === 'user' && (
                <Text className="text-dark-border text-[10px] mt-0.5">{msg.timestamp}</Text>
              )}
            </View>
          );
        })}
        {isLoading && (
          <View className="items-start mb-3">
            <View className="bg-dark-card border border-dark-border rounded-2xl rounded-bl-md p-4">
              <ActivityIndicator color="#A78BFA" size="small" />
              <Text className="text-dark-border text-xs mt-2">Analyzing...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Prompt Templates */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-1">
        <View className="flex-row gap-2">
          {PROMPT_TEMPLATES.map((template) => (
            <Pressable
              key={template.id}
              className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 active:opacity-80"
              onPress={() => applyTemplate(template)}
            >
              <Text className="text-white text-xs font-semibold">
                {template.icon} {template.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Input */}
      <View className="px-4 py-3 border-t border-dark-border flex-row gap-2">
        <TextInput
          className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white"
          placeholder="Ask a clinical question..."
          placeholderTextColor="#6B7280"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          multiline
          accessibilityLabel="Clinical question input"
        />
        <Pressable
          className={`rounded-xl px-4 items-center justify-center ${
            input.trim() && !isLoading ? 'bg-portal-green' : 'bg-dark-border'
          }`}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Text className={`font-bold ${input.trim() && !isLoading ? 'text-dark-bg' : 'text-dark-border'}`}>
            Send
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
