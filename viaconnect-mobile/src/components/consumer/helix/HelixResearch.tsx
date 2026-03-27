import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { Microscope, ShieldCheck, CircleCheckBig } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { StaggerItem } from '../../ui/animations';
import { HelixIcon } from './HelixIcon';

const TOGGLES = [
  { id: 'supplement', label: 'Supplement Adherence Data', desc: 'Share daily supplement completion and timing data', on: true },
  { id: 'biomarker',  label: 'Biomarker Trends',         desc: 'Share bloodwork and biomarker changes over time', on: true },
  { id: 'lifestyle',  label: 'Lifestyle Metrics',        desc: 'Share steps, sleep quality, and activity patterns', on: false },
  { id: 'genomic',    label: 'Genomic Outcome Correlation', desc: 'Share anonymized genetic health correlations', on: false },
];

const HOW_IT_HELPS = [
  { num: '01', text: 'Identifies which supplement protocols produce the best biomarker improvements' },
  { num: '02', text: 'Helps researchers understand lifestyle factors that accelerate health outcomes' },
  { num: '03', text: 'Enables personalized recommendations based on aggregate population data' },
  { num: '04', text: 'Contributes to peer-reviewed studies advancing precision wellness science' },
];

const PRIVACY = [
  'All data is HIPAA-compliant and encrypted end-to-end',
  'Your identity is never attached to shared data — fully anonymized',
  'You can withdraw consent at any time with complete data deletion',
  'Data is never sold to third parties or used for advertising',
];

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: enabled ? '#2DA5A0' : 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        paddingHorizontal: 2,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#fff',
          transform: [{ translateX: enabled ? 20 : 0 }],
        }}
      />
    </Pressable>
  );
}

export function HelixResearch() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    TOGGLES.forEach((t) => { init[t.id] = t.on; });
    return init;
  });

  const handleToggle = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View>
      {/* Research Consent Card */}
      <GlassCard className="p-5 mb-4">
        {/* Badge */}
        <View className="flex-row items-center px-3 py-1.5 rounded-full bg-teal/10 border border-teal/20 self-start mb-4">
          <ShieldCheck size={12} strokeWidth={1.5} color="#2DA5A0" />
          <Text className="text-[9px] font-bold text-teal uppercase tracking-wider ml-1.5">
            100% Anonymous & Encrypted
          </Text>
        </View>

        <View className="flex-row items-center mb-2">
          <Microscope size={20} strokeWidth={1.5} color="#B75E18" />
          <Text className="text-lg font-extrabold text-copper ml-2">Share for Science</Text>
        </View>
        <Text className="text-[12px] text-white/35 leading-5 mb-4">
          Opt in to share anonymized health data with researchers. Your contributions
          help advance precision wellness science while earning monthly Helix rewards.
        </Text>

        {/* Toggles */}
        {TOGGLES.map((toggle, i) => (
          <StaggerItem key={toggle.id} index={i} stagger={60}>
            <Pressable
              onPress={() => handleToggle(toggle.id)}
              className="flex-row items-center py-3 border-b border-white/5"
            >
              <ToggleSwitch
                enabled={toggles[toggle.id]}
                onToggle={() => handleToggle(toggle.id)}
              />
              <View className="flex-1 ml-3">
                <Text className="text-[13px] font-bold text-white">{toggle.label}</Text>
                <Text className="text-[11px] text-white/30 mt-0.5">{toggle.desc}</Text>
              </View>
            </Pressable>
          </StaggerItem>
        ))}

        {/* Enroll CTA */}
        <View className="items-center mt-5 pt-4 border-t border-white/5">
          <View className="flex-row items-center mb-3">
            <HelixIcon size={16} />
            <Text className="text-base font-extrabold text-teal ml-1.5">+200 Helix/month</Text>
          </View>
          <Pressable className="w-full py-3.5 rounded-xl bg-teal items-center active:opacity-80">
            <Text className="text-white text-sm font-bold">Enroll Now</Text>
          </Pressable>
        </View>
      </GlassCard>

      {/* How Your Data Helps */}
      <GlassCard className="p-5 mb-4">
        <Text className="text-[15px] font-extrabold text-white mb-4">How Your Data Helps</Text>
        {HOW_IT_HELPS.map((item, i) => (
          <StaggerItem key={item.num} index={i} stagger={80}>
            <View className="flex-row mb-3">
              <Text className="text-[13px] font-extrabold text-copper w-7">{item.num}</Text>
              <Text className="flex-1 text-[12px] text-white/40 leading-5">{item.text}</Text>
            </View>
          </StaggerItem>
        ))}
      </GlassCard>

      {/* Privacy Guarantee */}
      <GlassCard className="p-5">
        <View className="flex-row items-center mb-3">
          <ShieldCheck size={18} strokeWidth={1.5} color="#B75E18" />
          <Text className="text-[15px] font-extrabold text-white ml-2">Privacy Guarantee</Text>
        </View>
        {PRIVACY.map((item, i) => (
          <StaggerItem key={i} index={i} stagger={60}>
            <View className="flex-row items-start mb-2.5">
              <View className="mr-2 mt-0.5">
                <CircleCheckBig size={14} strokeWidth={2} color="#2DA5A0" />
              </View>
              <Text className="flex-1 text-[12px] text-white/40 leading-5">{item}</Text>
            </View>
          </StaggerItem>
        ))}
      </GlassCard>
    </View>
  );
}
