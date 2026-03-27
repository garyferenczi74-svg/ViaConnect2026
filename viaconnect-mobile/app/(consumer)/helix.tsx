import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Swords, Trophy, Dna, Gift, Megaphone, Microscope } from 'lucide-react';
import { HelixHero } from '../../src/components/consumer/helix/HelixHero';
import { HelixArena } from '../../src/components/consumer/helix/HelixArena';
import { HelixChallenges } from '../../src/components/consumer/helix/HelixChallenges';
import { HelixEarn } from '../../src/components/consumer/helix/HelixEarn';
import { HelixRedeem } from '../../src/components/consumer/helix/HelixRedeem';
import { HelixRefer } from '../../src/components/consumer/helix/HelixRefer';
import { HelixResearch } from '../../src/components/consumer/helix/HelixResearch';

const TABS = [
  { key: 'arena',      label: 'Arena',      icon: Swords },
  { key: 'challenges', label: 'Challenges', icon: Trophy },
  { key: 'earn',       label: 'Earn',       icon: Dna },
  { key: 'redeem',     label: 'Redeem',     icon: Gift },
  { key: 'refer',      label: 'Refer',      icon: Megaphone },
  { key: 'research',   label: 'Research',   icon: Microscope },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const TAB_CONTENT: Record<TabKey, React.ComponentType> = {
  arena: HelixArena,
  challenges: HelixChallenges,
  earn: HelixEarn,
  redeem: HelixRedeem,
  refer: HelixRefer,
  research: HelixResearch,
};

export default function HelixRewardsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('arena');
  const ActiveContent = TAB_CONTENT[activeTab];
  const scrollRef = useRef<ScrollView>(null);

  const switchTab = useCallback((key: TabKey) => {
    setActiveTab(key);
  }, []);

  return (
    <View className="flex-1 bg-dark-bg">
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="px-4 pt-6 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <HelixHero />

        {/* Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-6 mb-6"
          contentContainerClassName="gap-2"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => switchTab(tab.key)}
                className={`flex-row items-center px-4 py-2.5 rounded-full ${
                  isActive
                    ? 'bg-copper/15 border border-copper/30'
                    : 'border border-transparent'
                }`}
              >
                <tab.icon size={16} strokeWidth={1.5} color={isActive ? '#B75E18' : 'rgba(255,255,255,0.35)'} />
                <Text
                  className={`text-sm font-semibold ml-1.5 ${
                    isActive ? 'text-copper' : 'text-white/35'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active Tab Content */}
        <Animated.View key={activeTab} entering={FadeIn.duration(250)}>
          <ActiveContent />
        </Animated.View>

        {/* Footer */}
        <View className="mt-10 pt-6 border-t border-white/5 items-center pb-4">
          <Text className="text-[11px] text-white/15 text-center">
            Helix Rewards™ by ViaConnect™ • FarmCeutica Wellness LLC • © 2026
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
