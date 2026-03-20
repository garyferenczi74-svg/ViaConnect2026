import { View, Text, ScrollView, Pressable } from 'react-native';
import { useBreakpoint } from '../../src/components/shared/ResponsiveLayout';

const PROTOCOL_STEPS = [
  { step: 1, title: 'Genetic Profile', desc: 'Review patient GENEX360 results' },
  { step: 2, title: 'Biomarkers', desc: 'Analyze lab work and health metrics' },
  { step: 3, title: 'Supplement Stack', desc: 'Select gene-targeted supplements' },
  { step: 4, title: 'Dosing Schedule', desc: 'Configure timing and dosage' },
  { step: 5, title: 'Interactions', desc: 'Run interaction checker' },
];

function StepCard({ step, isActive }: { step: (typeof PROTOCOL_STEPS)[0]; isActive: boolean }) {
  return (
    <View
      className={`bg-dark-card rounded-2xl p-4 border ${
        isActive ? 'border-portal-green' : 'border-dark-border'
      }`}
    >
      <View className="flex-row items-center mb-2">
        <View
          className={`w-7 h-7 rounded-full items-center justify-center mr-3 ${
            isActive ? 'bg-portal-green' : 'bg-dark-border'
          }`}
        >
          <Text className={`text-xs font-bold ${isActive ? 'text-dark-bg' : 'text-sage'}`}>
            {step.step}
          </Text>
        </View>
        <Text className="text-white font-semibold">{step.title}</Text>
      </View>
      <Text className="text-sage text-sm">{step.desc}</Text>
    </View>
  );
}

function InteractionChecker() {
  return (
    <View className="bg-dark-card rounded-2xl p-5 border border-dark-border">
      <Text className="text-white font-semibold mb-3">Interaction Checker</Text>
      <View className="bg-portal-green/10 rounded-xl p-4 mb-3">
        <Text className="text-portal-green text-sm">
          No interactions detected in current protocol
        </Text>
      </View>
      <Text className="text-sage text-xs">
        Checks herb-drug, herb-herb, and gene-supplement interactions
      </Text>
    </View>
  );
}

export default function ProtocolsScreen() {
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop';

  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-1">
        Protocol Builder
      </Text>
      <Text className="text-sage text-sm mb-6">
        Build gene-targeted supplement protocols
      </Text>

      {isDesktop ? (
        // Desktop: multi-column steps with interaction checker alongside
        <View className="flex-row gap-4">
          <View className="flex-[3]">
            <View className="flex-row gap-3 flex-wrap">
              {PROTOCOL_STEPS.map((step) => (
                <View key={step.step} className="flex-1 min-w-[200px]">
                  <StepCard step={step} isActive={step.step === 1} />
                </View>
              ))}
            </View>
          </View>
          <View className="flex-1">
            <InteractionChecker />
          </View>
        </View>
      ) : (
        // Mobile: sequential wizard
        <View className="gap-3">
          {PROTOCOL_STEPS.map((step) => (
            <StepCard key={step.step} step={step} isActive={step.step === 1} />
          ))}
          <InteractionChecker />
        </View>
      )}
    </ScrollView>
  );
}
