import { createClient } from "@/lib/supabase/server";

const aiModels = [
  {
    name: "Claude",
    role: "Clinical Reasoning",
    description:
      "Deep clinical analysis, protocol recommendations, and gene-supplement interaction reasoning",
    accent: "border-plum text-plum",
    badge: "bg-plum/20 text-plum",
  },
  {
    name: "Grok",
    role: "Real-Time Research",
    description:
      "Latest research papers, clinical trial data, and emerging supplement science",
    accent: "border-teal text-teal",
    badge: "bg-teal/20 text-teal",
  },
  {
    name: "GPT-4o",
    role: "Extraction",
    description:
      "Lab report parsing, genetic data extraction, and structured data processing",
    accent: "border-copper text-copper",
    badge: "bg-copper/20 text-copper",
  },
];

export default async function AIAdvisorPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            Multi-LLM Clinical Advisor
          </h1>
          <p className="text-gray-400 mt-1">
            AI-powered clinical reasoning with three specialized models
          </p>
        </div>

        {/* AI Model Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {aiModels.map((model) => (
            <div
              key={model.name}
              className={`glass rounded-2xl p-6 space-y-4 border ${model.accent} border-opacity-30`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {model.name}
                </h2>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${model.badge}`}
                >
                  {model.role}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{model.description}</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-portal-green animate-pulse" />
                <span className="text-portal-green text-xs">Online</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Interface Placeholder */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Clinical Chat
            </h2>
            <div className="flex gap-2">
              {aiModels.map((model) => (
                <button
                  key={model.name}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    model.name === "Claude"
                      ? "bg-portal-green/20 text-portal-green"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="h-96 bg-dark-surface/50 rounded-xl border border-dark-border/50 p-4 space-y-4 overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-portal-green/20 flex items-center justify-center text-portal-green text-xs font-bold flex-shrink-0">
                AI
              </div>
              <div className="glass rounded-xl p-4 max-w-[80%]">
                <p className="text-gray-300 text-sm">
                  Welcome to the Clinical Advisor. I can help with protocol
                  recommendations, drug-supplement interaction analysis, genetic
                  variant interpretation, and evidence-based supplement guidance.
                  How can I assist you today?
                </p>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="flex gap-3">
            <div className="flex-1 bg-dark-surface border border-dark-border rounded-lg px-4 py-3 text-gray-500 text-sm">
              Ask about a patient&apos;s genetics, protocol suggestions, or
              supplement interactions...
            </div>
            <button className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-6 py-3 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors">
              Send
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Quick Prompts
          </h3>
          <div className="flex gap-3 flex-wrap">
            {[
              "Analyze MTHFR C677T heterozygous implications",
              "Suggest protocol for COMT slow metabolizer",
              "Check NAD+ interactions with metformin",
              "Review methylation pathway for patient",
              "Latest research on retatrutide + tirzepatide",
            ].map((prompt) => (
              <button
                key={prompt}
                className="px-4 py-2 rounded-lg text-sm bg-dark-surface border border-dark-border text-gray-400 hover:border-portal-green/30 hover:text-gray-300 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
