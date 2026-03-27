import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '../../ui/GlassCard';
import { AnimatedProgressBar, StaggerItem } from '../../ui/animations';
import { HelixIcon } from './HelixIcon';

const CHALLENGES = [
  { emoji: '👟', title: '10K Steps Sprint',  desc: 'Hit 10,000 steps every day for a week.',           helix: 500,  active: true,  progress: 71, participants: 5 },
  { emoji: '💊', title: 'Perfect Protocol',  desc: 'Take all supplements on time for 14 days.',        helix: 750,  active: true,  progress: 43, participants: 3 },
  { emoji: '🥗', title: 'Clean Plate Club',  desc: 'Log every meal for 21 days straight.',             helix: 600,  active: true,  progress: 85, participants: 4 },
  { emoji: '💪', title: 'Iron Week',         desc: 'Complete 5 full workouts in 7 days.',              helix: 800,  active: true,  progress: 60, participants: 2 },
  { emoji: '⚖️', title: 'Goal Crusher',      desc: 'Hit your target weight goal within 60 days.',     helix: 1000, active: false, progress: 35, participants: 6 },
  { emoji: '✅', title: 'Daily Pulse',        desc: 'Complete daily wellness check-in for 30 days.',   helix: 450,  active: false, progress: 52, participants: 2 },
  { emoji: '🎯', title: 'Biomarker Blitz',   desc: 'Record all biomarkers for 30 days.',              helix: 900,  active: true,  progress: 40, participants: 3 },
  { emoji: '😴', title: 'Dream Machine',     desc: 'Log 7+ hours of sleep for 14 nights.',            helix: 550,  active: false, progress: 30, participants: 2 },
];

function ChallengeCard({ ch, index }: { ch: (typeof CHALLENGES)[0]; index: number }) {
  const avatarColors = ['#2DA5A0', '#B75E18', '#FFD700', '#C0C0C0'];
  const showAvatars = Math.min(ch.participants, 4);
  const overflow = ch.participants - showAvatars;

  return (
    <StaggerItem index={index} stagger={60}>
      <GlassCard className="p-5 mb-3">
        {/* Header */}
        <View className="flex-row items-start justify-between mb-2">
          <Text style={{ fontSize: 32 }}>{ch.emoji}</Text>
          <View
            className={`px-2 py-1 rounded-full ${
              ch.active ? 'bg-teal/15 border border-teal/25' : 'bg-copper/15 border border-copper/25'
            }`}
          >
            <Text
              className={`text-[9px] font-bold uppercase tracking-wider ${
                ch.active ? 'text-teal' : 'text-copper'
              }`}
            >
              {ch.active ? 'LIVE' : 'ENDED'}
            </Text>
          </View>
        </View>

        <Text className="text-[15px] font-extrabold text-white mb-1">{ch.title}</Text>
        <Text className="text-[11px] text-white/40 mb-3 leading-4">{ch.desc}</Text>

        {/* Progress */}
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-[9px] font-semibold text-white/30 uppercase tracking-wider">
            Progress
          </Text>
          <Text className="text-[10px] font-bold text-teal">{ch.progress}%</Text>
        </View>
        <AnimatedProgressBar progress={ch.progress} color="bg-teal" height="h-1.5" duration={1000} />

        {/* Bottom */}
        <View className="flex-row items-center justify-between mt-3">
          <View className="flex-row">
            {Array.from({ length: showAvatars }, (_, i) => (
              <View
                key={i}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: avatarColors[i % avatarColors.length],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: i > 0 ? -6 : 0,
                  borderWidth: 2,
                  borderColor: '#111827',
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff' }}>
                  {String.fromCharCode(65 + i)}
                </Text>
              </View>
            ))}
            {overflow > 0 && (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: -6,
                  borderWidth: 2,
                  borderColor: '#111827',
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.4)' }}>
                  +{overflow}
                </Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center">
            <HelixIcon size={13} />
            <Text className="text-sm font-extrabold text-copper ml-1">
              {ch.helix.toLocaleString()}
            </Text>
          </View>
        </View>
      </GlassCard>
    </StaggerItem>
  );
}

export function HelixChallenges() {
  return (
    <View>
      <Animated.View entering={FadeInUp.duration(400)}>
        <Text className="text-xl font-extrabold text-copper mb-1">All Challenges</Text>
        <Text className="text-[13px] text-white/35 mb-4">
          Join challenges, earn bonus Helix, and compete with your squad
        </Text>
      </Animated.View>

      {CHALLENGES.map((ch, i) => (
        <ChallengeCard key={ch.title} ch={ch} index={i} />
      ))}
    </View>
  );
}
