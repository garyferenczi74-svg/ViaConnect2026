import React from 'react';
import { View, Text } from 'react-native';
import { Microscope, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';

export function HelixResearch() {
  return (
    <View>
      <GlassCard className="p-5 mb-4">
        <View className="flex-row items-center px-3 py-1.5 rounded-full bg-teal/10 border border-teal/20 self-start mb-4">
          <ShieldCheck size={12} strokeWidth={1.5} color="#2DA5A0" />
          <Text className="text-[9px] font-bold text-teal uppercase tracking-wider ml-1.5">
            Consent is not live
          </Text>
        </View>
        <View className="flex-row items-center mb-2">
          <Microscope size={20} strokeWidth={1.5} color="#B75E18" />
          <Text className="text-lg font-extrabold text-copper ml-2">Share for Science</Text>
        </View>
        <Text className="text-[13px] text-white/45 leading-5">
          Not enough data. Research consent is not live.
        </Text>
      </GlassCard>
    </View>
  );
}
